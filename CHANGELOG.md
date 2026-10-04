# Changelog

## Unreleased

- Add mandatory per-template Draft-07 interfaces and validate the complete YAML
  document against the effective template before rendering.
- Reload interfaces during preview, exclude incomplete bundles from listings,
  and allow custom templates to define arbitrary config fields.
- Preserve the Classic resume schema as `schema/resume.schema.json` for compatibility.
- Organize templates as `templates/<name>/` bundles and add a human-readable
  `interface.md` beside each executable interface.

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
