---
name: integrate-metadata-enrichment
description: Use when a project needs to call the shared Metadata Enrichment API for entity extraction, classification, sentiment, or other configured document metadata.
---

# Integrate Metadata Enrichment

Guide the caller through identity, access, project configuration, and an authenticated API request. Reuse information and authorization already provided.

## 1. Confirm the endpoint and caller

Identify the target environment, Cloud Run service URL, GCP project, region, service name, and Metadata project key. The Metadata project key selects extraction configuration; it is distinct from the GCP project.

The caller can use a Service Account (SA) or a personal Google account. For an application, use its runtime SA; if none exists, guide the user to request one through their team's access process. For a personal call, use the approved personal account.

## 2. Request Invoker access

Ask the service owner or platform team to grant the actual caller access:

| Item | Required value |
|---|---|
| Principal | `serviceAccount:<sa-email>` or `user:<google-account-email>` |
| Role | `roles/run.invoker` |
| Permission included | `run.routes.invoke` |
| Resource | The target Metadata Cloud Run service |

Provide the principal, environment, GCP project, region, and service name in the access request. Confirm access is granted; do not infer it from an SA's existence or a successful login. Do not change IAM yourself.

## 3. Confirm the Metadata project

Use an existing deployed project configuration when it meets the caller's needs. Otherwise, give the Metadata team the project key, desired output fields, and mappings from source data to `structured_fields`, and request configuration deployment. Include prompt requirements for custom LLM fields. File creation alone does not mean configuration is deployed.

Read [configuration proposals](references/configuration-proposals.md) only when preparing a new or changed configuration. Do not deploy the service or publish configuration yourself.

## 4. Authenticate and call

- **Runtime SA:** use the runtime's Google authentication mechanism to obtain an ID token for the target service URL (or its configured custom audience).
- **Personal account:** use `gcloud auth login <email>` and obtain a token with `gcloud auth print-identity-token --account=<email>`. Google supports this personal CLI token for development/manual verification; use a runtime SA for ongoing application calls.

Send the ID token in `Authorization: Bearer <ID_TOKEN>`. An OAuth access token is not a substitute. Do not print tokens or ask the user to send credentials in chat.

First call `GET <SERVICE_URL>/health` with the same authorization header. Then call:

```http
POST <SERVICE_URL>/enrich
Authorization: Bearer <ID_TOKEN>
Content-Type: application/json
```

```json
{
  "project": "<metadata-project-key>",
  "documents": [
    {
      "doc_id": "article-001",
      "text": "Acme reported a 12% increase in revenue.",
      "structured_fields": {
        "date_live": "2026-10-19T00:00:00Z"
      }
    }
  ]
}
```

Adapt `structured_fields` to the deployed mappings. Use non-empty text and string IDs. For verification requests, use synthetic content within the user's authorized scope; the service logs content previews.

## 5. Handle the result

HTTP 200 can contain `partial_success`. Check each result's status and required metadata before storage or indexing. Results follow input order; duplicate `doc_id` values must not be collapsed into an ID-keyed dictionary. Use the caller's explicit failure-handling policy.

On token failure or 401/403, report the actual identity, audience, and status so access can be checked. For `404 Project not found`, confirm the environment and project key with the Metadata team. Health success alone does not verify extraction.

Read [the runtime contract](references/runtime-contract.md) when implementing a client or diagnosing response/configuration behavior.

## Sources

Use the [service repository](https://github.com/newscorp-ghfb/nca-component-metadata-enrichment-svc) for API behavior and `docs/PROJECT_ONBOARDING.md` for onboarding. The [Confluence page](https://newsau.atlassian.net/wiki/spaces/AAS/pages/81516068956/Metadata+Enrichment+SVC) provides the capability overview. Check [Cloud Run authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service) for IAM and runtime tokens, and [ID token methods](https://docs.cloud.google.com/docs/authentication/get-id-token) for personal calls.