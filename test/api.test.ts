/** Programmatic API: renderFile parity with the CLI path, paper option, and relocatable assets. */
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { listTemplates, PAPERS, renderFile, setAssetRoot } from "../src/api.js";

const configPath = resolve("configs/example.yaml");

const a4 = renderFile(configPath);
assert.equal(a4.templateId, "classic");
assert.equal(a4.paper, "a4");
assert.match(a4.html, /@page\s*\{\s*size:\s*A4;/);

const letter = renderFile(configPath, { template: "plain", paper: "letter" });
assert.equal(letter.templateId, "plain");
assert.equal(letter.paper, "letter");
assert.match(letter.html, /@page\s*\{\s*size:\s*letter;/);
assert.deepEqual(PAPERS, ["a4", "letter"]);
assert.throws(() => renderFile(configPath, { paper: "a5" as never }), /Invalid paper "a5"/);

const plainFromPackage = renderFile(configPath, { template: "plain" }).html;

// Relocated assets: an embedder copies templates/ and schema/ elsewhere and points the engine there.
const root = mkdtempSync(join(tmpdir(), "cv-assets-"));
try {
  cpSync(resolve("templates"), join(root, "templates"), { recursive: true });
  cpSync(resolve("schema"), join(root, "schema"), { recursive: true });
  rmSync(join(root, "templates", "nice-navy"), { recursive: true });
  setAssetRoot(root);
  assert.deepEqual(listTemplates(), ["classic", "plain"]);
  assert.equal(
    renderFile(configPath, { template: "plain" }).html,
    plainFromPackage,
    "relocated assets render identically",
  );
  assert.throws(() => renderFile(configPath, { template: "nice-navy" }), /Unknown template "nice-navy"/);
} finally {
  setAssetRoot(resolve("."));
  rmSync(root, { recursive: true, force: true });
}
assert.deepEqual(listTemplates(), ["classic", "nice-navy", "plain"]);

console.log("PASS — API renderFile, paper option and relocatable assets.");
