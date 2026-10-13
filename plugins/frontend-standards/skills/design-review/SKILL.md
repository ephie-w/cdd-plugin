---
name: design-review
description: Review a UI change for visual quality, consistency, and accessibility. Use when asked to review frontend changes, screenshots, or a deployed preview.
---

# Design review

Available as `/frontend-standards:design-review`.

## Steps

1. Render the change: run the dev server or open the preview deployment, and
   capture the affected screens at desktop and mobile widths.
2. Check visual consistency: spacing scale, typography hierarchy, color tokens
   from the design system (no hard-coded hex values), alignment to the layout
   grid.
3. Check states: hover, focus, disabled, loading, empty, error, and overflow
   (long text, many items, zero items).
4. Check accessibility: keyboard navigation order, visible focus rings, alt
   text, contrast, labels on form controls.
5. Report findings with screenshots, grouped by severity, each tied to a
   specific screen and state.
