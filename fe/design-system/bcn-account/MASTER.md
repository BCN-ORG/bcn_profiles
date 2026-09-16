# BCN Account — Design System (override)

> Source: ui-ux-pro-max `--design-system` + taste-skill anti-slop.
> **Reading:** B2B SaaS Account Center for BCN members — Linear-clean / trust-first — shadcn + Plus Jakarta Sans.

## Dials
- Variance: **4** (predictable hierarchy with restrained asymmetry)
- Motion: **3** (interaction feedback only; respect `prefers-reduced-motion`)
- Density: **6** (product UI, not marketing air)

## Palette (locked — no AI purple)
Cool zinc neutrals + **one** emerald accent for trust / membership / success.

| Role | Light | Dark |
|------|-------|------|
| Background | `oklch(0.985 0.002 250)` | `oklch(0.145 0.005 260)` |
| Foreground | `oklch(0.18 0.02 260)` | `oklch(0.98 0.005 260)` |
| Card | `oklch(1 0 0)` | `oklch(0.2 0.01 260)` |
| Primary | `oklch(0.22 0.02 260)` | `oklch(0.96 0.005 260)` |
| Accent / success | `oklch(0.55 0.14 160)` emerald | same, slightly brighter |
| Muted FG | `oklch(0.5 0.02 260)` | `oklch(0.7 0.02 260)` |
| Border | `oklch(0.91 0.01 260)` | `oklch(1 0 0 / 10%)` |
| Destructive | red-600 family | red-400 family |

**Banned:** purple/violet gradients, Inter as display, emoji icons, harsh black shadows.

## Typography
- **Family:** Plus Jakarta Sans (all weights 400–700) via `next/font`
- Display: `tracking-tight`, semibold
- Body: `text-sm` / `leading-relaxed`, max ~65ch on prose
- Labels: `text-xs tracking-wide text-muted-foreground`

## Surfaces
- Flat structural surfaces: solid canvas, visible hairline borders, shadow only where elevation is meaningful
- Avoid decorative blur and gradients in product UI
- Radius: `0.75rem` for containers, `0.5rem` for controls

## Motion
- Interactive: `150–250ms` `cubic-bezier(0.32, 0.72, 0, 1)`
- Press: `active:scale-[0.98]`
- Entry: fade/translate only; skip if reduced-motion

## Stack
Keep **shadcn/ui** (one system). Lucide icons OK (already in project). No new icon library.
