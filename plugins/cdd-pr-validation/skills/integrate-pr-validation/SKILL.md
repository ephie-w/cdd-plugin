---
name: integrate-pr-validation
description: Use when a GitHub repository needs pull-request validation (Node or Python/uv lint, tests and build, dependency audit, Docker build, Semgrep and Checkov scans, or a credential-free Terraform plan posted as a PR comment), or when evaluating or adopting the candidate PR validation reusable workflows.
---

# Integrate PR validation reusable workflows

The component is a `candidate`, not an approved standard. It is a set of GitHub Actions `workflow_call` workflows plus one composite action. A short caller workflow in the adopting repository chooses which ones run and sets their inputs.

There is no central workflow repository. The workflows live inside the reference repository and are called by relative path (`./.github/workflows/...`), so another repository adopts them by **copying the files at a pinned revision**. The adopter then owns updates, and copies will drift from the reference.

## Sources

Technical authority is the reference repository `newscorp-ghfb/ncau-data-ai-newtongpt` at the revision pinned in the core catalogue. That revision comes from PR #58, which was not merged when this plugin was written; check whether it has been merged into `dev` and say which revision you read. [`references/newtongpt-reference.md`](references/newtongpt-reference.md) maps each file, input, and behaviour to that revision. Read the files before citing them. If the repository or revision cannot be read, mark the affected claims **unverified**; do not reconstruct the workflows from this skill.

## 1. Check fit

It fits when:

- The repository uses GitHub Actions and runs PR checks on `pull_request` events.
- Each app being checked is either a Node project with `package-lock.json` (npm) or a Python project with `pyproject.toml` and `uv.lock`.
- For the Terraform preview: the Terraform configuration uses the Google provider and has **no provider data sources** (`data "..."` blocks, including inside modules). This is required because the plan runs with refresh disabled and a fake access token, and any data source would try to call Google Cloud.

It does not fit, or needs extra work, when:

- The project uses pnpm, Yarn, Poetry, or plain pip. The install and audit steps only support `npm ci` and `uv sync --locked`.
- Terraform uses AWS, Azure, or other providers that need credentials during plan. The fake-token approach works only for the Google provider.
- PRs come from forks. Their `GITHUB_TOKEN` is read-only, so the Terraform comment step fails and so does the job.
- Images must be pushed or signed. The Docker step only builds images.

Report fit, gaps, and evidence from the caller's files before editing.

## 2. Pick workflows and inputs

| Workflow | Runs | Main inputs |
| --- | --- | --- |
| `_node-validate.yml` | `npm ci`, `npm audit`, lint, test, build, optional Docker builds | `working-directory` (required), `node-version`, `audit-level`, `lint-command`, `test-command`, `build-command`, `build-env` (JSON), `docker-builds` |
| `_python-uv-validate.yml` | `uv sync --locked --dev`, `pip-audit`, lint, test, optional Docker builds | `working-directory` (required), `python-version`, `uv-version`, `dependency-audit`, `lint-command`, `test-command`, `docker-builds` |
| `_security-scan.yml` | Semgrep (`--error`) and Checkov over the whole repository | `semgrep-config`, `exclude-paths`, `python-version`, `uv-version` |
| `_terraform-preview.yml` | `bash -n` on shell scripts, `terraform fmt -check`, `validate`, offline plan, sticky PR comment | `var-files` (JSON, required), `comment-marker` (required), `terraform-dir`, `terraform-version`, `shell-check-paths`, `preview-var-file`, `comment-title`, `plan-max-bytes` |

An empty command input skips that step. List inputs are newline-separated strings, and maps are JSON strings, because `workflow_call` inputs accept only strings, numbers, and booleans.

## 3. Copy the files

Copy these from the pinned revision without changing their logic:

- The `.github/workflows/_*.yml` workflows you selected.
- `.github/actions/sticky-pr-comment/action.yml`, if you use the Terraform preview. It is referenced by the relative path `./.github/actions/sticky-pr-comment`.

Keep every third-party action pinned to its full commit SHA. Record the source repository and revision in the PR description. Do not edit the reference repository.

## 4. Write the caller

Model the caller on NewtonGPT's `.github/workflows/pr-validation.yml`:

- Trigger: `pull_request`, with the target branches you want to check.
- Top-level `permissions: contents: read`.
- `concurrency` keyed on the PR number, with `cancel-in-progress: true`.
- One job per workflow, each with a clear `name:`.
- Give `pull-requests: write` only to the Terraform job. A called workflow cannot have more permissions than its caller job.

Do not pass secrets, and do not use `secrets: inherit`; none of the workflows need them. `build-env` is for non-secret build-time values only. Command inputs run through `bash -c`, so set them only as literals in the caller file. Never build them from PR titles, branch names, or other PR-controlled data.

## 5. Prepare the Terraform preview

- **Environment mapping.** `var-files` maps the PR base branch to a var file relative to `terraform-dir`, with `"*"` as the fallback. Example: `{"main":"environments/prod.tfvars","*":"environments/dev.tfvars"}`.
- **Placeholders.** Commit a preview var file, for example `environments/ci-preview.tfvars`, that gives placeholder values for variables the environment files leave unset: image digests, client IDs, network paths. Placeholders must still pass the caller's `validation` blocks (for example `@sha256:` followed by 64 hex characters). Never put real secrets or real identifiers in it.
- **Backend.** The workflow copies the Terraform directory and adds `zz_ci_preview_backend_override.tf` with `backend "local" {}`. The `_override.tf` suffix replaces whatever remote backend is configured. Plans use `-refresh=false -lock=false`, so they show the full configuration diff against empty state, not against what is deployed.
- **Comment.** `comment-marker` must be unique per repository. The comment is updated in place on each push. If the plan fails, the comment is still posted and then the job fails.

## 6. Prepare owner requests

Do not change branch protection, rulesets, or repository settings yourself. Status checks from called workflows are named `<caller job name> / <called job name>`, for example `Frontend lint and build / Validate`, `Security scans / Scan`, and `Terraform validation and preview / Preview`. Give the repository admin a request that lists:

- The new check names to mark as required on each protected branch.
- The old check names to remove from the required list, so PRs are not left waiting on checks that never report.

## 7. Verify and report

1. Run `actionlint` on the copied workflows and the caller.
2. Run each configured command locally where you can: install, audit, lint, test, build, and `docker build`. For Terraform, run `fmt -check`, `validate`, and the offline plan.
3. Open a PR. Confirm that every job runs, that the check names are as expected, and that a second push updates the Terraform comment instead of adding a new one.
4. Audits and scanners often fail on findings that already exist in the repository. Fix those in a separate, focused change, such as a lockfile-only `npm audit fix --package-lock-only`. Do not lower `audit-level`, add exclusions, or skip a gate to get a green run without the owner's explicit agreement.

Report:

- Fit and gaps, with evidence.
- Source revision copied.
- Workflows and inputs chosen.
- Changed files.
- Checks run, locally and in CI.
- Existing findings fixed or still open.
- Owner requests (required checks).
- Checks not performed, and who owns them.
