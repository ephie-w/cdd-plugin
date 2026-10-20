# AI Engineering CDD marketplace

A [Devin](https://docs.devin.ai/cli/extensibility/plugins/overview) meta-plugin for discovering reusable AI Engineering CDD patterns and candidate components, with independently installable component-assessment plugins.

This branch retains the original example plugins alongside the CDD discovery demo.

> Plugins are in beta. The [CLI plugins reference](https://docs.devin.ai/cli/extensibility/plugins/overview) is the authoritative format. For a single-plugin authoring starter, see [CognitionAI/plugin-template](https://github.com/CognitionAI/plugin-template).

## What's inside

This marketplace includes:

- A root meta-plugin (`cdd-marketplace`) that declares required discovery and baseline plugins plus optional component assessments
- Example plugins that demonstrate different patterns:
  - Required baseline plugins (`engineering-baseline`, `security-guardrails`)
  - Optional plugins (`frontend-standards`, `docs-and-release`)
- Independent CDD demo plugins:
  - Required `cdd-core` discovers a draft RAG pattern and candidate components from its bundled catalogue.
  - Required `cdd-metadata-enrichment` integrates the shared Metadata Enrichment API for pre-indexing document metadata, subject to project configuration and access.
  - Optional `cdd-braintrust-otel` assesses the shared Braintrust OTel trace path; it does not cover OTel Metrics dashboards.
  - Optional `cdd-okta-bff-auth` integrates the candidate Okta BFF authentication component (Express + React, server-side tokens); its in-memory session store is single-instance only.
  - Optional `cdd-protected-source-delivery` guides the draft pattern for serving cited files from private storage through user-bound references and the authenticated API; it is a design guide, not a library.
- Documentation for maintainers:
  - [`docs/add-a-plugin.md`](docs/add-a-plugin.md) — how a team contributes a plugin to this repo.

## How distribution works

1. The three CDD `git-subdir` entries in [`.devin-plugin/plugin.json`](.devin-plugin/plugin.json) point to `https://github.com/ephie-w/cdd-plugin.git` at `ref: codex/cdd-marketplace-import`. Push that branch to the target repository before attempting a root installation. The retained example-plugin entries still point to Cognition's template repository.
2. Customize the plugins under `plugins/` and the root manifest.
3. Distribute from Settings → Marketplace in the Devin web app: an admin adds one required entry to the enterprise/account (or org) managed manifest — the meta-plugin:

   ```json
   {
     "requiredPlugins": [
       {
         "source": "github",
         "repo": "ephie-w/cdd-plugin",
         "ref": "codex/cdd-marketplace-import"
       }
     ]
   }
   ```

   Once the branch is pushed, required plugins install recursively, so requiring `cdd-marketplace` pulls in `engineering-baseline`, `security-guardrails`, `cdd-core`, and `cdd-metadata-enrichment`. Individual users can additionally install endorsed optional plugins such as `cdd-braintrust-otel`. An `optionalPlugins` entry is not an installation.

4. After publishing the referenced branch and configuring the managed manifest, everyone in scope gets required plugins automatically — cloud sessions, and CLI/Desktop users logged into the account.

**Distribution precondition:** verify that `codex/cdd-marketplace-import` is published in the target repository and accessible through Devin's Git integration; if it is not, push the branch before installing the root meta-plugin. Core discovery still uses a demo catalogue: the RAG pattern is `draft` and the components are `candidate`. The metadata plugin has a caller-side integration workflow, but this marketplace does not deploy the shared service or a project's configuration. Core declares an Atlassian MCP server; reading private Confluence content also requires an authenticated connection.

## Cloud vs. CLI Support

The Devin Cloud supports rules, skills, hooks (except for `session_start` and `session_end`), and MCP servers. Devin CLI/Desktop supports all components of a plugin, including subagents.

## Try a plugin locally

```bash
devin plugins install --local ./plugins/engineering-baseline
devin plugins install --local ./plugins/cdd-core
devin plugins install --local ./plugins/cdd-metadata-enrichment
devin plugins install --local ./plugins/cdd-braintrust-otel
devin plugins install --local ./plugins/cdd-okta-bff-auth
devin plugins install --local ./plugins/cdd-protected-source-delivery
devin plugins list
```

Install only the optional components needed for a request. Core discovery identifies a candidate and checks whether its component skill is active before invocation. Local CLI/Desktop may use the component's read-only reviewer subagent, while Cloud uses the skill directly. The root meta-plugin cannot resolve its CDD dependencies until the referenced branch is pushed.

If a component plugin is not active in the current session, `cdd-core:discover` returns its exact `git-subdir` source (URL, branch ref, and subdirectory path) plus the skill to run after installation. A catalogue match is not an assessment by the component skill. Installing through plugin management may not expose a new skill to the current Cloud session; verify availability and start a new session when needed. `cdd-core` does not silently install plugins.

For metadata discovery, core's catalogue points to the service GitHub repository for technical capabilities and `docs/PROJECT_ONBOARDING.md` for onboarding. The linked Confluence page is a capability overview, not a source for ownership or access-request steps. Core declares the Atlassian MCP in `plugins/cdd-core/.mcp.json`; a Cloud connection or CLI login is still required to read private Confluence content. Missing access leaves the relevant claim unverified. Core does not treat source reading as execution of `/cdd-metadata-enrichment:integrate-metadata-enrichment`.

## Claude plugin compatibility

Devin also reads Claude plugin manifests (`.claude-plugin/plugin.json`), so existing Claude Code plugins install as-is. The meta-plugin endorses Anthropic's [`frontend-design`](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) plugin as a live example.

## Validation

CI runs `scripts/validate-template.mjs` on every PR:

```bash
node scripts/validate-template.mjs
```
