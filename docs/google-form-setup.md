# Wiring the CFP page to Google Forms

The landing page (`index.html`) has its own styled submission form. When a speaker
hits **Send it 🔥**, the page POSTs their answers directly to your Google Form's
`formResponse` endpoint — so every submission shows up in the Form's **Responses**
tab (and its linked Google Sheet) exactly as if they'd filled out the Form itself.
Visitors never see the Google Forms UI.

One-time setup, ~10 minutes:

## 1. Create the Google Form

Go to [forms.google.com](https://forms.google.com) and create a new form named
**ODevs: Ignite the Summer — CFP** with these questions, **in this order**, using
these exact types:

| # | Question              | Type            | Required |
|---|-----------------------|-----------------|----------|
| 1 | Your name             | Short answer    | Yes      |
| 2 | Email                 | Short answer    | Yes      |
| 3 | Talk title            | Short answer    | Yes      |
| 4 | What's the talk about?| Paragraph       | Yes      |
| 5 | Speaking experience   | Multiple choice | Yes      |
| 6 | Short bio             | Paragraph       | No       |
| 7 | Link                  | Short answer    | No       |

For question 5, the options must match the landing page **character-for-character**:

- `First-time speaker`
- `Some experience`
- `Seasoned speaker`

## 2. Settings that must be OFF

Open the form's **Settings** tab and make sure all of these are **disabled**,
otherwise external submissions will silently fail:

- **Collect email addresses** → set to **Do not collect** (we collect email as a
  regular question instead — "Verified" email collection requires Google sign-in,
  which breaks posting from the landing page)
- **Limit to 1 response** → off (this also forces sign-in)
- **Restrict to users in your organization** → off

Then click **Publish** (or Send) so the form is live and accepting responses.

## 3. Get the form ID

Click **Send → link icon (🔗)** and copy the URL. It looks like:

```
https://docs.google.com/forms/d/e/1FAIpQLSc...long-id.../viewform
```

The part between `/d/e/` and `/viewform` is your **form ID**.

> ⚠️ Use the *public* URL from the Send dialog (it contains `/d/e/`). The URL in
> your browser's address bar while *editing* the form is a different, shorter ID
> that won't work.

## 4. Get the entry IDs

Each question has a hidden field name like `entry.1234567890`. The easiest way to
grab them all at once:

1. In the form editor, click the **⋮ (three-dot) menu → Get pre-filled link**.
2. Fill in a dummy answer for **every** question (pick any radio option too).
3. Click **Get link → Copy link**.
4. Paste it somewhere — it looks like:

```
https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url
  &entry.1000000001=Ada+Lovelace
  &entry.1000000002=ada@example.com
  &entry.1000000003=My+Talk+Title
  &entry.1000000004=My+abstract
  &entry.1000000005=First-time+speaker
  &entry.1000000006=My+bio
  &entry.1000000007=https://example.com
```

Match each `entry.N` to the dummy answer you typed to know which question it
belongs to.

## 5. Paste the values into `index.html`

Open `index.html` and find the `GOOGLE_FORM` config block near the bottom:

```js
const GOOGLE_FORM = {
  formId: "1FAIpQLSc...your-real-form-id...",
  fields: {
    name:       "entry.1000000001",
    email:      "entry.1000000002",
    title:      "entry.1000000003",
    abstract:   "entry.1000000004",
    experience: "entry.1000000005",
    bio:        "entry.1000000006",
    link:       "entry.1000000007",
  },
};
```

The red "Organizer setup needed" banner on the page disappears automatically once
a real form ID is in place.

## 6. Test it

Open `index.html` in a browser (double-clicking the file works — no server
needed), submit a test proposal, and confirm it appears under **Responses** in
your Google Form. Tip: link the responses to a Sheet (Responses tab → Sheets
icon) so reviewing proposals is easy.

> Note: because Google Forms doesn't send CORS headers, the page can't *read*
> Google's response — it treats a delivered POST as success. That's why the test
> submission matters: if an entry ID is wrong, that answer just won't appear in
> the response. Verify every field landed.

## 7. Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source: Deploy from a branch**, branch `main`,
   folder `/ (root)`.
3. Your CFP goes live at `https://<user>.github.io/ignite-the-summer/`.

## Closing the CFP later

When submissions close, click **Accepting responses** off in the Google Form.
Late POSTs from the page will be rejected by Google; you may also want to swap
the form section on the page for a "CFP is closed" note.
