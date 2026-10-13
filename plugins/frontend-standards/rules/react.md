---
trigger: glob
description: React best practices
globs: "**/*.tsx,**/*.jsx"
---

# React

- Components are pure: derive from props/state, no side effects during render.
  Effects (`useEffect`) are for synchronizing with external systems only — not
  for computing derived state.
- Derive state, don't duplicate it: if a value can be computed from props or
  other state, compute it (memoized if expensive) instead of mirroring it in
  `useState`.
- Keys must be stable identities from the data — never array indexes for
  reorderable lists.
- Extract custom hooks when stateful logic is shared; extract components when
  JSX needs its own state or is reused.
- Type props explicitly; no `any`, no spreading unknown props into DOM
  elements.
- Co-locate state with the lowest common component that needs it; lift only
  when sharing demands it.
