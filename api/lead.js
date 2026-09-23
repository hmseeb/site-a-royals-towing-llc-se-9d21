/* =========================================================================
   A Royals Towing LLC — GoHighLevel lead handler
   Receives contact/quote form submissions and creates or updates the
   matching contact in the GoHighLevel (LeadConnector) sub-account.

   Runs server-side so the private integration token is never exposed to
   the browser.

   Environment variables
     GHL_API_KEY      Private Integration token / OAuth access token (required)
     GHL_LOCATION_ID  Sub-account id (optional, defaults to the value below)
     GHL_API_VERSION  API version header (optional, defaults to 2021-07-28)
   ========================================================================= */
'use strict';

var API_BASE = 'https://services.leadconnectorhq.com';
var DEFAULT_LOCATION_ID = 'JXTJ0hx2dveAx8AWdpSM';
var DEFAULT_VERSION = '2021-07-28';
var LEAD_TAG = 'website-lead';

/* Custom fields this integration writes to, by display name. */
var FIELD_LEAD_SOURCE = 'Lead Source';
var FIELD_WEBSITE_FORM = 'Website Form';
var FIELD_MESSAGE = 'Message';

/* Cache resolved custom-field ids for the lifetime of the warm instance. */
var fieldCache = { locationId: null, expires: 0, byName: null };
var FIELD_CACHE_MS = 5 * 60 * 1000;

function config() {
  return {
    token: process.env.GHL_API_KEY || process.env.GHL_ACCESS_TOKEN || '',
    locationId: process.env.GHL_LOCATION_ID || DEFAULT_LOCATION_ID,
    version: process.env.GHL_API_VERSION || DEFAULT_VERSION
  };
}

