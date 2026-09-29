import Handlebars from "handlebars";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { inlineToHtml } from "./inline.js";
import { PAGINATE_SOURCE } from "./paginate.js";
import type { Theme } from "./types.js";

/**
 * Handlebars helpers + supporting utilities shared by every template.
 *
 * Two of these (`md`, `icon`) emit raw markup and must be used with
 * triple-mustache (`{{{md ...}}}`, `{{{icon ...}}}`) in templates.
 */

/** Photos must be real raster files within the config directory (including symlink resolution). */
export function photoDataUri(photoPath: string, baseDir: string): string {
  if (isAbsolute(photoPath))
    throw new Error("basics.photo must be relative to the config directory");
  let abs: string;
  try {
    abs = realpathSync(resolve(baseDir, photoPath));
  } catch {
    throw new Error(`Cannot read photo "${photoPath}"`);
  }
  const rel = relative(realpathSync(baseDir), abs);
  if (
    rel === ".." ||
    rel.startsWith("../") ||
    rel.startsWith("..\\") ||
    isAbsolute(rel)
  )
    throw new Error("basics.photo must stay inside the config directory");
  const stat = statSync(abs);
  if (!stat.isFile() || stat.size > 5 * 1024 * 1024)
    throw new Error("Photo must be a file no larger than 5 MiB");
  const bytes = readFileSync(abs);
  const mime =
    bytes.length >= 24 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString("ascii", 12, 16) === "IHDR"
      ? "image/png"
      : bytes.length >= 4 &&
          bytes[0] === 255 &&
          bytes[1] === 216 &&
          bytes[2] === 255 &&
          bytes[bytes.length - 2] === 255 &&
          bytes[bytes.length - 1] === 217
        ? "image/jpeg"
        : bytes.length >= 16 &&
            bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP" &&
            bytes.readUInt32LE(4) + 8 === bytes.length
          ? "image/webp"
          : null;
  if (!mime) throw new Error("Photo must contain a PNG, JPEG, or WebP image");
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/** The script reports success only after fonts, images, and all layout checks settle. */
export function paginationScript(theme: Theme): string {
  const height = theme.layout.pageHeight;
  if (!Number.isFinite(height)) throw new Error("Invalid page height");
  return `<script>
  (function () {
    ${PAGINATE_SOURCE}
    window.__pagination = { status: 'pending' };
    var timer = setTimeout(function () { fail(new Error('Fonts or images did not load within 15 seconds')); }, 15000);
    function fail(error) {
      clearTimeout(timer);
      window.__pagination = { status: 'error', message: String(error.message || error) };
      var alert = document.createElement('p');
      alert.setAttribute('role', 'alert');
      alert.style.cssText = 'background:white;color:#900;padding:24px;position:relative;z-index:100';
      alert.textContent = 'CV layout failed: ' + window.__pagination.message;
      document.body.prepend(alert);
    }
    async function run() {
      try {
        // A page-shell heading may use fonts absent from the off-screen source.
        var shell = document.getElementById('cv-page-shell');
        var probe = null;
        if (shell && shell.content) {
          probe = document.createElement('div');
          probe.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden';
          probe.append(shell.content.cloneNode(true));
          document.body.append(probe);
          void probe.offsetHeight;
        }
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map(function (img) { return img.decode(); }));
        if (probe) probe.remove();
        if (window.__pagination.status !== 'pending') return;
        paginate(document, ${JSON.stringify(height)});
        clearTimeout(timer);
        window.__pagination = { status: 'complete' };
        window.__paginated = true;
      } catch (e) { fail(e); }
    }
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
  })();
  </script>`;
}

/** Register the `md`, `icon`, and `join` helpers on a Handlebars instance. */
export function registerHelpers(hb: typeof Handlebars): void {
  hb.registerHelper("md", function (text: unknown, colorVar?: unknown) {
    const color = typeof colorVar === "string" ? colorVar : undefined;
    return new hb.SafeString(inlineToHtml(String(text ?? ""), color));
  });

  hb.registerHelper(
    "icon",
    function (name?: unknown, options?: { data?: { root?: unknown } }) {
      const key = typeof name === "string" ? name : undefined;
      const root = options?.data?.root as { theme?: Theme } | undefined;
      const icons = root?.theme?.icons ?? {};
      const iconName = key && icons[key] ? key : icons.dot ? "dot" : undefined;
      if (!iconName) return "";
      const path = icons[iconName];
      const svg = `<svg aria-hidden="true" data-icon="${hb.escapeExpression(iconName)}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
      return new hb.SafeString(svg);
    },
  );

  hb.registerHelper("join", function (arr: unknown, sep?: unknown) {
    const list = Array.isArray(arr) ? arr : [];
    const separator = typeof sep === "string" ? sep : ", ";
    return list.map((v) => String(v)).join(separator);
  });
}
