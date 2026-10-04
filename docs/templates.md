# Template authoring

A template is a trusted-code folder: `templates/<id>/template.html` (or
`template.hbs`) with required `interface.json` and `interface.md`, plus optional
`theme.json`. IDs contain letters, numbers, underscores and hyphens. A
`template.hbs` file takes precedence over `template.html`. Each bundle also
includes a `scaffold.yaml` that validates against its interface and acts as the
agent's copy-and-fill source. Do not install templates from untrusted
sources. Global defaults → sidecar → YAML overrides determines the theme.

`interface.json` is a self-contained Draft-07 JSON Schema for the whole flat YAML
document. Its root must be an object; use `additionalProperties: false` to make
the accepted contract explicit. Local `#` references are supported, but runtime
network resolution and external `$ref` values are not. Template-defined keys
are passed to Handlebars unchanged. Engine-derived fields (resolved `theme`,
contact/photo metadata, education/language/speaking metadata, content width and
pagination script) override YAML values when the expected source shapes exist.
`interface.md` documents the same contract for people and should link to the
machine-readable schema; keep both files in sync when the template evolves.
The selected template interface is reloaded for every preview request.

For native-flow templates, use normal HTML plus `@page {size:A4}` and
`break-inside:avoid` on short entries. Do not add `#cv-stage` if the template does
not use the controlled paginator. Use ordinary escaped Handlebars output for
content, `{{{md text}}}` for escaped inline bold, and `{{{icon name}}}` for vetted
SVG primitives. Theme CSS string tokens need triple braces in a style block;
HTML attributes need ordinary escaped double braces.

Controlled pagination uses:

- `#cv-stage`: empty destination for pages.
- `#cv-source.cv-measure`: off-screen flat list of `.blk` elements.
- `.blk.sec-h[data-title]`: section heading followed by its first entry.
- `.blk[data-section]`: entry; the section name supplies continuation headings.
- `[data-splittable]`: opt in to word-boundary splitting of large narrative blocks
  while preserving inline markup and list structure. Keep decorations out of
  narrative text; each word must be able to fit on an otherwise empty page.
- `[data-consent]`: final footer in the source list. Its height participates in
  pagination; use `margin-top:auto` to pin it to the final page's bottom.
- `{{{paginationScript}}}`: once before the closing body tag.

The page is a fixed 794 × 1122 CSS pixel A4 shell. Contents must not flex-shrink;
use `flex:0 0 auto` on blocks and wrap long values. Simple Classic pages are flex
columns with padding. For two-column layouts, provide `#cv-page-shell` as an
HTML `<template>` with a `.cv-page` first child and a fixed-height
`[data-page-content]` destination. Mark only the masthead as
`[data-first-page-only]`. An optional `#cv-sidebar-source` contains the same flat
block contract and flows independently into `[data-sidebar-content]`. Do not
mark sidebar content first-page-only or hide overflow as a substitute for
pagination. The final consent is placed after both lanes finish.

The script waits for load, fonts, and decoded images before measuring. It exposes
`window.__pagination` with `pending`, `complete`, or `error` plus a message.
`window.__paginated` is true only on success. An error is visibly reported in HTML
and fails PDF generation. Fonts/images timing out after 15 seconds fail instead
of producing an unreliable document. Unbreakable oversized elements and layouts
exceeding 100 pages are errors.

Themes share the runtime schema. Colors are CSS color expressions composed of
letters, numbers, spaces, commas, parentheses, periods, percentages, hashes and
hyphens. Font stacks contain names, spaces, quotes and commas; arbitrary CSS
statements and URLs are forbidden. The only external font URL is an explicit
Google Fonts HTTPS `/css` or `/css2` URL; use an empty value for offline rendering.
SVG icons accept self-closing path/circle/rect/line/polyline/polygon/ellipse
primitives and geometric/presentation attributes only, with no scripts, events,
references, images, transforms or foreign objects. Layout tokens are finite
nonnegative numbers; page size is A4 and margins must leave usable content space.

Validate examples, minimal configs, absent sections, long paragraphs/jobs,
overfull sidebars, enabled/disabled photos, Unicode and long URLs. Run all checks
in CONTRIBUTING.md and inspect actual PDFs. Test text retention, page bounds,
heading placement and consent gaps. A command exiting zero alone is insufficient.

The two built-in styles and simple geometric icon primitives are distributed
under the repository MIT license. No third-party font files are bundled.
