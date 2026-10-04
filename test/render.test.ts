/**
 * Smoke test for the render pipeline: renders configs/example.yaml through
 * every registered template and asserts the output is well-formed. Run:
 * `npm test`.
 */
import { dirname, join, resolve } from "node:path";
import { loadConfig } from "../src/loadConfig.js";
import { listTemplates, loadTemplateTheme, renderCv } from "../src/render.js";
import { resolveTheme } from "../src/theme.js";

const CONFIG_PATH = resolve("configs/example.yaml");

const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const config = loadConfig(CONFIG_PATH);
const baseDir = dirname(CONFIG_PATH);

const templates = listTemplates();
check(
  templates.includes("classic"),
  `listTemplates() should include "classic", got: ${templates.join(", ")}`,
);

const expectedSections: [string, unknown][] = [
  ["Skills", config.skills],
  ["Experience", config.experience],
  ["Projects", config.projects],
  ["Key Achievements", config.achievements],
  ["Speaking", config.speaking],
  ["Education", config.education],
  ["Languages", config.languages],
];

for (const templateId of templates) {
  const templateScaffoldPath = resolve(
    join("templates", templateId, "scaffold.yaml"),
  );
  const templateScaffold = loadConfig(templateScaffoldPath);
  const scaffoldHtml = renderCv(
    templateScaffold,
    resolveTheme(loadTemplateTheme(templateId), templateScaffold.theme),
    dirname(templateScaffoldPath),
    templateId,
  );
  check(
    scaffoldHtml.includes("<!DOCTYPE html>"),
    `[${templateId}] bundled scaffold should validate and render`,
  );

  const theme = resolveTheme(loadTemplateTheme(templateId), config.theme);
  const html = renderCv(config, theme, baseDir, templateId);

  check(
    html.includes("<!DOCTYPE html>"),
    `[${templateId}] output should include <!DOCTYPE html>`,
  );
  check(
    html.includes(config.basics.name),
    `[${templateId}] output should include the config's basics.name`,
  );
  const styleMatch = html.match(/<style>[\s\S]*?<\/style>/);
  check(
    !styleMatch || !styleMatch[0].includes("&#x27;"),
    `[${templateId}] <style> block should not contain &#x27; (a theme token was interpolated with {{ }} instead of {{{ }}})`,
  );

  if (config.consent) {
    check(
      html.includes("cv-consent"),
      `[${templateId}] output should include the cv-consent holder when config.consent is set`,
    );
  }

  if (templateId === "nice-navy") {
    for (const iconName of ["mail", "phone", "linkedin", "globe", "map-pin"]) {
      check(
        html.includes(`data-icon="${iconName}"`),
        `[nice-navy] should render semantic ${iconName} contact icon`,
      );
    }
  }

  for (const [title, value] of expectedSections) {
    const hasContent = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (!hasContent) continue;
    check(
      html.includes(`data-title="${title}"`),
      `[${templateId}] output should include data-title="${title}" for a populated section`,
    );
  }
}

if (failures.length) {
  console.error(`FAIL — ${failures.length} issue(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `PASS — rendered ${templates.length} template(s) (${templates.join(", ")}) cleanly.`,
);
