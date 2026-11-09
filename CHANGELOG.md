# Changelog

## 0.6.0

- Optional embedded font: `theme.fonts.embed: inter` inlines Inter (SIL OFL 1.1, Latin and Latin Extended,
  weights 400–800) as data: URIs, so line breaks are identical on every operating system and no network is
  used. Set `fonts.primary`/`fonts.heading` to `'Inter', …` to use it. Off by default; existing output is
  unchanged.
- Template authors: put `{{{fontFaceCss}}}` at the start of the `<style>` block.

## 0.5.0

- Add top-level `language: en | pl`. Built-in templates render section headings, the "(continued)" label,
  `<html lang>`, the document title and the photo alt text in the chosen language. Content is unchanged.
- The paginator takes the continuation label as an argument; custom templates keep "(continued)".

Template authors: use `{{labels.<key>}}` for headings (keys in `src/labels.ts`) and
`<html lang="{{lang}}">`.

## 0.4.1

- Build `dist/` in a `prepare` script so installing from a Git tag
  (`github:korczas/cv-generator#v0.4.1`) yields a working package and API.

## 0.4.0

- Publish as `@korczas/cv-generator` (the unscoped npm name is taken) with a
  programmatic API: `renderFile`, `renderCv`, `listTemplates`, `setAssetRoot`,
  paper helpers and TypeScript declarations. The CLI uses the same `renderFile`.
- Add the `plain` template: ATS-friendly single column with the same YAML
  interface as Classic and Nice Navy.
- Support US Letter (816 × 1056 px) alongside A4 via `--paper a4|letter` or
  `theme.layout.pageWidth/pageHeight`; PDFs use the matching page size.
- Mirror the pagination result on `<html data-cv-status>` with `data-cv-pages` /
  `data-cv-message` for script-less headless checks.
- Add a Content-Security-Policy meta tag to built-in templates (no network unless
  Google Fonts is configured) and `print-color-adjust: exact` to Classic.
- Load templates and schema lazily from a relocatable asset root so the engine can
  be bundled into a single file.

Template authors: add the CSP meta and `@page { size: {{pageCssSize}} }` (see
`docs/templates.md`). Unsupported page sizes now report the supported list.

### Also in 0.4.0 (previously listed as unreleased)

- Add mandatory per-template Draft-07 interfaces and validate the complete YAML
  document against the effective template before rendering.
- Reload interfaces during preview, exclude incomplete bundles from listings,
  and allow custom templates to define arbitrary config fields.
- Preserve the Classic resume schema as `schema/resume.schema.json` for compatibility.
- Organize templates as `templates/<name>/` bundles and add a human-readable
  `interface.md` beside each executable interface.
- Add a validated `scaffold.yaml` to each bundle and make the scaffolded
  `apply-to-job` skill copy and fill only the effective template's scaffold.

## 0.3.0

- Validate YAML, themes, links, layout dimensions, and contained raster photos.
- Paginate oversized text and job entries; continue sidebar sections across pages.
- Reserve consent space and fail clearly when a template cannot be laid out.
- Export PDFs with sandboxed Chromium and explicit rendering error checks.
- Use offline fonts by default; retain explicit Google Fonts opt-in.
- Add strict CLI options, help/version, Unicode filenames, and `--force` protection.
- Build distributable packages automatically, with a file allowlist.
- Require Node 22.13+, update dependencies, remove unused Express.
- Add browser/PDF regressions, installation tests, and cross-platform CI.

Breaking changes: absolute/out-of-directory photo paths, arbitrary SVG/HTML or CSS
in theme tokens, unknown YAML fields, non-A4 dimensions, and unsafe URL schemes
are rejected. Repeated output writes require `--force`. Custom paginated
templates should adopt the contract in `docs/templates.md`.
