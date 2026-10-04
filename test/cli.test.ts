import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "cv-cli-"));
const cli = resolve("src/cli.ts");
const config = join(dir, "cv.yaml");
const customName = `test-cli-${process.pid}`;
const customDir = resolve("templates", customName);
const customMarkup = resolve(customDir, "template.html");
const customInterface = resolve(customDir, "interface.json");
const customHumanInterface = resolve(customDir, "interface.md");
const customScaffold = resolve(customDir, "scaffold.yaml");
writeFileSync(config, 'basics: {name: "李明"}');
const run = (...args: string[]) =>
  spawnSync(
    process.execPath,
    ["--import", resolve("node_modules/tsx/dist/loader.mjs"), cli, ...args],
    { cwd: dir, encoding: "utf8" },
  );
try {
  assert.equal(run("--help").status, 0);
  assert.match(run("--version").stdout, /0\.3\.0/);
  for (const args of [
    [config, "-t"],
    [config, "-o"],
    [config, "--format", "bad"],
    [config, "--unknown"],
  ])
    assert.notEqual(run(...args).status, 0);
  assert.equal(run(config, "--format", "html").status, 0);
  assert.ok(existsSync(join(dir, "output", "李明-classic.html")));
  assert.match(run(config, "--format", "html").stderr, /already exists/);
  assert.equal(run(config, "--format", "html", "--force").status, 0);
  const genericConfig = join(dir, "generic.yaml");
  writeFileSync(genericConfig, "novel: Custom shape");
  mkdirSync(customDir);
  writeFileSync(customMarkup, "<!DOCTYPE html><p>{{novel}}</p>");
  writeFileSync(
    customInterface,
    JSON.stringify({
      type: "object",
      additionalProperties: false,
      properties: { novel: { type: "string" } },
      required: ["novel"],
    }),
  );
  writeFileSync(customHumanInterface, "# Custom interface\n");
  writeFileSync(customScaffold, "novel: Placeholder\n");
  assert.equal(
    run(genericConfig, "--template", customName, "--format", "html").status,
    0,
  );
  assert.ok(existsSync(join(dir, "output", `generic-${customName}.html`)));
  console.log(
    "PASS — CLI help, arguments, Unicode filenames and overwrite protection",
  );
} finally {
  rmSync(customDir, { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
}
