# Public Profile Page Overrides

> Inherits `design-system/bcn-account/MASTER.md`. Do not introduce a second palette, font, or radius scale.

## Dials

Keep Master: variance 4, motion 3, density 6.

## Layout

- Split identity + artifact on `lg`, single column below `md`
- Header 64px, max width `max-w-6xl`, `min-h-[100dvh]`
- No account sidebar on this public route

## Motion

- 3D artifact is the only extra visual. Drag-to-rotate, no autoplay loop
- `prefers-reduced-motion: reduce` and WebGL failure use the static initials fallback

## Color / type

- Same zinc + emerald tokens and Plus Jakarta Sans as the account app
- One accent. No purple, no extra display font
