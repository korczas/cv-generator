import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import puppeteer from "puppeteer";
import { loadConfig } from "../src/loadConfig.js";
import { loadTemplateTheme, renderCv } from "../src/render.js";
import { resolveTheme } from "../src/theme.js";

const configPath = resolve("configs/example.yaml");
const config = loadConfig(configPath);
const theme = resolveTheme(loadTemplateTheme("nice-navy"), config.theme);
const html = renderCv(config, theme, dirname(configPath), "nice-navy");

const browser = await puppeteer.launch({
  headless: true,
});

try {
  const classicTheme = resolveTheme(loadTemplateTheme("classic"), config.theme);
  const classicPage = await browser.newPage();
  await classicPage.setViewport({ width: 1000, height: 1400 });
  await classicPage.setContent(
    renderCv(config, classicTheme, dirname(configPath), "classic"),
    {
      waitUntil: "networkidle0",
    },
  );
  await classicPage.waitForFunction("window.__paginated === true", {
    timeout: 5000,
  });
  let screenPageCount = 0;
  for (const media of ["screen", "print"] as const) {
    await classicPage.emulateMediaType(media);
    const geometry = await classicPage.evaluate(() => {
      const pages = Array.from(
        document.querySelectorAll<HTMLElement>("#cv-stage > .cv-page"),
      );
      const last = pages[pages.length - 1];
      const consent = last.querySelector<HTMLElement>(".consent")!;
      const noteRect = consent.getBoundingClientRect();
      const contentBottom = Math.max(
        ...Array.from(last.children)
          .filter((element) => element !== consent)
          .map((element) => element.getBoundingClientRect().bottom),
      );
      return {
        heights: pages.map((element) => element.getBoundingClientRect().height),
        consentBottomGap: last.getBoundingClientRect().bottom - noteRect.bottom,
        consentContentGap: noteRect.top - contentBottom,
      };
    });
    assert.ok(
      geometry.heights.length >= 2,
      `Classic ${media}: expected multiple pages`,
    );
    if (media === "screen") screenPageCount = geometry.heights.length;
    assert.equal(
      geometry.heights.length,
      screenPageCount,
      "Classic: screen and print page counts match",
    );
    geometry.heights.forEach((height, index) => {
      assert.ok(
        Math.abs(height - classicTheme.layout.pageHeight) <= 1,
        `Classic ${media}: page ${index + 1} should be ${classicTheme.layout.pageHeight}px, got ${height}px`,
      );
    });
    assert.ok(
      Math.abs(geometry.consentBottomGap - classicTheme.layout.padBottom) <= 1,
      `Classic ${media}: consent should respect the bottom margin`,
    );
    assert.ok(
      geometry.consentContentGap >= 0,
      `Classic ${media}: consent must not overlap content`,
    );
  }
  await classicPage.close();
  console.log(
    "PASS — Classic screen and print page heights and consent placement match.",
  );

  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 1400 });
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await page.waitForFunction("window.__paginated === true", { timeout: 5000 });

  const metrics = await page.evaluate(() => {
    const pages = Array.from(
      document.querySelectorAll<HTMLElement>(".cv-page"),
    );
    return {
      pages: pages.map((pageEl) => {
        const pageRect = pageEl.getBoundingClientRect();
        const sidebar = pageEl.querySelector<HTMLElement>(".sidebar")!;
        const content = pageEl.querySelector<HTMLElement>(
          "[data-page-content]",
        )!;
        const sidebarRect = sidebar.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        return {
          pageHeight: pageRect.height,
          sidebarBottomGap: pageRect.bottom - sidebarRect.bottom,
          contentTopGap: contentRect.top - pageRect.top,
          overflow: content.scrollHeight - content.clientHeight,
          mastheads: pageEl.querySelectorAll(".masthead").length,
          firstOnly: pageEl.querySelectorAll("[data-first-page-only]").length,
        };
      }),
      consent: (() => {
        const element = document.getElementById("cv-consent-block");
        if (!element) return null;
        const consentRect = element.getBoundingClientRect();
        const lastRect = pages[pages.length - 1].getBoundingClientRect();
        return { bottomGap: lastRect.bottom - consentRect.bottom };
      })(),
    };
  });

  const failures: string[] = [];
  if (metrics.pages.length < 2)
    failures.push(`expected at least 2 pages, got ${metrics.pages.length}`);
  metrics.pages.forEach((pageMetrics, index) => {
    if (Math.abs(pageMetrics.pageHeight - theme.layout.pageHeight) > 1) {
      failures.push(
        `page ${index + 1} height should equal ${theme.layout.pageHeight}`,
      );
    }
    if (Math.abs(pageMetrics.sidebarBottomGap) > 1) {
      failures.push(`page ${index + 1} sidebar should reach the page bottom`);
    }
    if (pageMetrics.overflow > 1) {
      failures.push(
        `page ${index + 1} content overflows by ${pageMetrics.overflow}px`,
      );
    }
    if (index > 0 && pageMetrics.mastheads !== 0) {
      failures.push(`page ${index + 1} should not repeat the masthead`);
    }
    if (index > 0 && pageMetrics.firstOnly !== 0) {
      failures.push(
        `page ${index + 1} should not contain first-page-only content`,
      );
    }
  });
  if (
    metrics.pages[1] &&
    Math.abs(metrics.pages[1].contentTopGap - theme.layout.padTop) > 1
  ) {
    failures.push(
      `page 2 top margin should be ${theme.layout.padTop}px, got ${metrics.pages[1].contentTopGap}px`,
    );
  }
  if (!metrics.consent) {
    failures.push("consent should render on the final page");
  } else if (Math.abs(metrics.consent.bottomGap - theme.layout.padBottom) > 1) {
    failures.push(
      `consent bottom gap should be ${theme.layout.padBottom}px, got ${metrics.consent.bottomGap}px`,
    );
  }

  if (failures.length) {
    console.error(
      `FAIL — ${failures.length} layout issue(s):\n - ${failures.join("\n - ")}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `PASS — Nice Navy ${metrics.pages.length}-page shell geometry holds.`,
    );
  }
} finally {
  await browser.close();
}
