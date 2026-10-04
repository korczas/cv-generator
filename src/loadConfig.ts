import { readFileSync, statSync } from "node:fs";
import { parse } from "yaml";
import { validateConfig } from "./validation.js";
import type { EngineConfig } from "./types.js";

/** Read bounded YAML and validate engine-owned fields before template validation. */
export function loadConfig(path: string): EngineConfig {
  if (statSync(path).size > 1024 * 1024)
    throw new Error(`Config at ${path} exceeds 1 MiB`);
  const config: unknown = parse(readFileSync(path, "utf8"), {
    maxAliasCount: 100,
  });
  validateConfig(config, `Config at ${path}`);
  return config;
}
