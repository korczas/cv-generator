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
