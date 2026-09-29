import { loadTemplateTheme, parseTemplateTheme } from "../src/render.js";
import { DEFAULT_THEME, resolveTheme } from "../src/theme.js";

const failures: string[] = [];
function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const niceNavy = loadTemplateTheme("nice-navy");
const classic = loadTemplateTheme("classic");
check(
  niceNavy?.colors?.panel === "#e8e9eb",
  "nice-navy should load its panel token",
);
check(
  niceNavy?.fonts?.heading?.includes("Montserrat") === true,
  "nice-navy should load its heading font",
);
check(
  niceNavy?.layout?.sidebarWidth === 288,
  "nice-navy should load its sidebar width",
);
check(
  niceNavy?.icons?.phone?.includes("path") === true,
  "nice-navy should own semantic icons",
);
check(
  classic?.icons?.lightning?.includes("path") === true,
  "classic should own achievement icons",
);
check(
  classic?.icons?.phone === undefined,
  "classic should not inherit nice-navy contact icons",
);

const resolved = resolveTheme(niceNavy, {
  colors: { navy: "#123456" },
  layout: { sidebarWidth: 300 },
});
check(
  resolved.colors.panel === "#e8e9eb",
  "template-only tokens should survive resolution",
);
check(
  resolved.colors.navy === "#123456",
  "config colors should override template defaults",
);
check(
  resolved.layout.sidebarWidth === 300,
  "config layout should override template defaults",
);
check(
  DEFAULT_THEME.colors.navy === "#092334",
  "global Classic navy should remain unchanged",
);

const custom = parseTemplateTheme(
  JSON.stringify({
    icons: { custom: '<path d="M1 1h2"/>' },
    colors: { customAccent: "#fff" },
    layout: { customGap: 12 },
  }),
  "custom",
);
check(
  custom.icons?.custom?.includes("path") === true,
  "custom icon tokens should be accepted",
);
check(
  custom.colors?.customAccent === "#fff",
  "custom color tokens should be accepted",
);
check(
  custom.layout?.customGap === 12,
  "custom layout tokens should be accepted",
);

for (const [raw, message] of [
  ["{", "invalid JSON"],
  [JSON.stringify({ colors: { navy: 12 } }), "non-string color"],
  [JSON.stringify({ icons: { star: 12 } }), "non-string icon"],
  [JSON.stringify({ layout: { sidebarWidth: "wide" } }), "non-number layout"],
  [JSON.stringify({ spacing: { small: 4 } }), "unknown root group"],
] as const) {
  try {
    parseTemplateTheme(raw, "broken");
    failures.push(`theme parser should reject ${message}`);
  } catch (error) {
    check(
      error instanceof Error && error.message.includes("broken.theme.json"),
      `${message} should report the sidecar name`,
    );
  }
}

check(
  parseTemplateTheme(
    JSON.stringify({
      fonts: {
        googleFontsHref:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap",
      },
    }),
    "fonts",
  ).fonts?.googleFontsHref?.includes("400;700") === true,
  "standard Google Fonts weight URLs should be accepted",
);

if (failures.length) {
  console.error(
    `FAIL — ${failures.length} theme issue(s):\n - ${failures.join("\n - ")}`,
  );
  process.exit(1);
}

console.log("PASS — template theme loading, validation, and precedence hold.");
