# The Administration — Brand Identity & Design System

## Overview

**The Administration** is a dark-luxury political strategy simulation. The visual language is executive command-center: classified-document atmosphere, presidential authority, architectural precision. Every visual decision should feel like it belongs in a briefing room, not a consumer app.

**Aesthetic direction:** Dark luxury / editorial command. Not gaming. Not consumer. Closer to a classified brief or a presidential seal than anything on the App Store.

---

## The Mark

### Concept

The "A" mark is the product's singular visual identifier. It reads simultaneously as two instruments of power:

- **Pen nib** — statecraft, the written word, the document that changes nations. The pen is mightier.
- **Warhead** — force, decisiveness, the authority to act. Precision-guided.

Both are instruments through which leaders lead. The mark encodes this duality in pure geometry.

### Geometry

The mark is a **tall, angular capital A**, proportioned like a warhead — narrow and vertical, not wide. No curves. No softness. Every angle is structural.

**Viewport:** 100 × 120 units

| Point | Coordinates | Notes |
|-------|-------------|-------|
| Apex | (50, 4) | Warhead tip. Sharp meeting of both strokes. |
| Left leg base outer | (8, 116) | Bottom-left corner |
| Left leg base inner | (14, 116) | Nib notch — inward step |
| Left nib inner top | (14, 110) | Top of nib notch |
| Right leg base outer | (92, 116) | Bottom-right corner |
| Right leg base inner | (86, 116) | Nib notch — inward step |
| Right nib inner top | (86, 110) | Top of nib notch |
| Crossbar left | intersection of left leg at y=64 | ≈53% from top |
| Crossbar right | intersection of right leg at y=64 | |

**Crossbar** sits at 53% of total height (slightly above center — military, not typographic).

**Stroke weight:** `size × 0.048` (e.g., 4.8pt at 100pt mark width). Scales proportionally.

**Line joins:** Miter — sharp corners, no rounding.

**Line caps:** Butt on apex strokes; square on nib notch segments.

**Fill:** None. The mark is stroke-only. The open interior reads as precision and restraint.

### The Nib Notch

At the bottom of each leg, a small inward step is cut before the final baseline:

```
         |  → leg continues downward
         |
   ______|  → step inward (6 units)
  |         → nib inner wall (6 units tall)
  |_______  → baseline
```

This creates the pen nib's split — the gap where ink flows. Mirrored on both sides, it also reads as the stabilizing fins of a warhead. The duality is encoded in the geometry itself.

### SVG Reference

```svg
<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
  <g stroke="#C49429" stroke-width="4.8" fill="none"
     stroke-linejoin="miter" stroke-linecap="butt">
    <!-- Left leg with nib notch -->
    <polyline points="50,4 8,116 14,116 14,110"/>
    <!-- Right leg with nib notch -->
    <polyline points="50,4 92,116 86,116 86,110"/>
    <!-- Crossbar (approximate intersections at y=64) -->
    <line x1="22.9" y1="64" x2="77.1" y2="64"/>
  </g>
</svg>
```

### Usage Rules

| Rule | Specification |
|------|--------------|
| On dark backgrounds | Gold mark: `#C49429` |
| On gold backgrounds | Black mark: `#040507` |
| On light backgrounds | **Never.** This product has no light mode. |
| Minimum size | 24pt (height of mark) |
| Clear space | 1× mark width on all sides |
| Forbidden | Rotation, skew, drop shadows, color substitution, stroke weight modification, filled version |

---

## Color System

All colors are defined canonically in `ios/TheAdministration/Design/Colors.swift`. This table is the design-layer reference.

### Core Palette

| Token | Hex | RGB | Role |
|-------|-----|-----|------|
| Command Black | `#040507` | rgb(4, 5, 7) | Icon background, launch screen |
| Background | `#000000` | rgb(0, 0, 0) | App base layer |
| Background Elevated | `#0C0E14` | rgb(12, 14, 20) | Cards, surfaces |
| Background Muted | `#14161C` | rgb(20, 22, 28) | Secondary surfaces |
| Background Panel | `#181A21` | rgb(24, 26, 33) | Panels |
| Background Surface | `#1F212B` | rgb(31, 33, 43) | Interactive surfaces |

