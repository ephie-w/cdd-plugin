# Configuration and prompt proposals

Use this reference for Metadata-team handoff files, after the caller boundary is approved. Generate proposals in the caller's deliverables directory, not in the service checkout. The intended service destination is `live/<project>/config.yaml` or its configured GCS equivalent; `<project>_metadata/` is a proposal directory only.

## Deterministic starting example

Replace `demo` with the approved project key and schema name. Select fields from actual caller requirements. Extractors and capabilities belong inside `metadata_enrichment.schema`. Explicitly disable unused capabilities; enabled extractors may initialize even when no field needs them.

```yaml
metadata_enrichment:
  schema:
    schema_name: demo
    project_id: demo
    vector_db_type: weaviate
    custom_fields:
      - name: publication_date
        extractor: heuristic.from_structured
        source_field: date_live
        level: chunk
        type: datetime
        required: true
      - name: mentioned_percentages
        extractor: heuristic.pattern
        level: chunk
        type: list
        pattern: '(?<!\w)\d+(?:\.\d+)?%'
    extractors:
      heuristic: {}
    enrichment_capabilities:
      enable_llm: false
      enable_nlp: false
      enable_heuristic: true
      enable_derived: false
```

This example makes no model calls; it still requires installed service dependencies. `vector_db_type` controls normalization, not storage. `project_id` is schema metadata, not the request router or Vertex project. `description` in field YAML is informational: `FieldDefinition` does not declare it and it is not automatically injected into prompts.

To add LLM/NLP, declare the requested fields, enable their capabilities, and place settings under `schema.extractors`. Use `nlp.model: en_core_web_sm` when the deployed image contains that model. Derive LLM settings from the actual target project's current config:

- `model`, `vertex_ai_project`, `vertex_ai_location` must be approved and available together. Do not copy a model name from old documentation or infer regional availability from Cloud Run's region.
- `prompt_file` is an importable Python module, such as `live.default.prompts`, not YAML or a filesystem filename.
- `parallel_prompts`, positive `max_parallel_prompts`, `max_workers`, and `merge_strategy` govern concurrency/merging. Do not silently increase service concurrency from the caller.
- `llm_provider` does not switch provider: current code constructs `GoogleGenAIChatGenerator(api="vertex")`.
- `${NAME}` requires a service environment value; `${NAME:default}` permits a fallback. A caller-side variable does not populate the service environment.

## LLM prompt proposals

Read the current target prompt module and `prompt_loader.py`, `llm_extractor.py`, and `prompt_executor.py` before proposing changes. Prompt constants are strings with uppercase names containing `PROMPT`. Templates read article text from `{{ document.content }}` and dependency metadata from `{{ document.meta }}`.

For each LLM field, provide a field-level prompt specification: input, output JSON key and type, taxonomy/shape constraints, missing-value behavior, and synthetic example. Multiple compatible base fields may share a prompt; the runtime does not require one physical prompt constant per field. List the intended constant/binding and fields returned. Use `extractor_config.prompt` when a field must select a particular constant.

Unbound LLM fields run shared prompts (loaded constants excluding prompts bound to schema fields). Explicitly bound fields are grouped by the selected constant. Results are filtered to requested field names. Adding a separate constant per field without bindings can cause unnecessary model calls. A missing bound constant fails initialization. Prompt-returned JSON keys must match configured names; YAML `description` alone does not tell the model what to return.

Dependent fields have this shape:

```yaml
# Under metadata_enrichment.schema.custom_fields; declare both upstream fields too.
- name: sentiments
  extractor: llm
  level: chunk
  type: list
  required: false
  default_value: []
  depends_on:
    - topics
    - organizations
  extractor_config:
    prompt: SENTIMENTS_PROMPT
```

Dependencies must reference declared base chunk fields. Self, unknown, document-level, derived, and dependent-to-dependent references are rejected. Execution is triggered when **any dependency key exists**, even if its value is empty/null; this is not an all-dependencies-ready rule. Only present dependency entries are passed in `document.meta`. With none present, extraction is skipped without automatically inserting `default_value`.

Default sentiment is an LLM field, not a distinct extractor or endpoint. The default prompt requests `target`, `overall` (`label`, `basis`, `confidence`), and `evidence` (`text`, `label`, `holder`). These are prompt-level instructions; the caller must validate its required nested contract. Other projects, including `dataco`, may use different bound sentiment prompts; inspect the selected module rather than assuming interchangeable semantics.

Save prompt specifications as `<project>_metadata/prompt-proposal.md` (or an agreed format), clearly labeled for review. If Python constants are requested, label the resulting module as proposed application code requiring the Metadata team's image release. Do not report deployment from file creation.

## Handoff contents and activation evidence

Generate `<project>_metadata/metadata-team-request.md` with:

- Caller purpose, approved boundary, environment, endpoint, project key, owners, and runtime identity.
- Input and output mappings, required metadata, field/extractor table, dependencies, and prompt bindings.
- Expected volume, batch size, latency/failure expectations, and data restrictions.
- Config and prompt proposal paths; target backend; required environment/model settings; any image release requirement.
- Requested deployment/access actions and the evidence needed to confirm readiness.

Use the service repository's `docs/PROJECT_ONBOARDING.md` for submission instructions. Verify owners and the access-request route there or in a current source it links; if they are absent, mark them unknown and ask the Metadata team. Do not send the request to another person without user authorization.

An existing deployed configuration can satisfy onboarding. Otherwise wait for deployment confirmation. Read-only config inspection can show the effective YAML visible in one process, but a healthy service or visible YAML alone does not prove model access, prompt execution, fleet-wide activation, or extraction quality.
