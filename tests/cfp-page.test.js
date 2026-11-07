import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

function loadPage() {
  const dom = new JSDOM(html, { url: "https://ignitetheholidays.com/" });
  return { document: dom.window.document };
}

describe("page structure", () => {
  const { document } = loadPage();

  it("every in-page nav link targets an element that exists", () => {
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      const id = a.getAttribute("href").slice(1);
      expect(document.getElementById(id), `missing anchor target #${id}`).toBeTruthy();
    }
  });

  it("only references allowed external hosts", () => {
    const allowed = [
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      "orlandodevs.com",
      "forms.gle",
      "discord.gg",
    ];
    for (const [, host] of html.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) {
      expect(allowed, `unexpected external host ${host}`).toContain(host.toLowerCase());
    }
  });
});

describe("Call for Proposals — Google Form", () => {
  const { document } = loadPage();
  const FORM_URL = "https://forms.gle/wcGC6ooTzoR2qAAP6";

  it("links out to the Google Form rather than embedding a form", () => {
    expect(document.getElementById("cfpForm")).toBeNull();
    expect(document.querySelector('button[type="submit"]')).toBeNull();
    const cta = document.getElementById("cfpCta");
    expect(cta).toBeTruthy();
    const submit = [...cta.querySelectorAll("a")].find(
      (a) => a.getAttribute("href") === FORM_URL
    );
    expect(submit, "CFP section should link to the Google Form").toBeTruthy();
  });

  it("opens every form link in a new tab safely", () => {
    const formLinks = [...document.querySelectorAll(`a[href="${FORM_URL}"]`)];
    expect(formLinks.length).toBeGreaterThanOrEqual(1);
    for (const a of formLinks) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toMatch(/noopener/);
    }
  });

  it("the hero and nav Submit buttons point at the form", () => {
    const labels = [...document.querySelectorAll(`a[href="${FORM_URL}"]`)].map((a) =>
      a.textContent.toLowerCase()
    );
    expect(labels.some((l) => l.includes("submit"))).toBe(true);
  });
});

describe("accessibility", () => {
  const { document } = loadPage();

  it("declares the document language", () => {
    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  it("has a skip link that targets the main landmark", () => {
    const skip = document.querySelector(".skip-link");
    expect(skip).toBeTruthy();
    const target = skip.getAttribute("href").slice(1);
    expect(document.getElementById(target)).toBeTruthy();
  });

  it("has exactly one h1", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("hides decorative emoji from assistive tech", () => {
    // every bare emoji should sit inside an aria-hidden container
    const emojiHosts = [...document.querySelectorAll('[aria-hidden="true"]')]
      .map((el) => el.textContent)
      .join("");
    for (const emoji of ["🔥", "🎤", "✨"]) {
      expect(emojiHosts, `${emoji} should be aria-hidden`).toContain(emoji);
    }
  });
});

describe("branding", () => {
  const { document } = loadPage();

  it("uses the Ignite the Holidays name, not Summer", () => {
    expect(html).not.toMatch(/Ignite the Summer/i);
    expect(document.title).toMatch(/Ignite the Holidays/i);
  });
});
