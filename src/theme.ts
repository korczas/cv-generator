import type { Theme, DeepPartial } from "./types.js";

/** Global fallback tokens. Template sidecars and config values may override them. */
export const DEFAULT_THEME: Theme = {
  icons: {},
  colors: {
    navy: "#092334",
    orange: "#BC4314",
    orangeSoft: "rgba(255,94,31,0.10)",
    ink: "#33454f",
    inkAlt: "#3c4d57",
    slate: "#5a6b74",
    greyMeta: "#5a6b74",
    tileSub: "#6a7a83",
    hairline: "#e4e7e2",
    dividerPipe: "#cfd6da",
    muted: "#5a6b74",
    desk: "#c8ccc4",
    page: "#ffffff",
  },
  fonts: {
    primary:
      "'Inter', -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    mono: "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    googleFontsHref: "",
  },
  layout: {
    pageWidth: 794,
    pageHeight: 1122,
    padTop: 52,
    padBottom: 56,
    sidePadding: 62,
    accentRule: 3,
    radius: 9,
  },
};

/** Supported paper sizes in CSS px (96 dpi). The paginator lays out pages of exactly this size. */
export const PAPER = {
  a4: { pageWidth: 794, pageHeight: 1122, cssSize: "A4", pdfFormat: "A4" },
  letter: { pageWidth: 816, pageHeight: 1056, cssSize: "letter", pdfFormat: "Letter" },
} as const;
export type Paper = keyof typeof PAPER;
export const PAPERS = Object.keys(PAPER) as Paper[];

/** Theme override that selects a paper size. */
export function paperTheme(paper: Paper): DeepPartial<Theme> {
  const { pageWidth, pageHeight } = PAPER[paper];
  return { layout: { pageWidth, pageHeight } };
}

/** The paper a resolved theme lays out, or a clear error for unsupported sizes. */
export function paperOf(theme: Theme): Paper {
  const { pageWidth, pageHeight } = theme.layout;
  const found = PAPERS.find(
    (p) => PAPER[p].pageWidth === pageWidth && PAPER[p].pageHeight === pageHeight,
  );
  if (!found)
    throw new Error(
      `theme.layout: unsupported page size ${pageWidth} × ${pageHeight} px. Supported: ${PAPERS.map((p) => `${p} (${PAPER[p].pageWidth} × ${PAPER[p].pageHeight})`).join(", ")}`,
    );
  return found;
}

/**
 * Content-Security-Policy for rendered documents: inline script/style only, data:
 * images and fonts, no network unless Google Fonts was explicitly configured.
 */
export function contentSecurityPolicy(theme: Theme): string {
  const google = Boolean(theme.fonts.googleFontsHref);
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    google ? "style-src 'unsafe-inline' https://fonts.googleapis.com" : "style-src 'unsafe-inline'",
    google ? "font-src data: https://fonts.gstatic.com" : "font-src data:",
    "img-src data:",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

/** Deep-merge a partial theme over another theme (arrays/scalars replace). */
function deepMerge<T>(base: T, override?: DeepPartial<T>): T {
  if (!override) return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const ov = (override as any)[key];
    if (ov === undefined) continue;
    const bv = (base as any)[key];
    if (
      bv &&
      ov &&
      typeof bv === "object" &&
      typeof ov === "object" &&
      !Array.isArray(bv) &&
      !Array.isArray(ov)
    ) {
      out[key] = deepMerge(bv, ov);
    } else {
      out[key] = ov;
    }
  }
  return out as T;
}

/** Resolve global defaults, then template defaults, then config overrides. */
export function resolveTheme(
  ...overrides: Array<DeepPartial<Theme> | undefined>
): Theme {
  return overrides.reduce<Theme>(
    (theme, override) => deepMerge(theme, override),
    DEFAULT_THEME,
  );
}
