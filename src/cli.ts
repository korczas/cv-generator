#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { basename, dirname, join } from "node:path";
import { renderFile } from "./api.js";
import { htmlToPdf } from "./pdf.js";
import { DEFAULT_TEMPLATE, listTemplates } from "./render.js";
import { PAPERS, type Paper } from "./theme.js";

/*
 * Usage:
 *   npm run generate -- <config.yaml> [-o <output>] [-t <template>] [--format pdf|html|both] [--paper a4|letter]
 *   npm run generate -- --list            # list available templates
 *
 * Template resolution order: -t/--template flag > config.template > "classic".
 * If no -o/--output is given, writes ./output/<name>[-<target>]-<template>.<ext>.
 */

const FORMATS = ["pdf", "html", "both"] as const;
type Format = (typeof FORMATS)[number];

function slug(s: string): string {
  return (
    s
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "resume"
  );
}

function printTemplates() {
  const templates = listTemplates();
  console.log("Available templates:\n");
  for (const id of templates) {
    const tag = id === DEFAULT_TEMPLATE ? " (default)" : "";
    console.log(`  ${id}${tag}`);
  }
}

function printUsage() {
  console.error(
    "Usage: npm run generate -- <config.yaml> [-o <output>] [-t <template>] [--format pdf|html|both] [--paper a4|letter]\n" +
      "       npm run generate -- --list",
  );
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      template: { type: "string", short: "t" },
      output: { type: "string", short: "o" },
      format: { type: "string", default: "pdf" },
      list: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      force: { type: "boolean" },
      offline: { type: "boolean" },
      paper: { type: "string" },
    },
  });
  if (values.help) {
    printUsage();
    console.log(
      "Options: --help --version --list --offline --paper a4|letter --force (replace existing output)",
    );
    return;
  }
  if (values.version) {
    console.log(
      JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
      ).version,
    );
    return;
  }
  if (values.list) {
    printTemplates();
    return;
  }
  const format = values.format as Format;
  if (!FORMATS.includes(format))
    throw new Error("Invalid --format. Expected pdf, html, or both.");
  const [configPath] = positionals;
  if (positionals.length !== 1) {
    printUsage();
    throw new Error("Expected one YAML config path");
  }
  const templateFlag = values.template;
  const outArg = values.output;
  if (outArg !== undefined && !outArg.trim())
    throw new Error("--output must not be empty");
  if (values.paper !== undefined && !PAPERS.includes(values.paper as Paper))
    throw new Error(`Invalid --paper. Expected ${PAPERS.join(" or ")}.`);
  const { html, config, templateId, paper } = renderFile(configPath, {
    template: templateFlag,
    paper: values.paper as Paper | undefined,
    offline: values.offline,
  });

  let outBase = outArg;
  if (outBase) {
    outBase = outBase.replace(/\.(pdf|html)$/i, "");
  } else {
    const basics =
      config.basics &&
      typeof config.basics === "object" &&
      !Array.isArray(config.basics)
        ? (config.basics as Record<string, unknown>)
        : undefined;
    const configuredName =
      basics && typeof basics.name === "string" ? basics.name : undefined;
    const configFilename = basename(configPath).replace(/\.(?:ya?ml)$/i, "");
    const parts = [slug(configuredName ?? configFilename)];
    if (config.target) parts.push(slug(config.target));
    parts.push(templateId);
    outBase = join("output", parts.join("-"));
  }

  const extensions = format === "both" ? ["html", "pdf"] : [format];
  for (const ext of extensions) {
    if (!values.force && existsSync(`${outBase}.${ext}`))
      throw new Error(
        `Output already exists: ${outBase}.${ext}. Use --force to replace it.`,
      );
  }
  // Render both formats before writing either so a PDF error cannot leave half a result.
  const pdf = format !== "html" ? await htmlToPdf(html, paper) : undefined;
  mkdirSync(dirname(outBase), { recursive: true });
  for (const ext of extensions) {
    const outPath = `${outBase}.${ext}`;
    writeFileSync(outPath, ext === "html" ? html : pdf!, {
      flag: values.force ? "w" : "wx",
    });
    console.log(
      `Generated ${outPath}  [template: ${templateId}]  from ${basename(configPath)}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
