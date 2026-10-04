# Career vault

This is your private, canonical workspace for career history, job opportunities,
and tailored CV content. It is an independent Git repository nested inside the
`cv-generator` checkout; it is intentionally not a Git submodule.

Keep this repository private. Before every commit, inspect staged changes and
avoid adding credentials, access tokens, or unnecessary sensitive information.

## First push

Create an empty private repository with your preferred Git host, then run:

```sh
git remote add origin <private-repository-url>
git add .
git commit -m "Initialize career vault"
git push -u origin main
```

Use `experience.md` for your complete career history, copy
`opportunities/_template.md` for each role, and keep tailored resume YAML files
under `cvs/`.

## Generate an application from a link

In Codex, invoke the project skill with a job-offer URL:

```text
$apply-to-job https://example.com/jobs/role-id
```

The agent researches the offer, creates `opportunities/<company>-<role>.md`,
tailors `cvs/<company>-<role>.yaml` from `experience.md`, and validates it with
the parent `cv-generator` project. Restart the Codex workspace after adding the
skill if it does not appear in the skill picker immediately.

Repository-wide defaults live in `career-vault.yaml`. For example:

```yaml
defaults:
  template: classic
```

An explicit template in a request overrides this default.
