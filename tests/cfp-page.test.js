import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const setupDoc = readFileSync(resolve(root, "docs/google-form-setup.md"), "utf8");

const TEST_FORM_ID = "1FAIpQLTest-abc123";

// The GOOGLE_FORM config block as written in index.html, and its
// field-name → entry-ID mapping, extracted so tests never hardcode entry IDs.
const configBlock = html.match(/const GOOGLE_FORM = \{[\s\S]*?\n\};/)[0];
const fieldMap = Object.fromEntries(
  [...configBlock.matchAll(/(\w+):\s*"(entry\.\d+)"/g)].map((m) => [m[1], m[2]])
);

/**
 * Load index.html in jsdom and run its inline script for real.
 * `configured: true` swaps the placeholder form ID for a test one, exactly
 * like an organizer following docs/google-form-setup.md would.
 */
function loadPage({ configured = false, fetchImpl } = {}) {
  let source = html;
  if (configured) {
    source = source.replace('"YOUR_FORM_ID_HERE"', `"${TEST_FORM_ID}"`);
    if (!source.includes(TEST_FORM_ID)) {
      throw new Error("could not swap in test form ID — placeholder changed?");
    }
  }
  const fetchCalls = [];
  const dom = new JSDOM(source, {
    runScripts: "dangerously",
    url: "https://odevs.example/cfp/",
    beforeParse(window) {
      window.Element.prototype.scrollIntoView = () => {};
      window.fetch = (url, options) => {
        fetchCalls.push({ url, options });
        return fetchImpl ? fetchImpl(url, options) : Promise.resolve({ ok: true });
      };
      if (!window.HTMLFormElement.prototype.reportValidity) {
        window.HTMLFormElement.prototype.reportValidity = function () {
          return this.checkValidity();
        };
      }
    },
  });
  return { window: dom.window, document: dom.window.document, fetchCalls };
}

function fillValidProposal(document) {
  const set = (id, value) => {
    document.getElementById(id).value = value;
  };
  set("f-name", "Ada Lovelace");
  set("f-email", "ada@example.com");
  set("f-title", "Programming the Analytical Engine in 5 Minutes");
  set("f-abstract", "A rapid tour of the first algorithm ever published.");
  document.querySelector('input[name="experience"][value="Some experience"]').checked = true;
  set("f-bio", "Mathematician. First programmer.");
  set("f-link", "https://example.com/ada");
}

async function submit(window, document) {
  document
    .getElementById("cfpForm")
    .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  // let the async submit handler (validate → fetch → DOM updates) settle
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("page structure", () => {
  const { document } = loadPage();

  it("every nav link targets an element that exists", () => {
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      const id = a.getAttribute("href").slice(1);
      expect(document.getElementById(id), `missing anchor target #${id}`).toBeTruthy();
    }
  });

  it("has all seven CFP fields with one control per configured entry ID", () => {
    const form = document.getElementById("cfpForm");
    const controlNames = new Set(
      [...form.querySelectorAll("[name]")].map((el) => el.name)
    );
    expect(controlNames).toEqual(new Set(Object.keys(fieldMap)));
  });

  it("marks the right fields required", () => {
    const form = document.getElementById("cfpForm");
    const required = new Set(
      [...form.querySelectorAll("[required]")].map((el) => el.name)
    );
    expect(required).toEqual(new Set(["name", "email", "title", "abstract", "experience"]));
  });

  it("enforces the documented input types and length limits", () => {
    expect(document.getElementById("f-email").type).toBe("email");
    expect(document.getElementById("f-link").type).toBe("url");
    expect(document.getElementById("f-title").maxLength).toBe(100);
    expect(document.getElementById("f-abstract").maxLength).toBe(800);
    expect(document.getElementById("f-bio").maxLength).toBe(400);
  });

  it("config maps every field to a distinct entry ID", () => {
    const ids = Object.values(fieldMap);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
    for (const id of ids) expect(id).toMatch(/^entry\.\d+$/);
  });

  it("only references allowed external hosts (Google Fonts + Google Forms)", () => {
    const allowed = ["fonts.googleapis.com", "fonts.gstatic.com", "docs.google.com"];
    for (const [, host] of html.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) {
      expect(allowed, `unexpected external host ${host}`).toContain(host.toLowerCase());
    }
  });
});

