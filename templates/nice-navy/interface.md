# Nice Navy YAML interface

This template accepts the flat resume document described below. The executable
contract is [`interface.json`](interface.json); this page is its human-readable
companion. Unknown fields are rejected.

## Top-level fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `basics` | object | yes | Identity and contact information. `basics.name` is required. |
| `target` | string | no | Non-blank job/application label used in the output filename. |
| `template` | string | no | Template ID. A CLI `--template` value overrides it. |
| `theme` | object | no | Validated color, font, layout, and icon overrides. |
| `summary` | string | no | Introductory profile; supports `**bold**`. |
| `metrics` | array | no | Career metric tiles. |
| `skills` | array | no | Skill groups rendered in the sidebar. |
| `experience` | array | no | Employment entries. |
| `achievements` | array | no | Highlighted achievement rows. |
| `speaking` | array | no | Talks and writing. |
| `projects` | array | no | Project entries. |
| `education` | array | no | Education entries. |
| `languages` | array | no | Languages and proficiency levels. |
| `consent` | string | no | Small footer consent text. |

## Nested objects

- `basics`: `name` (required string), plus optional `title`, `headline`,
  `email`, `phone`, `location`, `photo`, `showPhoto`, and `links`. When
  `showPhoto` is `true`, `photo` is required. Each link requires string `label`
  and an HTTP(S) `url`.
- `metrics[]`: required `value` and `label` strings; optional `sub` string.
- `skills[]`: required `category` string and string array `items`.
- `experience[]`: required `company` and `role`; optional string-or-number
  `period`, string `location`, and string array `highlights`.
- `achievements[]`: required `title` and `description`; optional `icon`.
- `speaking[]`: required `title`; optional `venue`, `location`, and
  string-or-number `year`.
- `projects[]`: required `name`; optional `description`, HTTP(S) `url`, and
  string array `highlights`.
- `education[]`: required `institution`; optional `degree` and string-or-number
  `period`.
- `languages[]`: required `name`; optional `level`.

Arrays accept at most 1,000 entries. Required text values must contain a
non-whitespace character. The agent-ready [`scaffold.yaml`](scaffold.yaml) is
the copy-and-fill starting point for a Nice Navy document.
