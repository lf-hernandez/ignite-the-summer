# ODevs: Ignite the Holidays 2026 🔥

Landing page + Call for Proposals for the ODevs (Orlando Devs) **Ignite the
Holidays 2026** event. 5-minute Ignite talks: 20 slides, 15 seconds each, auto-advancing.

## How it works

- **`index.html`** is a single self-contained static page (no build step, no
  runtime dependencies). The "Submit your talk" buttons link out to a published
  Google Form, so responses land in the Form's Responses tab and linked Sheet.
  No backend, no cost.
- **`assets/odevs-logo.svg`** is the Orlando Devs mark, used in the nav and as
  the favicon.

The Google Form lives at `https://forms.gle/wcGC6ooTzoR2qAAP6`. Update that link
in `index.html` if the form ever changes.

## Run locally

Open `index.html` in a browser. No server needed.

## Tests

A vitest + jsdom suite loads the real `index.html` and checks page structure,
the CFP form link-out, external-host allowlisting, and branding.

```sh
npm install
npm test
```

Tests also run in CI on every push (`.github/workflows/test.yml`).

## Deploy

Deployed to Render as a static site via `render.yaml` (publish dir: repo root).
Push to `main` and Render redeploys. Custom domain: **ignitetheholidays.com**.

## Things you'll want to edit

- Key dates in the `#dates` timeline (CFP closes **Dec 5**, speakers announced
  **Dec 7**, event **Dec 10, 2026** at Zymarium Meadery). Dates also live in
  the hero line and the JSON-LD `Event` block in `<head>`; keep all three in sync.
- The `#details` section (venue, speaker info, accessibility).
- `#speakers` and `#attend` are "coming soon" placeholders: swap in the lineup on
  Dec 7 and the Eventbrite link once tickets are ready.
- `#sponsors` and the `#faq` answers (cost, end time, etc. as they're decided).
- `assets/ignite-the-holidays-2026.ics` and the Google Calendar link in `#attend`:
  add an end time (`DTEND`) to both once it's known.
- Contact: the footer points to Discord rather than a personal email address.
- Topic chips in the `#topics` section.
- The Google Form link and the Discord invite in the `#cfp` section.
