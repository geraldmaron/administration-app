# Design System: The Administration

> Canonical reference for all visual design, UI patterns, and interaction principles.
> Updated: 2026-03-13 | Version: 3.0 — Visual Overhaul Complete

---

## Table of Contents

### Foundation
1. [Design Philosophy](#1-design-philosophy)
2. [Accessibility Standards](#2-accessibility-standards)
3. [Color System](#3-color-system)
   - 3.1 Design Tokens
   - 3.2 Color Usage Rules
   - 3.3 Component Color Patterns
   - 3.4 Command Center Visual Layer *(grid, scanlines, tech-border, scrollbar)*
4. [Typography](#4-typography)
5. [Iconography](#5-iconography)
6. [Spacing & Layout](#6-spacing--layout)

### Design Application
7. [Visual Hierarchy](#7-visual-hierarchy)
8. [Component Patterns](#8-component-patterns)
9. [Animation & Motion](#9-animation--motion)
10. [Interaction Patterns](#10-interaction-patterns)
11. [Responsive Design](#11-responsive-design)

### Specific Patterns
12. [Data Visualization](#12-data-visualization)
13. [State Representation](#13-state-representation)
14. [Modal & Overlay System](#14-modal--overlay-system)
15. [Form Patterns](#15-form-patterns)
16. [Error Handling](#16-error-handling)

### Platform Implementation
17. [Platform-Specific Considerations](#17-platform-specific-considerations)

---

## 1. Design Philosophy

### Core Principles

**The Administration** employs a **command center aesthetic** inspired by military operations rooms, government intelligence interfaces, and cyberpunk design language. The visual language communicates authority, precision, and consequence.

| Principle | Description | Application |
|-----------|-------------|-------------|
| **Clarity over Decoration** | Information density must never compromise readability | Generous whitespace, clear typography, logical grouping |
| **Purposeful Motion** | Animations serve functional purpose, not aesthetic | State transitions, data updates, attention direction |
| **Systematic Color** | Color encodes meaning consistently | Metrics use consistent color coding, states use semantic colors |
| **Tactile Feedback** | All interactions provide immediate visual response | Hover states, pressed states, loading states |
| **Progressive Disclosure** | Complexity revealed incrementally | Tooltips, expandable sections, drill-down patterns |

### Aesthetic Identity

- **Monochromatic Foundation**: Black background with white/gray text creates high contrast
- **Accent as Signal**: Deep violet primary with red secondary — intelligence/authority aesthetic over casual consumer green
- **Grid & Structure**: Visible grid patterns reinforce order and precision
- **Typographic Authority**: Bold headlines, monospace for data, clear hierarchy
- **Subtle Depth**: Layered backgrounds, subtle shadows, backdrop blur for depth
- **Vibrant Chromaticity**: High-chroma violet primary in OKLCH space for perceptual consistency
- **Intelligence Dossier Aesthetic**: Cabinet/person cards styled as classified documents — left classification strips, mono labels, 4-col stat grids

### Design Non-Goals

❌ Friendly, approachable, casual design language  
❌ Bright, saturated color palettes  
❌ Playful, whimsical animations  
❌ Skeuomorphic textures or gradients  
❌ Maximalist decoration

---

## 3. Color System

### 3.1 Design Tokens (CSS Custom Properties)

All colors defined in `globals.css` using OKLCH color space for perceptual uniformity.

#### Base Colors

```css
:root {
  /* Backgrounds */
  --background: oklch(0.09 0 0);           /* Pure black */
  --background-elevated: oklch(0.12 0 0);  /* Slightly lifted */
  --background-muted: oklch(0.15 0 0);     /* Cards, panels */

  /* Foreground */
  --foreground: oklch(1.0 0 0);            /* #ffffff - Pure white */
  --foreground-muted: oklch(0.65 0 0);     /* ~65% white, secondary text */
  --foreground-subtle: oklch(0.45 0 0);    /* ~45% white, tertiary/metadata */

  /* Borders */
  --border: oklch(0.3 0 0 / 0.1);          /* ~10% white opacity */
  --border-strong: oklch(0.5 0 0 / 0.15);  /* ~15% white opacity */

  /* Tech Grid / Scanlines (command-center aesthetic) */
  --grid-color: oklch(0.3 0 0 / 0.05);    /* Subtle grid lines on body */
  --scanline-color: oklch(0 0 0 / 0.2);   /* CRT scanline overlay */

  /* Accents - Unified Protocol Palette */
  --accent-primary: oklch(0.62 0.22 275);   /* Deep Indigo/Violet — primary brand */
  --accent-secondary: oklch(0.65 0.28 15);  /* #ef4444 - Red 500 - Critical/Destructive */
  --accent-tertiary: oklch(0.72 0.19 195);  /* Cyan — data/intel layer */
  --accent-quaternary: oklch(0.70 0.22 320);/* Hot Pink — Dick Mode/special states */
  --accent-muted: oklch(0.62 0.22 275 / 0.15);

  /* Interactive States */
  --interactive-hover: oklch(0.68 0.22 275);  /* Brighter violet */
  --interactive-active: oklch(0.55 0.22 275); /* Pressed violet */

  /* Focus Ring */
  --focus-ring: oklch(0.62 0.22 275);         /* Violet focus ring */
  --focus-ring-offset: oklch(0.09 0 0);        /* Matches --background */

  /* Disabled State */
  --disabled-opacity: 0.5;

  /* Shadow Colors */
  --shadow-sm: oklch(0 0 0 / 0.1);
  --shadow-md: oklch(0 0 0 / 0.15);
  --shadow-lg: oklch(0 0 0 / 0.25);
  --shadow-xl: oklch(0 0 0 / 0.35);

  /* Overlay Backgrounds */
  --overlay-backdrop: oklch(0 0 0 / 0.8);         /* Solid dark overlay */
  --overlay-backdrop-blur: oklch(0 0 0 / 0.6);    /* Lighter when backdrop-filter is applied */
}
```

#### Semantic Colors

```css
:root {
  /* Status */
  --success: oklch(0.70 0.19 165);         /* Emerald 500 - Positive outcomes */
  --warning: oklch(0.80 0.20 65);          /* Amber 500 - Caution, thresholds */
  --error: oklch(0.65 0.28 15);            /* Red 500 - Critical, destructive */
  --info: oklch(0.70 0.20 230);            /* Sky Blue - Neutral information */

  /* Metric Grade Colors — letter-grade system (see Section 13.1) */
  --metric-a: oklch(0.70 0.19 165);  /* A — Excellent (Emerald) */
  --metric-b: oklch(0.70 0.19 165);  /* B — Good (Emerald) */
  --metric-c: oklch(0.80 0.20 65);   /* C — Average (Amber) */
  --metric-d: oklch(0.80 0.20 65);   /* D — Poor (Amber) */
  --metric-f: oklch(0.65 0.28 15);   /* F — Critical (Red) */
}
```

### 3.2 Color Usage Rules

#### Forbidden Patterns

❌ **Never use hardcoded colors**: `bg-black`, `text-white`, `border-white/10`  
✅ **Always use tokens**: `bg-background`, `text-foreground`, `border-border`

❌ **Never use arbitrary opacity**: `text-white/37`  
✅ **Use semantic variants**: `text-foreground-muted`, `text-foreground-subtle`

❌ **Never inline hex codes**: `style={{ color: '#10b981' }}`  
✅ **Use CSS variables**: `style={{ color: 'var(--accent-primary)' }}`

#### Contrast Requirements

All text must meet **WCAG AA** standards:
- Normal text (< 18px): **4.5:1** minimum contrast ratio
- Large text (≥ 18px): **3:1** minimum contrast ratio
- Interactive elements: **3:1** minimum against background

| Background | Foreground Min | Use Case |
|------------|---------------|----------|
| `--background` | `--foreground` (1.0) | Primary content |
| `--background` | `--foreground-muted` (0.65) | Secondary content |
| `--background` | `--foreground-subtle` (0.45) | Tertiary, metadata |
| `--background-elevated` | `--foreground` (1.0) | Card primary text |

### 3.3 Component Color Patterns

| Component | Background | Border | Text | Hover |
|-----------|------------|--------|------|-------|
| Button (command) | `accent-primary` | `accent-primary` | `background` | glow `shadow-[0_0_30px_rgba(34,211,238,0.4)]` |
| Button (tactical) | `background-elevated` | `border` | `foreground` | `border-accent/50 text-accent` |
| Button (accent) | `accent/10` | `accent/20` | `accent` | `accent/20` + glow |
| Button (destructive) | `error/15` | `error/50` | `error` | `error/25` + glow |
| Button (ghost) | transparent | none | inherited | `background-muted` |
| Button (outline) | transparent | `border` | `foreground` | `background-muted` |
| Card (default) | `background-elevated` | `tech-border` | `foreground` | `border-strong` |
| Card (interactive) | `background-elevated` | `tech-border` | `foreground` | `border-accent-primary/50` + shadow |
| Card (metric) | `background-elevated` | `border-l-4` (metric color) | `foreground` | n/a |
| Input | `background-elevated` | `border` | `foreground` | `focus:ring-accent focus:border-accent/50` |
| Badge (success) | `success/15` | `success/30` | `success` | n/a |
| Badge (warning) | `warning/15` | `warning/30` | `warning` | n/a |
| Badge (destructive) | `error/15` | `error/30` | `error` | n/a |
| Badge (accent) | `accent-primary/15` | `accent-primary/30` | `accent-primary` | n/a |

---

### 3.5 Color Theme System

Players choose from five accent themes that override the seven `--accent-*` variables at runtime. All other design tokens — semantic status colors, backgrounds, typography — remain constant regardless of theme. Theme choice persists across sessions in `localStorage` key `ta_theme`.

| ID | Name | `--accent-primary` | Hue |
|---|---|---|---|
| `purple` | Violet Protocol | `oklch(0.62 0.22 275)` | 275 — Default |
| `gold` | Gold Standard | `oklch(0.72 0.18 85)` | 85 |
| `blue` | Cerulean Command | `oklch(0.60 0.20 230)` | 230 |
| `red` | Crimson Authority | `oklch(0.58 0.24 20)` | 20 |
| `green` | Operative Green | `oklch(0.66 0.20 145)` | 145 |

Each theme defines these seven variables (shown for `purple`; other themes follow the same pattern, substituting hue):

```css
--accent-primary:     oklch(0.62 0.22 275);
--accent-muted:       oklch(0.62 0.22 275 / 0.15);
--interactive-hover:  oklch(0.68 0.22 275);  /* L + 0.06 */
--interactive-active: oklch(0.55 0.22 275);  /* L − 0.07 */
--focus-ring:         oklch(0.62 0.22 275);
--accent:             oklch(0.62 0.22 275);  /* legacy Shadcn */
--ring:               oklch(0.62 0.22 275);  /* legacy Shadcn */
```

**Architecture:**
- `web/src/store/themeStore.ts` — Zustand store (`useThemeStore`), persisted to `ta_theme`
- `web/src/components/ThemeProvider.tsx` — Client component; applies CSS vars via `document.documentElement.style.setProperty()` on theme change. Mounted once in root layout.
- `web/src/components/ui/ThemeSelector.tsx` — Five 20×20px circular swatches. Active swatch: `ring-2 ring-foreground scale-110`. Inactive: `opacity-60 hover:opacity-100`.

**Critical rule:** Semantic status colors (`--success`, `--warning`, `--error`, `--info`) are **never** overridden by themes. They encode fixed meaning (health, caution, danger, information) independent of the player's aesthetic preference. Only `--accent-*` and interactive-state variables change with the theme.

### 3.6 Global Footer Bar

A persistent `h-8 fixed bottom-0 z-20` bar is mounted in `layout.tsx`, visible on every screen. It sits below all modals and overlays (`z-20` places it under `z-dropdown: 50`).

```tsx
<div className="fixed bottom-0 left-0 right-0 z-20 h-8 border-t border-border
                bg-background-elevated flex items-center justify-between px-4">
  <span className="text-[9px] font-mono uppercase tracking-widest
                   text-foreground-subtle pointer-events-none">
    Protocol Interface
  </span>
  <ThemeSelector />
</div>
```

Left label: 9px mono uppercase — L5 System UI chrome. Right: `ThemeSelector` swatches (pointer-events active only on the swatches, not the full bar).

---

### 3.4 Command Center Visual Layer

The app's aesthetic is reinforced by two always-on global effects applied to the `<body>` element, plus a set of utility classes that card/panel components build on.

#### Global Grid Background

A subtle 40×40px grid is drawn on `<body>` using `--grid-color`:

```css
body {
  background-image:
    linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

Components can apply a tighter 20×20px local grid with `.bg-grid`.

#### Scanline Overlay

A fixed `body::after` pseudo-element renders an optional CRT scanline texture:

```css
body::after {
  content: "";
  position: fixed;
  inset: 0;
  background:
    linear-gradient(to bottom, transparent 50%, var(--scanline-color) 50%);
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.3;
}
```

#### Tech Border Utility

`.tech-border` adds a hairline border plus animated corner-bracket accents:

```tsx
// Default card border — corner brackets animate to foreground-muted on hover
<div className="tech-border">
  Panel content
</div>
```

CSS:
```css
.tech-border {
  border: 1px solid var(--border-strong);
  position: relative;
}
.tech-border::before,
.tech-border::after {
  content: '';
  position: absolute;
  width: 4px; height: 4px;
  transition: all 0.3s ease;
}
.tech-border::before { top: -1px; left: -1px;
  border-top: 1px solid var(--foreground-muted);
  border-left: 1px solid var(--foreground-muted); }
.tech-border::after  { bottom: -1px; right: -1px;
  border-bottom: 1px solid var(--foreground-muted);
  border-right: 1px solid var(--foreground-muted); }
```

`.tech-card` combines the elevated background with `.tech-border` and a hover that reveals `border-strong`.

#### Sharp Corner Radius

All components use **2px** corner radius (`--radius: 0.125rem`). Never use `rounded-lg` or larger on UI chrome — the sharp-edged aesthetic is intentional.

#### Scrollbar

Custom 6px scrollbars are applied globally:

```css
::-webkit-scrollbar         { width: 6px; height: 6px; }
::-webkit-scrollbar-track   { background: var(--background); }
::-webkit-scrollbar-thumb   { background: var(--border-strong); border-radius: 0; }
::-webkit-scrollbar-thumb:hover { background: var(--foreground-muted); }
```

---

## iOS Design System (v3.0)

> Swift/SwiftUI implementation of the design system. All files live in `ios/TheAdministration/Design/`.

### iOS Color Tokens — `Design/Colors.swift`

```swift
// Base
AppColors.background          // #000000
AppColors.backgroundElevated  // #1a1a1a
AppColors.backgroundMuted     // #262626
AppColors.foreground          // #ffffff
AppColors.foregroundMuted     // 65% white
AppColors.foregroundSubtle    // 45% white
AppColors.border              // 5% white opacity
AppColors.borderStrong        // 10% white opacity

// Accent (theme-adaptive via ThemeManager)
AppColors.accentPrimary       // Resolves from active AppTheme
AppColors.accentSecondary
AppColors.accentTertiary
AppColors.accentMuted

// Status
AppColors.success             // #0fdf9c  (OKLCH teal)
AppColors.warning             // #ffa500  (vibrant orange)
AppColors.error               // #ff4747  (bright red)
AppColors.info                // #199cff  (sky blue)

// Helpers
AppColors.metricColor(for: value)     // Dynamic status color 0–100
AppColors.gradeColor(for: grade)      // Letter grade color
AppColors.severityGradient(for: 0.8) // LinearGradient by urgency
AppColors.cardGlow(color: color)      // [Shadow] array for glow effects
AppColors.accentGlow                  // LinearGradient for surface highlights
```

### iOS Typography Tokens — `Design/Typography.swift`

```swift
AppTypography.displayLarge   // 48pt Black
AppTypography.displayMedium  // 32pt Black
AppTypography.title          // 24pt Black
AppTypography.headline       // 20pt Bold
AppTypography.subheadline    // 16pt Medium
AppTypography.body           // 14pt Regular
AppTypography.bodySmall      // 13pt Regular
AppTypography.caption        // 12pt Semibold
AppTypography.label          // 10pt Black Monospaced (buttons, section headers)
AppTypography.micro          // 8pt Black Monospaced (protocol labels, badges)
AppTypography.data           // 24pt Black Monospaced (metric values)
AppTypography.dataLarge      // 48pt Black Monospaced (full-screen metric display)
```

### iOS Spacing Constants — `Design/Spacing.swift`

```swift
AppSpacing.xxs = 4
AppSpacing.xs  = 8
AppSpacing.sm  = 12
AppSpacing.md  = 16
AppSpacing.lg  = 20
AppSpacing.xl  = 24
AppSpacing.xxl = 32
AppSpacing.xxxl = 40
AppSpacing.cardPadding = 16     // Standard card inner padding
AppSpacing.sectionPadding = 24  // Section horizontal padding
AppSpacing.tabBarClearance = 100 // Bottom padding for custom tab bar
```

### iOS Motion Constants — `Design/Motion.swift`

```swift
AppMotion.quickSnap     // spring(0.2, 0.8) — button presses, toggles
AppMotion.standard      // spring(0.35, 0.75) — reveals, sheets
AppMotion.dramatic      // spring(0.6, 0.7) — scenario reveals, grade animation
AppMotion.fadeDuration  // 0.25s — crossfades
AppMotion.staggerDelay(for: index, base: 0.05) // per-item list stagger
```

### iOS Haptic Feedback — `Services/HapticEngine.swift`

```swift
HapticEngine.shared.light()     // Tab switches, info taps
HapticEngine.shared.medium()    // Option selections, decisions
HapticEngine.shared.heavy()     // Fire cabinet member, game over
HapticEngine.shared.success()   // Positive outcomes
HapticEngine.shared.warning()   // Negative outcomes
HapticEngine.shared.error()     // Critical failures
HapticEngine.shared.selection() // Slider adjustments
```

### iOS Button Styles — `Design/ButtonStyles.swift`

| Style | Use case |
|-------|----------|
| `CommandButtonStyle` | Primary CTA — full-width, accent background |
| `TacticalButtonStyle` | Secondary action — bordered, accent text |
| `AccentButtonStyle` | Accent with glow shadow |
| `GhostButtonStyle` | Text-only, muted |
| `OutlineButtonStyle` | Bordered, white text |
| `SecondaryButtonStyle` | Muted background |
| `DestructiveButtonStyle` | Error color, destruction actions |

### iOS View Modifiers — `Design/ViewModifiers.swift`

```swift
.cardStyle(.elevated)            // Background + border styling
.cardStyle(.interactive)         // Interactive card variant
.cardStyle(.accent)              // Accent-bordered card
.appLabelStyle()                 // Protocol label (label font, uppercase, tracking)
.screenBackground()              // AppColors.background ignoresSafeArea ZStack
.accentGlow(color: color, radius: 12) // Drop shadow glow
.shimmerLoading()                // Loading shimmer animation
.staggerEntrance(index: i)       // Staggered list entrance animation
```

### iOS Component Library

#### `Views/Components/Cards.swift`
- `CommandCard` — container card with optional title/subtitle header
- `MetricCard` — tappable metric tile with bar indicator
- `InteractiveCard` — generic tappable card with press animation
- `DossierCard` — intelligence dossier panel with category + ruled line
- `ScenarioOptionCard` — decision option with letter badge + impact badges + advisor button

#### `Views/Components/ScreenHeader.swift`
- `ScreenHeader` — unified header with protocol label (pulsing dot), title, subtitle, trailing slot

#### `Views/Components/TooltipView.swift`
- `TooltipView` — floating help card (title, helpText, dismiss button)
- `InfoButton` — `(i)` button that anchors a TooltipView on tap

#### `Views/Components/OnboardingOverlay.swift`
- `OnboardingOverlay` — full-screen 5-step tutorial overlay, completion stored in UserDefaults

### iOS Navigation — `ContentView.swift`

- `CustomTabBar` — frosted-glass tab bar with 7 tabs, accent indicator line, haptic selection
- Active tab shows accent top border + scaled icon
- `MainTabView` — manual tab switching (no system TabView chrome)
- Onboarding overlay fires once after first setup completion

---

## 4. Typography

### 4.1 Font Stack

```css
:root {
  /* Primary: Sans-serif for UI and body text */
  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, 
               "Segoe UI", Roboto, sans-serif;
  
  /* Monospace: Data, metrics, technical content */
  --font-mono: ui-monospace, "SF Mono", Menlo, Monaco, 
               "Cascadia Code", "Courier New", monospace;
  
  /* Display: Large headlines (if needed) */
  --font-display: var(--font-sans);
}
```

### 4.2 Type Scale

Based on 1.25 (major third) scale with pixel-perfect adjustments.

| Token | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `text-xs` | 10px | 14px | Labels, badges, metadata |
| `text-sm` | 12px | 16px | Secondary text, captions |
| `text-base` | 14px | 20px | **Body text default** |
| `text-lg` | 16px | 24px | Emphasized body, large UI text |
| `text-xl` | 20px | 28px | Subheadings, card titles |
| `text-2xl` | 24px | 32px | Section headings |
| `text-3xl` | 30px | 36px | Page headings |
| `text-4xl` | 36px | 40px | Modal titles |
| `text-5xl` | 48px | 1 | Large display (welcome page) |
| `text-6xl` | 60px | 1 | Extra large display |
| `text-7xl` | 72px | 1 | Hero headlines |
| `text-8xl` | 96px | 1 | Maximum size |

### 4.3 Font Weights

| Weight | Value | Token | Use Case |
|--------|-------|-------|----------|
| Light | 300 | `font-light` | Large display text only |
| Normal | 400 | `font-normal` | Body text default |
| Medium | 500 | `font-medium` | Emphasized text, labels |
| Semibold | 600 | `font-semibold` | Headings, buttons |
| Bold | 700 | `font-bold` | Strong emphasis, titles |
| Extrabold | 800 | `font-extrabold` | Major headings |

**Never use**: `font-black` (900) - excessive for all contexts.

### 4.4 Letter Spacing

| Token | Value | Use Case |
|-------|-------|----------|
| `tracking-tighter` | -0.05em | Large display (≥ 48px) |
| `tracking-tight` | -0.025em | Headings (24-48px) |
| `tracking-normal` | 0 | Body text default |
| `tracking-wide` | 0.025em | Button text, labels |
| `tracking-wider` | 0.05em | Small caps, badges |
| `tracking-widest` | 0.1em | Protocol bar, system labels |

### 4.5 Typography Patterns

#### Headlines

```tsx
// Page Title
<h1 className="text-4xl font-bold tracking-tight text-foreground">
  Cabinet Management
</h1>

// Section Title
<h2 className="text-2xl font-semibold tracking-tight text-foreground">
  Active Metrics
</h2>

// Subsection
<h3 className="text-xl font-medium text-foreground">
  Economic Indicators
</h3>
```

#### Body Text

```tsx
// Primary Content
<p className="text-base text-foreground leading-relaxed">
  Your decision has far-reaching consequences...
</p>

// Secondary Content
<p className="text-sm text-foreground-muted">
  Last updated 3 minutes ago
</p>

// Metadata
<span className="text-xs text-foreground-subtle uppercase tracking-wider">
  Confidential
</span>
```

#### Monospace (Data)

```tsx
// Metric Value
<div className="font-mono text-3xl font-bold tracking-tighter">
  {value.toFixed(1)}
</div>

// System Status
<code className="font-mono text-xs uppercase tracking-widest">
  SYSTEM_STATUS: ONLINE
</code>
```

---

## 6. Spacing & Layout

### 6.1 Spacing Scale

Consistent 4px-based scale for predictable rhythm.

| Token | Value | Use Case |
|-------|-------|----------|
| `spacing-0` | 0px | No spacing |
| `spacing-1` | 4px | Tight spacing, icon gaps |
| `spacing-2` | 8px | Small gaps, compact layouts |
| `spacing-3` | 12px | Default gap in flex/grid |
| `spacing-4` | 16px | **Standard spacing unit** |
| `spacing-5` | 20px | Card padding |
| `spacing-6` | 24px | Section spacing |
| `spacing-8` | 32px | Large section gaps |
| `spacing-10` | 40px | Major section dividers |
| `spacing-12` | 48px | Page-level spacing |
| `spacing-16` | 64px | Extra large spacing |
| `spacing-20` | 80px | Maximum spacing |

### 6.2 Container System

```tsx
// Maximum Width Containers
<div className="container mx-auto">            {/* max-w-screen-2xl */}
<div className="container max-w-7xl mx-auto">  {/* 1280px - Full app width */}
<div className="container max-w-5xl mx-auto">  {/* 1024px - Content width */}
<div className="container max-w-3xl mx-auto">  {/* 768px - Article width */}
```

### 6.3 Grid System

#### Dashboard Layout (12-column)

```tsx
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-12 lg:col-span-8">
    {/* Main content: 8 columns on desktop */}
  </div>
  <div className="col-span-12 lg:col-span-4">
    {/* Sidebar: 4 columns on desktop */}
  </div>
</div>
```

#### Metric Grid

```tsx
// 3 columns on desktop, 2 on tablet, 1 on mobile
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {metrics.map(metric => <MetricCard key={metric.id} />)}
</div>
```

### 6.4 Card Spacing

Standard card internal spacing:

```tsx
<Card className="p-6 space-y-4">
  <CardHeader className="space-y-2">
    <h3 className="text-xl font-semibold">Title</h3>
    <p className="text-sm text-foreground-muted">Description</p>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Content with 12px vertical rhythm */}
  </CardContent>
</Card>
```

---

## 8. Component Patterns

### 8.1 Button Variants

All buttons share a base of `uppercase tracking-widest rounded-[2px] active:scale-[0.98]` and use CVA for variant/size composition.

#### Command (Primary)

The main action in any context. Bold styling plus an ambient glow on hover.

```tsx
<Button variant="command" size="lg">
  <Icon className="mr-2 h-4 w-4" />
  Initialize Campaign
</Button>

// Style
"bg-accent-primary text-background border border-accent-primary font-bold
 tracking-widest hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
```

#### Tactical (Secondary)

For secondary actions. Understated backdrop with an accent border hint on hover.

```tsx
<Button variant="tactical">
  <Icon className="mr-2 h-4 w-4" />
  View Details
</Button>

// Style
"bg-background-elevated border border-border text-foreground
 hover:border-accent/50 hover:text-accent backdrop-blur-sm"
```

#### Accent

For calls to action that sit below the command level but need accent visibility.

```tsx
<Button variant="accent">
  Confirm Selection
</Button>

// Style
"bg-accent/10 text-accent border border-accent/20
 hover:bg-accent/20 hover:border-accent/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
```

#### Ghost

For tertiary actions, minimal presence.

```tsx
<Button variant="ghost" size="sm">
  Cancel
</Button>

// Style
"hover:bg-background-muted hover:text-accent"
```

#### Outline

For neutral secondary actions where a visible border aids grouping.

```tsx
<Button variant="outline">
  Export
</Button>

// Style
"border border-border bg-transparent shadow-sm
 hover:bg-background-muted hover:text-foreground"
```

#### Secondary

Elevated-background variant when the ghost is too subtle.

```tsx
<Button variant="secondary">
  Settings
</Button>

// Style
"bg-background-elevated text-foreground border border-border
 hover:bg-background-muted"
```

#### Destructive

For dangerous actions requiring confirmation.

```tsx
<Button variant="destructive">
  <AlertTriangle className="mr-2 h-4 w-4" />
  Remove Cabinet Member
</Button>

// Style
"bg-error/15 text-error border border-error/50
 hover:bg-error/25 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"
```

#### Size Variants

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 32px | `px-4` | `text-xs` |
| `default` | 40px | `px-6 py-2` | `text-sm` |
| `lg` | 56px | `px-8` | `text-base` |
| `xl` | 64px | `px-10` | `text-lg` |
| `icon` | 36px | square | — |
| `touch` | 44px | 44×44 min | — |

### 8.2 Card Patterns

Cards use a CVA-based component with four variants:

#### Default (Tech Border)

Uses the `.tech-border` utility — sharp 1px border with corner-bracket accents.

```tsx
<Card>  {/* variant="default" */}
  <h3 className="text-xl font-semibold mb-2">Card Title</h3>
  <p className="text-sm text-foreground-muted">Card content</p>
</Card>
```

#### Elevated

For cards that need traditional shadow depth instead of corner brackets.

```tsx
<Card variant="elevated">
  Elevated content
</Card>

// Style: border border-border shadow-lg
```

#### Interactive

For clickable cards. Uses `.tech-border` plus an accent glow on hover.

```tsx
<Card variant="interactive" onClick={handleClick}>
  Clickable scenario card
</Card>

// Style: tech-border cursor-pointer hover:border-accent-primary/50
//        hover:shadow-lg hover:shadow-accent-primary/10
```

#### Metric

Left-colored border communicating metric grade. Pass `metricColor` prop.

```tsx
<Card variant="metric" metricColor={getMetricColor(value)}>
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm text-foreground-muted uppercase tracking-wider">
      {metric.name}
    </span>
    <Icon className="h-4 w-4 text-foreground-subtle" />
  </div>
  <div className="font-mono text-3xl font-bold tracking-tighter">
    {value.toFixed(1)}
  </div>
  <div className="mt-2 flex items-center text-xs">
    <TrendingUp className="h-3 w-3 mr-1 text-success" />
    <span className="text-foreground-muted">+2.4 from last turn</span>
  </div>
</Card>
```

#### Padding Variants

| Prop | Value |
|------|-------|
| `padding="none"` | 0 |
| `padding="sm"` | `p-4` |
| `padding="default"` | `p-6` |
| `padding="lg"` | `p-8` |

### 8.3 Badge System

Badges use `font-mono text-[10px] font-bold tracking-wider uppercase rounded-sm` for a data-label aesthetic.

```tsx
// Semantic badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Critical</Badge>
<Badge variant="accent">New</Badge>

// Style reference
accent:      "border-accent-primary/30 bg-accent-primary/15 text-accent-primary"
success:     "border-success/30 bg-success/15 text-success"
warning:     "border-warning/30 bg-warning/15 text-warning"
destructive: "border-error/30 bg-error/15 text-error"
outline:     "border-border text-foreground"
```

> **Note**: The previous `info` variant has been replaced by `accent`. Use `variant="accent"` for informational/new badges.

### 8.4 Input Fields

```tsx
<Input
  placeholder="Enter value..."
/>
```

Default style: `bg-background-elevated border border-border rounded-sm
              focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent/50
              placeholder:text-muted-foreground transition-all`

Validation states:

```tsx
// Error
<Input className="border-error focus-visible:ring-error" aria-invalid="true" />

// Success
<Input className="border-success focus-visible:ring-success" />
```

---

## 9. Animation & Motion

### 9.1 Duration Scale

| Token | Duration | Use Case |
|-------|----------|----------|
| `duration-75` | 75ms | Micro-interactions (hover) |
| `duration-100` | 100ms | Quick transitions |
| `duration-150` | 150ms | Standard transitions |
| `duration-200` | 200ms | **Default transition** |
| `duration-300` | 300ms | Moderate animations |
| `duration-500` | 500ms | Slow, emphasized animations |
| `duration-700` | 700ms | Page transitions |
| `duration-1000` | 1000ms | Long animations (counters) |

### 9.2 Easing Functions

```css
:root {
  --ease-linear: linear;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);     /* Default */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 9.3 Animation Patterns

#### Fade In

```tsx
<div className="animate-in fade-in duration-300">
  Content fades in
</div>
```

#### Slide In

```tsx
<div className="animate-in slide-in-from-bottom-4 duration-500">
  Slides up from bottom
</div>

// Variants
slide-in-from-left-4
slide-in-from-right-4
slide-in-from-top-4
slide-in-from-bottom-4
```

#### Scale In (Zoom)

```tsx
<div className="animate-in zoom-in-95 duration-300">
  Scales from 95% to 100%
</div>
```

#### Combined Animation

```tsx
<div className="animate-in fade-in slide-in-from-bottom-8 
                duration-700 delay-100">
  Fades and slides with delay
</div>
```

#### Counter Animation

```tsx
// Animated number counting
const [displayValue, setDisplayValue] = useState(0);

useEffect(() => {
  let start = 0;
  const duration = 1500;
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4); // Ease out quart
    setDisplayValue(Math.floor(targetValue * ease));
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
}, [targetValue]);
```

#### Ticker / Marquee

For horizontally scrolling data feeds (news tickers, protocol bars):

```css
@keyframes ticker         { 0%   { transform: translateX(0);       }
                            100% { transform: translateX(-33.33%); } }
@keyframes ticker-reverse { 0%   { transform: translateX(-33.33%); }
                            100% { transform: translateX(0);        } }
```

```tsx
<div className="animate-ticker" style={{ animationDuration: '30s' }}>
  {/* Repeated content (×3) for seamless loop */}
</div>
```

#### Indeterminate Loading Bar

For page-level or modal loading states, use `.animate-loading_bar` on the inner progress fill:

```css
@keyframes loading_bar {
  0%   { left: -33%; width: 33%; }
  50%  { left:  20%; width: 60%; }
  100% { left: 100%; width: 10%; }
}
```

#### Reverse Spin

`.animate-spin_reverse` — same speed as Tailwind's `animate-spin` but counter-clockwise. Used for concentric spinner rings:

```tsx
<Loader2 className="animate-spin_reverse text-accent-primary" />
```

### 9.4 Motion Accessibility

**Always respect `prefers-reduced-motion`:**

```tsx
<div className="animate-pulse motion-reduce:animate-none">
  Pulse animation disabled for users who prefer reduced motion
</div>
```

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 2. Accessibility Standards

### 2.1 Semantic HTML

Always use proper HTML5 semantic elements:

```tsx
// ✅ Correct
<header>
  <nav aria-label="Main navigation">
    <ul><li><a href="/game">Game</a></li></ul>
  </nav>
</header>

<main>
  <section aria-labelledby="metrics-heading">
    <h2 id="metrics-heading">Metrics Dashboard</h2>
  </section>
</main>

<aside aria-label="Cabinet members">
  {/* Sidebar content */}
</aside>

// ❌ Incorrect
<div className="header">
  <div className="nav">
    <div><div>Game</div></div>
  </div>
</div>
```

### 2.2 ARIA Labels

#### Interactive Elements

```tsx
// Icon-only buttons MUST have labels
<Button aria-label="Close modal">
  <X aria-hidden="true" />
</Button>

// Icons with visible text
<Button>
  <Save aria-hidden="true" className="mr-2" />
  Save Changes
</Button>
```

#### Landmark Regions

```tsx
<header aria-label="Site header" />
<nav aria-label="Main navigation" />
<aside aria-label="Metric filters" />
<footer aria-label="Site footer" />
```

#### Dynamic Content

```tsx
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
>
  {statusMessage}
</div>

// For critical updates
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

### 2.3 Focus Management

#### Visible Focus Indicators

```tsx
<Button className="focus:outline-none focus:ring-2 focus:ring-accent-primary 
                   focus:ring-offset-2 focus:ring-offset-background">
  Button with clear focus ring
</Button>
```

#### Focus Trap in Modals

```tsx
import { FocusTrap } from '@headlessui/react'

<FocusTrap>
  <Dialog>
    {/* Modal content - focus stays within */}
  </Dialog>
</FocusTrap>
```

#### Skip Links

```tsx
<a 
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             focus:z-50 focus:px-4 focus:py-2 focus:bg-accent-primary 
             focus:text-background"
>
  Skip to main content
</a>
```

### 2.4 Screen Reader Support

#### Visually Hidden Content

```tsx
// Provide context for screen readers
<span className="sr-only">Current metric value: </span>
<span className="font-mono text-3xl" aria-hidden="true">
  {value}
</span>
```

#### Image Alt Text

```tsx
// Informative images
<img src={flag} alt={`Flag of ${country.name}`} />

// Decorative images
<img src={pattern} alt="" aria-hidden="true" />
```

---

## 5. Iconography

### 5.1 Icon Library

**Primary:** Lucide React (https://lucide.dev)

**Rationale:** Consistent stroke width, extensive library, tree-shakeable, customizable.

### 5.2 Icon Sizing

| Size | Pixels | Token | Use Case |
|------|--------|-------|----------|
| xs | 12px | `h-3 w-3` | Inline with small text |
| sm | 16px | `h-4 w-4` | Inline with body text, badges |
| md | 20px | `h-5 w-5` | Buttons, labels |
| lg | 24px | `h-6 w-6` | Card headers, prominent icons |
| xl | 32px | `h-8 w-8` | Feature icons |
| 2xl | 48px | `h-12 w-12` | Empty states |

### 5.3 Icon Patterns

#### In Buttons

```tsx
<Button>
  <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
  Button Text
</Button>

// Icon-only button (requires aria-label)
<Button aria-label="Delete item">
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

#### Metric Icons

```tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
<Icon className={cn(
  "h-3 w-3",
  change > 0 && "text-success",
  change < 0 && "text-error",
  change === 0 && "text-foreground-subtle"
)} />
```

#### Status Icons

```tsx
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

const statusIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info
}
```

### 5.4 Icon Color Rules

- **Default:** `text-foreground-muted`
- **Active/Hover:** `text-foreground`
- **Semantic:** Use semantic colors (`text-success`, `text-error`, etc.)
- **Accent:** `text-accent-primary` for interactive elements
- **Always:** Include `aria-hidden="true"` if decorative

---

## 7. Visual Hierarchy

### 7.1 Information Architecture Layers

| Layer | Purpose | Visual Treatment |
|-------|---------|------------------|
| **L1: Critical Actions** | Primary decisions | Large buttons, high contrast, accent color |
| **L2: Primary Content** | Main information | Bold headings, full opacity, prominent spacing |
| **L3: Secondary Content** | Supporting details | Medium weight, 65% opacity, standard spacing |
| **L4: Metadata** | Contextual info | Light weight, 45% opacity, compact spacing |
| **L5: System UI** | Chrome, navigation | Subtle borders, muted colors, small text |

### 7.2 Z-Index Scale

```css
:root {
  --z-base: 0;              /* Default layer */
  --z-dropdown: 50;         /* Dropdown menus */
  --z-sticky: 100;          /* Sticky headers */
  --z-overlay: 200;         /* Overlay backgrounds */
  --z-modal: 300;           /* Modal dialogs */
  --z-popover: 400;         /* Popovers, tooltips */
  --z-toast: 500;           /* Toast notifications */
  --z-tooltip: 600;         /* Tooltips over everything */
}
```

### 7.3 Visual Weight Patterns

#### Heavy Weight (Highest Attention)

- Font: `font-bold` or `font-extrabold`
- Size: `text-3xl` or larger
- Color: `text-foreground` (full opacity)
- Borders: `border-2` or `border-4`

#### Medium Weight (Standard Content)

- Font: `font-medium` or `font-semibold`
- Size: `text-base` to `text-xl`
- Color: `text-foreground` or `text-foreground-muted`
- Borders: `border` (1px)

#### Light Weight (De-emphasized)

- Font: `font-normal`
- Size: `text-sm` or `text-xs`
- Color: `text-foreground-subtle`
- Borders: `border-border` (translucent)

---

## 10. Interaction Patterns

### 10.1 Hover States

All interactive elements must have clear hover states:

```tsx
// Buttons
hover:bg-accent-primary/90       // Darken slightly
hover:border-accent-primary      // Accent border
hover:scale-105                  // Subtle scale (use sparingly)

// Cards
hover:border-accent-primary/50   // Accent border hint
hover:shadow-lg                  // Elevation increase

// Links
hover:text-accent-primary        // Color change
hover:underline                  // Underline appearance
```

### 10.2 Active/Pressed States

```tsx
active:scale-95                  // Slight depression
active:bg-accent-primary/80      // Darker background
```

### 10.3 Loading States

#### Button Loading

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Processing...
    </>
  ) : (
    <>
      <Icon className="mr-2 h-4 w-4" />
      Submit
    </>
  )}
</Button>
```

#### Skeleton Loading

```tsx
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-border rounded w-3/4" />
  <div className="h-4 bg-border rounded w-1/2" />
</div>
```

#### Spinner

```tsx
import { Loader2 } from 'lucide-react'

<Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
```

### 10.4 Disabled States

```tsx
// Disabled button
<Button 
  disabled 
  className="opacity-50 cursor-not-allowed"
>
  Unavailable Action
</Button>

// Disabled input
<Input 
  disabled 
  className="opacity-50 cursor-not-allowed bg-background-muted"
/>
```

### 10.5 Selection States

```tsx
// Selected card
<Card className={cn(
  "border-2 transition-colors",
  isSelected 
    ? "border-accent-primary bg-accent-primary/5" 
    : "border-border"
)}>
```

---

## 11. Responsive Design

### 11.1 Breakpoint System

| Breakpoint | Width | Token | Usage |
|------------|-------|-------|-------|
| Mobile | < 640px | default | Single column, stacked layout |
| Tablet | 640px+ | `sm:` | 2-column grid, reduced spacing |
| Desktop | 1024px+ | `lg:` | Multi-column, full features |
| Large | 1280px+ | `xl:` | Maximum width containers |
| XLarge | 1536px+ | `2xl:` | Wide layouts, extra columns |

### 11.2 Mobile-First Approach

Always design for mobile first, enhance for larger screens:

```tsx
// ✅ Correct: Mobile first
<div className="flex flex-col lg:flex-row">
  {/* Stacks on mobile, horizontal on desktop */}
</div>

// ❌ Incorrect: Desktop first
<div className="flex flex-row md:flex-col">
  {/* Confusing, harder to maintain */}
</div>
```

### 11.3 Responsive Patterns

#### Navigation

```tsx
// Mobile: Hamburger menu
// Desktop: Full horizontal nav
<nav className="lg:flex hidden">{/* Desktop nav */}</nav>
<button className="lg:hidden">{/* Mobile menu toggle */}</button>
```

#### Grid Columns

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* 1 column mobile → 4 columns xl */}
</div>
```

#### Typography

```tsx
<h1 className="text-4xl lg:text-6xl xl:text-7xl">
  {/* Smaller on mobile, larger on desktop */}
</h1>
```

#### Spacing

```tsx
<div className="p-4 lg:p-6 xl:p-8">
  {/* Less padding on mobile, more on desktop */}
</div>
```

### 11.4 Touch Targets

Minimum touch target: **44x44 pixels** (iOS HIG, WCAG AA)

```tsx
// Buttons
<Button className="min-h-[44px] px-4">
  Touch-friendly Button
</Button>

// Icon buttons
<Button className="h-11 w-11">  {/* 44px */}
  <Icon className="h-5 w-5" />
</Button>
```

---

## 12. Data Visualization

### 12.1 Chart Color Palette

```tsx
const chartColors = {
  primary: 'oklch(0.72 0.19 195)',    // Electric Cyan
  secondary: 'oklch(0.65 0.28 285)',  // Vibrant Purple
  tertiary: 'oklch(0.70 0.22 320)',   // Hot Pink
  quaternary: 'oklch(0.75 0.24 260)', // Neon Blue
  quinary: 'oklch(0.68 0.20 345)',    // Magenta
  senary: 'oklch(0.72 0.19 150)',     // Teal
}
```

### 12.2 Metric Value Display

```tsx
<div className="space-y-1">
  {/* Label */}
  <div className="text-xs uppercase tracking-wider text-foreground-subtle">
    {metric.name}
  </div>
  
  {/* Value */}
  <div className="font-mono text-4xl font-bold tracking-tighter">
    {value.toFixed(1)}
  </div>
  
  {/* Change Indicator */}
  <div className="flex items-center text-sm">
    <TrendingUp className="h-3 w-3 mr-1 text-success" />
    <span className="text-foreground-muted">+2.4 from last turn</span>
  </div>
</div>
```

### 12.3 Progress Bars

```tsx
<div className="relative h-2 bg-border rounded-full overflow-hidden">
  <div 
    className="absolute inset-y-0 left-0 bg-accent-primary transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

### 12.4 Sparklines

Minimal trend indicators without axes:

```tsx
// Use Recharts or similar with minimal styling
<Sparkline
  data={historyData}
  stroke="var(--accent-primary)"
  strokeWidth={2}
  fill="var(--accent-muted)"
/>
```

---

## 13. State Representation

### 13.1 Metric States (Visual Encoding)

Metrics use a **letter-grade system** (A–F) mapped to CSS colour tokens `--metric-a` through `--metric-f`.

| Grade | Range | Token | Color | Icon | Card Border |
|-------|-------|-------|-------|------|-------------|
| A | 80–100 | `metric-a` | Emerald | TrendingUp | `border-l-4 border-metric-a` |
| B | 60–79 | `metric-b` | Emerald | CheckCircle | `border-l-4 border-metric-b` |
| C | 40–59 | `metric-c` | Amber | Minus | `border-l-4 border-metric-c` |
| D | 20–39 | `metric-d` | Amber | AlertCircle | `border-l-4 border-metric-d` |
| F | 0–19 | `metric-f` | Red | AlertTriangle | `border-l-4 border-metric-f` |

Tailwind aliases for Tailwind-direct use: `metric-critical` → `metric-f`, `metric-low` → `metric-d`, `metric-healthy` → `metric-b`, `metric-high` → `metric-a`.

### 13.2 Approval Rating Colors

| Range | Color | Label |
|-------|-------|-------|
| 80-100 | `oklch(0.72 0.19 195)` | Excellent (Cyan) |
| 60-79 | `oklch(0.72 0.19 150)` | Good (Teal) |
| 40-59 | `oklch(0.75 0.24 260)` | Fair (Blue) |
| 20-39 | `oklch(0.80 0.20 65)` | Poor (Orange) |
| 0-19 | `oklch(0.65 0.28 15)` | Critical (Red) |

### 13.3 Country Difficulty Tier

Countries carry a `difficulty` field (`'Low' | 'Medium' | 'High'`) that reflects how challenging the country is to govern. This is **always displayed** in the country list — never omitted — so every row has consistent spacing.

| Tier | Semantic Color | Badge Variant | Meaning |
|---|---|---|---|
| Low | `--success` (Emerald) | `success` | Stable institutions, strong resource base; consequences are recoverable |
| Medium | `--warning` (Amber) | `warning` | Notable structural challenges requiring sustained attention |
| High | `--error` (Red) | `destructive` | Severe constraints: conflict, collapsed economy, failed-state indicators |

**Difficulty colors are fixed — they do not change with the player's accent theme.** `--success`, `--warning`, and `--error` always encode the same meaning regardless of which of the five themes is active. This is a deliberate exception to accent customization: a country that is High difficulty must read as red whether the theme is green or gold.

Data stored in Firebase `world_state/countries[id].difficulty`. Canonical ratings live in `web/scripts/country-data/difficulty-ratings.ts` and are applied by the seed script.

### 13.4 Turn Status

```tsx
// Protocol bar status indicator
<div className="flex items-center gap-2">
  <div className={cn(
    "h-1.5 w-1.5 rounded-full animate-pulse",
    status === 'online' && "bg-success",
    status === 'processing' && "bg-warning",
    status === 'error' && "bg-error"
  )} />
  <span className="text-xs uppercase tracking-widest">
    {statusLabel}
  </span>
</div>
```

---

## 14. Modal & Overlay System

### 14.1 Modal Structure

```tsx
<Dialog open={isOpen} onClose={onClose}>
  {/* Backdrop */}
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-overlay" />
  
  {/* Modal Container */}
  <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
    {/* Modal Content */}
    <DialogPanel className="bg-background-elevated border border-border-strong 
                           rounded-lg shadow-2xl max-w-2xl w-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <DialogTitle className="text-2xl font-semibold">
          Modal Title
        </DialogTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Body */}
      <div className="space-y-4">
        {children}
      </div>
      
      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="command">Confirm</Button>
      </div>
    </DialogPanel>
  </div>
</Dialog>
```

### 14.2 Toast Notifications

```tsx
// Position: bottom-right, z-toast
<Toast variant="success" duration={5000}>
  <CheckCircle className="h-5 w-5 mr-2" />
  Changes saved successfully
</Toast>

// Variants
success: "bg-success/15 border-l-4 border-success text-success"
error: "bg-error/15 border-l-4 border-error text-error"
warning: "bg-warning/15 border-l-4 border-warning text-warning"
info: "bg-info/15 border-l-4 border-info text-info"
```

### 14.3 Tooltip System

```tsx
import { Tooltip } from '@radix-ui/react-tooltip'

<Tooltip>
  <TooltipTrigger>
    <Info className="h-4 w-4 text-foreground-subtle" />
  </TooltipTrigger>
  <TooltipContent className="bg-background-elevated border border-border-strong 
                            px-3 py-2 text-sm rounded-md shadow-lg z-tooltip">
    Helpful explanation text
  </TooltipContent>
</Tooltip>
```

---

## 15. Form Patterns

### 15.1 Form Layout

```tsx
<form className="space-y-6">
  {/* Form Field */}
  <div className="space-y-2">
    <Label htmlFor="input-id" className="text-sm font-medium">
      Field Label
    </Label>
    <Input 
      id="input-id"
      type="text"
      placeholder="Enter value..."
      className="w-full"
    />
    <p className="text-xs text-foreground-subtle">
      Helper text for this field
    </p>
  </div>
  
  {/* Submit */}
  <div className="flex justify-end gap-3">
    <Button variant="ghost" type="button">Cancel</Button>
    <Button variant="command" type="submit">Submit</Button>
  </div>
</form>
```

### 15.2 Input Validation States

```tsx
// Error state
<Input 
  className="border-error focus:ring-error"
  aria-invalid="true"
  aria-describedby="error-message"
/>
<p id="error-message" className="text-sm text-error mt-1">
  This field is required
</p>

// Success state
<Input 
  className="border-success focus:ring-success"
  aria-invalid="false"
/>
<p className="text-sm text-success mt-1">
  ✓ Valid input
</p>
```

### 15.3 Select Dropdowns

```tsx
<Select>
  <SelectTrigger className="w-full bg-background-muted border-border-strong">
    <SelectValue placeholder="Select option..." />
  </SelectTrigger>
  <SelectContent className="bg-background-elevated border border-border-strong">
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

---

## 16. Error Handling

### 16.1 Error Message Hierarchy

| Level | Treatment | Use Case |
|-------|-----------|----------|
| **Inline** | Red text below field | Form validation |
| **Banner** | Top of page, dismissible | Page-level errors |
| **Toast** | Bottom-right notification | Temporary errors |
| **Modal** | Blocking dialog | Critical errors requiring action |

### 16.2 Error State Patterns

#### Form Error

```tsx
<div className="rounded-md bg-error/10 border border-error/30 p-4">
  <div className="flex items-start">
    <AlertCircle className="h-5 w-5 text-error mr-3 mt-0.5" />
    <div>
      <h3 className="text-sm font-semibold text-error">
        Validation Error
      </h3>
      <p className="text-sm text-foreground-muted mt-1">
        Please correct the highlighted fields
      </p>
    </div>
  </div>
</div>
```

#### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-foreground-subtle mb-4" />
  <h3 className="text-lg font-semibold text-foreground mb-2">
    No Data Available
  </h3>
  <p className="text-sm text-foreground-muted max-w-sm">
    There are no items to display. Try adjusting your filters.
  </p>
</div>
```

#### Error Boundary

```tsx
<div className="min-h-screen flex items-center justify-center">
  <Card className="p-8 max-w-md text-center">
    <AlertTriangle className="h-16 w-16 text-error mx-auto mb-4" />
    <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
    <p className="text-foreground-muted mb-6">
      An unexpected error occurred. Please refresh the page.
    </p>
    <Button variant="command" onClick={() => window.location.reload()}>
      Reload Page
    </Button>
  </Card>
</div>
```

---

## 17. Platform-Specific Considerations

### 17.1 Web Application (Next.js)

#### Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Primary development target |
| Safari | 14+ | WebKit specifics, backdrop-filter support |
| Firefox | 88+ | Full CSS Grid and OKLCH support |
| Edge | 90+ | Chromium-based, same as Chrome |

#### Web-Specific Patterns

**Progressive Web App (PWA)**

```json
// public/manifest.json
{
  "name": "The Administration",
  "short_name": "Admin",
  "theme_color": "#06b6d4",
  "background_color": "#000000",
  "display": "standalone",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker Considerations**

- Cache static assets aggressively
- Network-first strategy for game state
- Offline fallback for scenario descriptions
- Background sync for save games

**Performance Budgets**

| Metric | Target | Maximum |
|--------|--------|---------|
| First Contentful Paint | < 1.2s | < 2.0s |
| Largest Contentful Paint | < 2.0s | < 3.0s |
| Time to Interactive | < 3.0s | < 4.5s |
| Total Bundle Size | < 300KB | < 500KB |
| JavaScript Bundle | < 150KB | < 250KB |

**Web-Specific Components**

```tsx
// Next.js Image optimization
import Image from 'next/image'

<Image
  src={countryFlag}
  alt={country.name}
  width={32}
  height={24}
  loading="lazy"
  placeholder="blur"
/>

// Web-specific navigation
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/game/desk')

// Browser-specific features
if (typeof window !== 'undefined') {
  // Client-side only code
  localStorage.setItem('gameState', JSON.stringify(state))
}
```

#### CSS Considerations

**Browser Prefixes**

```css
/* Backdrop filter with fallback */
.modal-backdrop {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background-color: rgba(0, 0, 0, 0.8); /* Fallback */
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

**Viewport Units**

```css
/* Use dvh (dynamic viewport height) for mobile browsers */
.full-screen {
  height: 100dvh; /* Dynamic viewport height */
  height: 100vh;  /* Fallback */
}
```

#### Web Accessibility Enhancements

- **Keyboard Navigation**: All features accessible via keyboard
- **Focus Trap**: Modal dialogs trap focus
- **Skip Links**: Jump to main content
- **ARIA Live Regions**: Announce dynamic updates
- **Screen Reader Testing**: NVDA (Windows), JAWS, VoiceOver (macOS)

#### Web-Specific Interactions

```tsx
// Hover states (desktop only)
<Button className="hover:bg-accent-primary/90 touch:active:bg-accent-primary/90">
  Desktop hover, mobile tap
</Button>

// Right-click context menus
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault()
  showContextMenu(e.clientX, e.clientY)
}

// Drag and drop
<div
  draggable
  onDragStart={handleDragStart}
  onDrop={handleDrop}
>
  Draggable Element
</div>
```

### 17.2 iOS Application (SwiftUI)

#### iOS Design Guidelines

Following Apple's Human Interface Guidelines with custom theming:

| Element | iOS Standard | Our Adaptation |
|---------|--------------|----------------|
| Navigation Bar | 44pt height | Custom 40pt with monospace title |
| Tab Bar | Bottom placement | Custom styling with accent colors |
| Corner Radius | 10pt standard | 8pt for tighter aesthetic |
| Safe Area | Respect all insets | Full-bleed backgrounds with safe content |
| Haptics | System defaults | Custom for metric changes |

#### SwiftUI Component Mapping

```swift
// Design System → SwiftUI Mapping

// Button Variants
struct CommandButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(Color("Background"))
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color("AccentPrimary"))
            .cornerRadius(8)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
    }
}

// Card Pattern
struct MetricCard: View {
    let metric: Metric
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(metric.name.uppercased())
                .font(.system(size: 10, weight: .medium))
                .tracking(1.5)
                .foregroundColor(Color("ForegroundSubtle"))
            
            Text(String(format: "%.1f", metric.value))
                .font(.system(size: 36, weight: .bold, design: .monospaced))
                .tracking(-1)
                .foregroundColor(Color("Foreground"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color("BackgroundElevated"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color("Border"), lineWidth: 1)
        )
    }
}
```

#### iOS Color Assets

```swift
// Assets.xcassets color definitions
// Color names match web design tokens

extension Color {
    static let background = Color("Background")           // #000000
    static let backgroundElevated = Color("BackgroundElevated") // #1a1a1a
    static let foreground = Color("Foreground")           // #ffffff
    static let foregroundMuted = Color("ForegroundMuted") // rgba(255,255,255,0.6)
    static let accentPrimary = Color("AccentPrimary")     // #06b6d4
    static let accentSecondary = Color("AccentSecondary") // #8b5cf6
    static let success = Color("Success")                 // Teal
    static let warning = Color("Warning")                 // Orange
    static let error = Color("Error")                     // Red
}
```

#### iOS Typography

```swift
// Typography system matching web design
extension Font {
    // Display Sizes
    static let display = system(size: 48, weight: .bold, design: .default)
    static let displayLarge = system(size: 60, weight: .bold, design: .default)
    
    // Headings
    static let h1 = system(size: 36, weight: .bold, design: .default)
    static let h2 = system(size: 24, weight: .semibold, design: .default)
    static let h3 = system(size: 20, weight: .medium, design: .default)
    
    // Body
    static let body = system(size: 14, weight: .regular, design: .default)
    static let bodyEmphasized = system(size: 14, weight: .medium, design: .default)
    
    // Labels
    static let label = system(size: 12, weight: .medium, design: .default)
    static let caption = system(size: 10, weight: .regular, design: .default)
    
    // Monospace (Metrics)
    static let metricValue = system(size: 36, weight: .bold, design: .monospaced)
    static let dataLabel = system(size: 10, weight: .medium, design: .monospaced)
}

// Letter Spacing (Tracking)
extension View {
    func tracking(_ value: CGFloat) -> some View {
        self.tracking(value)
    }
}
```

#### iOS Navigation Patterns

```swift
// Navigation Stack (iOS 16+)
NavigationStack {
    DeskView()
        .navigationTitle("Executive Desk")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: openSettings) {
                    Image(systemName: "gearshape")
                        .foregroundColor(.accentPrimary)
                }
            }
        }
}

// Modal Presentation
.sheet(isPresented: $showModal) {
    CabinetView()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
}

// Full Screen Cover (Scenarios)
.fullScreenCover(isPresented: $showScenario) {
    ScenarioView(scenario: currentScenario)
        .edgesIgnoringSafeArea(.all)
}
```

#### iOS-Specific Features

**Haptic Feedback**

```swift
import CoreHaptics

// Metric change feedback
func provideMetricFeedback(change: Double) {
    let generator = UINotificationFeedbackGenerator()
    
    if change > 5 {
        generator.notificationOccurred(.success)
    } else if change < -5 {
        generator.notificationOccurred(.error)
    } else {
        generator.notificationOccurred(.warning)
    }
}

// Button tap feedback
func provideTapFeedback() {
    let generator = UIImpactFeedbackGenerator(style: .medium)
    generator.impactOccurred()
}
```

**iOS Gestures**

```swift
// Swipe gestures for navigation
.gesture(
    DragGesture()
        .onEnded { value in
            if value.translation.width > 100 {
                // Swipe right - go back
                dismiss()
            }
        }
)

// Long press for additional options
.onLongPressGesture(minimumDuration: 0.5) {
    showContextMenu = true
}

// Pull to refresh
.refreshable {
    await reloadData()
}
```

**iOS Widgets (Home Screen)**

```swift
// Widget showing current metrics
struct MetricWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(
            kind: "MetricWidget",
            provider: MetricProvider()
        ) { entry in
            MetricWidgetView(entry: entry)
        }
        .configurationDisplayName("Metrics")
        .description("Current state of key metrics")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

**Dark Mode (Always On)**

```swift
// Force dark mode
.preferredColorScheme(.dark)

// Or in Info.plist
UIUserInterfaceStyle: Dark
```

#### iOS Accessibility

```swift
// VoiceOver support
Text(metric.name)
    .accessibilityLabel("Metric: \(metric.name)")
    .accessibilityValue("\(metric.value) out of 100")
    .accessibilityHint("Double tap for details")

// Dynamic Type support
Text("Scenario Title")
    .font(.headline)
    .dynamicTypeSize(.medium...(.accessibility3))

// Reduce Motion
@Environment(\.accessibilityReduceMotion) var reduceMotion

var animation: Animation {
    reduceMotion ? .none : .spring(response: 0.3)
}
```

### 17.3 Cross-Platform Consistency

#### Shared Design Language

| Element | Web Implementation | iOS Implementation |
|---------|-------------------|-------------------|
| Primary Button | `bg-accent-primary` | `Color("AccentPrimary")` |
| Card | `bg-background-elevated border` | `Color("BackgroundElevated") + overlay` |
| Typography | Tailwind tokens | Custom Font extensions |
| Spacing | 4px scale | 4pt scale (1:1 mapping) |
| Animations | Tailwind duration | SwiftUI Animation |

#### Divergent Patterns (Platform Conventions)

**Navigation**

- **Web**: Top horizontal nav bar, breadcrumbs
- **iOS**: Bottom tab bar, hierarchical navigation

**Modals**

- **Web**: Centered overlay with backdrop
- **iOS**: Sheet from bottom with drag indicator

**Forms**

- **Web**: Inline validation, enter to submit
- **iOS**: Keyboard toolbar, done/next buttons

**Context Menus**

- **Web**: Right-click menu
- **iOS**: Long-press menu

#### Asset Sharing

```
/shared-assets/
  /colors/
    design-tokens.json      # Shared color definitions
  /icons/
    metric-icons.svg        # Source SVG for both platforms
  /data/
    countries.json          # Shared game data
    scenarios.json
```

**Color Token Sync**

```json
// design-tokens.json
{
  "colors": {
    "background": {
      "value": "#000000",
      "oklch": "oklch(0.09 0 0)",
      "ios": "000000FF"
    },
    "accent-primary": {
      "value": "#06b6d4",
      "oklch": "oklch(0.72 0.19 195)",
      "ios": "06B6D4FF"
    }
  }
}
```

#### Platform-Specific Optimizations

**Web**

- Code splitting by route
- Image optimization with Next.js Image
- Lazy loading components
- Service worker caching
- Local storage for saves

**iOS**

- Core Data for game state persistence
- Background fetch for scenario updates
- Local notifications for turn completion
- iCloud sync for save games
- Optimized list rendering with LazyVStack

#### Testing Matrix

| Feature | Web Desktop | Web Mobile | iOS iPhone | iOS iPad |
|---------|-------------|------------|------------|----------|
| Layout | ✓ | ✓ | ✓ | ✓ |
| Touch targets | N/A | ✓ | ✓ | ✓ |
| Keyboard nav | ✓ | N/A | External | External |
| Gestures | Limited | ✓ | ✓ | ✓ |
| Offline mode | ✓ (PWA) | ✓ (PWA) | ✓ | ✓ |

---

## Implementation Checklist

### New Component Checklist

When creating a new component, ensure:

- [ ] Uses design tokens (no hardcoded colors)
- [ ] Includes all necessary ARIA labels
- [ ] Has proper semantic HTML structure (web) / SwiftUI accessibility (iOS)
- [ ] Implements hover/focus/active states (web) / tap states (iOS)
- [ ] Respects `prefers-reduced-motion`
- [ ] Works at all breakpoints (web) / device sizes (iOS)
- [ ] Has loading and error states
- [ ] Meets WCAG AA contrast requirements
- [ ] Uses consistent spacing scale (4px/4pt)
- [ ] Follows typography system
- [ ] Has keyboard navigation support (web) / VoiceOver support (iOS)
- [ ] Includes proper focus indicators (web) / haptic feedback (iOS)
- [ ] Platform-appropriate interactions (hover vs tap, gestures)

### Page Layout Checklist

When creating a new page:

- [ ] Proper landmark regions (`<main>`, `<aside>`, etc.) (web) / NavigationStack (iOS)
- [ ] Skip link to main content (web) / VoiceOver navigation (iOS)
- [ ] Page title reflects current view (web `<title>`) / navigationTitle (iOS)
- [ ] Logical heading hierarchy (h1 → h2 → h3)
- [ ] Responsive grid system used (web) / adaptive layout (iOS)
- [ ] Loading states for async data
- [ ] Error boundaries in place (web) / error views (iOS)
- [ ] Consistent spacing between sections
- [ ] Platform-appropriate navigation (breadcrumbs vs back button)

---

## Design Debt & Future Improvements

### Known Issues

1. **Metric color mapping on iOS**: Web now uses the letter-grade token system; iOS color assets still need updating to match.
2. **Icon sizing**: Some components still use arbitrary sizes instead of the token scale.
3. **Cross-platform sync**: Save game format needs standardization for web ↔ iOS sync.
4. **Legacy Shadcn tokens**: `globals.css` retains backward-compat tokens (`--card`, `--popover`, etc.) that should eventually be removed in favour of the design-system tokens.

### Resolved

- ✅ **Color tokens** — full semantic token set defined in `globals.css` and Tailwind config.
- ✅ **Animation utilities** — `animate-ticker`, `animate-loading_bar`, `animate-spin_reverse` standardised.
- ✅ **Metric color mapping (web)** — letter-grade system (A–F) replaces ad-hoc critical/low/healthy/high names.
- ✅ **Theme customization** — five-theme OKLCH accent system (`purple` / `gold` / `blue` / `red` / `green`) with `ThemeSelector` swatch picker; persisted to `ta_theme` localStorage. See §3.5.
- ✅ **Country difficulty tier** — canonical `Low / Medium / High` ratings seeded to Firebase; semantic badge colors fixed independent of accent theme. See §13.3.

### Planned Enhancements

1. **Dark/light mode toggle**: Currently dark-only, add light mode support (web + iOS)
2. **Reduced data mode**: High-contrast, simplified view for accessibility (both platforms)
3. **Component library documentation**: Storybook (web) + SwiftUI Previews documentation
4. **Cross-platform continuity**: Handoff between web and iOS devices
5. **iOS widgets**: Expanded widget library for home screen and lock screen
6. **Web push notifications**: Match iOS notification capabilities

---

## 18. View Toggle System

### 18.1 Global Preference

The `useViewStore` Zustand slice (`web/src/store/viewStore.ts`) stores `preferredView: 'grid' | 'list'` and persists to `localStorage` key `ta_preferred_view`. Default: `'grid'`.

### 18.2 ViewToggle Component

`web/src/components/ui/ViewToggle.tsx` — drop into any toolbar.

```tsx
<ViewToggle />  // Shows LayoutGrid + List toggle buttons
```

Active button: `bg-accent-primary text-background`. Inactive: `text-foreground-muted`.

### 18.3 Consuming in Views

```tsx
import { useViewStore } from '@/store/viewStore'

const { preferredView } = useViewStore()

// Grid mode
{preferredView === 'grid' && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map(item => <GridCard key={item.id} {...item} />)}
  </div>
)}

// List mode
{preferredView === 'list' && (
  <div className="flex flex-col divide-y divide-border">
    {items.map(item => <ListRow key={item.id} {...item} />)}
  </div>
)}
```

### 18.4 Screens Supporting Toggle

Cabinet Management, Relations/World, Setup/Country Picker.

---

## 19. Screen Specifications

### 19.1 Welcome Page (/)

- Boot terminal: 4 staggered lines, `var(--accent-primary)` `>` prefix, cursor blink
- Ambient violet glow: `oklch(0.62 0.22 275)` centered top, 120px blur
- Header badge: violet border + `oklch(0.62 0.22 275 / 0.08)` fill
- Title: 8xl font-black, `textShadow: 0 0 40px oklch(0.62 0.22 275 / 0.4)`
- LivePanel right column: classification strip + metric bars + feature pills + intel stamp
- CTAs: `command` (Initialize Campaign), `tactical` with violet border (Quick Start), save-conditional (Resume Session)
- Footer: `<Ticker />` news feed

### 19.2 Desk View (/game/desk)

- Top stat bar: 5-col, `bg-background-elevated`, `border-b border-border`
- Scenario cards: `border-l-4` violet strip, severity badge, outcome pills, hover glow
- Metric grid: 3-col, left-border grade color, sparkline Recharts `AreaChart`, trend icon
- Section headers: mono uppercase + right stat chip
- Empty state: classified-document framing, mono "NO ACTIVE SCENARIOS"

### 19.3 Relations / World View (/game/world)

- Summary bar: 4-col, `bg-background-muted` (not `bg-border`)
- Buckets: teal / amber / red left-border headers per alignment + count badge
- Country card grid: flag image header, name, capital, relationship bar (colored), alignment badge
- Country list row: 32px flag | name • capital | alignment badge | relationship bar | action btn
- Search: sticky, debounced, scope filter (all/allies/hostile/neutral)
- `<ViewToggle />` in toolbar

### 19.4 Cabinet Management (/game/cabinet)

- Stat bar: `bg-background-muted` (not `bg-border`), 4-col
- Category section headers: left-border per category (security=blue, economy=teal, foreign=purple, domestic=amber, social=pink)
- Person card grid (dossier spec — see §20)
- Vacant slot: dashed border, "VACANT" mono stamp, category color
- Person list row: PersonSilhouette 28x36 | name | role | 4 stat pills | fire/dossier buttons
- `<ViewToggle />` in toolbar

### 19.5 Economy View (/game/economy)

- Budget sliders: violet `--accent-primary` track, white circle thumb
- Balance panel: teal surplus / red deficit
- Chart: Recharts `BarChart`, tokens for colors, dark tooltip
- Metric tiles: value + trend arrow + sparkline

### 19.6 Policy View (/game/policy)

- Same slider system as Economy
- `RadarChart` 5-axis for policy balance
- Policy cards: title + description + slider + impact preview hover

### 19.7 Archive View (/game/archive)

- Timeline vertical line in violet
- Event cards with `staggerChildren` 0.04s
- Delta chips: `+n` teal / `-n` red
- Accordion per year/quarter

### 19.8 Setup / Country Picker (/setup)

- Step indicator: violet fill (current), teal check (done)
- Country grid: flag header, name, difficulty badge, region tag
- Country list view: fixed-column table layout with header row — see §20.4
- Region pills: `bg-accent-primary text-background` when active, `bg-background-muted` inactive; horizontal scroll on mobile
- Difficulty badge: always shown (never omitted); Low=`success`, Medium=`warning`, High=`destructive` — these are semantic colors, independent of the active accent theme
- `<ViewToggle />` in toolbar header

---

## 20. Entity Card Specification

### 20.1 Person Card — Grid (Intelligence Dossier Aesthetic)

```
┌──[3px strip]───────────────────────────┐
│  [48×62 portrait] [ID_XXXXX          ] │
│  [photo frame   ] [NAME BOLD UPPERCASE] │
│  [scanlines     ] [● PARTY AFFILIATION] │
│  [FILE label    ] [ROLE TITLE (opt.)  ] │
├────────────────────────────────────────┤
│   LYL  │  COMP  │  POP  │   EXP       │
│    87  │    72  │   61  │    5        │
├────────────────────────────────────────┤
│  [Action button                     →] │
└────────────────────────────────────────┘
```

- Left strip: 3px wide, full height, `background: categoryColor`
- Portrait frame: `w-12 h-[62px]` rectangular (portrait proportions), `bg-background`, `border border-border/50`
- Portrait: `<PersonSilhouette>` SVG component, `text-foreground-muted`, slides to bottom-center of frame
- Photo frame corner accent: top-right corner bracket in `categoryColor`
- Scanline overlay: `repeating-linear-gradient`, `rgba(0,0,0,0.06)` at 4px intervals
- File label: `"FILE"` — 5px mono, bottom strip `bg-background/80`
- File ID: `ID_` + last 5 chars of `candidate.id`, 7px mono, `text-foreground-subtle`
- Name: `font-bold text-[13px] uppercase tracking-tight`
- Party indicator: 5×5px square `background: categoryColor, opacity: 0.7`
- Party text: 9px mono uppercase, `text-foreground-subtle`
- Stat labels: `text-[8px] font-mono uppercase tracking-widest text-foreground-subtle`
- Stat values: `text-[13px] font-mono font-bold`, colored via `getScoreColor()`
- Hover: `border-color: oklch(0.62 0.22 275 / 0.4)`, `shadow-[0_0_16px_oklch(0.62_0.22_275/0.15)]`
- `rounded-none` — sharp corners, no border-radius

### 20.2 Person Card — List Row

```
[28x36 portrait] [Name · Role]  [Loyalty] [Competence] [Pop] [Exp]  [Actions]
```

Portrait: `<PersonSilhouette>` at `w-7 h-9`, `bg-background`, `border border-border/50`.
Row height: 48px. Divided by `border-b border-border`. Hover: `bg-background-elevated`.

### 20.3 Country Card — Grid

```
┌─────────────────────────────────────┐
│  [FLAG IMAGE 100% × 60px]           │
├─────────────────────────────────────┤
│  [Country name — font-semibold]     │
│  [Capital — text-foreground-muted]  │
│  [Alignment badge]                  │
│  ████████░░░░ Relationship bar      │
└─────────────────────────────────────┘
```

Flag: `object-cover`, `h-16 w-full`, emoji flag if image unavailable.
Relationship bar: `h-1.5`, colored fill per level (teal/amber/red).

### 20.4 Country Card — List Row

The list-view row pattern uses a **fixed-column flex layout** to guarantee header–data alignment regardless of content length. All fixed-width columns carry `shrink-0`.

**Setup / Country Picker** (see §19.8):

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER  (bg-background · 9px mono uppercase · text-foreground-subtle)
│ [ 32px ]  Territory           Region ────  Difficulty ──  [▸]   │
├──────────────────────────────────────────────────────────────────┤
│ [ flag ]  Country Name        [Region]     [Difficulty]   [▸]   │
└──────────────────────────────────────────────────────────────────┘
```

| Slot | Class | Content |
|---|---|---|
| Flag | `w-8 shrink-0` | 24×16px emoji or image flag |
| Territory | `flex-1 min-w-0` | Country name (truncated if needed) |
| Region | `w-32 shrink-0 text-right` | `<Badge variant="outline" className="whitespace-nowrap">` |
| Difficulty | `w-20 shrink-0 text-right` | `<Badge variant="success\|warning\|destructive">` |
| Chevron | `w-3 shrink-0` | `<ChevronRight />` icon |

Row height: 52px (`py-3`). Header row: 32px (`py-2`). Divided by `border-b border-border`. Hover: `bg-background-muted`. Selected: `bg-accent-primary/10 border-border-strong`.

**World / Relations view** uses the same fixed-column base (flag + name·capital) but replaces the right columns with an alignment badge, relationship progress bar, and action button — see §19.3.

### 20.5 PersonSilhouette Portrait System

Person portraits are rendered via the `<PersonSilhouette>` React component — no external avatar library. Designed to evoke classified-document identity photos.

```tsx
import { PersonSilhouette, getCandidateVariant } from "@/components/ui/PersonSilhouette";

<PersonSilhouette
  gender={candidate.gender ?? 'non_binary'}
  variant={getCandidateVariant(candidate.id)}
  className="w-full text-foreground-muted"
/>
```

**Variants**: 3 male (M0–M2), 3 female (F0–F2), 1 non-binary (N0). Variant is selected deterministically from `candidateId` hash (`getCandidateVariant`).

**Gender assignment**: Gender is assigned via seeded RNG at candidate generation time. First names are then drawn from the gender-appropriate pool (`pickGenderedName`) to ensure logical name↔silhouette consistency.

**Rendering**: All shapes use `fill="currentColor"`, so the host controls tint via Tailwind text color classes. Typical usage: `text-foreground-muted` on `bg-background` for strong silhouette contrast.

---

**Last Updated:** 2026-03-12  
**Version:** 2.1 — PersonSilhouette / Intelligence Dossier Portrait Update  
**Maintained by:** Design System Team  
**Questions?** See `README.md` or open an issue.
