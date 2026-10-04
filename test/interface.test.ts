import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertTemplate,
  listTemplates,
  parseTemplateInterface,
  renderCv,
  validateTemplateConfig,
} from "../src/render.js";
import { resolveTheme } from "../src/theme.js";

const templates = resolve("templates");
const suffix = process.pid;
const customName = `test-custom-${suffix}`;
const incompleteName = `test-incomplete-${suffix}`;
const customDir = resolve(templates, customName);
const incompleteDir = resolve(templates, incompleteName);
const customMarkup = resolve(customDir, "template.html");
const customInterface = resolve(customDir, "interface.json");
const customHumanInterface = resolve(customDir, "interface.md");
const incompleteMarkup = resolve(incompleteDir, "template.html");

try {
  assert.throws(
    () => parseTemplateInterface("{", "broken"),
    /broken\/interface\.json.*invalid JSON/,
  );
  assert.throws(
    () =>
      parseTemplateInterface(
        JSON.stringify({ type: "object", properties: { x: { type: 7 } } }),
        "broken-schema",
      ),
    /broken-schema\/interface\.json.*invalid JSON Schema/,
  );
  assert.throws(
    () =>
      parseTemplateInterface(
        JSON.stringify({ type: "object", $ref: "https://example.test/x" }),
        "external",
      ),
    /external.*external \$ref/,
  );

  mkdirSync(incompleteDir);
  writeFileSync(incompleteMarkup, "{{value}}");
  assert.ok(!listTemplates().includes(incompleteName));
  assert.throws(() => assertTemplate(incompleteName), /missing required interface/);

  mkdirSync(customDir);
  writeFileSync(customMarkup, "<!DOCTYPE html><p>{{novel}}</p>");
  writeFileSync(
    customInterface,
    JSON.stringify({
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      additionalProperties: false,
      properties: { novel: { type: "string" } },
      required: ["novel"],
    }),
  );
  writeFileSync(customHumanInterface, "# Custom interface\n\nRequires `novel`.\n");
  assert.ok(listTemplates().includes(customName));
  const config = { novel: "Template-owned value" };
  validateTemplateConfig(config, customName);
  assert.match(
    renderCv(config, resolveTheme(), templates, customName),
    /Template-owned value/,
  );
  assert.throws(
    () => validateTemplateConfig({ novel: 3 }, customName),
    new RegExp(`${customName}/interface\\.json.*novel.*string`),
  );
  console.log("PASS — template interfaces, bundle discovery, and custom data");
} finally {
  for (const path of [customDir, incompleteDir])
    if (existsSync(path)) rmSync(path, { recursive: true });
}
