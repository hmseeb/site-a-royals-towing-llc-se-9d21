# A Royals Towing LLC — Website

Single-page marketing site for **A Royals Towing LLC**, a 24/7 towing and light-duty
roadside assistance company serving El Paso, TX and surrounding areas.

## Stack

Vanilla HTML, CSS and JavaScript. No build step, no dependencies, no environment
variables. Open `index.html` in a browser, or serve the directory statically.

```bash
python3 -m http.server 8000
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Entry point — all page sections and structured data |
| `styles.css` | Design system, layout and responsive rules |
| `script.js` | Mobile nav, sticky header, FAQ accordion, form validation, scroll reveals |

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

Two items could not be verified and were deliberately left off the page rather than guessed:

1. **Email address.** No email is published on the company's own site. Add one to the
   contact section when confirmed.
2. **Contact form delivery.** The form validates in the browser and then directs the
   visitor to call dispatch. Connect it to a form service or mail handler to receive
   submissions by email.

Only one verifiable customer review exists publicly, so the testimonials section
features that single real review alongside verifiable credentials. No reviews were invented.

## Images

The company logo is the business's own asset. All photography comes from the Pexels
API and is matched to the specific service each card describes.
