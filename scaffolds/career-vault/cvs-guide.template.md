# Tailored CVs

Keep one YAML file per tailored application here. These files are deliberately
maintained derivatives of `../experience.md`; the master experience document
remains the canonical career history.

From the parent `cv-generator` repository, render a tailored CV with:

```sh
npm run generate -- career-vault/cvs/acme-platform-engineer.yaml
```

The YAML uses the same schema as `configs/example.yaml`. Because a file here is
two directories below the parent schema, this optional editor directive is:

```yaml
# yaml-language-server: $schema=../../schema/resume.schema.json
```

Generated output belongs in the parent repository's ignored `output/` directory.
