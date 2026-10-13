---
trigger: glob
description: Next.js App Router best practices
globs: "**/app/**/*.ts,**/app/**/*.tsx,next.config.*"
---

# Next.js (App Router)

- Server Components are the default; add `"use client"` only where
  interactivity or browser APIs demand it, and push the boundary as deep into
  the tree as possible.
- Fetch data on the server (in Server Components or route handlers), not in
  client-side effects. Use `cache`/`revalidate` options deliberately — no
  accidental dynamic rendering.
- Mutations go through Server Actions or route handlers with validation; never
  trust client-supplied identifiers for authorization.
- Use `next/image` and `next/link` — no raw `<img>` or `<a>` for internal
  navigation.
- Route segments own their loading and error states (`loading.tsx`,
  `error.tsx`); don't hand-roll spinners in pages.
- Keep environment variables server-only unless explicitly prefixed
  `NEXT_PUBLIC_`; never leak server secrets into client bundles.
