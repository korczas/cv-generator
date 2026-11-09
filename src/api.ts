/**
 * Programmatic API. The CLI and embedders (for example the FactFit CV skill)
 * share `renderFile`, so both produce identical HTML for the same input.
 */
import { dirname, resolve } from "node:path";
import { loadConfig } from "./loadConfig.js";
import {
  DEFAULT_TEMPLATE,
  listTemplates,
  loadTemplateTheme,
  renderCv,
} from "./render.js";
import { paperOf, paperTheme, PAPERS, resolveTheme, type Paper } from "./theme.js";
import type { EngineConfig } from "./types.js";

export { setAssetRoot } from "./paths.js";
export { DEFAULT_TEMPLATE, listTemplates, loadTemplateTheme, renderCv } from "./render.js";
export { loadConfig } from "./loadConfig.js";
export { PAPER, PAPERS, paperOf, paperTheme, resolveTheme } from "./theme.js";
export type { Paper } from "./theme.js";
export type { EngineConfig, ResumeConfig, Theme } from "./types.js";

export interface RenderOptions {
  /** Overrides the config's `template`; falls back to "classic". */
  template?: string;
  /** Overrides the paper selected by the config theme; default A4. */
  paper?: Paper;
  /** Drop an explicitly configured Google Fonts URL. */
  offline?: boolean;
}

export interface RenderResult {
  html: string;
  config: EngineConfig;
  templateId: string;
  paper: Paper;
}

/** Load a YAML config from disk and render it to a self-paginating HTML document. */
export function renderFile(configPath: string, options: RenderOptions = {}): RenderResult {
  if (options.paper !== undefined && !PAPERS.includes(options.paper))
    throw new Error(`Invalid paper "${options.paper}". Expected ${PAPERS.join(" or ")}.`);
  const config = loadConfig(configPath);
  const templateId = options.template ?? config.template ?? DEFAULT_TEMPLATE;
  const theme = resolveTheme(
    loadTemplateTheme(templateId),
    config.theme,
    options.paper ? paperTheme(options.paper) : undefined,
    options.offline ? { fonts: { googleFontsHref: "" } } : undefined,
  );
  const html = renderCv(config, theme, dirname(resolve(configPath)), templateId);
  return { html, config, templateId, paper: paperOf(theme) };
}

/** Convenience re-export for callers that only need the list. */
export const templates = (): string[] => listTemplates();
