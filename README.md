# AI Engineering CDD marketplace

A [Devin](https://docs.devin.ai/cli/extensibility/plugins/overview) meta-plugin for discovering reusable AI Engineering CDD patterns and components, with independently installable component-assessment plugins.

This branch retains the original example plugins alongside the CDD discovery demo.

> Plugins are in beta. The [CLI plugins reference](https://docs.devin.ai/cli/extensibility/plugins/overview) is the authoritative format. For a single-plugin authoring starter, see [CognitionAI/plugin-template](https://github.com/CognitionAI/plugin-template).

## What's inside

This marketplace includes:

- A root meta-plugin (`cdd-marketplace`) that declares required discovery and baseline plugins plus optional component assessments
- Example plugins that demonstrate different patterns:
  - Required baseline plugins (`engineering-baseline`, `security-guardrails`)
  - Optional plugins (`frontend-standards`, `docs-and-release`)
- Independent CDD demo plugins:
  - Required `cdd-core` discovers a draft RAG pattern, the approved Metadata Enrichment component, and the candidate Braintrust OTel component from its bundled catalogue.
  - Required `cdd-metadata-enrichment` integrates the approved shared Metadata Enrichment API for pre-indexing document metadata, subject to project configuration and access.
  - Optional `cdd-braintrust-otel` assesses the shared Braintrust OTel trace path; it does not cover OTel Metrics dashboards.
  - Optional `cdd-okta-bff-auth` integrates the candidate Okta BFF authentication component (Express + React, server-side tokens); its in-memory session store is single-instance only.
  - Optional `cdd-protected-source-delivery` guides the draft pattern for serving cited files from private storage through user-bound references and the authenticated API; it is a design guide, not a library.
  - Optional `cdd-pr-validation` adopts the candidate GitHub Actions PR validation workflows (Node, Python/uv, security scans, offline Terraform preview); they are copied at a pinned revision because no central workflow repository exists.
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

**Distribution precondition:** verify that `codex/cdd-marketplace-import` is published in the target repository and accessible through Devin's Git integration; if it is not, push the branch before installing the root meta-plugin. Core discovery still uses a demo catalogue: the RAG pattern is `draft`, Metadata Enrichment is `approved`, and Braintrust OTel is `candidate`. Component approval does not establish caller access or project configuration readiness. The metadata plugin has a caller-side integration workflow, but this marketplace does not deploy the shared service or a project's configuration. Core declares an Atlassian MCP server; reading private Confluence content also requires an authenticated connection.

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
devin plugins install --local ./plugins/cdd-pr-validation
devin plugins list
```

Install only the optional components needed for a request. Core discovery identifies a matching component and checks whether its component skill is active before invocation. Local CLI/Desktop may use the component's read-only reviewer subagent, while Cloud uses the skill directly. The root meta-plugin cannot resolve its CDD dependencies until the referenced branch is pushed.

If a component plugin is not active in the current session, `cdd-core:discover` returns its exact `git-subdir` source (URL, branch ref, and subdirectory path) plus the skill to run after installation. A catalogue match is not an assessment by the component skill. Installing through plugin management may not expose a new skill to the current Cloud session; verify availability and start a new session when needed. `cdd-core` does not silently install plugins.

For metadata discovery, core's catalogue points to the service GitHub repository for technical capabilities and `docs/PROJECT_ONBOARDING.md` for onboarding. The linked Confluence page is a capability overview, not a source for ownership or access-request steps. Core declares the Atlassian MCP in `plugins/cdd-core/.mcp.json`; a Cloud connection or CLI login is still required to read private Confluence content. Missing access leaves the relevant claim unverified. Core does not treat source reading as execution of `/cdd-metadata-enrichment:integrate-metadata-enrichment`.

## Claude Code marketplace

This repository also provides a Claude Code marketplace at `.claude-plugin/marketplace.json`. It lists all 10 bundled plugins with relative sources, and each plugin has a Claude manifest alongside its Devin manifest.

Install from the Claude compatibility branch in your terminal:

```bash
claude plugin marketplace add 'ephie-w/cdd-plugin#codex/claude-marketplace-support'
claude plugin install cdd-core@cdd-marketplace
claude plugin install cdd-okta-bff-auth@cdd-marketplace
claude plugin details cdd-okta-bff-auth
```

Adding the marketplace registers the catalogue; install each plugin you need separately. Start a new Claude Code session after installation, then invoke `/cdd-core:discover` or `/cdd-okta-bff-auth:integrate-okta-bff-auth`.

To test a local checkout instead:

```bash
claude plugin validate --strict .
claude plugin marketplace add .
claude plugin install cdd-okta-bff-auth@cdd-marketplace
```

The compatibility configuration was tested with Claude Code 2.1.226: all 10 plugins installed and were enabled in an isolated configuration. Component inventory confirmed the Okta skill and reviewer agent, the security hook and reviewer, and the core Atlassian MCP declaration. Reviewer agents have flat `agents/<name>.md` copies for Claude, while the original Devin agent directories remain. Keep both copies in sync when editing a reviewer. Security uses a separate Claude hooks file with the `Bash` matcher; it only prints a reminder and does not block commands. The core Claude manifest supplies the HTTP MCP server configuration; authenticating to Atlassian is still required.

This is installation compatibility, not a migration of Devin's organization policies: Claude does not apply this repository's Devin `AGENTS.md`, `rules/`, or root `requiredPlugins`/`optionalPlugins`/`forbiddenPlugins` as equivalent Claude policies. The discovery skill still contains Devin-specific installation guidance; in Claude, use `claude plugin install <name>@cdd-marketplace` instead. Real Okta login, private-source access, MCP authentication, model execution of skills, and hook execution were not exercised by the installation test.

Devin also reads Claude plugin manifests (`.claude-plugin/plugin.json`). The Devin meta-plugin endorses Anthropic's [`frontend-design`](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) plugin as a live example.

## Validation

CI runs `scripts/validate-template.mjs` on every PR:

```bash
node scripts/validate-template.mjs
```
