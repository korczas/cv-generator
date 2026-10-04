import {
  reportValidation,
  validateConfig,
  validateTheme,
  validateLayout,
} from "./validation.js";
import Ajv, { type ValidateFunction } from "ajv";
import Handlebars from "handlebars";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { photoDataUri, paginationScript, registerHelpers } from "./helpers.js";
import type {
  DeepPartial,
  EngineConfig,
  Theme,
} from "./types.js";

export const DEFAULT_TEMPLATE = "classic";

const TEMPLATES_DIR = fileURLToPath(new URL("../templates/", import.meta.url));

function markupTemplateIds(): string[] {
  return readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        (existsSync(join(TEMPLATES_DIR, entry.name, "template.hbs")) ||
          existsSync(join(TEMPLATES_DIR, entry.name, "template.html"))),
    )
    .map((entry) => entry.name)
    .sort();
}

/** List complete template bundles, relative to this module, not `cwd`. */
export function listTemplates(): string[] {
  return markupTemplateIds().filter(
    (id) =>
      existsSync(join(TEMPLATES_DIR, id, "interface.json")) &&
      existsSync(join(TEMPLATES_DIR, id, "interface.md")) &&
      existsSync(join(TEMPLATES_DIR, id, "scaffold.yaml")),
  );
}

/** Parse the same safe theme schema used for YAML overrides. */
export function parseTemplateTheme(
  raw: string,
  templateName: string,
): DeepPartial<Theme> {
  const label = `Invalid template theme "${templateName}/theme.json"`;
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
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(templateName)) {
    throw new Error(
      `Unknown template "${templateName}". Available: ${listTemplates().join(", ")}`,
    );
  }
  if (markupTemplateIds().includes(templateName)) {
    if (!existsSync(join(TEMPLATES_DIR, templateName, "interface.json")))
      throw new Error(
        `Template "${templateName}" is missing required interface "templates/${templateName}/interface.json"`,
      );
    if (!existsSync(join(TEMPLATES_DIR, templateName, "interface.md")))
      throw new Error(
        `Template "${templateName}" is missing required human-readable interface "templates/${templateName}/interface.md"`,
      );
    if (!existsSync(join(TEMPLATES_DIR, templateName, "scaffold.yaml")))
      throw new Error(
        `Template "${templateName}" is missing required CV scaffold "templates/${templateName}/scaffold.yaml"`,
      );
    return;
  }
  throw new Error(
    `Unknown template "${templateName}". Available: ${listTemplates().join(", ")}`,
  );
}

function hasExternalRef(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasExternalRef);
  return Object.entries(value).some(
    ([key, child]) =>
      (key === "$ref" && typeof child === "string" && !child.startsWith("#")) ||
      hasExternalRef(child),
  );
}

