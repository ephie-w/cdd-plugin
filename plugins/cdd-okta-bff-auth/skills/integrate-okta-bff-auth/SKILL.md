---
name: integrate-okta-bff-auth
description: Use when a same-origin web app (Express server + browser SPA) needs corporate Okta sign-in with tokens kept server-side, or when evaluating or integrating the candidate Okta BFF authentication component (PKCE, HttpOnly session cookie, refresh rotation, bearer forwarding to an internal API).
---

# Integrate Okta BFF authentication

The component is a `candidate`, not an approved standard. It is an Express router plus a headless React hook. The browser only holds an HttpOnly session cookie, and the BFF holds the Okta tokens and forwards the access token to upstream APIs.

## Sources

Technical authority is the component package in the source repository: [`apps/frontend/packages/okta-bff-auth`](https://github.com/newscorp-ghfb/ncau-data-ai-newtongpt/tree/dev/apps/frontend/packages/okta-bff-auth) in `newscorp-ghfb/ncau-data-ai-newtongpt`. Read its `README.md`, `server/index.d.ts`, `server/create-okta-bff.mjs`, and `react/useOktaBffSession.ts` at the available revision, and record that revision. NewtonGPT is the reference consumer:

- Provider wrapper: `apps/frontend/server/bff-auth.mjs`
- Bearer forwarding: `apps/frontend/server/index.mjs`
- React adapter: `apps/frontend/src/auth/AuthContext.tsx`
- Backend JWT validation: `apps/backend/src/auth.py`
- Secret wiring: `terraform/` (`okta_*` variables and the frontend startup template)

If the package path is missing at the read revision, report it as **unverified** and do not reconstruct the component from memory.

## 1. Check fit

Fits when all of these hold:

- An Express 5 server (Node ≥ 20) serves the SPA, or proxies it, on the same origin as `/api`.
- Users sign in with an Okta OIDC Web application (client secret), using an authorization server that issues refresh tokens (`offline_access`).
- Upstream APIs accept an Okta access token as a bearer and validate it themselves.

Does not fit, or needs extra work:

- Pure SPA or mobile clients with no server.
- Non-Express servers. Only the pattern is reusable there.
- Non-Okta IdPs. Endpoints are hard-wired to `{issuer}/v1/*`.
- Cross-site API calls that depend on third-party cookies.
- Multi-instance deployments without a shared store.

The component **does not** validate token signatures. Every upstream API must verify `iss`, `aud`, `exp`, and signature against `{issuer}/v1/keys`; the reference is NewtonGPT's `validate_okta_user`. Report fit, gaps, and evidence from the caller's code before editing.

## 2. Decide the session store

The default is `MemoryStore`, which is single instance and loses sessions on restart. Identify the caller's instance count: VM, Cloud Run `max-instances`, or autoscaling. If more than one instance can serve a user, require a shared `OktaBffStore` (`get/set/take/delete/deleteBySubject`; never return entries past `expiresAt`; `take` must be atomic). Sessions contain refresh tokens, so require encryption at rest and BFF-only access. With refresh-token rotation across instances, require a distributed refresh lock or an Okta rotation grace period. Agree on the store with the user before implementing one. Do not ship `MemoryStore` behind a multi-instance deployment.

## 3. Prepare the Okta and secret request

Do not create or modify Okta applications, authorization servers, IAM, or secrets yourself. Produce a request for the identity/platform owner containing:

- App type: Web; grants: Authorization Code + Refresh Token.
- Sign-in redirect `https://<host><basePath>/callback`; sign-out redirect (defaults to `https://<host>/`).
- Issuer and authorization server, scopes, and the access-token audience the upstream API will check.
- Refresh-token rotation and grace-period settings.
- Assigned groups.
- Where the client secret will live: a secret manager readable only by the BFF runtime identity. Never Terraform state, the image, or VCS. NewtonGPT's Terraform pattern creates a placeholder secret version, and the real value is uploaded out of band.
- Egress: the BFF needs outbound HTTPS to the Okta org; NewtonGPT dev uses Cloud NAT.

## 4. Integrate

Copy or vendor the package until a registry release exists. Record the source revision. Do not edit the source repository.

1. Server: `createOktaBff({ issuer, clientId, clientSecret, redirectUri, cookiePrefix: '<app>', sessionStore? })`, then mount `router` at `basePath` (default `/api/auth`). Load config from env and the secret from the secret manager, and fail start-up on invalid config; the factory throws.
2. Before proxying `/api`, call `await accessTokenFor(request)`. If it returns `null`, respond 401. Otherwise set `Authorization: Bearer <token>`. Do not forward a browser-supplied `Authorization` header when Okta is the provider.
3. Browser: use `useOktaBffSession({ basePath })` for pending/login/logout state, and render the app's own login UI. Keep `getAccessToken` returning nothing in the browser.
4. Keep security headers (CSP, `frame-ancestors 'none'`) and `trust proxy` correct, so that `Secure` cookies and rate limiting see the real client.

## 5. Verify and report

Run the package tests (`node --test packages/okta-bff-auth/server/*.test.mjs` or the vendored equivalent) and the caller's lint, build, and tests. Add caller tests with a mocked `fetchImplementation` covering: login redirect (S256, scopes, redirect URI), callback success and state/flow replay rejection, `/session` without tokens, 401 without a session, refresh, and logout of all sessions for the subject. A real Okta sign-in needs the owner-provisioned app and a test user; mark it **not performed** if they are unavailable.

Report:

- Fit and gaps
- Source revision
- Store decision and instance count
- Okta/secret request status
- Changed files and env vars
- Tests run
- Upstream token-validation evidence
- Unperformed checks and their owners
