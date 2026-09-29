import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "cv-cli-"));
const cli = resolve("src/cli.ts");
const config = join(dir, "cv.yaml");
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
  console.log(
    "PASS — CLI help, arguments, Unicode filenames and overwrite protection",
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