### Presidential Gold (Accent)

| Token | Hex | RGB | Role |
|-------|-----|-----|------|
| Accent Primary | `#C49429` | rgb(196, 148, 41) | Brand primary, CTA, mark |
| Accent Secondary | `#807059` | rgb(128, 112, 89) | Muted gold |
| Accent Tertiary | `#D4B06B` | rgb(212, 176, 107) | Light gold, highlights |
| Accent Muted | `#C49429` @ 12% | — | Subtle fills |

### Foreground

| Token | Hex | RGB | Role |
|-------|-----|-----|------|
| Foreground | `#EBEBEB` | rgb(235, 235, 235) | Primary text |
| Foreground Muted | `#8F8F8F` | rgb(143, 143, 143) | Secondary text |
| Foreground Subtle | `#5C5C5C` | rgb(92, 92, 92) | Tertiary, decorative labels |

### Semantic

| Token | Hex | Role |
|-------|-----|------|
| Success | `#3DA18A` | Positive states |
| Warning | `#C78040` | Caution |
| Error | `#BF4040` | Danger |
| Info | `#4D8AB8` | Informational |

---

## Typography

Defined canonically in `ios/TheAdministration/Design/Typography.swift`.

| Style | Size | Weight | Tracking | Usage |
|-------|------|--------|----------|-------|
| Brand | 52pt | Black | wide | Title screen, game name |
| Brand Small | 36pt | Black | wide | Branded sections |
| Display Large | 40pt | Bold | default | Major headings |
| Display Medium | 28pt | Semibold | default | Section headings |
| Screen Title | 22pt | Black | default | Screen headings |
| Title | 24pt | Semibold | default | Card titles |
| Headline | 18pt | Semibold | default | Card headers |
| Body | 15pt | Regular | default | Primary content |
| Caption | 13pt | Medium | default | Labels |
| Protocol Label | 9pt | Bold | 1.5pt | "SCI // TK // NOFORN" markings |
| Micro | 11pt | Regular | default | Smallest UI text |

**Rules:**
- Always tracked caps for headings and labels — creates command-center formality
- SF Pro exclusively — system-native for performance; no web fonts
- SF Mono for numeric data only (metrics, stats, classified markings)
- No italics

---

## App Icon

**Canvas:** 1024 × 1024pt, no alpha channel (App Store requirement)

**Background:** Command Black `#040507` — the darkest possible black with a microscopic blue-navy shift. Not pure black.

**Mark:** Presidential Gold `#C49429`, stroke-only, centered

**Mark size on icon canvas:** 576pt tall (56.25% of canvas height) — large enough to read at 60×60pt home screen but not overwhelming at 1024×1024.

**Corner radius:** Do NOT bake corner radius into the PNG. iOS applies the squircle mask; designing without the radius ensures it works across all contexts.

**Generation:** `IconExporter.swift` (DEBUG utility) renders the mark using `ImageRenderer` and writes the 1024×1024 PNG. See that file for export instructions.

---

## Launch Screen

**Philosophy:** A launch screen is not an ad. It is a moment of orientation — the first frame of an experience. Keep it absolute: the mark, black, silence.

**Specification:**
- Background: Command Black `#040507`
- Mark: Presidential Gold `#C49429`, centered
- Mark size: 120 × 144pt
- Text: None
- Animation: None (system limitation; the app's `WelcomeView` handles the reveal)

**Implementation:** `LaunchScreen.storyboard` + `BrandMarkLaunch` PDF asset in the asset catalog.

---

## In-App Mark Usage

The `BrandMark` SwiftUI view (`ios/TheAdministration/Design/BrandMark.swift`) renders the mark at any size. Use it:

- In loading states
- As a watermark in background layers
- In onboarding or "about" screens
- Never as inline body decoration — the mark has authority; use it sparingly

---

## Design Principles

1. **Authority through restraint.** Empty space is not waste — it is command.
2. **Every line earns its place.** No decoration that doesn't carry meaning.
3. **Gold is a signal, not a color.** Use accent sparingly; when it appears, it matters.
4. **Classified typography.** Tracked caps, tight leading, small sizes for labels — the document aesthetic is intentional.
5. **No light mode, ever.** This product lives in the dark.
