---
name: release-notes
description: Draft release notes or a changelog entry from merged PRs and commit history. Use when asked to write release notes or prepare a release.
---

# Release notes

Available as `/docs-and-release:release-notes`.

## Steps

1. Determine the release range: last tag to HEAD
   (`git describe --tags --abbrev=0`), or the range the user specifies.
2. Collect merged changes: `git log --merges --format='%s%n%b' <range>` plus
   PR titles where available.
3. Group into sections: Features, Fixes, Breaking changes, Internal.
4. Write user-facing summaries — the effect on users, not the implementation.
5. Put breaking changes at the top with concrete migration steps.
