import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "cv-package-"));
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run with npm run test:package");
try {
  mkdirSync("dist", { recursive: true });
  writeFileSync("dist/stale-build-sentinel.js", 'throw new Error("stale");');
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [npm, "pack", "--json", "--pack-destination", dir],
      { encoding: "utf8" },
    ),
  );
  const files = result[0].files.map((f) => f.path);
  assert.ok(!files.includes("dist/stale-build-sentinel.js"));
  assert.ok(files.includes("dist/cli.js"));
  assert.ok(files.includes("schema/resume.schema.json"));
  assert.ok(files.includes("templates/classic/interface.json"));
  assert.ok(files.includes("templates/classic/interface.md"));
  assert.ok(files.includes("templates/classic/scaffold.yaml"));
  assert.ok(files.includes("templates/nice-navy/interface.json"));
  assert.ok(files.includes("templates/nice-navy/interface.md"));
  assert.ok(files.includes("templates/nice-navy/scaffold.yaml"));
  for (const f of ["template.html", "interface.json", "interface.md", "scaffold.yaml", "theme.json"])
    assert.ok(files.includes(`templates/plain/${f}`), `missing templates/plain/${f}`);
  assert.ok(files.includes("dist/api.js"));
  assert.ok(files.includes("fonts/inter/inter-latin.woff2") && files.includes("fonts/inter/OFL.txt"));
  assert.ok(files.includes("dist/api.d.ts"));
  assert.ok(files.includes("scripts/init-career-vault.mjs"));
  assert.ok(
    files.includes("scaffolds/career-vault/.agents/skills/apply-to-job/SKILL.md"),
  );
  assert.ok(files.includes("scaffolds/career-vault/career-vault.yaml"));
  assert.ok(files.includes("scaffolds/career-vault/gitignore.template"));
  assert.ok(files.includes("scaffolds/career-vault/cvs-guide.template.md"));
  assert.ok(
    files.every((f) =>
      /^(dist\/|templates\/|fonts\/|schema\/|scaffolds\/career-vault\/|scripts\/init-career-vault.mjs$|configs\/example.yaml$|docs\/(templates.md|classic-preview.png|nice-navy-preview.png|plain-preview.png)$|prompts\/(fill-config.md|design-template.md)$|CONTRIBUTING.md$|SECURITY.md$|CHANGELOG.md$|package.json$|README.md$|LICENSE$)/.test(
        f,
      ),
    ),
    files.join("\n"),
  );
  const install = join(dir, "install");
  mkdirSync(install);
  execFileSync(
    process.execPath,
    [
      npm,
      "install",
      "--prefix",
      install,
      join(dir, result[0].filename),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { stdio: "pipe" },
  );
  const bin = join(install, "node_modules", "@korczas", "cv-generator", "dist", "cli.js");
  // The public API resolves through package exports from an installed copy.
  const apiCheck = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { renderFile, listTemplates } from "@korczas/cv-generator"; const r = renderFile(${JSON.stringify(resolve("configs/example.yaml"))}, { template: "plain", paper: "letter" }); console.log(listTemplates().join(",") + " " + r.paper);`,
    ],
    { cwd: install, encoding: "utf8" },
  );
  assert.equal(apiCheck.trim(), "classic,nice-navy,plain letter");
  const config = resolve("configs/example.yaml");
  const out = join(dir, "sample");
  execFileSync(process.execPath, [bin, config, "--format", "html", "-o", out], {
    cwd: dir,
  });
  assert.match(readFileSync(out + ".html", "utf8"), /Jane Doe/);
  assert.ok(
    existsSync(
      join(
        install,
        "node_modules",
        ".bin",
        process.platform === "win32" ? "cv-gen.cmd" : "cv-gen",
      ),
    ),
  );
  console.log(
    "PASS — packed executable, schema, templates and isolated installation",
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
