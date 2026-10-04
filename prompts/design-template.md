# Prompt: design a CV template for cv-generator

Paste this into Claude or v0 after creating a real config with
`prompts/fill-config.md`. The workflow compares 2–3 rendered directions before
authoring the selected production template, required interface, and theme sidecar.

---

I want you to design a Handlebars template for **cv-generator**, a CLI that
renders a YAML resume config into print-ready A4 HTML and PDF. A custom visual
interface and visual theme are delivered as JSON sidecars next to the HTML template.

## Inputs

- Real config path: `configs/<my-config>.yaml`
- Final template name: `<template-name>`
- Optional design-reference screenshot: `ATTACH OR LEAVE BLANK`
- Optional design brief: `PASTE PREFERENCES OR LEAVE BLANK`

The config is the only content source. A screenshot attached to this prompt is a
**style reference only**: infer layout, hierarchy, palette, typography, density,
and spacing, but do not copy its names, employers, text, logos, watermarks, or
other content. If the screenshot is my own resume and I need its content
transcribed, stop and use `prompts/fill-config.md` first.

## Operating mode

- **Claude Code in the cloned repository:** read the real config, create and
  render all candidate templates, let me select one, then write and validate the
  production template.
- **v0, claude.ai, or an Artifact:** use the supplied real content to create 2–3
  labelled standalone illustrative mockups. These mockups are disposable visual
  previews, not cv-generator templates. After I select one, return the separate
  production Handlebars template, interface JSON, and theme JSON for me to save and test in the
  repo. Do not claim to have repository access or to have run `npm` commands.

## Step 0 — confirm the real config

Read `configs/<my-config>.yaml` and summarize:

- which optional sections are present or absent;
- approximate content volume and likely pagination pressure;
- especially long sections or entries;
- whether a photo is enabled and resolvable;
- any malformed-looking shapes that need correction before design.

Do not fall back to `configs/example.yaml` for design content. YAML key order
does not control output order; choose an appropriate fixed section order in the
template based on this real content.

## Step 1 — propose and preview 2–3 directions

Propose 2–3 concise directions, each covering layout, hierarchy, palette,
typography, density, section order, and expected one-page or multi-page behavior.
Frame every direction around the sections and content volume actually present.

Then produce a real visual preview for **every** direction:

- In Claude Code, create lightweight candidates named
  `templates/preview-<slug>-a/template.html`,
  `templates/preview-<slug>-b/template.html`, and so on. Render
  each against the real config to a distinct output with:

  ```bash
  npm run generate -- configs/<my-config>.yaml \
    -t preview-<slug>-a -o output/preview-<slug>-a --format html
  ```

  If candidates use different palettes or fonts, make temporary config copies
  only when testing config-level overrides. Put each candidate's design defaults
  in `templates/preview-<slug>-a/theme.json`; give each candidate a complete
  `templates/preview-<slug>-a/interface.json` matching the real config and an
  `interface.md` summary; never
  overwrite `src/theme.ts`.
- In v0, claude.ai, or an Artifact, create one clearly labelled standalone mockup per
  direction using the real content. Do not present generic wireframes or dummy
  Jane Doe content as previews.

Stop after presenting the previews and wait for me to select or revise a
direction. Do not author the final template before selection. “One page” is a
preference, not a guarantee: never remove real content or make print typography
unreadably small to force a page count.

## Step 2 — author the selected template

After selection, create `templates/<template-name>/` containing `template.html`,
the required machine-readable `interface.json`, human-readable `interface.md`,
and `theme.json`. The theme file contains the template's
palette, fonts, and layout defaults. Never overwrite `src/theme.ts` for one
template. Config `theme:` values are optional user overrides, not the home for
the template's required defaults. Remove or leave clearly identified preview
files according to my preference.
Wrap every optional section in `{{#if}}`; never assume a section exists. The
layout must close gaps and remain balanced when sections are absent.

## Rendering model

- A template is a `templates/<name>/` bundle with `template.html` (or
  `template.hbs`), a required self-contained Draft-07 `interface.json` for the
  complete YAML document, a matching human-readable `interface.md`, and an
  optional `theme.json` containing partial defaults.
- `Handlebars.compile(templateSource)(context)` creates HTML. Headless Chromium
  produces PDF; `--format html` skips the PDF step for faster iteration.