/** Parse and compile a trusted template's self-contained Draft-07 interface. */
export function parseTemplateInterface(
  raw: string,
  templateName: string,
): ValidateFunction {
  const filename = `${templateName}/interface.json`;
  const label = `Invalid template interface "${filename}"`;
  let schema: unknown;
  try {
    schema = JSON.parse(raw);
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
  if (
    !schema ||
    typeof schema !== "object" ||
    Array.isArray(schema) ||
    (schema as { type?: unknown }).type !== "object"
  )
    throw new Error(`${label}: root schema must have type "object"`);
  if (hasExternalRef(schema))
    throw new Error(`${label}: external $ref values are not supported`);
  try {
    return new Ajv({ allErrors: true, strict: false }).compile(schema);
  } catch (error) {
    throw new Error(
      `${label}: invalid JSON Schema: ${error instanceof Error ? error.message : error}`,
    );
  }
}

/** Load and compile templates/<name>/interface.json. */
export function loadTemplateInterface(templateName: string): ValidateFunction {
  assertTemplate(templateName);
  const path = join(TEMPLATES_DIR, templateName, "interface.json");
  return parseTemplateInterface(readFileSync(path, "utf8"), templateName);
}

export function validateTemplateConfig(
  value: unknown,
  templateName: string,
): asserts value is EngineConfig {
  const check = loadTemplateInterface(templateName);
  if (!check(value))
    reportValidation(
      check,
      `Config for template "${templateName}" (${templateName}/interface.json)`,
    );
}

/** Load optional template defaults from templates/<name>/theme.json. */
export function loadTemplateTheme(
  templateName: string,
): DeepPartial<Theme> | undefined {
  assertTemplate(templateName);
  const path = join(TEMPLATES_DIR, templateName, "theme.json");
  if (!existsSync(path)) return undefined;
  return parseTemplateTheme(readFileSync(path, "utf8"), templateName);
}

interface ContactPart {
  text: string;
  href?: string;
  icon: string;
}

/** Build the Handlebars render context: config content + resolved theme + derived/precomputed fields. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildContext(config: EngineConfig, theme: Theme, baseDir: string) {
  const basics = isRecord(config.basics) ? config.basics : undefined;

  const displayHeadline = basics
    ? basics.headline ?? basics.title ?? ""
    : undefined;

  let photoUri: string | null = null;
  if (basics?.showPhoto && typeof basics.photo === "string") {
    photoUri = photoDataUri(basics.photo, baseDir);
  }

  const contactParts: ContactPart[] = [];
  if (typeof basics?.email === "string") {
    contactParts.push({
      text: basics.email,
      href: `mailto:${basics.email}`,
      icon: "mail",
    });
  }
  if (typeof basics?.phone === "string") {
    contactParts.push({
      text: basics.phone,
      href: `tel:${basics.phone.replace(/\s+/g, "")}`,
      icon: "phone",
    });
  }
  for (const link of Array.isArray(basics?.links) ? basics.links : []) {
    if (!isRecord(link) || typeof link.label !== "string" || typeof link.url !== "string") continue;
    const isLinkedIn = /linkedin/i.test(`${link.label} ${link.url}`);
    contactParts.push({
      text: link.label,
      href: link.url,
      icon: isLinkedIn ? "linkedin" : "globe",
    });
  }
  if (typeof basics?.location === "string")
    contactParts.push({ text: basics.location, icon: "map-pin" });

  const speaking = Array.isArray(config.speaking) ? config.speaking.map((s) => isRecord(s) ? ({
    ...s,
    subParts: [s.venue, s.location, s.year]
      .filter((v) => v !== undefined && v !== null && `${v}` !== "")
      .map((v) => `${v}`),
  }) : s) : config.speaking;

  const education = Array.isArray(config.education) ? config.education.map((e) => {
    if (!isRecord(e)) return e;
    const metaParts: { text: string; bold?: boolean }[] = [];
    if (typeof e.degree === "string")
      metaParts.push({ text: e.degree, bold: true });
    if (typeof e.institution === "string")
      metaParts.push({ text: e.institution });
    if (e.period) metaParts.push({ text: String(e.period) });
    return { ...e, metaParts };
  }) : config.education;

  const languages = Array.isArray(config.languages) ? config.languages.map((l) => isRecord(l) && typeof l.name === "string" ? ({
    ...l,
    label: l.level ? `${l.name} — ${l.level}` : l.name,
  }) : l) : config.languages;

  return {
    ...config,
    ...(basics
      ? { basics: { ...basics, displayHeadline, photoUri, contactParts } }
      : {}),
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
  config: EngineConfig,
  theme: Theme,
  baseDir: string,
  templateName: string,
): string {
  validateConfig(config);
  validateTemplateConfig(config, templateName);
  validateTheme(theme);
  validateLayout(theme);
  assertTemplate(templateName);
  const hbsPath = join(TEMPLATES_DIR, templateName, "template.hbs");
  const templatePath = existsSync(hbsPath)
    ? hbsPath
    : join(TEMPLATES_DIR, templateName, "template.html");
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
