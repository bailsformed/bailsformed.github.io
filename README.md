# bailsformed.github.io

## Automatic checks

Every pull request to `main` runs **Site checks** (`.github/workflows/checks.yml`) before it can merge.
Turn on auto-merge for a pull request (the **Enable auto-merge** button, or `gh pr merge --auto --merge`)
and it merges and goes live by itself once the checks pass.
If a check fails, nothing merges and the live site stays as it was.

What runs (`.github/scripts/check_site.py`, plain Python plus Node, no installs):

| Step | What it checks |
| --- | --- |
| JavaScript parses | Every `.js` file and every inline `<script>` in every `.html` page has no syntax errors. |
| App manifests and icons | Every `manifest.webmanifest` / `manifest.json` is valid JSON, each listed icon exists at the size it claims, app ids and scopes don't clash or overlap, and the homepage has no manifest. |
| Local links exist | Every local `href`/`src` (including ones written inside page scripts) points at a file that exists. |
| HTML basics | Each page has a doctype, `<html lang>`, `<meta charset>`, a viewport tag and a `<title>`, and no duplicate `id`s. |
| No secret keys committed | Fails on a Supabase `service_role` key or an `sb_secret_` key. The `sb_publishable_` key is meant to be public and is allowed. |

**Seeing why a check failed:** open the pull request, scroll to the checks box and click **Details** next to
*Site checks*. Each failed step lists the file and line, and the same errors show as red notes on the PR's
*Files changed* tab.

**Running them yourself** from the repo root (Node is needed only for the JavaScript step):

```bash
python3 .github/scripts/check_site.py
```

Pass a step name to run just one, e.g. `python3 .github/scripts/check_site.py links`.