- A4 defaults to `794×1122px` at 96 dpi through
  `theme.layout.pageWidth`/`pageHeight`.
- No registration is required. The CLI discovers complete markup + interface bundles.
  Run `npm run generate -- --list` to inspect the discovered names.
- Template selection order is `-t/--template`, then config `template`, then
  `classic`.
- Theme precedence is global `DEFAULT_THEME`, then `<name>/theme.json`, then the
  config's `theme:` overrides. A malformed sidecar must fail with a clear error.

## Data available in the template

The context is the full config plus resolved `theme` values and derived fields:

```text
basics:
  name: string                         # required
  title?: string                       # legacy fallback for headline
  headline?: string
  email?: string
  phone?: string
  location?: string
  photo?: string
  showPhoto?: boolean                  # defaults to false
  links?: [{ label: string, url: string }]
  displayHeadline: string              # derived: headline ?? title ?? ""
  photoUri: string | null              # derived if photo is enabled/resolved
  contactParts: [{ text, href?, icon }] # derived and pre-filtered

target?: string
template?: string
theme?: resolved Theme
summary?: string
metrics?: [{ value, label, sub? }]
skills?: [{ category, items: string[] }]
experience?: [{ company, role, period?, location?, highlights?: string[] }]
achievements?: [{ icon?, title, description }]
speaking?: [{ title, venue?, location?, year?, subParts: string[] }]
projects?: [{ name, description?, url?, highlights?: string[] }]
education?: [{ institution, degree?, period?, metaParts: [{ text, bold? }] }]
languages?: [{ name, level?, label: string }]
consent?: string

theme:
  colors: { navy, orange, orangeSoft, ink, inkAlt, slate, greyMeta, tileSub,
            hairline, dividerPipe, muted, desk, page }
  fonts: { primary, mono, googleFontsHref }
  layout: { pageWidth, pageHeight, padTop, padBottom, sidePadding, accentRule,
            radius }

pageContentWidth: number                # derived
paginationScript: SafeString            # derived for Path B
```

Everything except `basics.name` is optional. Use the real config to decide the
template's section order, but ensure the template also degrades gracefully when
any currently populated section is later omitted.

## Available Handlebars helpers

- `{{{md text}}}` or `{{{md text "var(--color)"}}}` renders `**bold**` inline
  emphasis. It returns HTML and must use triple mustaches.
- `{{{icon name}}}` renders a template-owned SVG path from `theme.icons` and
  inherits `currentColor`. Define every icon used by the template in its theme
  sidecar; do not add SVG paths to TypeScript. Unknown values fall back to the
  sidecar's `dot` icon when present. Nice Navy defines `lightning`,
  `clipboard-check`, `target`, `star`, `dot`, `phone`, `mail`, `map-pin`,
  `linkedin`, and `globe`. Use triple mustaches and set `color` on the icon
  container for light-on-dark or light-on-orange badges.
- `{{join items ", "}}` joins an array with the supplied separator, defaulting
  to `", "`. Double mustaches are correct.
- Use ordinary `{{value}}`, `{{#if}}`, and `{{#each}}` for other values.

## Template theme and CSS safety

Put the design's defaults and icon set in `templates/<name>/theme.json`. The
sidecar may add template-specific token names under `colors`, `fonts`, and
`layout`; it owns all SVG path fragments under `icons`. Values must pass the runtime schema and safety rules in `docs/templates.md`.
Arbitrary HTML, CSS statements and external SVG references are forbidden. Store only SVG
inner markup in `icons`; the helper owns the outer `<svg>`, accessibility,
`currentColor`, and sizing. For example:

```json
{
  "icons": {
    "dot": "<circle cx=\"12\" cy=\"12\" r=\"4\"/>",
    "mail": "<path d=\"M3 7l9 6 9-6\"/>"
  },
  "colors": { "panel": "#e8e9eb" },
  "fonts": { "heading": "'Montserrat', sans-serif" },
  "layout": { "sidebarWidth": 288 }
}
```

Icon maps are intentionally not inherited from another template. Copy or
redesign the required paths in each template's sidecar so the template remains
portable and visually independent.

Map resolved tokens into CSS variables rather than hardcoding the palette or
font values in the HTML:

