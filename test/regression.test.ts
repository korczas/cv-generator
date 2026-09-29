import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderCv, loadTemplateTheme } from "../src/render.js";
import { resolveTheme } from "../src/theme.js";
import { htmlToPdf } from "../src/pdf.js";
import type { ResumeConfig } from "../src/types.js";

const fixtures: Record<string, ResumeConfig> = {
  minimal: { basics: { name: "Review Person" } },
  entry: {
    basics: { name: "Review Person" },
    experience: [
      {
        company: "Company",
        role: "Engineer",
        highlights: Array.from(
          { length: 90 },
          (_, i) =>
            `Marker${i} delivered a meaningful improvement for customers and colleagues.`,
        ),
      },
    ],
  },
  sidebar: {
    basics: { name: "Review Person" },
    skills: Array.from({ length: 30 }, (_, i) => ({
      category: `Category${i}`,
      items: ["TypeScript", "Systems", "Testing", "Operations"],
    })),
  },
  consent: {
    basics: { name: "Review Person" },
    summary: "Summary text. ".repeat(325),
    consent: "Consent note. ".repeat(100),
  },
  paragraph: {
    basics: { name: "Review Person" },
    summary: Array.from({ length: 1500 }, (_, i) => `Word${i}`).join(" "),
  },
  unicode: {
    basics: {
      name: "李明 – Żaneta",
      links: [
        {
          label: "Portfolio",
          url: "https://example.com/" + "long-path-".repeat(30),
        },
      ],
    },
    summary: "Zażółć gęślą jaźń. Ελληνικά. 日本語.",
  },
};
const browser = await puppeteer.launch({ headless: true });
try {
  for (const id of ["classic", "nice-navy"]) {
    const theme = resolveTheme(loadTemplateTheme(id));
    for (const [label, config] of Object.entries(fixtures)) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1000, height: 1400 });
        await page.setContent(renderCv(config, theme, process.cwd(), id), {
          waitUntil: "load",
        });
        await page.waitForFunction("window.__pagination?.status !== 'pending'");
        const state = (await page.evaluate("window.__pagination")) as {
          status: string;
          message?: string;
        };
        assert.equal(
          state.status,
          "complete",
          `${id}/${label}: ${state.message}`,
        );
        for (const media of ["screen", "print"] as const) {
          await page.emulateMediaType(media);
          const m = await page.evaluate(() => {
            const stage = document.getElementById("cv-stage")!;
            const pages = Array.from(stage.children) as HTMLElement[];
            return {
              text: stage.textContent!,
              pages: pages.map((p) => ({
                height: p.getBoundingClientRect().height,
                overflow: p.scrollHeight - p.clientHeight,
                width: p.scrollWidth - p.clientWidth,
                lanes: Array.from(
                  p.querySelectorAll<HTMLElement>(
                    "[data-page-content],[data-sidebar-content]",
                  ),
                ).map((d) => d.scrollHeight - d.clientHeight),
              })),
              consentGap: (() => {
                const note = stage.querySelector<HTMLElement>("[data-consent]");
                if (!note) return 0;
                return (
                  note.getBoundingClientRect().top -
                  Math.max(
                    note.parentElement!.getBoundingClientRect().top,
                    ...Array.from(note.parentElement!.children)
                      .filter((e) => e !== note)
                      .map((e) => e.getBoundingClientRect().bottom),
                  )
                );
              })(),
              orphan: pages.some((p) =>
                Array.from(
                  p.querySelectorAll(
                    "[data-page-content],[data-sidebar-content]",
                  ),
                )
                  .concat(p)
                  .some((d) => d.lastElementChild?.classList.contains("sec-h")),
              ),
            };
          });
          for (const p of m.pages) {
            assert.equal(p.height, 1122);
            assert.ok(p.overflow <= 1, `${id}/${label} page overflow`);
            assert.ok(p.width <= 1);
            assert.ok(
              p.lanes.every((v) => v <= 1),
              `${id}/${label} lane overflow`,
            );
          }
          assert.equal(m.orphan, false);
          assert.ok(
            m.consentGap >= 0,
            `${id}/${label} consent overlaps content`,
          );
          if (label === "entry")
            for (let i = 0; i < 90; i++)
              assert.ok(
                m.text.includes(`Marker${i} `),
                `${id}: missing Marker${i}`,
              );
          if (label === "sidebar")
            for (let i = 0; i < 30; i++)
              assert.ok(m.text.includes(`Category${i}`));
          if (label === "paragraph")
            for (let i = 0; i < 1500; i++)
              assert.ok(m.text.includes(`Word${i}`));
        }
        // Check the actual exported PDF's page count and content, not only DOM geometry.
        if (["entry", "sidebar", "minimal"].includes(label)) {
          const bytes = await page.pdf({
            format: "A4",
            preferCSSPageSize: true,
            printBackground: true,
          });
          const loading = getDocument({
            data: new Uint8Array(bytes),
            useSystemFonts: true,
          });
          const doc = await loading.promise;
          let text = "";
          for (let p = 1; p <= doc.numPages; p++)
            text += (await (await doc.getPage(p)).getTextContent()).items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ");
          if (label === "entry")
            for (let i = 0; i < 90; i++)
              assert.ok(text.includes(`Marker${i}`), `PDF lost Marker${i}`);
          if (label === "sidebar")
            for (let i = 0; i < 30; i++)
              assert.ok(
                text.toLowerCase().includes(`category${i}`),
                `PDF lost Category${i}`,
              );
          if (label === "minimal") assert.equal(doc.numPages, 1);
          await loading.destroy();
        }
        console.log(
          `PASS — ${id}/${label} content, screen, print and PDF checks`,
        );
      } finally {
        await page.close();
      }
    }
  }
  const photoDir = mkdtempSync(join(tmpdir(), "cv-photo-layout-"));
  try {
    const imagePage = await browser.newPage();
    await imagePage.setViewport({ width: 20, height: 20 });
    writeFileSync(join(photoDir, "photo.png"), await imagePage.screenshot());
    await imagePage.close();
    for (const id of ["classic", "nice-navy"]) {
      const page = await browser.newPage();
      await page.setContent(
        renderCv(
          { basics: { name: "Portrait", photo: "photo.png", showPhoto: true } },
          resolveTheme(loadTemplateTheme(id)),
          photoDir,
          id,
        ),
        { waitUntil: "load" },
      );
      await page.waitForFunction("window.__pagination?.status !== 'pending'");
      assert.equal(
        await page.evaluate("window.__pagination.status"),
        "complete",
      );
      assert.equal(
        await page.$$eval(
          "#cv-stage img",
          (images) => images.filter((i) => i.naturalWidth > 0).length,
        ),
        1,
      );
      await page.close();
    }
    console.log("PASS — photos decode and appear in both templates");
  } finally {
    rmSync(photoDir, { recursive: true, force: true });
  }
  // Delayed font bytes exercise the old 1.5-second fallback race without network access.
  const fontPage = await browser.newPage();
  await fontPage.setRequestInterception(true);
  let fontRequested = false;
  fontPage.on("request", (request) => {
    if (request.url().startsWith("https://fonts.googleapis.com/"))
      void request.respond({
        status: 200,
        contentType: "text/css",
        body: "@font-face {font-family:ReviewFont;src:url(https://fonts.gstatic.com/review.ttf)}",
      });
    else if (request.url().startsWith("https://fonts.gstatic.com/")) {
      fontRequested = true;
      setTimeout(
        () =>
          void request.respond({
            status: 200,
            contentType: "font/ttf",
            headers: { "Access-Control-Allow-Origin": "*" },
            body: readFileSync(
              "node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf",
            ),
          }),
        2000,
      );
    } else void request.continue();
  });
  const started = Date.now();
  await fontPage.setContent(
    renderCv(
      fixtures.minimal,
      resolveTheme(loadTemplateTheme("classic"), {
        fonts: {
          primary: "ReviewFont, sans-serif",
          googleFontsHref: "https://fonts.googleapis.com/css2?family=Inter",
        },
      }),
      process.cwd(),
      "classic",
    ),
    { waitUntil: "domcontentloaded" },
  );
  await fontPage.waitForFunction("window.__pagination.status === 'complete'");
  assert.ok(fontRequested);
  assert.ok(Date.now() - started >= 2000);
  assert.equal(
    await fontPage.evaluate('document.fonts.check("12px ReviewFont")'),
    true,
  );
  await fontPage.close();
  console.log("PASS — delayed font bytes settle before pagination");
  const html = renderCv(
    fixtures.minimal,
    resolveTheme(loadTemplateTheme("classic")),
    process.cwd(),
    "classic",
  );
  assert.ok((await htmlToPdf(html)).length > 1000);
  await assert.rejects(
    () =>
      htmlToPdf(
        html.replace(
          "function paginate(doc, PAGE_H) {",
          "function paginate(doc, PAGE_H) { throw new Error('deliberate failure');",
        ),
      ),
    /deliberate failure/,
  );
  assert.ok(
    (
      await htmlToPdf(
        "<!doctype html><html><body><p>Native flow</p></body></html>",
      )
    ).length > 1000,
  );
  console.log(
    "PASS — PDF pipeline rejects pagination failure and supports native flow",
  );
} finally {
  await browser.close();
}
