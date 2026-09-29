#!/usr/bin/env node
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadConfig } from "./loadConfig.js";
import {
  DEFAULT_TEMPLATE,
  listTemplates,
  loadTemplateTheme,
  renderCv,
} from "./render.js";
import { resolveTheme } from "./theme.js";

/** Local preview; reload the config, template, and theme on every request. */
export function createPreviewServer(
  configPath: string,
  templateOverride?: string,
) {
  const absoluteConfigPath = resolve(configPath);
  return createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    if (
      !/^(?:127\.0\.0\.1|localhost|\[::1\])(?::[0-9]+)?$/.test(
        request.headers.host ?? "",
      )
    ) {
      response.writeHead(403);
      response.end("Only loopback hosts are allowed");
      return;
    }
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("Method not allowed");
      return;
    }

    let url: URL;
    try {
      url = new URL(request.url ?? "/", "http://localhost");
    } catch {
      response.writeHead(400);
      response.end("Invalid URL");
      return;
    }
    if (url.pathname !== "/") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    try {
      const config = loadConfig(absoluteConfigPath);
      const template =
        url.searchParams.get("template") ??
        templateOverride ??
        config.template ??
        DEFAULT_TEMPLATE;
      if (!listTemplates().includes(template)) {
        response.writeHead(404);
        response.end(
          `Unknown template "${template}". Available: ${listTemplates().join(", ")}`,
        );
        return;
      }
      const theme = resolveTheme(loadTemplateTheme(template), config.theme);
      const html = renderCv(
        config,
        theme,
        dirname(absoluteConfigPath),
        template,
      );
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
    } catch (error) {
      response.writeHead(500);
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      template: { type: "string", short: "t" },
      port: { type: "string", short: "p", default: "3000" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      "Usage: npm run serve -- [config.yaml] [-t template] [-p port]",
    );
    return;
  }
  if (positionals.length > 1)
    throw new Error("Expected at most one config path.");
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }
  const configPath = positionals[0] ?? "configs/example.yaml";
  loadConfig(configPath);
  if (values.template && !listTemplates().includes(values.template)) {
    throw new Error(
      `Unknown template "${values.template}". Available: ${listTemplates().join(", ")}`,
    );
  }
  const server = createPreviewServer(configPath, values.template);
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`CV preview: http://127.0.0.1:${port} (${configPath})`);
    console.log(
      "Refresh the browser after editing the config or template. Press Ctrl+C to stop.",
    );
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
