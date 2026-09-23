/* =========================================================================
   A Royals Towing LLC — site behaviour
   Vanilla JS, no dependencies, no external calls.
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');

  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });

    // Close after tapping any link inside the menu
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        closeNav();
        toggle.focus();
      }
    });

    // Close when clicking outside the header
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (!e.target.closest('.site-header')) closeNav();
    });

    // Reset menu state when leaving mobile widths
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeNav();
    });
  }

  /* ---------------------------------------------------------------
     Header shadow on scroll
     --------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var ticking = false;
    var applyScrollState = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(applyScrollState);
      }
    }, { passive: true });
    applyScrollState();
  }

  /* ---------------------------------------------------------------
     Footer year
     --------------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------------
     FAQ — keep only one answer open at a time
     --------------------------------------------------------------- */
  var faqs = Array.prototype.slice.call(document.querySelectorAll('.faq'));
  faqs.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqs.forEach(function (other) {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------------------------------------------------------------
     Contact / quote forms
     Validates locally, then posts the submission to /api/lead, which
     creates or updates the contact in GoHighLevel. A thank-you message
     is shown in place once the submission is accepted.
     --------------------------------------------------------------- */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function wireForm(form) {
    var status = form.querySelector('.form-note');
    var submitBtn = form.querySelector('[type="submit"]');
    var formName = form.getAttribute('data-form-name') || 'Website Form';

    var PHONE_RE = /^[\d\s().+-]{10,}$/;
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

    function setError(input, message) {
      var field = input.closest('.field');
      if (!field) return;
      var msg = field.querySelector('.err');
      if (message) {
        field.classList.add('invalid');
        input.setAttribute('aria-invalid', 'true');
        if (msg) msg.textContent = message;
      } else {
        field.classList.remove('invalid');
        input.removeAttribute('aria-invalid');
        if (msg) msg.textContent = '';
      }
    }

    function validateField(input) {
      var value = (input.value || '').trim();

      if (input.hasAttribute('required') && !value) {
        setError(input, 'This field is required.');
        return false;
      }
      if (input.name === 'phone' && value && !PHONE_RE.test(value)) {
        setError(input, 'Please enter a valid phone number.');
        return false;
      }
      if (input.name === 'email' && value && !EMAIL_RE.test(value)) {
        setError(input, 'Please enter a valid email address.');
        return false;
      }
      if (input.name === 'name' && value && value.length < 2) {
        setError(input, 'Please enter your name.');
        return false;
      }
      setError(input, '');
      return true;
    }

    var fields = Array.prototype.slice.call(
      form.querySelectorAll('input, select, textarea')
    );

    fields.forEach(function (input) {
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field && field.classList.contains('invalid')) validateField(input);
      });
      input.addEventListener('change', function () {
        if (input.tagName === 'SELECT') validateField(input);
      });
    });

    function valueOf(fieldName) {
      var el = form.querySelector('[name="' + fieldName + '"]');
      return el ? (el.value || '').trim() : '';
    }

    var sending = false;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;

      var firstBad = null;
      fields.forEach(function (input) {
        if (!validateField(input) && !firstBad) firstBad = input;
      });

      if (firstBad) {
        if (status) {
          status.textContent = 'Please fix the highlighted fields above.';
          status.className = 'form-note bad';
        }
        firstBad.focus();
        return;
      }

      var firstName = valueOf('name').split(/\s+/)[0];

      var payload = {
        formName: formName,
        name: valueOf('name'),
        phone: valueOf('phone'),
        email: valueOf('email'),
        message: valueOf('message'),
        service: valueOf('service'),
        location: valueOf('location'),
        vehicle: valueOf('vehicle')
      };

      sending = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
      }
      if (status) {
        status.textContent = 'Sending your request…';
        status.className = 'form-note';
      }

      function thankYou(delivered) {
        if (status) {
          status.innerHTML =
            'Thank you' + (firstName ? ', ' + escapeHtml(firstName) : '') +
            ' &mdash; your request has been received' +
            (delivered ? '' : ', but we could not confirm delivery') +
            '. For the fastest response, call dispatch now at ' +
            '<a href="tel:+19159005680">(915) 900-5680</a>.';
          status.className = 'form-note ' + (delivered ? 'ok' : 'bad');
        }
        if (delivered) {
          form.reset();
          fields.forEach(function (input) { setError(input, ''); });
        }
      }

      function done() {
        sending = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
        }
      }

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return res.ok && data && data.ok !== false;
        });
      }).then(function (ok) {
        thankYou(ok);
      }).catch(function () {
        thankYou(false);
      }).then(done, done);
    });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll('form[data-ghl-form]'),
    wireForm
  );

  /* ---------------------------------------------------------------
     Reveal-on-scroll for cards (progressive enhancement)
     --------------------------------------------------------------- */
  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !prefersReduced) {
    var targets = document.querySelectorAll(
      '.card, .price-card, .info-card, .review-feature, .review-side, .specialty, .why-media, .why-body'
    );

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'none';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(targets, function (el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(18px)';
      el.style.transition =
        'opacity .55s ease ' + Math.min(i % 4, 3) * 0.07 + 's, ' +
        'transform .55s ease ' + Math.min(i % 4, 3) * 0.07 + 's';
      observer.observe(el);
    });
  }
})();
