# NewtonGPT reference implementation

Repository: `newscorp-ghfb/ncau-data-ai-newtongpt`, branch `dev`, revision
`c783b49be28dfa46454539b6d6432d111c89d787`. Line numbers are for that
revision; re-check them if you read a different one.

Base: `https://github.com/newscorp-ghfb/ncau-data-ai-newtongpt/blob/c783b49be28dfa46454539b6d6432d111c89d787/`

| Invariant | File and lines | Notes |
| --- | --- | --- |
| 1. Private storage, least privilege | `terraform/main.tf` 324-328 (`backend_source_reader`); `terraform/variables.tf` 104-111 (`source_bucket_name`) | Only the backend service account gets `roles/storage.objectViewer`, scoped to the whole bucket. The bucket already exists and is not created here. `terraform/modules/cloud_storage` sets uniform access and `public_access_prevention = "enforced"`, but nothing references that module. |
| 2. Allowlist | `apps/backend/src/source_access.py` 48-100 (`parse_source_uri`, `validate_source_object`, `parse_legacy_source_url`) | Requires bucket == `SOURCE_BUCKET_NAME` and the `documents/` prefix. Rejects `..`, NUL, and absolute paths. Accepts only `gs://` and `storage.(cloud.)google(apis).com` URLs. |
| 3. Opaque reference | `apps/backend/src/conversation_store.py` 76-81 (`_user_key`), 159-160 (`source_url`), 162-279 (`persist_exchange`) | Uses a random `uuid4().hex` per source and preview, stored under `newtongpt_users/{sha256(iss\0sub)}/conversations/{cid}/sources/{sid}`. The public URI is `/api/v1/conversations/{cid}/sources/{sid}`. |
| 3. Legacy token (do not copy as is) | `apps/backend/src/source_access.py` 103-156 | HMAC-SHA256 with a key derived from `INTERNAL_API_KEY`, payload `{v, b, o, exp}`, 12-hour lifetime. Not bound to a user. Still accepted at `/api/v1/sources/{token}`, and accepted after expiry only for history import. |
| 4. Authorise every open | `apps/backend/api/main.py` 122-134 (middleware), 443-466 (`download_conversation_source`); `apps/backend/src/conversation_store.py` 329-347 (`resolve_source`) | The BFF HMAC signature and the Okta/Google JWT are checked on every request. Lookup is scoped to the caller. Missing or unowned references return 404. The allowlist is re-validated on read. |
| 5. Constrained response | `apps/backend/api/main.py` 90-92 (limits), 340-380 (`stream_source_object`) | 100 MB cap, 1 MB chunks, allowed types pdf/jpeg/png/webp, `inline` disposition, `no-store`, `nosniff`. |
| 5. Proxy hop | `apps/frontend/server/proxy-response.mjs`; `apps/frontend/server/index.mjs` 115-173 | Binary bodies are passed through only on the two source routes and only for allowed types. Only an `inline` disposition is forwarded. |
| 6. Audit | `apps/backend/api/main.py` 458-463, 486-490; `apps/backend/src/analytics.py` (`publish_event`, `document_open`) | Pub/Sub to BigQuery. The user ID is pseudonymous. |
| 7. Lifecycle | `apps/backend/src/conversation_store.py` 323-327 (`delete_conversation`, recursive delete) | Import of legacy history uses `allow_expired=True`. |

Tests at the same revision:

- `apps/backend/tests/test_source_access.py`: token round trip, tamper, expiry, other buckets and hosts.
- `apps/backend/tests/test_source_prefix.py`: paths outside `documents/`.
- `apps/backend/tests/test_conversation_security.py`: pseudonymous user key, traversal, expired-token migration only, and a stable route that contains no identity or storage location.
- `apps/frontend/server/proxy-response.test.mjs`: binary allowlist on source routes only.