```css
:root {
  --navy: {{{theme.colors.navy}}};
  --orange: {{{theme.colors.orange}}};
  --font: {{{theme.fonts.primary}}};
  --panel: {{{theme.colors.panel}}};
  --heading-font: {{{theme.fonts.heading}}};
  --sidebar-width: {{theme.layout.sidebarWidth}}px;
  --pad-top: {{theme.layout.padTop}}px;
}
```

Inside `<style>`, every string-valued `theme.*` interpolation must use triple
mustaches. Double mustaches turn apostrophes in font stacks into `&#x27;` and
silently break CSS. Numbers may use double mustaches.

After rendering, inspect only the style block because body text may legitimately
contain apostrophes:

```bash
awk '/<style>/,/<\/style>/' output/<rendered-file>.html | grep -c "&#x27;"
```

The command must print `0`.

## Two authoring paths

### Path A — simple native pagination

Use normal document flow with print CSS. This is the recommended starting point:

```html
<style>
  @page { size: A4; margin: 18mm; }
  .entry { break-inside: avoid; }
</style>
<body>
  <h1>{{basics.name}}</h1>
  {{#if summary}}<p>{{{md summary}}}</p>{{/if}}
  {{#if experience}}
    <h2 data-title="Experience">Experience</h2>
    {{#each experience}}
      <article class="entry">
        <h3>{{role}} — {{company}}</h3>
        {{#if highlights}}
          <ul>{{#each highlights}}<li>{{{md this}}}</li>{{/each}}</ul>
        {{/if}}
      </article>
    {{/each}}
  {{/if}}
  {{#if consent}}<footer id="cv-consent">{{consent}}</footer>{{/if}}
</body>
```

Even on Path A, use these exact `data-title` values on populated section
headings so the repository smoke test can verify coverage: `Skills`,
`Experience`, `Projects`, `Key Achievements`, `Speaking`, `Education`, and
`Languages`. Use `id="cv-consent"` when consent is present.

### Path B — controlled JavaScript pagination

Read `docs/templates.md` for the authoritative DOM and theme validation contract.
Use the current built-in templates as worked examples. Pages have fixed A4
height and flex children that cannot shrink. The main and optional sidebar
source lists contain flat `.blk` children, `.sec-h[data-title]` headers, and
`data-section` entries. Mark narrative blocks `data-splittable`. Consent is a
`data-consent` block in the main source list and participates in measurement.

Two-column templates use `#cv-page-shell`, `[data-page-content]`, and an independent
`#cv-sidebar-source` flowing into `[data-sidebar-content]`. Mark only the masthead
`data-first-page-only`; sidebar content must continue when full. Do not hide
excess content or pretend overflow is a successful render. Include
`{{{paginationScript}}}` once; its `window.__pagination` state must be `complete`.

## Constraints

- A4 only, with print-safe margins and no clipped or bleeding content.
- Keep body text readable when printed or scanned; do not solve overflow by
  indiscriminately shrinking fonts.
- Prefer the resolved `theme.fonts.googleFontsHref` or robust system fallbacks.
  Remember that remote fonts may be unavailable offline.
- Keep CSS inline in the HTML and theme values in the JSON sidecar. No external
  stylesheets and no custom external JavaScript.
- Render only config content. Never hardcode personal data from either input.
- Use semantic HTML and preserve visible URLs/contact information in print.

## Optional design brief

The config and optional screenshot are sufficient. These preferences refine the
directions when supplied:

- Visual style:
- Preferred or avoided colors:
- Preferred or avoided fonts:
- Simple Path A or controlled Path B:
- Density and page-count preference:
- Accessibility or print constraints:
- Other requirements:

## Final validation

Render the selected production template against the real config:

```bash
npm run generate -- configs/<my-config>.yaml \
  -t <template-name> --format both
npm test
npm run test:layout
npm run build
```

Inspect both HTML and PDF visually. For two-column templates, verify every page
has the configured top/bottom margins, both column backgrounds reach the page
bottom, first-page-only content does not repeat, and consent sits at the bottom
of the final main column. Also check overflow, clipping, orphan headings,
contrast, font loading, long URLs, and photo behavior. Exercise the template
with temporary fixtures for:

1. `basics.name` only;
2. several absent sections;
3. one unusually long section;
4. photo disabled and enabled when an actual image is available.

Command success is not visual or runtime-schema validation. Fix all observed
layout failures before calling `templates/<template-name>/template.html` complete.
