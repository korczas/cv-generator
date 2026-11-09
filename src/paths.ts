import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Root folder that contains `templates/` and `schema/`. Defaults to the package
 * root. Bundlers and embedders (for example an agent skill that ships the
 * engine as one file) call `setAssetRoot` with the folder holding those assets.
 */
let assetRoot = fileURLToPath(new URL("../", import.meta.url));

export function setAssetRoot(dir: string): void {
  assetRoot = dir;
}

export function templatesDir(): string {
  return join(assetRoot, "templates");
}

export function schemaPath(): string {
  return join(assetRoot, "schema", "resume.schema.json");
}
