# Contributing

Use Node.js 22.13+ (a supported Node 22 or 24 release is recommended).

```sh
npm ci
npm run build
npm test
npm run test:layout
npm run test:package
```

The browser suite launches sandboxed Chromium and checks both templates in
screen/print modes, oversized content, sidebar continuation, PDF text retention,
and rendering failures. The package suite builds and installs a tarball in a
fresh temporary directory. It needs registry access. CI also runs on Linux,
macOS, and Windows. Configure the Linux Chromium sandbox; do not add
`--no-sandbox` to make tests pass.

For bugs, use GitHub Issues and include Node/OS versions, the command, and a
minimal **fictional** YAML reproduction. Never attach a real CV or photograph
unless you deliberately want it public. Private reports belong in SECURITY.md's
reporting route.

Keep changes focused and add regression tests for behavioral fixes. For visual
changes, inspect every page of both generated example PDFs and attach sanitized
screenshots. Preserve readable type and all content instead of shrinking it to
fit a page count. See [template authoring](docs/templates.md).

Every `templates/<name>/` contribution must include a self-contained
`interface.json` describing its complete YAML contract and an `interface.md`
explaining it for people. `theme.json` remains optional.

Keep personal files under `configs/` or outside the repository. Only the example
config is tracked. Inspect `git diff --cached` and `npm pack --dry-run` before
committing or publishing. Do not force-add private files. A `.gitignore` rule is
not a history sanitizer.

The project uses the MIT license. Submit only code and assets you are entitled
to contribute; record any third-party license/attribution requirements.
