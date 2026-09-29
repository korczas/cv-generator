# Security and privacy

This is a local CLI and loopback-only preview server, not a multi-user upload
service. Run a supported Node release and keep dependencies/Chromium updated.

YAML is validated against `schema/resume.schema.json`. Theme CSS tokens and SVG
primitives are constrained; links permit HTTP(S). Photos must be PNG/JPEG/WebP,
no larger than 5 MiB, at a relative path resolving within the config directory.
Symlinks cannot bypass that directory boundary. Photos are embedded in output,
including any metadata in the source image; remove sensitive metadata yourself.
Configs are limited to 1 MiB and layouts to 100 pages.

**Custom HTML/Handlebars templates are trusted executable code.** Read templates
before installing them. Schema validation does not make a malicious template
safe. PDF rendering keeps Chromium's sandbox and blocks requests except data
URLs and optional Google Fonts. Browser HTML opened outside the preview server
executes under that browser's own policies. Do not run this on untrusted uploads
without a separately isolated execution environment, resource limits, and a
review of its filesystem/network access.

Fonts use local system fallbacks by default, so rendering is offline. Explicitly
setting `theme.fonts.googleFontsHref` to a Google Fonts CSS URL enables requests
to Google. `--offline` disables that override for CLI generation. Contact links
are not fetched during generation. Keep the preview bound to loopback; it also
checks Host headers and sends a restrictive content security policy.

Generated HTML/PDF includes resume data and enabled photos. Ignore rules and npm
allowlists prevent common accidental inclusion; they cannot protect files you
force-add or information already published in Git history.

Report a suspected vulnerability privately through
[GitHub private vulnerability reporting](https://github.com/korczas/cv-generator/security/advisories/new)
when enabled. If unavailable, open an issue requesting a private contact without
including exploit details or personal data. Never post somebody's CV as evidence.

Security fixes target the latest release. No long-term support for older
releases is promised.
