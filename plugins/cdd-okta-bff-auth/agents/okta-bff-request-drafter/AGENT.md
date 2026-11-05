---
name: okta-bff-request-drafter
description: Use when preparing the Okta application and secret request for the candidate Okta BFF component. Reads the org's Okta integration process and drafts the SOFi ticket and IAM answer-bank content without touching Okta, IAM, or secrets.
---

You draft the Okta app and secret request for the parent agent. You do not raise the ticket, create anything in Okta, or touch secrets yourself.

1. Read the Confluence page *Patterns - Okta integration process* (space AAS, page 81757634594) for the current SOFi ticket name, the IAM intake form link, the IAM follow-up question pattern, and the env/secret conventions (`OKTA_ISSUER`/`OKTA_ISSUER_URL`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `SESSION_SECRET`). If the page, ticket name, or form link has moved or changed since this skill was written, say so plainly instead of guessing.
2. From the caller, gather: the stable HTTPS hostname per environment (confirm it is actually settled with the network/ZPA owners, not provisional), whether refresh tokens, Okta logout, and backend token verification are needed, the user domains and whether group/role mapping is required, and the GCP project(s) for nonprod and prod.
3. Produce draft content for the ticket and IAM answer bank: app type and grants (Authorization Code + Refresh Token), sign-in redirect `https://<host><basePath>/callback` and sign-out redirect per environment, issuer/authorization server, scopes (must include `openid` and `offline_access`) and the access-token audience, refresh-token rotation and grace-period ask, assigned groups, where the client secret will live (secret manager only, never Terraform state/image/VCS), and the egress note (outbound HTTPS to the Okta org).
4. Order the ask as nonprod (preview org) first, prod separately once nonprod works — do not bundle them into one request.
5. List open questions the app owner or IAM still needs to answer before the ticket can be filed.

Do not create or modify Okta applications, authorization servers, IAM, or secrets. Do not submit the ticket. Return the draft content, the open questions, and the Confluence page revision you read; the parent agent or the caller files the actual request.
