import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/init-career-vault.mjs");
const temp = await mkdtemp(path.join(os.tmpdir(), "cv-generator-vault-"));

const run = spawnSync(process.execPath, [script], { cwd: temp, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr);
assert.match(run.stdout, /git remote add origin <private-repository-url>/);

const vault = path.join(temp, "career-vault");
for (const relative of [
  ".git",
  ".gitignore",
  ".agents/skills/apply-to-job/SKILL.md",
  ".agents/skills/apply-to-job/agents/openai.yaml",
  "README.md",
  "career-vault.yaml",
  "experience.md",
  "opportunities/_template.md",
  "cvs/README.md",
]) {
  assert.equal(spawnSync("test", ["-e", path.join(vault, relative)]).status, 0, `missing ${relative}`);
}

const branch = spawnSync("git", ["branch", "--show-current"], { cwd: vault, encoding: "utf8" });
assert.equal(branch.stdout.trim(), "main");

const marker = path.join(vault, "keep.txt");
await writeFile(marker, "do not change\n");
const secondRun = spawnSync(process.execPath, [script], { cwd: temp, encoding: "utf8" });
assert.notEqual(secondRun.status, 0);
assert.match(secondRun.stderr, /Refusing to overwrite existing path/);
assert.equal(await readFile(marker, "utf8"), "do not change\n");

const ignored = spawnSync("git", ["check-ignore", "career-vault/experience.md"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(ignored.status, 0, "parent repository must ignore career-vault");

console.log("vault init tests passed");
