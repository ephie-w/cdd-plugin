---
name: discover
description: Use when a business or engineering request might reuse a CDD pattern, component, standard, service, or domain plugin, including document-grounded RAG, data ingestion, metadata enrichment, and AI observability.
---

# Discover CDD capabilities

Read this plugin's bundled `catalog/capabilities.yaml` before matching any CDD capability. The catalog is a demo snapshot, not a production approval source. If the catalog is unavailable, report that the plugin failed to load and stop; do not substitute a Confluence or web search.

1. Identify the user's outcome and constraints. Compare them with each entry's `use_when` and `do_not_use_when`, not just its name.
2. Follow matching pattern-to-component references. Keep optional components distinct from requirements. Report `known_gaps` without inventing a missing component. Treat any requested subfeature not explicit in the catalogue (such as named-entity extraction) as unverified.
3. Report each entry's exact `status`; draft patterns and candidate components are not approved.
4. For a selected component, report `plugin.name`, `plugin.marketplace_path`, and `plugin.skill`. Check whether that plugin is installed in the current session before invoking its skill. A catalogue record, an `optionalPlugins` entry, or skill text found in a repository does not mean the plugin is installed. In CLI/Desktop, `plugin.local_agent` is an optional specialist for a larger read-only assessment; in Cloud, use an installed skill directly because plugin custom subagents are not loaded there. Never make the local agent a prerequisite.
5. If the plugin is absent, stop at a catalogue-level match. State **plugin not installed; component skill not run**. Do not present a manual reading of its repository copy as the skill's assessment or conclude the component is adoptable. Give an installation handoff containing the plugin name, skill command (`/<plugin.name>:<plugin.skill>`), and the exact `git-subdir` source: `plugin_source.source`, `plugin_source.url`, `plugin_source.ref`, and `plugin.marketplace_path` as `path`. For Cloud, direct the user or admin to install that source through Devin's plugin management/Marketplace. If a plugin-management tool is available and the user has explicitly asked for installation, it may be used; otherwise ask before changing plugin state. For a local CLI checkout, `devin plugins install ./<plugin.marketplace_path>` is an option from the repository root. Check activation after installation; if the current session still lacks the skill, tell the user to start a new session and rerun the assessment. Never promise same-session activation.
6. If no entry fits, say the catalogue has no match. Do not force a CDD recommendation.

Return matched IDs, reasons for fit or exclusion, status, gaps, whether the component skill actually ran, the next plugin/skill or installation handoff, and anything still needing confirmation. Discovery alone must not edit application code or install plugins without an explicit user request.
