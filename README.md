# Devin team marketplace template

A template for running your own **governed plugin ecosystem** for [Devin](https://docs.devin.ai/cli/extensibility/plugins/overview): a single repo your org owns, containing the plugins your teams share, distributed to everyone from the Devin web app.

Fork it, replace the example plugins with your own, and wire it into your org or enterprise manifest.

> Plugins are in beta. The [CLI plugins reference](https://docs.devin.ai/cli/extensibility/plugins/overview) is the authoritative format. For a single-plugin authoring starter, see [CognitionAI/plugin-template](https://github.com/CognitionAI/plugin-template).

## What's inside

This template includes:

- A root meta-plugin (`team-starter-pack`) that governs what plugins are available to teams
- Example plugins that demonstrate different patterns:
  - Required baseline plugins (`engineering-baseline`, `security-guardrails`)
  - Optional plugins (`frontend-standards`, `docs-and-release`)
- Documentation for maintainers:
  - [`docs/add-a-plugin.md`](docs/add-a-plugin.md) — how a team contributes a plugin to this repo.

## How distribution works

1. Fork this repo into your org and update the `git-subdir` URLs in [`.devin-plugin/plugin.json`](.devin-plugin/plugin.json) to point at your fork.
2. Customize the plugins under `plugins/` and the root manifest.
3. Distribute from Settings → Marketplace in the Devin web app: an admin adds one required entry to the enterprise/account (or org) managed manifest — the meta-plugin:

   ```json
   {
     "requiredPlugins": [
       {
         "source": "github",
         "repo": "<your-org>/team-marketplace-template"
       }
     ]
   }
   ```

   Required plugins install recursively, so requiring `team-starter-pack` pulls in `engineering-baseline` and `security-guardrails` automatically. Individual users can additionally install the endorsed optional plugins.

4. Everyone in scope gets them automatically — cloud sessions, and CLI/Desktop users logged into the account.

## Cloud vs. CLI Support

The Devin Cloud supports rules, skills, hooks (except for `session_start` and `session_end`), and MCP servers. Devin CLI/Desktop supports all components of a plugin, including subagents.

## Try a plugin locally

```bash
devin plugins install ./plugins/engineering-baseline
devin plugins list

# Or install the whole governed set the way your users will get it:
devin plugins install "https://github.com/<your-org>/team-marketplace-template.git"
```

## Claude plugin compatibility

Devin also reads Claude plugin manifests (`.claude-plugin/plugin.json`), so existing Claude Code plugins install as-is. The meta-plugin endorses Anthropic's [`frontend-design`](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) plugin as a live example.

## Validation

CI runs `scripts/validate-template.mjs` on every PR:

```bash
node scripts/validate-template.mjs
```
