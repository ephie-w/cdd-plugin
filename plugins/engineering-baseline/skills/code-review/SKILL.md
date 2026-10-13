---
name: code-review
description: Review a diff, branch, or PR for correctness, safety, tests, and style. Use when asked to review code or a pull request.
---

# Code review

Available as `/engineering-baseline:code-review` once this plugin is
installed.

## Steps

1. Identify the change set: `git diff --merge-base <base-branch>` or the PR diff.
2. Read every changed file fully — the surrounding code, not just the hunks.
3. Check, in order of severity:
   - **Correctness**: logic errors, unhandled edge cases, off-by-ones, race
     conditions, broken invariants.
   - **Safety**: secrets in code, injection, permission checks, unvalidated
     input at trust boundaries.
   - **Tests**: is the new behavior covered? Were tests modified to pass
     rather than fixed properly?
   - **Style**: consistency with surrounding code; naming; dead code.
4. Report findings grouped by severity (blocker / should-fix / nit), each with
   `file:line` references. State explicitly when a category is clean.
