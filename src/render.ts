import { validateConfig, validateTheme, validateLayout } from "./validation.js";
import Handlebars from "handlebars";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { photoDataUri, paginationScript, registerHelpers } from "./helpers.js";
import type {
  DeepPartial,
  Education,
  Language,
  ResumeConfig,
  Speaking,
  Theme,
} from "./types.js";

export const DEFAULT_TEMPLATE = "classic";

const TEMPLATES_DIR = fileURLToPath(new URL("../templates/", import.meta.url));

/** List available .hbs and .html template ids, relative to this module, not `cwd`. */
export function listTemplates(): string[] {
  return [
    ...new Set(
      readdirSync(TEMPLATES_DIR)
        .filter((f) => /\.(hbs|html)$/.test(f))
        .map((f) => basename(f).replace(/\.(hbs|html)$/, "")),
    ),
  ].sort();
}

/** Parse the same safe theme schema used for YAML overrides. */
export function parseTemplateTheme(
  raw: string,
  templateName: string,
): DeepPartial<Theme> {
  const label = `Invalid template theme "${templateName}.theme.json"`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
  validateTheme(parsed, label);
  return parsed;
}

export function assertTemplate(templateName: string): void {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(templateName) ||
    !listTemplates().includes(templateName)
  ) {
    throw new Error(
      `Unknown template "${templateName}". Available: ${listTemplates().join(", ")}`,
    );
  }
}

/** Load optional template defaults from templates/<name>.theme.json. */
export function loadTemplateTheme(
  templateName: string,
): DeepPartial<Theme> | undefined {
  assertTemplate(templateName);
  const path = `${TEMPLATES_DIR}${templateName}.theme.json`;
  if (!existsSync(path)) return undefined;
  return parseTemplateTheme(readFileSync(path, "utf8"), templateName);
}

interface ContactPart {
  text: string;
  href?: string;
  icon: string;
}

/** Build the Handlebars render context: config content + resolved theme + derived/precomputed fields. */
function buildContext(config: ResumeConfig, theme: Theme, baseDir: string) {
  const basics = config.basics;

  const displayHeadline = basics.headline ?? basics.title ?? "";

  let photoUri: string | null = null;
  if (basics.showPhoto && basics.photo) {
    photoUri = photoDataUri(basics.photo, baseDir);
  }

  const contactParts: ContactPart[] = [];
  if (basics.email) {
    contactParts.push({
      text: basics.email,
      href: `mailto:${basics.email}`,
      icon: "mail",
    });
  }
  if (basics.phone) {
    contactParts.push({
      text: basics.phone,
      href: `tel:${basics.phone.replace(/\s+/g, "")}`,
      icon: "phone",
    });
  }
  for (const link of basics.links ?? []) {
    const isLinkedIn = /linkedin/i.test(`${link.label} ${link.url}`);
    contactParts.push({
      text: link.label,
      href: link.url,
      icon: isLinkedIn ? "linkedin" : "globe",
    });
  }
  if (basics.location)
    contactParts.push({ text: basics.location, icon: "map-pin" });

  const speaking = (config.speaking ?? []).map((s: Speaking) => ({
    ...s,
    subParts: [s.venue, s.location, s.year]
      .filter((v) => v !== undefined && v !== null && `${v}` !== "")
      .map((v) => `${v}`),
  }));

  const education = (config.education ?? []).map((e: Education) => {
    const metaParts: { text: string; bold?: boolean }[] = [];
    if (e.degree) metaParts.push({ text: e.degree, bold: true });
    if (e.institution) metaParts.push({ text: e.institution });
    if (e.period) metaParts.push({ text: String(e.period) });
    return { ...e, metaParts };
  });

  const languages = (config.languages ?? []).map((l: Language) => ({
    ...l,
    label: l.level ? `${l.name} — ${l.level}` : l.name,
  }));

  return {
    ...config,
    basics: { ...basics, displayHeadline, photoUri, contactParts },
    speaking,
    education,
    languages,
    theme,
    pageContentWidth: theme.layout.pageWidth - 2 * theme.layout.sidePadding,
    paginationScript: new Handlebars.SafeString(paginationScript(theme)),
  };
}

/** Render a config with a resolved theme through the named template. Returns the full HTML document string. */
export function renderCv(
  config: ResumeConfig,
  theme: Theme,
  baseDir: string,
  templateName: string,
): string {
  validateConfig(config);
  validateTheme(theme);
  validateLayout(theme);
  assertTemplate(templateName);
  const hbsPath = `${TEMPLATES_DIR}${templateName}.hbs`;
  const templatePath = existsSync(hbsPath)
    ? hbsPath
    : `${TEMPLATES_DIR}${templateName}.html`;
  let source: string;
  try {
    source = readFileSync(templatePath, "utf8");
  } catch {
    throw new Error(
      `Unknown template "${templateName}". Available: ${listTemplates().join(", ")}`,
    );
  }

  const hb = Handlebars.create();
  registerHelpers(hb);

  const template = hb.compile(source, { noEscape: false });
  const context = buildContext(config, theme, baseDir);
  return template(context);
}
