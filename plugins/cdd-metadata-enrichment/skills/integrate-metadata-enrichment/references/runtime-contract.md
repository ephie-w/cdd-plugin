# Runtime contract

## Request and processing

`POST /enrich`, JSON content type:

```json
{
  "project": "demo",
  "documents": [
    {
      "doc_id": "article-001",
      "text": "Acme reported a 12% increase in revenue.",
      "structured_fields": {"date_live": "2026-09-24T00:00:00Z"}
    }
  ]
}
```

- `project` is a non-empty string of at most 100 alphanumeric, hyphen, or underscore characters. It selects the project configuration, independently of schema `project_id` or the Google Cloud project.
- `documents` must be a non-empty array. Each record needs `doc_id` and `text`; use string IDs, non-empty string text, and a JSON object for optional `structured_fields` (default `{}`). The API's request validation is incomplete; malformed types can produce 500. Do not describe all malformed inputs as guaranteed 400.
- Each record becomes one chunk: internal `chunk_id=request-<index>`, `context=text`, placeholder `vector=[0.0]`. The service does not split text, generate embeddings, store results, or fetch content from URLs.
- Results are assembled in input order. Duplicate `doc_id` values are supported and processed independently at the API boundary. The internal chunk identifier is not a promised response correlation field.
- The API may fall back from batch to individual processing. Missing output becomes a per-record processing error.

## Results and caller validation

Processed requests return HTTP 200 with this shape, even when every record fails:

```json
{
  "status": "partial_success",
  "project": "demo",
  "total": 2,
  "successful": 1,
  "failed": 1,
  "results": [
    {"doc_id": "same", "status": "success", "metadata": {"doc_id": "same"}},
    {
      "doc_id": "same",
      "status": "error",
      "error": "No enrichment output returned",
      "error_type": "ProcessingError"
    }
  ]
}
```

The example corresponds to two input records with ID `same`; their texts may differ. Validate:

1. A JSON object, matching `project`, and list-shaped `results`.
2. Integer, non-negative counts: `total == len(inputs) == len(results)` and `successful + failed == total`. Count record statuses and compare with both counters.
3. `status == success` exactly when `failed == 0`; otherwise `partial_success`, including `successful == 0`.
4. One result per input position, with the matching `doc_id`. Match by position and ID together. An ID-only dictionary loses duplicate records; positional correlation follows the service contract. Reordering records with identical IDs cannot be detected from IDs alone.
5. Each result has a recognized status; success has an object `metadata`, error has string `error` and `error_type`. Reject malformed results instead of fabricating missing outcomes.
6. Apply the caller's required metadata, type, taxonomy, date, and nested-object rules to successful metadata before indexing. Optional absence should follow the agreed field contract.

HTTP success and a successful record indicate that output exists, not that all configured fields were extracted. `required`, `default_value`, and `validation_rules` are not universal output guarantees. LLM failures can be swallowed into missing fields or empty metadata; NLP failures can become empty lists. A non-empty result can still fail caller validation.

For a retry subset, retain each record's original caller position or durable correlation key. If the caller requires IDs unique for persistence, enforce that as a caller rule rather than claiming a server restriction.

Sources: `services/metadata_enrichment_api/app.py`; `tests/test_metadata_enrichment_api_results.py`; `services/metadata_enrichment/normalizer.py`; `services/metadata_enrichment/extractors/prompt_executor.py`.

## HTTP diagnostics

| Outcome | Meaning and integration action |
|---|---|
| 400 | Explicit envelope/project/key validation failure; correct the request |
| 404, `Project not found` | No project configuration found; check endpoint/environment/project and return to configuration onboarding |
| 500, `Invalid project configuration` | Schema, prompt loading, or orchestrator initialization failure; involve the Metadata owner |
| 503, `Configuration backend unavailable` | Backend read failure; bounded retry may be appropriate |
| 500, `Internal server error` | Unhandled failure; diagnose without assuming it is transient |
| 401/403 | Check token identity/audience and access with platform owner; do not mutate IAM |
| Timeout/network failure | No trustworthy batch result; apply the request failure policy |

Cloud Run performs invocation authentication outside Flask. Do not infer public reachability, an admin-specific role, or the live IAM binding from the route names or Terraform defaults.

`GET /health` returns `{"status":"healthy","service":"metadata-enrichment-api","version":"1.0.0"}`. This static version is not a deployment commit. Health does not load a project or exercise Vertex AI/spaCy.

`GET /admin/configs` returns backend project listings and cache statistics. `GET /admin/configs/<project>` returns `project` and parsed `config`; it does not build an orchestrator. Treat parsed configuration as potentially sensitive and avoid copying the entire response to logs.

`POST /admin/configs/<project>/reload` and `POST /admin/cache/clear` mutate runtime caches and are outside this skill's execution scope.

## Structured fields and extraction

- `heuristic.from_structured` resolves `source_field` within `structured_fields`, with nested dot paths. `source_field: content.date.live` requires `{"content":{"date":{"live":"..."}}}` within `structured_fields`, not a flat dotted key.
- If a configured chunk output name already exists in `structured_fields`, extraction is skipped even for `null`, `""`, or `[]`. Do not prefill empty generated output keys unless deliberately suppressing extraction.
- Prefer `level: chunk` for HTTP projects. Legacy document-level action names do not imply aggregation; the current loop does not populate or propagate its document metadata cache.
- Supported NLP output names are `people`, `organizations`, `locations`, `products`, `events`, and `work_of_arts`. NLP uses `threshold`/`max_length`; `max_items` is not enforced by its filter.
- Use `heuristic.from_structured` and `heuristic.pattern` for implemented heuristic operations. Bare `heuristic` and `heuristic.keywords` do not provide keyword extraction in this implementation.
- Derived fields run last. Their `pattern` supports string `==`/`!=` comparisons with uppercase ` AND `/` OR `; `default_value` supplies two `|`-separated branches. It is not a general expression evaluator.
- Normalization retains schema-defined and recognized system fields, trims strings, removes null list elements, and performs limited string/list/int/float conversion. It does not enforce date, boolean, taxonomy, or nested sentiment validity. Weaviate normalization changes dots/hyphens in field names to underscores; check collisions in proposals.

Sources: `execution_plan.py`, `orchestrator.py`, `normalizer.py`, and `extractors/` under `services/metadata_enrichment/`.

## Configuration activation

Configurations are loaded from `<CONFIG_BASE_DIR>/<project>/config.yaml` or `gs://<CONFIG_GCS_BUCKET>/<CONFIG_GCS_PREFIX>/<project>/config.yaml`. Prefix defaults to `configs`; registry TTL defaults to 300 seconds. `CONFIG_BACKEND` accepts `local`, `gcs`, or `auto`; auto gives local/image configuration priority. A shadowing local config can prevent a GCS edit from taking effect.

After registry TTL expiry, an enrichment request reads configuration and refreshes its orchestrator when the effective configuration fingerprint changes. Explicit reload bypasses TTL and builds a replacement before publishing it. Cache behavior is process-local; neither method updates every running instance at once. A failed explicit reload does not publish the replacement; normal expiry rules still apply.

Image-bundled YAML needs an image release. GCS YAML can change without rebuilding the image when no new code/prompts are required. Python prompt modules are imported application code; YAML reload does not ship or reliably refresh changed Python prompts. Their changes need an image release/restart by the service owner.

Sources: `services/common/config_registry.py`, `services/metadata_enrichment_api/configuration.py`, and `services/metadata_enrichment/extractors/prompt_loader.py`.
