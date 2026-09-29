# Prompt: fill a real CV config for cv-generator

Paste this prompt into Claude before designing a template. Supply your real CV
material in the input section. The result is a content-only
`configs/<slug>.yaml` ready for the design workflow in
`prompts/design-template.md`.

---

I want you to turn my real resume material into one YAML config for
**cv-generator**. Do not design a template yet.

## Operating mode

- **Claude Code in the cloned repository:** inspect `src/types.ts` and
  `configs/example.yaml`, then write `configs/<slug>.yaml` and run the checks
  below.
- **claude.ai or another chat:** return the complete YAML in one fenced `yaml`
  block. Do not claim to have written a file or run repository commands.

## My source material

Paste LinkedIn profile text, an exported resume, existing CV text, or notes here:

```text
PASTE REAL CV CONTENT HERE
```

A screenshot of **my own resume** may be used here to transcribe its content. A
screenshot of **another design I want to emulate** is not a content source; that
belongs in `prompts/design-template.md` after this config is complete.

## Content rules

1. Use only facts present in my source material or confirmed by me.
2. Never invent employers, dates, metrics, achievements, technologies, links,
   language levels, or placeholder bullets.
3. Preserve my meaning. You may normalize punctuation, whitespace, date style,
   and obvious formatting inconsistencies, but do not silently rewrite claims.
4. Omit empty sections and empty optional fields. Do not pad the CV.
5. If an entry is missing a required field, ask me for it or omit the entry.
6. Keep `showPhoto: false` unless I provide an accessible photo file path.
7. YAML key order does not control rendered section order. The template chooses
   section order during the design step.
8. Use `**bold**` sparingly for existing key phrases in summaries, highlights,
   and achievement descriptions. Do not add emphasis that changes meaning.
9. Preserve recognizable link labels and complete URLs. The renderer uses both
   to infer semantic `linkedin` versus general `globe` contact icons.

## Content schema

`basics.name` is the only top-level content requirement. Fields marked
“required per entry” are required only when that entry is included.

```yaml
target: string                    # optional offer label used in output filename

basics:
  name: string                    # required
  title: string                   # optional legacy fallback for headline
  headline: string                # optional role line
  email: string
  phone: string
  location: string
  photo: string                   # relative path inside the config directory
  showPhoto: boolean              # defaults to false
  links:
    - label: string               # required per link
      url: string                 # required per link

summary: string

metrics:
  - value: string                 # required per metric
    label: string                 # required per metric
    sub: string

skills:
  - category: string              # required per skill group
    items: [string]               # required, non-empty

experience:
  - company: string               # required per job
    role: string                  # required per job
    period: string
    location: string
    highlights: [string]

achievements:
  - icon: lightning               # optional; must exist in the selected
                                  # template's theme icon map. Built-ins support
                                  # lightning, clipboard-check, target, star, dot
    title: string                 # required per achievement
    description: string           # required per achievement

speaking:
  - title: string                 # required per item
    venue: string
    location: string
    year: string                  # a YAML number is also accepted

projects:
  - name: string                  # required per project
    description: string
    url: string
    highlights: [string]

education:
  - institution: string           # required per education entry
    degree: string
    period: string

languages:
  - name: string                  # required per language
    level: string

consent: string                   # optional GDPR/RODO-style bottom footnote
```

Do not add `template:` or `theme:` in this content step. Those belong to the
design workflow. Do not copy derived fields such as `displayHeadline`,
`photoUri`, `contactParts`, `subParts`, `metaParts`, or `label`; the renderer
creates them.

## Output procedure

1. Choose a lowercase hyphenated slug, normally based on my name or target.
2. Produce exactly one complete config with no commentary inside the YAML.
3. Re-read every emitted value against my source and list any unresolved facts
   outside the YAML.
4. Check each field and array item against the schema above. Rendering is not a
   substitute for runtime schema validation.

In Claude Code, write the file and run:

```bash
git check-ignore configs/<slug>.yaml
npm run generate -- configs/<slug>.yaml --format html
git status --short
```

The loader validates the full YAML schema; generation alone does not prove
visual correctness. All personal files under `configs/` are Git-ignored by
default except `example.yaml`, but that is
not a privacy guarantee. Do not force-add them, and inspect `git status` before
committing or sharing the repository.

Use `configs/example.yaml` as a worked formatting reference, not as a source of
facts or placeholder content.
