# Public Profile Page Overrides

> Inherits `design-system/bcn-account/MASTER.md`. Do not introduce a second palette, font, or radius scale.

## Dials

Keep Master: variance **4**, motion **3**, density **6**.

## Layout

- Split identity + artifact on `lg`, single column below `md`
- Sticky 64px header, max width `max-w-6xl`, `min-h-[100dvh]`
- No account sidebar on this public route
- Hero is one composition: copy left, 3D stage right — no stats/cards in the first viewport

## Surfaces

- Soft emerald radial wash + quiet zinc grain (`.profile-canvas`) — not glassmorphism
- Artifact stage: inset radial vignette + hairline border
- Milestones: single bordered strip; earned cells use `bg-primary/[0.04]`

## Motion

- Section enter: `animate-enter` (+ delays) via `--ease-premium`
- 3D artifact is the only spatial flourish; drag-to-rotate, no autoplay spin that hides the face
- `prefers-reduced-motion` / WebGL fail → static initials fallback

## Color / type

- Same zinc + emerald tokens and Plus Jakarta Sans as the account app
- Display name: tight tracking (`-0.04em`), semibold
- One accent. No purple, no extra display font, no emoji icons
