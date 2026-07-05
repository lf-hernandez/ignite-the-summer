# ODevs: Ignite the Summer 🔥

Landing page + Call for Proposals for the ODevs (Orlando Devs) **Ignite the Summer**
event — 5-minute Ignite talks: 20 slides, 15 seconds each, auto-advancing.

## How it works

- **`index.html`** — a single self-contained static page (no build step, no
  dependencies). It includes a custom-styled CFP form that POSTs submissions
  directly to a Google Form, so responses land in the Form's Responses tab and
  linked Sheet — no Sessionize, no backend, $0.
- **`docs/google-form-setup.md`** — one-time setup guide: create the Google Form,
  grab the form ID + entry IDs, and paste them into the `GOOGLE_FORM` config
  block in `index.html`.

Until the form is wired up, the page shows an "Organizer setup needed" banner in
the CFP section and politely refuses submissions.

## Run locally

Just open `index.html` in a browser — no server needed.

## Tests

The page's form logic is covered by a vitest + jsdom suite that loads the real
`index.html` and drives its inline script — validation, the unconfigured-form
banner, the Google Forms `formResponse` payload (field → `entry.N` mapping),
success/error states, and sync between the page and the setup guide.

```sh
npm install
npm test
```

Tests also run in CI on every push (`.github/workflows/test.yml`).

## Deploy

Push to GitHub, then **Settings → Pages → Deploy from a branch → `main` / root**.

## Things you'll want to edit

- Key dates in the `#dates` timeline (currently: CFP closes **Jul 31**, speakers
  announced **Aug 7**, event **Aug 20, 2026**) and the venue line.
- Contact email in the footer.
- Topic chips in the `#topics` section.
