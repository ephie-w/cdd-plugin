# Add a plugin to this marketplace

Any team can contribute a plugin by opening a PR against this repo.

## 1. Create the plugin folder

```
plugins/<your-plugin>/
├── .devin-plugin/plugin.json   # required; "name" must match the folder
├── AGENTS.md                   # optional: always-on rule (keep it short!)
├── rules/*.md                  # optional: triggered rules
├── skills/<skill>/SKILL.md     # optional: skills
├── agents/<agent>/AGENT.md     # optional: subagents (CLI/Desktop-only today)
├── hooks.json                  # optional: lifecycle hooks
└── mcp_config.json             # optional: MCP servers
```

Manifest minimum:

```json
{
  "name": "your-plugin",
  "version": "0.1.0",
  "description": "One sentence on what it does"
}
```

Conventions:

- Names are unique, lowercase, kebab-case, and match the folder name.
- Skills/subagents need `name` and `description` frontmatter; the description
  is what the agent uses to decide when to invoke it — write it like a match
  condition ("Use when...").
- Rules use `trigger` frontmatter: `always_on`, `glob` (with `globs`),
  `model_decision` (with `description`), or `manual`.
- Keep `AGENTS.md` minimal — it costs context in _every_ session for every
  user who has the plugin.

## 2. Test it locally

```bash
devin plugins install ./plugins/<your-plugin>   # live-linked; edits apply immediately
node scripts/validate-template.mjs
```

Start a CLI session and confirm the rules inject and skills resolve as
`/<your-plugin>:<skill>`.

## 3. Decide its governance tier

- **Baseline for everyone** → add it to the root
  `.devin-plugin/plugin.json`'s `requiredPlugins` (same-repo `git-subdir`
  reference). Note these are literal URLs: if you forked this template, make
  sure they point at your fork, not the upstream repo.
- **Endorsed, opt-in** → add it to `optionalPlugins` in `.devin-plugin/plugin.json`.
- Neither → it's still installable by anyone with repo access, unless a
  manifest forbids it.

## 4. Open a PR

CI validates structure. Once merged, sessions pick up the new version on their
next plugin sync.
