import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/loadConfig.js";
import { photoDataUri } from "../src/helpers.js";
import {
  renderCv,
  loadTemplateTheme,
  validateTemplateConfig,
} from "../src/render.js";
import { resolveTheme } from "../src/theme.js";
const dir = mkdtempSync(join(tmpdir(), "cv-config-"));
try {
  const path = join(dir, "cv.yaml");
  for (const [yaml, error] of [
    ["basics: {name: 123}", /basics.name/],
    ["basics: {name: Test, phone: 123}", /basics.phone/],
    ["basics: {name: Test}\neducation: wrong", /education/],
    ['basics: {name: " "}', /basics.name/],
    [
      'basics: {name: Test}\ntheme: {layout: {pageHeight: "1122);alert(1)//"}}',
      /pageHeight/,
    ],
    [
      'basics: {name: Test}\ntheme: {colors: {navy: "</style><script>alert(1)</script>"}}',
      /navy/,
    ],
    [
      JSON.stringify({
        basics: { name: "Test" },
        theme: { icons: { dot: '<image href="x"/>' } },
      }),
      /SVG/,
    ],
    [
      'basics: {name: Test, links: [{label: X, url: "javascript:alert(1)"}]}',
      /url/,
    ],
    ["basics: {name: Test, showPhoto: true}", /photo/],
    ["basics: {name: Test}\nunknown: x", /unknown/],
  ] as const) {
    writeFileSync(path, yaml);
    assert.throws(() => {
      const config = loadConfig(path);
      validateTemplateConfig(config, "classic");
    }, error);
  }
  writeFileSync(
    path,
    "basics: {name: Test}\neducation: [{institution: School, period: 2020}]",
  );
  const loaded = loadConfig(path);
  validateTemplateConfig(loaded, "classic");
  assert.equal((loaded.education as Array<{ period: number }>)[0].period, 2020);
  assert.throws(() => loadTemplateTheme("../package"), /Unknown template/);
  assert.throws(
    () =>
      renderCv(
        { basics: { name: "Test" } },
        resolveTheme(undefined, { layout: { padTop: 1100 } }),
        dir,
        "classic",
      ),
    /margins/,
  );
  writeFileSync(join(dir, "secret.txt"), "NOT_AN_IMAGE");
  assert.throws(() => photoDataUri("secret.txt", dir), /PNG/);
  assert.throws(() => photoDataUri("/tmp/anything", dir), /relative/);
  mkdirSync(join(dir, "child"));
  assert.throws(
    () => photoDataUri("../secret.txt", join(dir, "child")),
    /inside/,
  );
  symlinkSync(join(dir, "secret.txt"), join(dir, "child", "escape.png"));
  assert.throws(() => photoDataUri("escape.png", join(dir, "child")), /inside/);
  assert.throws(() => photoDataUri("missing.png", dir), /Cannot read/);
  writeFileSync(
    join(dir, "photo.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  assert.match(photoDataUri("photo.png", dir), /^data:image\/png;base64,/);
  console.log(
    "PASS — schema, injection, template paths, photo boundaries and numeric periods",
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
