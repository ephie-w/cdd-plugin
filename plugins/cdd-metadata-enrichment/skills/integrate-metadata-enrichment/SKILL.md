---
name: integrate-metadata-enrichment
description: Use when evaluating or integrating the shared Metadata Enrichment Service into a caller's ingestion or indexing pipeline, including entity extraction, classification, sentiment, structured-field mapping, and project configuration proposals.
---

# Integrate Metadata Enrichment

Integrate a caller with the existing HTTP service. The caller prepares text and persists validated metadata; the service performs configured extraction. Use the caller's language and conventions; use Python for a standalone client when no runtime has been selected.

## Scope and sources

Inspect the caller before changing it. Do not modify the service repository, publish service configuration, deploy services, reload or clear service caches, or change IAM. Configuration and prompt files produced by this skill are proposals for the Metadata team. Do not expose credentials or add document-body logging. Use synthetic, non-sensitive content for probes: the current service logs truncated input, structured fields, and output previews without redaction.

Technical authority is the [service repository](https://github.com/newscorp-ghfb/nca-component-metadata-enrichment-svc). Read relevant source at the available checkout/revision before relying on it; record that revision and distinguish local source from deployed behavior. Read these paths as needed:

- API: `services/metadata_enrichment_api/app.py` and its `configuration.py`.
- Field contracts: `services/metadata_enrichment/schema.py`, `execution_plan.py`, `orchestrator.py`, `normalizer.py`, and relevant `extractors/` implementations.
- Project behavior: `live/<project>/config.yaml` and its Python prompt module.
- Configuration loading: `services/common/config_registry.py`.
- Onboarding and context: `docs/PROJECT_ONBOARDING.md` and `docs/metadata-enrichment-service-technical-documentation.md`.
- IAM and runtime defaults: `modules/metadata_enrichment_api/`; these do not prove live settings.

Use the [Confluence page](https://newsau.atlassian.net/wiki/spaces/AAS/pages/81516068956/Metadata+Enrichment+SVC) only for a high-level capability overview. Read `docs/PROJECT_ONBOARDING.md` in the service repository for onboarding; verify ownership, access requests, and operational processes only where a current authoritative source explicitly documents them. Do not infer those processes from the Confluence overview. Report source conflicts. If a required source is unavailable, report its exact URL/path and needed information; request access or an excerpt before depending on that information. Continue independent work with accessible sources.

Read [the runtime contract](references/runtime-contract.md) before designing requests, validation, or mappings. It is a source-checked snapshot; recheck relevant implementation when the service changes. No separate client, test, or verification scripts are bundled or assumed.

## Workflow

### 1. Establish the integration boundary

Inspect existing HTTP/authentication, configuration, logging, pipeline, storage, testing, retries/dead-letter, and telemetry conventions. For a new caller, establish the runtime, intended input/output adapter, and future call site without requiring a package or packaging tool.

Identify the environment, endpoint, caller identity, project key, data sensitivity, owners, text preparation, and metadata destination. Map caller fields to `doc_id`, `text`, and `structured_fields`; prefer enrichment after parsing and before indexing. Present the insertion point or standalone scaffold boundary and mappings. Obtain approval before proceeding to project proposals or caller edits; reuse approval already given in the conversation.

### 2. Prepare the Metadata-team request

Read [configuration and prompt guidance](references/configuration-proposals.md). Produce `<project>_metadata/config.yaml` containing `metadata_enrichment.schema`, with extractors and capabilities nested under `schema`. Use the current project configuration or the deterministic example in that reference. Generate only the fields/capabilities required by the caller.

Include project key, schema name, environments, endpoint, caller identity, owners, field names/types/requiredness, source paths, extractor selection, dependency/prompt bindings, taxonomy, expected volume, latency constraints, and data restrictions in the request. Identify image versus GCS publication requirements and any required prompt release. Do not invent missing ownership or model availability.

For LLM fields, propose prompts from their field contracts, including output keys, shapes, allowed values, missing-value behavior, and supplied dependency metadata. Do not generate LLM prompts for heuristic/NLP/derived fields. A prompt proposal is not a deployed Python module.

Confirm with the user that the required project configuration and Python prompts are deployed in the target environment before continuing. If an existing deployed project already meets the contract, record that evidence and avoid proposing a needless replacement.

### 3. Verify access and liveness

Use the caller's existing Google identity-token mechanism; for a Python remote client use ADC-backed ID tokens with the service's configured audience, normally its base Cloud Run URL. Refresh tokens through the auth library. OAuth access tokens are not interchangeable with ID tokens. Permit unauthenticated operation only for loopback development in this integration.

Identify the actual request identity and audience without printing tokens. Check `GET /health` first. If permitted, `GET /admin/configs/<project>` can check visible configuration, but does not prove an orchestrator or models can initialize. Do not call admin POST endpoints.

Stop live verification on token failure or 401/403; report identity, audience, status, and the access action needed from the platform owner. Handle project/configuration errors using the runtime reference. Obtain explicit permission before a synthetic `POST /enrich` probe, unless already authorized. Health success alone does not verify extraction.

### 4. Implement the caller

Adapt the caller's HTTP stack, or create a standalone typed Python client and focused tests. Configure service URL, project, auth audience, timeouts, batch size, and retry limits externally. Caller limits are not server contract limits. Validate string IDs, non-empty text, object-shaped structured fields, and the request envelope locally.

Preserve the complete batch envelope and ordered per-record outcomes. Validate response cardinality, positional IDs, counts/status consistency, success metadata objects, and error records as specified in the runtime reference. Never collapse results into a dictionary keyed only by `doc_id`.

Validate required metadata and business types independently of HTTP and record success. Missing LLM output, invalid taxonomies, or incomplete sentiment structures can occur in a nominally successful response. Merge validated metadata at the approved destination without overwriting source fields.

### 5. Apply one explicit failure policy

Follow the caller's established policy or select one with the user; recommend `fail_batch` when there is no convention:

- `fail_batch`: prevent indexing the batch when any record or required output is invalid.
- `skip_failed`: index valid records only; explicitly record and surface skipped records.
- `retry_or_dead_letter`: retry eligible failed records within bounded attempts/time, then durably record failures. Preserve input positions/caller correlation across retry subsets.

Malformed envelopes and transport failures fail the request; do not guess which records succeeded. Retry only transient failures under the chosen policy; do not automatically retry 400, missing-project 404, or authentication failures. Retrying may repeat billable model work. Never silently index unenriched documents or retry indefinitely.

For a new caller without a pipeline, leave the approved adapter and future call site explicit rather than inventing application code.

### 6. Verify and report

Test valid success, partial and all-record failure, duplicate IDs with distinct outcomes, missing/extra/reordered results, inconsistent counts/statuses, missing required metadata despite success, HTTP/config/auth errors, timeouts, and the selected policy. Cover only cases relevant to the implemented integration; use synthetic fixtures and mocked HTTP for offline tests.

Run focused tests and relevant caller checks. Run live probes only within the approved environment and authorization. Distinguish offline tests, liveness, configuration visibility, real extraction, and output-quality assessment.

Report the approved boundary; source revision; endpoint/project; mappings; proposal and deployment status; prompt status; identity/audience diagnostics; health/enrichment results; failure policy; changed files and variables; tests; blockers and owners. Mark unperformed checks explicitly.
