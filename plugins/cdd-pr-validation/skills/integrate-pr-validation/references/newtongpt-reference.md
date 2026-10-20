# NewtonGPT reference implementation

Repository: `newscorp-ghfb/ncau-data-ai-newtongpt`, branch
`devin/1792467166-reusable-pr-validation` (PR #58 into `dev`, not merged when
this was written), revision `60f2ce47708fcedeeef2921f02a4f0088d07be34`. Line
numbers are for that revision; re-check them if you read a different one.

Base: `https://github.com/newscorp-ghfb/ncau-data-ai-newtongpt/blob/60f2ce47708fcedeeef2921f02a4f0088d07be34/`

| Concern | File and lines | Notes |
| --- | --- | --- |
| Caller | `.github/workflows/pr-validation.yml` 1-52 | `pull_request` on `dev` and `main`; read-only default permissions; concurrency keyed on the PR number; four jobs. Only `terraform` gets `pull-requests: write`. |
| Node | `.github/workflows/_node-validate.yml` 1-86 | Command inputs are passed through `env` and run as `bash -euo pipefail -c "${CMD}"`. Semgrep flagged direct `${{ inputs.* }}` interpolation in `run:`. `build-env` goes through `fromJSON`. |
| Python/uv | `.github/workflows/_python-uv-validate.yml` 1-76 | `uv sync --locked --dev`; `pip-audit` via `uv run --with pip-audit`; same command-through-`env` handling. |
| Security | `.github/workflows/_security-scan.yml` 1-58 | Semgrep `--config auto --error` and Checkov `-d .`. `exclude-paths` becomes `--exclude` and `--skip-path` arguments. |
| Terraform preview | `.github/workflows/_terraform-preview.yml` 59-67 (shell check), 73-80 (fmt, init `-backend=false`, validate), 82-90 (backend override), 92-105 (base branch to var file), 107-132 (offline plan), 134-158 (comment body), 160-167 (comment, then fail on plan error) | Plan exit code is captured with `continue-on-error`, so the comment is posted before the job fails. |
| Sticky comment | `.github/actions/sticky-pr-comment/action.yml` 1-56 | Pinned `actions/github-script`. Finds a bot comment containing `<!-- marker -->`, then updates it or creates one. |
| Placeholders | `terraform/environments/ci-preview.tfvars` 1-10 | Fake image digests, OAuth/Okta client IDs, and VPC paths that satisfy `terraform/variables.tf` validation. |

Evidence at this revision:

- CI on PR #58 passed for all four called jobs: `Frontend lint and build / Validate`, `Backend lint and tests / Validate`, `Security scans / Scan`, and `Terraform validation and preview / Preview`.
- The Terraform job log shows `Successfully configured the backend "local"!` and plan exit code 0.
- Before the refactor, the frontend job was already failing `npm audit` on `proxy-addr` 2.0.7 and `source-map-js` 1.2.1; the same failure occurs on `dev`. The PR fixes this with a lockfile-only patch bump (commit `60f2ce4`). It is not a workflow change.
