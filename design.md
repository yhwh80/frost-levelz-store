# Frost Levelz — Design System

## Brand Identity
- **Artist:** Frost Levelz
- **Genre:** Hip-Hop / Rap
- **Origin:** Brixton, London
- **Vibe:** Cold, crystalline, premium, street-authentic

## Color Palette

| Token            | Hex       | Usage                          |
|------------------|-----------|--------------------------------|
| `background`     | `#0a0a0f` | Page background, dark base     |
| `foreground`     | `#ffffff` | Primary text                   |
| `accent`         | `#89CFF0` | Baby blue — primary brand      |
| `accent-bright`  | `#b8e4ff` | Highlights, shimmer peaks      |
| `accent-deep`    | `#5ba3d9` | Gradient lows, secondary blue  |
| `surface`        | `#12121a` | Card backgrounds               |
| `surface-light`  | `#1a1a25` | Elevated surfaces, hover       |
| `border`         | `#2a2a3a` | Borders, dividers              |

### Contrast Notes
- `accent` (#89CFF0) on `background` (#0a0a0f): **11.2:1** — passes WCAG AAA
- `foreground/60` on `background`: body text secondary — passes AA
- All interactive elements must meet minimum 4.5:1 contrast

## Typography

| Role       | Font      | Weight    | Usage                              |
|------------|-----------|-----------|-------------------------------------|
| Display    | Orbitron  | 700–900   | Hero title, logo, section headings  |
| Body       | Geist     | 400–600   | Paragraphs, UI text, labels         |
| Mono       | Geist Mono| 400       | Prices, technical details           |

### Frozen Text Effects
- **`.frost-text-shimmer`** — Hero title: horizontal gradient animation (white → baby blue → deep blue), glowing drop shadow, 4s infinite loop
- **`.frost-heading`** — Section headings: vertical gradient (white → baby blue), subtle glow
- **`.frost-text`** — Nav logo / smaller display: vertical ice gradient with soft glow

## Spacing Scale
- Section padding: `py-16` (64px vertical)
- Hero padding: `py-32 sm:py-40` (128px / 160px)
- Card padding: `p-4` (16px) to `p-6 sm:p-8` (24px / 32px)
- Max content width: `max-w-6xl` (1152px)
- Component gap: `gap-2` (tracks list) to `gap-6` (album grid)

## Component Patterns

### Cards (Albums)
- `bg-surface` background
- `rounded-xl` corners
- `border border-border` default, `hover:border-accent/40` on hover
- Cover art: `aspect-square` with placeholder diamond icon
- Price in accent color, buy button: solid accent fill

### Track Rows (Singles)
- `bg-surface rounded-lg` with border
- Track number (muted) → cover art (optional) → title/year → preview player → price → buy button
- Hover: border shifts to `accent/40`

### Buttons
- Primary: `bg-accent text-background rounded-full` with `hover:bg-accent/80`
- Secondary/Ghost: `bg-accent/10 text-accent rounded-full` with hover fill
- `.frost-btn` class adds ice glow on hover

### Navigation
- Sticky top, backdrop blur, semi-transparent background
- Logo uses `.frost-text` effect
- Links: `text-foreground/70` default, `hover:text-accent`

## Visual Effects

### Ice Particles (Hero)
- Three.js canvas, transparent background
- 300 falling snow/ice particles (baby blue, additive blending)
- 15 wireframe octahedron crystal shards (slow rotation, downward drift)
- Blue point light for atmosphere
- `pointer-events-none` — non-interactive overlay

### Animations
- Frost shimmer: 4s ease-in-out infinite gradient shift
- All transitions: `transition-colors` for smooth state changes
- No jarring animations — everything should feel cold and smooth

## Layout Structure
```
[Nav — sticky, blur backdrop]
[Hero — full width, ice particles, shimmer title]
[Albums — grid, max-w-6xl]
[Singles — list rows, max-w-6xl]
[About — card with bio text]
[Contact — centered card with email]
[Footer — minimal copyright]
```

## Responsive Breakpoints
- Mobile-first design
- `sm:` (640px) — side-by-side layouts, larger hero padding
- `lg:` (1024px) — 3-column album grid

## Currency
- British Pounds (£) — artist is London-based
- MP3 and WAV pricing displayed separately
