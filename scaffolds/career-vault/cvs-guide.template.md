# Tailored CVs

Keep one YAML file per tailored application here. These files are deliberately
maintained derivatives of `../experience.md`; the master experience document
remains the canonical career history.

From the parent `cv-generator` repository, render a tailored CV with:

```sh
npm run generate -- career-vault/cvs/acme-platform-engineer.yaml
```

Use only `../templates/<template>/scaffold.yaml` as the structural source for a
tailored CV. Removing a section or field from that scaffold disables it for CVs
created by the `apply-to-job` skill. Preserve the scaffold's section/key order
and rewrite its schema comment for the `cvs/` location, for example Classic:

```yaml
# yaml-language-server: $schema=../../templates/classic/interface.json
```

Generated output belongs in the parent repository's ignored `output/` directory.
