---
name: integrate-okta-bff-auth
description: Use when a same-origin web app (Express server + browser SPA) needs corporate Okta sign-in with tokens kept server-side, or when evaluating or integrating the candidate Okta BFF authentication component (PKCE, HttpOnly session cookie, refresh rotation, bearer forwarding to an internal API).
---

# Integrate Okta BFF authentication

The component is a `candidate`, not an approved standard. It is an Express router plus a headless React hook. The browser only holds an HttpOnly session cookie, and the BFF holds the Okta tokens and forwards the access token to upstream APIs.

## Sources

Technical authority is the component package [`components/okta-bff`](https://github.com/newscorp-ghfb/ncau-data-ai-common-components/tree/candidates/components/okta-bff) on the `candidates` branch of `newscorp-ghfb/ncau-data-ai-common-components`, published as `@newscorp-ghfb/okta-bff`. Read its `README.md`, `AGENTS.md`, `server/index.d.ts`, `server/create-okta-bff.mjs`, and `react/useOktaBffSession.ts` at the available revision (commit SHA, since the branch moves), and record that revision. The package's own `AGENTS.md` carries agent-specific review rules (PR Reviewer, QA Agent, Architect, Orchestrator sections) — follow those in addition to this skill when touching the vendored code.

If the package path is missing at the read revision, report it as **unverified** and do not reconstruct the component from memory.

No repository in the org currently imports `@newscorp-ghfb/okta-bff` (confirmed by code search at the time this skill was written) — treat "reference consumer" claims with that in mind. NewtonGPT's `apps/frontend/server/bff-auth.mjs` (in `newscorp-ghfb/ncau-data-ai-newtongpt`) implements the same PKCE/session pattern by hand, predates the extracted package, and does not import it; read it only as a design precedent, not as proof this candidate is integrated anywhere, and expect drift between the two.

The organizational process — the SOFi ticket, IAM's part, and the env/secret conventions three existing apps use — is documented in Confluence: [*Patterns - Okta integration process*](https://newsau.atlassian.net/wiki/spaces/AAS/pages/81757634594/Patterns+-+Okta+integration+process) (space AAS). That page covers journal-inbox, symfinai, and blink — none of which use this candidate package — so use it for the human/process steps and the env-var conventions, not for how `createOktaBff` itself behaves.

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

The default for both `flowStore` (one-time login flow state) and `sessionStore` (issued sessions) is `MemoryStore`, an in-process `Map`: single instance only, lost on restart, not shared across replicas. Identify the caller's instance count: VM, Cloud Run `max-instances`, or autoscaling. If more than one instance can serve a user, require a shared `OktaBffStore` for both stores (`get/set/take/delete/deleteBySubject`; never return entries past `expiresAt`; `take` must be atomic). Sessions contain refresh tokens, so require encryption at rest and BFF-only access. Refresh single-flight and the logout-during-refresh guard are per-process, so with several instances also require either a distributed lock around refresh or an Okta rotation grace period, and a conditional session write so a refresh completing on one instance cannot resurrect a session a user just logged out on another. Agree on the store with the user before implementing one. Do not ship `MemoryStore` behind a multi-instance deployment.

## 3. Prepare the Okta and secret request

Do not create or modify Okta applications, authorization servers, IAM, or secrets yourself. Delegate drafting the request to the `okta-bff-request-drafter` agent — it reads the *Patterns - Okta integration process* Confluence page and the caller's environment/role decisions, and returns ticket and IAM-answer-bank content without pulling that page into this context. Use its draft to follow the org process:

1. Before raising anything, confirm with the network/ZPA owners the final, stable HTTPS hostname for each environment — the redirect URI must match it exactly — and confirm the caller has permission to create Secret Manager secrets and run Terraform for the target project.
2. Raise the SOFi ticket **Okta - Integration - Request** and fill in the **Okta Tile / Integration Request Form**. Request the nonprod (preview org) app first; request prod separately once nonprod works.
3. The IAM team emails follow-up questions (they vary by app type). Answer them; IAM then returns the issuer URL, client ID, and client secret.
4. Only after credentials arrive, implement (step 4 below) and configure.
5. Test with a real user (section 5 below, via `okta-bff-qa-verifier`); go back to IAM if the redirect URI, scopes, or token settings need changes.

The package itself does no role mapping — any authorization decision is "assigned to the Okta app" unless the caller builds its own group-to-role logic, so make sure the drafted request is explicit about who is assigned. Env var naming is not mandated by the package (its config is plain `createOktaBff` options), but the org's existing apps converge on `OKTA_ISSUER`/`OKTA_ISSUER_URL`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, and a separate `SESSION_SECRET` for session-cookie signing — reuse that convention unless the caller has its own.

## 4. Integrate

Copy or vendor the package until a registry release exists. Record the source revision. Do not edit the source repository. The caller must install the package's peer dependencies itself: `express` `^5.1.0`, `express-rate-limit` `^8.0.0`, and (only if using the React hook) `react` `>=18`.

1. Server: `createOktaBff({ issuer, clientId, clientSecret, redirectUri, ... })`, then mount the returned `router` at `basePath`. Relevant options and their defaults: `basePath` (`/api/auth`; `redirectUri`'s path must equal `basePath + '/callback'`), `cookiePrefix` (`okta_bff`), `scopes` (`openid profile email offline_access` — must include `openid` and `offline_access`), `postLoginRedirect` (`/`), `postLogoutRedirectUri` (redirect origin + `/`), `flowTtlMs` (10 min), `sessionTtlMs` (12 h), `refreshWindowMs` (30 s), `requestTimeoutMs` (10 s), `rateLimitPerMinute` (60), `flowStore`/`sessionStore` (both default to `MemoryStore`, see step 2 above), `fetchImplementation`, `logger`. `issuer` and `redirectUri` must be HTTPS (loopback redirect URIs may use HTTP). Load config from env and the secret from the secret manager, and fail start-up on invalid config; the factory throws.
2. The router exposes `/login`, `/callback`, `/session`, `/logout` under `basePath`. Flow: `GET /login` generates `verifier`/`state`/`nonce`, stores them in `flowStore` keyed by a one-time flow cookie, and redirects to Okta's `/v1/authorize`. Okta redirects back to `GET /callback?code&state`; the router validates `state` (constant-time) and the one-time flow entry, exchanges `code` for tokens, validates the ID token (`iss`/`aud`/`nonce`), cross-checks the subject against `/v1/userinfo`, stores the session in `sessionStore`, and sets the HttpOnly session cookie. No token ever reaches the browser.
3. Before proxying `/api`, call `await accessTokenFor(request)`. It refreshes the access token when it is within `refreshWindowMs` of expiry (concurrent refreshes for one session share a single Okta request; access and refresh tokens are replaced together for rotation; a failed refresh deletes the session). If it returns `null`, respond 401. Otherwise set `Authorization: Bearer <token>`. Do not forward a browser-supplied `Authorization` header when Okta is the provider.
4. Browser: use `useOktaBffSession({ basePath })`, which polls `/session` every 60 s and exposes `{ authenticated, user }` plus `callback_failed` / `session_check_failed` error states; it holds no tokens. Render the app's own login UI and navigate to `/login` / `/logout`. The `./react` export is TypeScript source, so the caller's bundler must compile it.
5. Keep security headers (CSP, `frame-ancestors 'none'`) and `trust proxy` correct, so that `Secure` cookies and rate limiting see the real client.

## 5. Verify and report

Add caller tests with a mocked `fetchImplementation` covering at least what the component's own `AGENTS.md` requires of callers (login redirect, callback success and replay rejection, mismatched subject, refresh and logout races, store-unavailable handling — the `okta-bff-qa-verifier` agent checks for the full list). Once the integration code and tests exist, delegate verification to that agent rather than asserting pass/fail yourself: it runs the package's and caller's test suites, checks the caller's test coverage against the required list, and — when a real Okta app and test user are available — runs the manual nonprod sign-in checklist and reports pass/fail with evidence. This keeps verification independent of whoever wrote the integration, and keeps raw test/log output out of this context.

If verification is not possible (no owner-provisioned Okta app or test user yet), have it mark those checks **not performed** with an owner, rather than skipping the report.

Report:

- Fit and gaps
- Source revision (commit SHA) of `components/okta-bff`
- Whether any consumer in the org actually depends on `@newscorp-ghfb/okta-bff` yet, versus a hand-rolled predecessor like NewtonGPT's
- Store decision (`flowStore` and `sessionStore`) and instance count
- Okta/secret request status (SOFi ticket number, nonprod vs. prod)
- Changed files and env vars
- Tests run, including which of the automated/manual lists above were skipped and why
- Upstream token-validation evidence
- Unperformed checks and their owners
