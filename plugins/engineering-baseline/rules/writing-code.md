---
trigger: model_decision
description: Best practices for writing new code. Apply when implementing features, fixing bugs, or refactoring.
---

# Writing code

- Before writing anything, read the neighboring code: existing utilities,
  naming conventions, and test patterns. Reuse before reinventing.
- Name things for what they are, not how they're used today. Good names remove
  the need for most comments.
- Comments explain *why*, never *what* — and never narrate the change you just
  made.
- Keep functions small enough to hold in your head; extract when a block needs
  its own comment to be understood.
- Make illegal states unrepresentable where the language allows it (enums over
  booleans, narrow types over strings).
- New dependencies need justification: prefer the standard library and
  already-present libraries; pin versions published at least 7 days ago.
- Write general-purpose solutions — no hard-coding values or special-casing
  inputs just to make a test pass.
