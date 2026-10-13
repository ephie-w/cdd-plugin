# CDD marketplace integration design

Date: 2026-10-14

## Goal and constraints

Bring the substantive CDD discovery and component-assessment content from
`/Users/wangyifei/code/nc/cdd-marketplace-demo/` into the current
`codex/cdd-marketplace-import` branch. Use this repository's existing flat
`plugins/<plugin-name>/` layout, plugin manifests, documentation conventions,
and validator. Keep the four imported Cognition example plugins for now.

The demo is a static, assessment-only snapshot. Its `draft` and `candidate`
statuses are not production approvals. No new MCP connection, external service
call, repository modification by a skill, or Cloud subagent behavior is implied.
The existing untracked files in the target checkout are out of scope.

## Architecture

Add three independent sibling plugins:

| Plugin directory | Role | Main content |
| --- | --- | --- |
| `plugins/cdd-core/` | Discover relevant CDD patterns and components from a request | Manifest, short `AGENTS.md`, bundled capability catalog, `discover` skill |
| `plugins/cdd-metadata-enrichment/` | Assess fit for the shared Metadata Enrichment API | Manifest, assessment skill, optional read-only local subagent |
| `plugins/cdd-braintrust-otel/` | Assess fit for the shared Braintrust OTel trace path | Manifest, assessment skill, optional read-only local subagent |

The category labels `data` and `observe` become explicit fields on the two
catalog component records and remain plugin keywords, not intermediate plugin
directories. This is necessary because the
current validator expects each direct child of `plugins/` to have a manifest
whose name matches its directory. Convert each demo `agents/<name>.md` profile
to the repository's `agents/<name>/AGENT.md` convention without widening its
permissions. Do not copy the demo's `.devin/config.local.json`, `.DS_Store`,
root README, or root manifest.

The core catalog keeps the RAG blueprint and the two candidate components,
including `use_when`, `do_not_use_when`, optional pattern-to-component links,
and known gaps. Update its plugin paths to the three flat directory names.
The discovery skill must check whether a selected component plugin is actually
installed before asking Devin to invoke its skill. If the bundled catalog is
unavailable, discovery stops with a clear loading error rather than inventing
a match or substituting an unrelated search.

## Distribution manifest

Keep the current root meta-plugin, its four local example-plugin declarations,
and its existing third-party optional reference.
Append `cdd-core` to `requiredPlugins` and the two component plugins to
`optionalPlugins`, each as a `git-subdir` object with the correct flat `path`.
Use the deliberately non-functional URL
`https://example.invalid/cdd-marketplace.git` as the same explicit placeholder
in these three new objects. This placeholder is an agreed design constraint,
not an unknown to resolve during implementation. Do not use ZIP-internal
references such as `./plugins/core` or `./plugins/data`.

Until a real repository URL replaces the placeholder, installing the root
meta-plugin cannot be expected to resolve its new required dependency.
Individual CDD plugins can still be validated and tested locally by installing
their folders separately. After a real URL is configured, root installation
will auto-install core; `optionalPlugins` will continue to be recommendations,
not automatic installations. The root plugin name remains unchanged in this
phase so existing template behavior is not silently renamed.

## Documentation and validation

Update the repository README with the CDD plugin roles, the intentional URL
placeholder, local per-plugin install commands, the distinction between core
discovery and component execution, and the assessment-only limitations. Keep
the four example-plugin descriptions. Update `docs/add-a-plugin.md` only if
needed to explain the flat CDD paths or placeholder replacement; avoid
rewriting unrelated template guidance.

Extend the existing validator narrowly so it checks that `git-subdir` paths
using either the current template-repository URL or the intentional CDD
placeholder point to real direct-child plugin folders. Do not treat the
existing third-party optional reference as a local path. Add catalog
consistency checks only if they can be
implemented without introducing a YAML parser dependency. The validator must
not attempt to fetch the placeholder URL.

Acceptance checks:

1. `node scripts/validate-template.mjs` passes for the seven flat plugins.
2. All new manifests and the root manifest parse as JSON; skill and subagent
   frontmatter names match their folders.
3. The catalog's plugin names, paths, and skill names resolve to the new
   on-disk folders. No new dependency uses a relative `./plugins/...` source.
4. The four existing example plugins remain present and unchanged unless a
   focused validation or documentation adjustment requires otherwise.
5. The working tree's pre-existing untracked files are not staged or edited.

Cloud installation and actual MCP/service invocation are outside this phase:
the placeholder URL and lack of service credentials prevent meaningful
end-to-end verification of those behaviors.
