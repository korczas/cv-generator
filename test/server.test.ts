import { get } from "node:http";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPreviewServer } from "../src/server.js";

const directory = mkdtempSync(join(tmpdir(), "cv-preview-"));
const configPath = join(directory, "resume.yaml");
writeFileSync(configPath, "basics:\n  name: Preview Person\n");
const server = createPreviewServer(configPath);

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const badHost = await new Promise<number | undefined>((resolve, reject) =>
    get(base, { headers: { Host: "evil.example" } }, (res) => {
      res.resume();
      resolve(res.statusCode);
    }).on("error", reject),
  );
  assert.equal(badHost, 403);
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type")!, /text\/html/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(await response.text(), /Preview Person/);

  const alternate = await fetch(`${base}/?template=nice-navy`);
  assert.equal(alternate.status, 200);
  assert.match(await alternate.text(), /data-page-content/);
  assert.equal((await fetch(`${base}/?template=../../package`)).status, 404);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
  const post = await fetch(base, { method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  const head = await fetch(base, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  writeFileSync(configPath, "basics:\n  name: Updated Person\n");
  assert.match(await (await fetch(base)).text(), /Updated Person/);
  writeFileSync(configPath, "basics: [invalid");
  assert.equal((await fetch(base)).status, 500);
  writeFileSync(configPath, "basics:\n  name: Recovered Person\n");
  assert.match(await (await fetch(base)).text(), /Recovered Person/);
  console.log(
    "PASS — preview rendering, template selection, reloads, and error recovery.",
  );
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  rmSync(directory, { recursive: true, force: true });
}
