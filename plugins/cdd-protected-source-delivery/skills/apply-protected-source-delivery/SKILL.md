---
name: apply-protected-source-delivery
description: Use when users must open original source files (PDFs, images) cited by an assistant or search UI and those files live in private object storage, or when evaluating or reviewing how an app serves cited documents without exposing the bucket (opaque user-bound references, authenticated streaming, signed-URL trade-offs).
---

# Apply protected source document delivery

This is a `draft` pattern, not an approved standard and not a library. There is no code to copy: each implementation is written in the caller's own stack. NewtonGPT is one reference implementation on GCP (GCS, Firestore, FastAPI, Express BFF). Use it as evidence of behaviour, not as a stack requirement.

The pattern controls **who can open a link**, not per-document entitlement. If users are entitled to different documents, it must sit behind permission-aware retrieval, which this pattern does not provide.

## Sources

The reference implementation is `newscorp-ghfb/ncau-data-ai-newtongpt` at the revision pinned in the core catalogue. [`references/newtongpt-reference.md`](references/newtongpt-reference.md) maps each invariant below to files, line ranges, and tests at that revision. Read those files before you cite them. If the repository or revision cannot be read, mark the affected claims **unverified**; do not reconstruct the behaviour from this skill.

## 1. Check fit

The pattern fits when all of these hold:

- Source files sit in object storage (GCS, S3, Azure Blob, etc.) and must stay private.
- End users are authenticated by an app or API that can identify them on every request.
- The app issues file links at answer or search time, so it can record which user the link was issued to.

It does not fit when:

- The files are public.
- The storage platform authorises each end user directly, for example per-user ACLs or delegated access such as Google Drive or SharePoint permissions.
- Users have different document entitlements and retrieval is not permission-aware.

Report the caller's fit, gaps, and code evidence before you propose changes.

## 2. Choose the delivery mode

- **A. Authenticated streaming (default; reference implementation).** The API reads the object with its own runtime identity and streams it to the user. The browser never receives a storage URL. The costs are API bandwidth and request duration, plus a file-size cap.
- **B. Just-in-time short-lived signed URL.** After the same checks as in A, the API redirects to a signed URL with a time-to-live of a few minutes, a forced `Content-Disposition`, and a fixed content type. Choose B only when file sizes or traffic make streaming impractical. Record the trade-off: within its TTL, the URL works for anyone who has it.

Never use these designs:

- A public bucket.
- Long-lived signed URLs embedded in answers or stored in chat history.
- Raw `gs://`, `s3://`, or storage-console URLs sent to the browser.

## 3. Invariants

1. **Private storage, least privilege.** Prevent public access on the bucket. Only the API runtime identity can read objects, and the frontend or BFF identity has no storage access. Scope read access to the document prefix where the platform supports it, for example a GCS IAM condition on the object name, an S3 bucket policy on the prefix, or an Azure container-level role.
2. **Allowlist at issue time and at open time.** Accept only the configured bucket and document prefix. Normalise the path, then reject traversal (`..`), NUL characters, absolute paths, other hosts, and other buckets. Validate again when the file is opened, not only when the reference is issued.
3. **Opaque, user-bound reference.** Replace the object path with a random ID of at least 128 bits. Store it server-side as `{bucket, object, owner, message}` in the user's own partition, such as a subcollection or a row with an owner column. The client URL contains no storage location and no user identifier. If you use a stateless signed token instead, it must include the user subject and an expiry, and it must be checked against the caller. The reference implementation's legacy HMAC token was not bound to a user; do not repeat that.
4. **Authenticate and authorise every open.** Use the same authentication as the rest of the API. Look up the reference only within the caller's scope. Return 404 for missing or unowned references, so the response does not reveal whether a reference exists.
5. **Constrained response.**
   - Read the object's metadata first.
   - Enforce a size cap.
   - Allow only an explicit list of content types, taken from stored metadata rather than the file extension.
   - Stream in bounded chunks.
   - Set these headers: `Content-Disposition: inline` with an RFC 5987 filename, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, and `Content-Length`.
   - Every proxy hop must also allow binary bodies only on the source routes and only for the allowed types.
6. **Audit.** Emit a document-open event with a pseudonymous user ID, the reference ID, and the document title, never file content.
7. **Lifecycle.** Delete references together with their conversation. If you replace old link formats, migrate them deliberately, and accept expired legacy references only during migration.

## 4. Map to the caller's stack

| Concern | Reference (GCP) | Typical alternatives |
| --- | --- | --- |
| Object store | GCS, uniform bucket-level access | S3 with Block Public Access; Azure Blob, private container |
| Read identity | Cloud Run service account with `roles/storage.objectViewer` on the bucket | IAM role with `s3:GetObject` on the prefix; managed identity with Storage Blob Data Reader |
| Reference store | Firestore `users/{hash(iss,sub)}/conversations/{id}/sources/{sourceId}` | Postgres table `(source_id PK, owner, bucket, object, message_id)`; DynamoDB with partition key = owner |
| Streaming API | FastAPI `StreamingResponse` | Express `pipeline`, Spring `StreamingResponseBody`, Go `io.Copy` |
| Proxy hop | Express BFF with a route and content-type allowlist | API gateway or edge function with the same allowlist |

## 5. Weaknesses in the reference to avoid

- Read access is granted on the whole bucket. Scope it to the document prefix.
- The legacy `/api/v1/sources/{token}` token is not bound to a user; any authenticated user can replay it for up to 12 hours.
- HTTP Range requests are not supported, so large PDFs cannot load incrementally. Add validated Range support if files are large.
- A new storage client is created for every request. Reuse one client.
- The source bucket is not managed as infrastructure as code, so public-access prevention and uniform access cannot be verified from the repository.

## 6. Prepare owner requests

Do not change buckets, IAM, secrets, or the reference repository yourself. Produce a request for the platform or data owner that names:

- The bucket and document prefix.
- The API runtime identity and the exact read role, with its prefix condition.
- Confirmation that public-access prevention and uniform access are enabled.
- Where references are stored, and their retention.

## 7. Verify and report

Add or confirm caller tests covering:

- Paths outside the allowlist rejected: other bucket, other host, traversal, NUL character, wrong prefix.
- A reference issued to user A returns 404 for user B.
- Unauthenticated requests are rejected.
- A disallowed content type is rejected (415).
- An oversized object is rejected (413).
- Response headers are present.
- The proxy refuses binary bodies on other routes.
- Issued URLs contain no bucket, object path, or user identifier.
- Any stateless token rejects tampering, expiry, and a different user.

Run the caller's lint, build, and tests. Opening a real file needs a deployed environment and an approved test user; if that is unavailable, mark it **not performed**.

Report:

- Fit and gaps.
- Delivery mode and why.
- Invariants met, missing, or not applicable, each with evidence.
- Owner requests.
- Changed files.
- Tests run.
- Unperformed checks and their owners.
