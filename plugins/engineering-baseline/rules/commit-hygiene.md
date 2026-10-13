---
trigger: model_decision
description: Commit and pull-request conventions. Apply when committing, branching, or opening pull requests.
---

# Commit hygiene

- Commit messages: imperative mood, `<area>: <summary>` under 72 characters
  (e.g. `auth: fix token refresh race`). Explain *why* in the body when the
  diff alone doesn't.
- One logical change per commit — never mix refactors with behavior changes.
- Branch names: `<user>/<short-description>`, kebab-case.
- PR descriptions lead with the motivation, not a restatement of the diff.
- Never force-push shared branches; never amend published commits.
