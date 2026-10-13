# Engineering baseline

Always-on standards for every session. Keep this list short — every line
costs context in every session.

- Prefer minimal, focused diffs: change only what the task requires; no
  drive-by refactors or unrelated formatting churn.
- Match the surrounding code's style, naming, and idioms before introducing
  your own.
- Never weaken types to make code compile (`any`, unchecked casts, reflection
  for ordinary attribute access). Understand the type, then use it correctly.
- Handle errors at the boundary where you can act on them; don't swallow
  exceptions or return sentinel values silently.
- Run the project's lint, typecheck, and tests before declaring work done.
