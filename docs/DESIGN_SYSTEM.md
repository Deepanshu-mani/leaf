# BookLeaf Author Support — Design System

## Product
BookLeaf is a self-publishing portal with an author-facing workspace and an operations console. Authors check book production/sales/royalties, submit queries, and read responses. Staff triage and respond to support cases across thousands of authors and a 22,000+ title catalog, processing 1,200+ books monthly. Primary jobs: find the right record quickly, understand the current state, and take a safe next action.

## Brand and interface
Use the existing BookLeaf identity and the supplied logo asset. The current color language is warm ivory canvas, white surfaces, dark green ink, muted gray-green labels, and rose accent. Keep the workspace calm, professional, and familiar to a publishing business; avoid decorative marketing motifs, gradients, neon, or dense dashboard clutter.

## Tokens
- Background `#f7f6f2`; surface `#ffffff`; text `#202c27`; muted `#78817b`; border `#e9e9e3`.
- Primary BookLeaf rose `#d56f80`; tint `#fff0f2`; success `#4e8660`; warning `#a36d2f`; critical `#ae453c`.
- DM Sans body; Manrope headings.
- Use consistent 4/8/12/16/24/32 spacing; control and card radii 8–14px; restrained shadow only for elevated cards.
- Desktop shell uses 238px sidebar and spacious content area; data tables should remain aligned with consistent row height and numeric right alignment.

## Component direction
The implementation should use ShadCN UI patterns built on accessible Radix primitives: Select, Tabs, Input, Button, Badge, Card, Table, Avatar, DropdownMenu, and Pagination as needed. Use Lucide React icons consistently (outline, 16–18px), not Unicode symbols or emoji. Keep visible focus rings, keyboard support, loading and empty states, and responsive behavior.

## Scale requirements
Never render the whole book catalog as author-grouped cards. Search, filters, server-side pagination, and compact sortable table columns should support a 22,000+ title catalog. People views should search and paginate server-side across thousands of author accounts. Database queries must select only displayed fields and aggregate counts in SQL.

## Target page designs
- Support queue: two-pane responsive workbench; narrow searchable/filterable ticket list and a stable detail/reply panel. Use compact ShadCN selects and clear priority/status badges. Keep internal notes visibly distinct from author-visible messages.
- Book catalog: one consistent toolbar and one full-width, dense but readable table. Search title/ISBN/author, filter status, align all rows identically, right-align figures, and provide server pagination and result count. No variable-height per-author table cards.
- People: search and role tabs with counts; rows/cards share consistent avatar, status, contact and activity layout.

## Motion and accessibility
Use short 120–180ms color/border transitions. Avoid layout movement on hover. Preserve focus-visible rings, labels, touch targets, and reduced-motion preferences.
