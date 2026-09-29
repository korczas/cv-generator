/** Export trusted templates with Chromium's sandbox enabled. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = (await import("puppeteer")).default;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
  } catch (error) {
    throw new Error(
      `Unable to launch Chromium for PDF output. Run "npx puppeteer browsers install chrome" and check your platform's Chromium dependencies and sandbox setup. You can use --format html instead.\n${error instanceof Error ? error.message : error}`,
    );
  }
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    // Resume rendering needs embedded assets and optional Google Fonts only.
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        url.protocol === "data:" ||
        (url.protocol === "https:" &&
          ["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname))
      )
        void request.continue();
      else void request.abort();
    });
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    if (await page.$("#cv-stage")) {
      await page.waitForFunction(
        "window.__pagination && window.__pagination.status !== 'pending'",
        { timeout: 20000 },
      );
      const result = (await page.evaluate("window.__pagination")) as {
        status: string;
        message?: string;
      };
      if (result.status !== "complete")
        throw new Error(`CV layout failed: ${result.message}`);
      if (!(await page.$("#cv-stage > .cv-page")))
        throw new Error("CV layout produced no pages");
    }
    if (errors.length)
      throw new Error(`Template script failed: ${errors.join("; ")}`);
    return Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true,
        waitForFonts: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      }),
    );
  } finally {
    await browser.close();
  }
}
