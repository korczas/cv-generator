import Handlebars from "handlebars";
import { registerHelpers } from "../src/helpers.js";

const failures: string[] = [];
function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

const hb = Handlebars.create();
registerHelpers(hb);

const icons = {
  dot: '<circle cx="12" cy="12" r="4"/>',
  phone: '<path d="M1 1h2"/>',
  mail: '<path d="M2 2h3"/>',
  "map-pin": '<path d="M3 3h4"/>',
  linkedin: '<path d="M4 4h5"/>',
  globe: '<path d="M5 5h6"/>',
  target: '<circle cx="12" cy="12" r="9"/>',
};

function icon(name: string): string {
  return hb.compile(`{{{icon "${name}"}}}`)({ theme: { icons } });
}

const dot = icon("dot");
for (const name of ["phone", "mail", "map-pin", "linkedin", "globe"]) {
  const svg = icon(name);
  check(
    svg.includes('stroke="currentColor"'),
    `${name} should inherit currentColor`,
  );
  check(svg.includes('aria-hidden="true"'), `${name} should be decorative`);
  check(
    svg.includes(`data-icon="${name}"`),
    `${name} should identify its rendered glyph`,
  );
  check(svg !== dot, `${name} should not fall back to dot`);
}

check(icon("unknown") === dot, "unknown icons should fall back to dot");
check(
  !icon("target").includes("var(--orange)"),
  "target should not hardcode orange",
);

if (failures.length) {
  console.error(
    `FAIL — ${failures.length} helper issue(s):\n - ${failures.join("\n - ")}`,
  );
  process.exit(1);
}

console.log("PASS — semantic icons inherit their container color.");
