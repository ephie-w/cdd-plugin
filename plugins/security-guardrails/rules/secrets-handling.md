---
trigger: model_decision
description: Secure handling of credentials and configuration. Apply when touching auth code, environment files, CI config, or anything credential-adjacent.
---

# Secrets handling

- Configuration precedence: environment variables or a secrets manager, never
  literals in code — including "temporary" ones.
- New config values that are secret-like (keys, tokens, passwords, connection
  strings) must be documented in the project's example env file with a
  placeholder, never a real value.
- Redact secret values from log statements and error messages; log the *name*
  of the missing credential, not its value.
- Rotating a credential? Search the whole repo (and CI config) for other uses
  before assuming one call site.
