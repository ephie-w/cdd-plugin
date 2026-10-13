---
name: dependency-audit
description: Audit dependency additions and upgrades for supply-chain risk. Use when reviewing manifest or lockfile changes.
---

# Dependency audit

Available as `/security-guardrails:dependency-audit`.

## Steps

1. Diff the dependency manifests and lockfiles in the change set.
2. For each added or upgraded package, check:
   - Publish date of the pinned version — prefer versions published ≥7 days
     ago (fresh releases are where supply-chain attacks hide).
   - Range style — flag floating ranges (`latest`, `*`, unbounded `>=`).
   - Install scripts or native build steps pulled in transitively.
   - Maintainer/repository reputation for unfamiliar packages.
3. Check the lockfile for unexpected transitive additions unrelated to the
   declared change.
4. Summarize per package: keep / pin differently / reject, with reasons.
