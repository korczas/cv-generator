import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fontsDir } from "./paths.js";
import type { Theme } from "./types.js";

/** Font families the engine can embed (OFL-licensed files in fonts/<id>/). */
export const EMBEDDABLE_FONTS = ["inter"] as const;

interface FontManifest {
  family: string;
  faces: { file: string; unicodeRange: string; weight: string }[];
}

const cache = new Map<string, string>();

/**
 * @font-face rules with the font files inlined as data: URIs, so rendering is identical on every
 * operating system and needs no network. Empty when the theme does not request an embedded font.
 */
export function fontFaceCss(theme: Theme): string {
  const id = theme.fonts.embed;
  if (!id) return "";
  if (!(EMBEDDABLE_FONTS as readonly string[]).includes(id))
    throw new Error(`theme.fonts.embed: unknown font "${id}". Available: ${EMBEDDABLE_FONTS.join(", ")}`);
  const dir = join(fontsDir(), id);
  const key = dir;
  if (cache.has(key)) return cache.get(key)!;
  const manifestPath = join(dir, "fonts.json");
  if (!existsSync(manifestPath)) throw new Error(`Embedded font "${id}" is not installed (${manifestPath})`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as FontManifest;
  const css = manifest.faces
    .map(
      (face) =>
        `@font-face{font-family:'${manifest.family}';font-style:normal;font-weight:${face.weight};font-display:block;` +
        `src:url(data:font/woff2;base64,${readFileSync(join(dir, face.file)).toString("base64")}) format('woff2');` +
        `unicode-range:${face.unicodeRange};}`,
    )
    .join("\n");
  cache.set(key, css);
  return css;
}