function ghlHeaders(cfg) {
  return {
    Authorization: 'Bearer ' + cfg.token,
    Version: cfg.version,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
}

async function ghl(cfg, method, path, body) {
  var res = await fetch(API_BASE + path, {
    method: method,
    headers: ghlHeaders(cfg),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  var text = await res.text();
  var data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

  if (!res.ok) {
    var err = new Error('GoHighLevel ' + method + ' ' + path + ' failed (' + res.status + ')');
    err.status = res.status;
    err.detail = (data && (data.message || data.error)) || text.slice(0, 300);
    throw err;
  }
  return data;
}

/* ---------------------------------------------------------------
   Custom fields — resolve by display name, creating any that the
   sub-account does not have yet.
   --------------------------------------------------------------- */
async function loadFields(cfg) {
  var now = Date.now();
  if (fieldCache.byName && fieldCache.locationId === cfg.locationId && fieldCache.expires > now) {
    return fieldCache.byName;
  }

  var data = await ghl(cfg, 'GET', '/locations/' + encodeURIComponent(cfg.locationId) + '/customFields?model=contact');
  var list = (data && data.customFields) || [];
  var byName = {};
  list.forEach(function (f) {
    if (f && f.name) byName[String(f.name).trim().toLowerCase()] = f;
  });

  fieldCache = { locationId: cfg.locationId, expires: now + FIELD_CACHE_MS, byName: byName };
  return byName;
}

async function fieldId(cfg, byName, name, createIfMissing) {
  var key = name.trim().toLowerCase();
  if (byName[key] && byName[key].id) return byName[key].id;
  if (!createIfMissing) return null;

  try {
    var created = await ghl(cfg, 'POST', '/locations/' + encodeURIComponent(cfg.locationId) + '/customFields', {
      name: name,
      dataType: 'TEXT',
      model: 'contact'
    });
    var field = (created && (created.customField || created)) || null;
    if (field && field.id) {
      byName[key] = field;
      return field.id;
    }
  } catch (e) {
    // Field could not be created (often because it already exists under a
    // different casing, or the token lacks the scope). Fall through — the
    // submission itself must not be lost over a missing custom field.
    fieldCache.expires = 0;
  }
  return null;
}

/* ---------------------------------------------------------------
   Input helpers
   --------------------------------------------------------------- */
function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function splitName(full, first, last) {
  var f = str(first);
  var l = str(last);
  if (f || l) return { firstName: f, lastName: l };

  var parts = str(full).split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/* Normalise North American numbers to E.164 so GoHighLevel can match
   duplicates reliably. Anything else is passed through untouched. */
function normalisePhone(raw) {
  var value = str(raw);
  if (!value) return '';
  if (value.charAt(0) === '+') return value.replace(/[^\d+]/g, '');

  var digits = value.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.charAt(0) === '1') return '+' + digits;
  return digits ? '+' + digits : '';
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }

  var raw = '';
  await new Promise(function (resolve) {
    req.on('data', function (chunk) { raw += chunk; });
    req.on('end', resolve);
    req.on('error', resolve);
  });
  try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
}

/* ---------------------------------------------------------------
   Handler
   --------------------------------------------------------------- */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  var cfg = config();
  if (!cfg.token) {
    console.error('[lead] GHL_API_KEY is not configured — submission not delivered.');
    return res.status(503).json({ ok: false, error: 'Lead delivery is not configured.' });
  }

  var payload = await readBody(req);

  // Honeypot: silently accept and drop obvious bot submissions.
  if (str(payload.company)) return res.status(200).json({ ok: true });

  var name = splitName(payload.name, payload.firstName, payload.lastName);
  var email = str(payload.email);
  var phone = normalisePhone(payload.phone);
  var message = str(payload.message);
  var formName = str(payload.formName) || 'Website Form';

  if (!name.firstName && !email && !phone) {
    return res.status(400).json({ ok: false, error: 'A name, phone or email is required.' });
  }
  if (!email && !phone) {
    return res.status(400).json({ ok: false, error: 'A phone number or email address is required.' });
  }

  /* Extra context the form collects — kept with the lead so dispatch has
     everything in one place. */
  var extras = [
    ['Service needed', str(payload.service)],
    ['Location', str(payload.location)],
    ['Vehicle', str(payload.vehicle)]
  ].filter(function (pair) { return pair[1]; });

  try {
    var byName = await loadFields(cfg);
    var ids = {
      leadSource: await fieldId(cfg, byName, FIELD_LEAD_SOURCE, true),
      websiteForm: await fieldId(cfg, byName, FIELD_WEBSITE_FORM, true),
      message: await fieldId(cfg, byName, FIELD_MESSAGE, false)
    };

    var customFields = [];
    if (ids.leadSource) customFields.push({ id: ids.leadSource, fieldValue: 'Website' });
    if (ids.websiteForm) customFields.push({ id: ids.websiteForm, fieldValue: formName });
    if (ids.message && message) customFields.push({ id: ids.message, fieldValue: message });

    var contact = {
      locationId: cfg.locationId,
      source: 'Website',
      customFields: customFields
    };
    if (name.firstName) contact.firstName = name.firstName;
    if (name.lastName) contact.lastName = name.lastName;
    if (email) contact.email = email;
    if (phone) contact.phone = phone;

    // Upsert = create when new, update when the contact already exists.
    // Tags are deliberately omitted here: on upsert the tags array
    // replaces every existing tag, so the tag is added separately below.
    var upserted = await ghl(cfg, 'POST', '/contacts/upsert', contact);
    var record = (upserted && (upserted.contact || upserted)) || {};
    var contactId = record.id || record._id || record.contactId;

    if (!contactId) throw new Error('GoHighLevel did not return a contact id.');

    // Additive tag — leaves any tags the contact already carries in place.
    try {
      await ghl(cfg, 'POST', '/contacts/' + encodeURIComponent(contactId) + '/tags', { tags: [LEAD_TAG] });
    } catch (e) {
      console.error('[lead] tag "' + LEAD_TAG + '" failed for ' + contactId + ': ' + (e.detail || e.message));
    }

    // Note keeps the verbatim message and the rest of the submission on the
    // timeline, including for repeat customers whose contact already exists.
    var noteLines = ['Website form: ' + formName];
    extras.forEach(function (pair) { noteLines.push(pair[0] + ': ' + pair[1]); });
    if (message) noteLines.push('', 'Message:', message);

    try {
      await ghl(cfg, 'POST', '/contacts/' + encodeURIComponent(contactId) + '/notes', {
        body: noteLines.join('\n')
      });
    } catch (e) {
      console.error('[lead] note failed for ' + contactId + ': ' + (e.detail || e.message));
    }

    return res.status(200).json({ ok: true, contactId: contactId });
  } catch (err) {
    console.error('[lead] submission failed: ' + err.message + (err.detail ? ' — ' + err.detail : ''));
    return res.status(502).json({ ok: false, error: 'Lead could not be delivered.' });
  }
};
