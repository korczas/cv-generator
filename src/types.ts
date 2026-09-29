/**
 * Schema for a resume YAML config.
 *
 * Design goals:
 *  - Every piece of *content* lives here (nothing is hardcoded in a template).
 *  - Every piece of *style* lives in resolved theme tokens (global defaults,
 *    optional template sidecars, then config overrides).
 *  - `template` selects which registered template renders the config.
 *
 * Everything except `basics.name` is optional, so a config can be trimmed per offer.
 *
 * Inline emphasis: any string that renders as body copy (summary, bullet
 * highlights, achievement descriptions) supports Markdown-style `**bold**`
 * markers. Templates turn these into the design's navy "key phrase" emphasis.
 */

export interface ResumeConfig {
  /** Optional label for the target offer, used in the output filename. */
  target?: string;

  /**
   * Which template (a `templates/<name>.html` file) to render with. Defaults
   * to "classic". Run `--list` to see all available templates. A CLI
   * `--template` flag overrides this.
   */
  template?: string;

  /** Per-config style token overrides, deep-merged over the default theme. */
  theme?: DeepPartial<Theme>;

  basics: Basics;
  summary?: string;
  /** Career-level metric tiles (not tied to a single job). */
  metrics?: Metric[];
  skills?: SkillGroup[];
  experience?: Job[];
  /** "Key Achievements" rows (v2 design). */
  achievements?: Achievement[];
  /** Talks / writing. */
  speaking?: Speaking[];
  projects?: Project[];
  education?: Education[];
  languages?: Language[];
  /** Small, light footnote at the very bottom (e.g. a GDPR/RODO consent clause). */
  consent?: string;
}

export interface Basics {
  name: string;
  /** Legacy field; used as a fallback for `headline` if the latter is absent. */
  title?: string;
  /** Role line shown under the name (per-offer swap zone). */
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  /** Path to a headshot (relative to and contained within the config directory). */
  photo?: string;
  /** Toggle the header photo on/off per offer. Defaults to false. */
  showPhoto?: boolean;
  /** Freeform links: LinkedIn, GitHub, website, etc. */
  links?: Link[];
}

export interface Link {
  label: string;
  url: string;
}

export interface Metric {
  /** Big number, e.g. "8+". */
  value: string;
  /** Bold caption, e.g. "Years Experience". */
  label: string;
  /** Small sub-caption, e.g. "Full-stack development". */
  sub?: string;
}

export interface SkillGroup {
  /** e.g. "Languages", "Frontend", "AI / Data". */
  category: string;
  items: string[];
}

export interface Job {
  company: string;
  role: string;
  /** Freeform, e.g. "Oct 2023 – present". */
  period?: string | number;
  location?: string;
  /** Bullet points (support `**bold**`). */
  highlights?: string[];
}

export interface Achievement {
  /** Named icon from the theme's icon set (e.g. "lightning"). Optional. */
  icon?: string;
  title: string;
  /** Supports `**bold**` for the metric phrase. */
  description: string;
}

export interface Speaking {
  title: string;
  venue?: string;
  location?: string;
  year?: string | number;
}

export interface Project {
  name: string;
  description?: string;
  url?: string;
  highlights?: string[];
}

export interface Education {
  institution: string;
  degree?: string;
  period?: string | number;
}

export interface Language {
  name: string;
  level?: string;
}

/* --------------------------------------------------------------------------
 * Theme (style tokens). Global defaults live in theme.ts; a template sidecar
 * and config may override or extend them. Templates read the resolved Theme.
 * ------------------------------------------------------------------------ */

export interface Theme {
  /** Template-owned SVG path fragments keyed by helper name. */
  icons: Record<string, string>;
  colors: {
    [key: string]: string;
    /** Name, section headers, job titles, page-2 band. */
    navy: string;
    /** Header rule, tile numbers, category labels, links. */
    orange: string;
    /** Soft orange tint behind achievement icons (rgba/hex). */
    orangeSoft: string;
    /** Summary + body copy. */
    ink: string;
    /** Experience bullet text. */
    inkAlt: string;
    /** Contact line, company names, achievement descriptions. */
    slate: string;
    /** Dates, locations (italic). */
    greyMeta: string;
    /** Tile sub-labels. */
    tileSub: string;
    /** Section-header underline, tile borders. */
    hairline: string;
    /** Vertical separators in the contact line. */
    dividerPipe: string;
    /** "continues on page 2" footnote. */
    muted: string;
    /** Screen-only desk background outside the page. */
    desk: string;
    /** Page background. */
    page: string;
  };
  fonts: {
    [key: string]: string;
    /** Primary UI/body family (CSS font stack, for HTML/PDF). */
    primary: string;
    /** Mono family (e.g. speaking years). */
    mono: string;
    /** Google Fonts href to load `primary`+`mono`, or "" to skip. */
    googleFontsHref: string;
  };
  /** Layout constants (px). */
  layout: {
    [key: string]: number;
    /** A4 width at 96dpi. */
    pageWidth: number;
    /** A4 height at 96dpi (used as the hard per-page limit by the paginator). */
    pageHeight: number;
    /** Top margin inside each page. */
    padTop: number;
    /** Bottom margin inside each page. */
    padBottom: number;
    /** Left/right margin inside each page. */
    sidePadding: number;
    accentRule: number;
    radius: number;
  };
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
