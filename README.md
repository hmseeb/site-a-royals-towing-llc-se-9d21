# A Royals Towing LLC — Website

Single-page marketing site for **A Royals Towing LLC**, a 24/7 towing and light-duty
roadside assistance company serving El Paso, TX and surrounding areas.

## Stack

Vanilla HTML, CSS and JavaScript. No build step and no dependencies. Open
`index.html` in a browser, or serve the directory statically. The quote form
posts to a serverless function, so form delivery only works on a deployment
(see **Lead delivery** below).

```bash
python3 -m http.server 8000
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Entry point — all page sections and structured data |
| `styles.css` | Design system, layout and responsive rules |
| `script.js` | Mobile nav, sticky header, FAQ accordion, form validation, scroll reveals |
| `api/lead.js` | Serverless handler that sends form submissions to GoHighLevel |

## Lead delivery

Every form marked with `data-ghl-form` posts to `/api/lead`, which creates or
updates the contact in the GoHighLevel sub-account. Each submission:

- upserts the contact with first name, last name, phone and email
- sets the custom field **Lead Source** to `Website` and **Website Form** to the
  submitting form's `data-form-name`
- adds the tag `website-lead` (added separately so existing tags are kept)
- stores the visitor's message, plus service, location and vehicle, as a note on
  the contact — and in a **Message** custom field when the sub-account has one

`Lead Source` and `Website Form` are created automatically if the sub-account
does not already have them.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GHL_API_KEY` | yes | GoHighLevel Private Integration token with contacts read/write scope |
| `GHL_LOCATION_ID` | no | Sub-account id (defaults to `JXTJ0hx2dveAx8AWdpSM`) |
| `GHL_API_VERSION` | no | API version header (defaults to `2021-07-28`) |

Without `GHL_API_KEY` the endpoint returns 503 and the form tells the visitor to
call dispatch instead, so submissions are never silently lost.

## Sections

Hero with call-to-action → credentials bar → services → pricing → why choose us →
motor club networks → testimonials → service-area CTA → FAQ → contact with form → footer.

## Business details used

All content is sourced from the company's own published material and public records.

- **Phone:** (915) 900-5680 — the number listed on every page of royalstowing.com
- **Hours:** Open 24 hours, 7 days a week
- **Service area:** El Paso, Lanark, Alton, Alvarado, Horizon City, San Miguel and any
  area within 20 miles, plus Sunland Park, NM
- **Licensing:** USDOT 4041925 · MC-1529690
- **Services and pricing:** taken verbatim from the company's services and FAQ pages

### Notes for the business owner

One item could not be verified and was deliberately left off the page rather than guessed:

1. **Email address.** No email is published on the company's own site. Add one to the
   contact section when confirmed.

Form submissions go to the GoHighLevel sub-account — set `GHL_API_KEY` in the
deployment environment for delivery to work.

Only one verifiable customer review exists publicly, so the testimonials section
features that single real review alongside verifiable credentials. No reviews were invented.

## Images

The company logo is the business's own asset. All photography comes from the Pexels
API and is matched to the specific service each card describes.