describe("radio options stay in sync with the Google Form setup guide", () => {
  it("page options exactly match the documented character-for-character list", () => {
    const { document } = loadPage();
    const pageOptions = [...document.querySelectorAll('input[name="experience"]')].map(
      (el) => el.value
    );
    const docSection = setupDoc.match(/character-for-character\*\*:\n([\s\S]*?)\n\n/)[1];
    const docOptions = [...docSection.matchAll(/^- `([^`]+)`$/gm)].map((m) => m[1]);
    expect(pageOptions).toEqual(docOptions);
    expect(pageOptions).toHaveLength(3);
  });

  it("setup guide documents all seven questions", () => {
    const tableRows = setupDoc.match(/^\| \d /gm);
    expect(tableRows).toHaveLength(7);
  });
});

describe("before the Google Form is wired up", () => {
  it("shows the organizer setup banner", () => {
    const { document } = loadPage();
    expect(document.getElementById("notConfigured").classList.contains("show")).toBe(true);
  });

  it("blocks a valid submission and never calls fetch", async () => {
    const { window, document, fetchCalls } = loadPage();
    fillValidProposal(document);
    await submit(window, document);
    expect(fetchCalls).toHaveLength(0);
    const msg = document.getElementById("formMsg");
    expect(msg.classList.contains("err")).toBe(true);
    expect(msg.textContent).toMatch(/aren't open/);
    expect(document.getElementById("successPanel").classList.contains("show")).toBe(false);
  });
});

describe("with the Google Form configured", () => {
  it("hides the organizer setup banner", () => {
    const { document } = loadPage({ configured: true });
    expect(document.getElementById("notConfigured").classList.contains("show")).toBe(false);
  });

  it("POSTs every answer to the form's formResponse endpoint under the right entry IDs", async () => {
    const { window, document, fetchCalls } = loadPage({ configured: true });
    fillValidProposal(document);
    await submit(window, document);

    expect(fetchCalls).toHaveLength(1);
    const { url, options } = fetchCalls[0];
    expect(url).toBe(`https://docs.google.com/forms/d/e/${TEST_FORM_ID}/formResponse`);
    expect(options.method).toBe("POST");
    expect(options.mode).toBe("no-cors");

    const sent = Object.fromEntries(options.body.entries());
    expect(sent[fieldMap.name]).toBe("Ada Lovelace");
    expect(sent[fieldMap.email]).toBe("ada@example.com");
    expect(sent[fieldMap.title]).toBe("Programming the Analytical Engine in 5 Minutes");
    expect(sent[fieldMap.abstract]).toBe("A rapid tour of the first algorithm ever published.");
    expect(sent[fieldMap.experience]).toBe("Some experience");
    expect(sent[fieldMap.bio]).toBe("Mathematician. First programmer.");
    expect(sent[fieldMap.link]).toBe("https://example.com/ada");
  });

  it("trims stray whitespace from answers", async () => {
    const { window, document, fetchCalls } = loadPage({ configured: true });
    fillValidProposal(document);
    document.getElementById("f-name").value = "  Ada Lovelace  ";
    await submit(window, document);
    const sent = Object.fromEntries(fetchCalls[0].options.body.entries());
    expect(sent[fieldMap.name]).toBe("Ada Lovelace");
  });

  it("shows the success panel and hides the form after submitting", async () => {
    const { window, document } = loadPage({ configured: true });
    fillValidProposal(document);
    await submit(window, document);
    expect(document.getElementById("successPanel").classList.contains("show")).toBe(true);
    expect(document.getElementById("cfpForm").style.display).toBe("none");
  });

  it("disables the button while the submission is in flight", async () => {
    let resolveFetch;
    const { window, document } = loadPage({
      configured: true,
      fetchImpl: () => new Promise((r) => (resolveFetch = r)),
    });
    fillValidProposal(document);
    document
      .getElementById("cfpForm")
      .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    const btn = document.getElementById("submitBtn");
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe("Sending…");
    resolveFetch({ ok: true });
  });

  it("recovers with an error message when the POST fails", async () => {
    const { window, document } = loadPage({
      configured: true,
      fetchImpl: () => Promise.reject(new Error("network down")),
    });
    fillValidProposal(document);
    await submit(window, document);

    const msg = document.getElementById("formMsg");
    expect(msg.classList.contains("err")).toBe(true);
    expect(msg.textContent).toMatch(/try again/);
    const btn = document.getElementById("submitBtn");
    expect(btn.disabled).toBe(false);
    expect(document.getElementById("cfpForm").style.display).not.toBe("none");
    expect(document.getElementById("successPanel").classList.contains("show")).toBe(false);
  });

  it("does not POST when a required field is missing", async () => {
    const { window, document, fetchCalls } = loadPage({ configured: true });
    fillValidProposal(document);
    document.getElementById("f-title").value = "";
    await submit(window, document);
    expect(fetchCalls).toHaveLength(0);
  });

  it("does not POST when the email is malformed", async () => {
    const { window, document, fetchCalls } = loadPage({ configured: true });
    fillValidProposal(document);
    document.getElementById("f-email").value = "not-an-email";
    await submit(window, document);
    expect(fetchCalls).toHaveLength(0);
  });
});

describe("abstract character counter", () => {
  it("updates live as the speaker types", () => {
    const { window, document } = loadPage();
    const abstract = document.getElementById("f-abstract");
    abstract.value = "Hello Orlando";
    abstract.dispatchEvent(new window.Event("input", { bubbles: true }));
    expect(document.getElementById("absCount").textContent).toBe("13 / 800");
  });
});
