# Security guardrails

Always-on security posture for every session.

- Never write secrets, tokens, or credentials into source files, logs, or
  commit messages. Load them from the environment or a secrets manager.
- Never commit files likely to contain secrets (`.env`, `credentials.json`,
  key material) — warn instead.
- Treat all external input as untrusted at trust boundaries: validate,
  parameterize queries, escape output.
- Do not weaken security policies, branch protection, or dependency-age
  controls to get past a failing build — escalate instead.
