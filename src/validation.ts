import { readFileSync } from "node:fs";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import { schemaPath } from "./paths.js";
import { paperOf } from "./theme.js";
import type { EngineConfig, Theme, DeepPartial } from "./types.js";

let compiled:
  | { engine: ValidateFunction; theme: ValidateFunction }
  | undefined;

/** Compile lazily so embedders can call `setAssetRoot` before first use. */
function checks() {
  if (!compiled) {
    const schema = JSON.parse(readFileSync(schemaPath(), "utf8"));
    const ajv = new Ajv({ allErrors: true });
    compiled = {
      engine: ajv.compile({
        type: "object",
        properties: {
          target: schema.properties.target,
          language: schema.properties.language,
          template: schema.properties.template,
          theme: schema.properties.theme,
        },
        definitions: { theme: schema.definitions.theme },
      }),
      theme: ajv.compile(schema.definitions.theme),
    };
  }
  return compiled;
}

export function reportValidation(
  check: { errors?: ErrorObject[] | null },
  label: string,
): never {
  throw new Error(
    `${label}: ${check.errors
      ?.map((e) => {
        const base = e.instancePath.slice(1).replaceAll("/", ".");
        const child =
          (e.params.missingProperty as string | undefined) ??
          (e.params.additionalProperty as string | undefined);
        const path = [base, child].filter(Boolean).join(".") || "root";
        return `${path} ${e.message}`;
      })
      .join("; ")}`,
  );
}

/** Icons are inert SVG primitives, not arbitrary XML/HTML. */
function validateIcon(value: string, label: string) {
  const tags =
    value.match(
      /<(?:path|circle|rect|line|polyline|polygon|ellipse)\s+[^<>]*\/>/g,
    ) ?? [];
  if (tags.join("") !== value.replace(/>\s+</g, "><").trim())
    throw new Error(`${label}: use self-closing SVG primitives only`);
  for (const tag of tags) {
    const body = tag.replace(/^<\w+\s+/, "").replace(/\/>$/, "");
    const attrs = [...body.matchAll(/([a-zA-Z-]+)="([^"]*)"\s*/g)];
    if (
      attrs
        .map((a) => a[0])
        .join("")
        .trim() !== body.trim()
    )
      throw new Error(`${label}: invalid SVG attributes`);
    for (const [, key, val] of attrs) {
      if (
        ![
          "d",
          "cx",
          "cy",
          "r",
          "x",
          "y",
          "x1",
          "x2",
          "y1",
          "y2",
          "width",
          "height",
          "rx",
          "ry",
          "points",
          "fill",
          "stroke",
          "stroke-width",
          "stroke-linecap",
          "stroke-linejoin",
          "fill-rule",
          "clip-rule",
          "opacity",
        ].includes(key) ||
        !/^[a-zA-Z0-9 .,+#%-]*$/.test(val)
      ) {
        throw new Error(`${label}: unsafe SVG attribute ${key}`);
      }
    }
  }
}

export function validateTheme(
  value: unknown,
  label = "theme",
): asserts value is DeepPartial<Theme> {
  const checkTheme = checks().theme;
  if (!checkTheme(value)) reportValidation(checkTheme, label);
  const theme = value as DeepPartial<Theme>;
  for (const [key, icon] of Object.entries(theme.icons ?? {}))
    validateIcon(icon!, `${label}.icons.${key}`);
  for (const [key, font] of Object.entries(theme.fonts ?? {})) {
    if (key === "embed") {
      if (font !== "" && font !== "inter")
        throw new Error(`${label}.fonts.embed must be "inter" or empty`);
    } else if (key === "googleFontsHref") {
      if (font === "") continue;
      let url: URL;
      try {
        url = new URL(font!);
      } catch {
        throw new Error(
          `${label}.fonts.googleFontsHref must be a Google Fonts HTTPS CSS URL or empty`,
        );
      }
      if (
        url.origin !== "https://fonts.googleapis.com" ||
        !["/css", "/css2"].includes(url.pathname) ||
        url.username ||
        url.password
      )
        throw new Error(
          `${label}.fonts.googleFontsHref must be a Google Fonts HTTPS CSS URL or empty`,
        );
    } else if (!/^[\p{L}\p{N}\s'",._-]+$/u.test(font!))
      throw new Error(`${label}.fonts.${key}: invalid font stack`);
  }
}

export function validateLayout(theme: Theme): void {
  const l = theme.layout;
  paperOf(theme);
  if (
    l.padTop + l.padBottom > l.pageHeight - 100 ||
    l.sidePadding * 2 > l.pageWidth - 100 ||
    (l.sidebarWidth !== undefined &&
      (l.sidebarWidth < 100 ||
        l.sidebarWidth + 2 * l.sidePadding > l.pageWidth - 100))
  ) {
    throw new Error(
      "theme.layout: margins/columns must leave at least 100px of content space",
    );
  }
}

export function validateConfig(
  value: unknown,
  label = "Config",
): asserts value is EngineConfig {
  const checkEngineConfig = checks().engine;
  if (!checkEngineConfig(value)) reportValidation(checkEngineConfig, label);
  const config = value as EngineConfig;
  if (config.theme) validateTheme(config.theme, `${label}.theme`);
}
