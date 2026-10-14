---
name: discover
description: Use when a business or engineering request might reuse a CDD pattern, component, standard, service, or domain plugin, including document-grounded RAG, data ingestion, metadata enrichment, and AI observability.
---

# Discover CDD capabilities

Read this plugin's bundled `catalog/capabilities.yaml` before matching any CDD capability. The catalog is a demo snapshot, not a production approval source. If the catalog is unavailable, report that the plugin failed to load and stop; do not substitute a Confluence or web search.

1. Identify the user's outcome and constraints. Compare them with each entry's `use_when` and `do_not_use_when`, not just its name.
2. Follow matching pattern-to-component references. Keep optional components distinct from requirements. Report `known_gaps` without inventing a missing component.
3. Report each entry's exact `status`; draft patterns and candidate components are not approved.
4. For a selected component, report `plugin.name`, `plugin.marketplace_path`, and `plugin.skill`. Check whether the selected component plugin is installed before invoking its skill. An `optionalPlugins` entry does not install it. If it is absent, recommend the named plugin for installation; do not invoke its skill as if present. In CLI/Desktop, `plugin.local_agent` is an optional specialist for a larger read-only assessment; in Cloud, use the skill directly because plugin custom subagents are not loaded there. Never make the local agent a prerequisite.
5. If no entry fits, say the catalogue has no match. Do not force a CDD recommendation.

Return matched IDs, reasons for fit or exclusion, status, gaps, the next plugin/skill, and anything still needing confirmation. Discovery alone must not edit application code or install plugins.
