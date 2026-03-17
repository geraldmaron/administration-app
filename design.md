# Design System: The Administration

> Canonical reference for all visual design, UI patterns, and interaction principles.
> Platform: iOS (Swift/SwiftUI) — primary. Web admin interface will align to this system in a future update.
> Version: 4.0 — iOS First

---

## 1. Design Philosophy

The Administration uses a **presidential command authority** aesthetic: deep blue, gold, and white on pure black. The visual language conveys institutional weight, precision, and authority — not consumer-app approachability.

**Defaults:**
- Default identity: **Statesman** (blue `#1969DC` + gold `#D4AA2C`)
- Background: pure black (`#000000`) with minimal elevation steps
- Text: white hierarchy (100% / 70% / 50% opacity)
- Cards: near-invisible white fill (`white.opacity(0.04–0.05)`), no shadows
- No gradients on interactive controls (buttons are solid fills only)
- All metric and status color via semantic tokens — never hardcoded

**Principles:**
- Borders via `Rectangle().stroke` or `strokeBorder` — never the `.border` modifier
- Corner radius 12pt is standard for cards and panels; buttons use 10–12pt
- `AppSpacing.cardPadding` (20pt) for all card inner padding
- Uppercase tracking labels (`AppLabelModifier`) signal data categories throughout
- Monospaced font only for literal numeric data values (`data`, `dataLarge` tokens)

---

## 2. Color System

### 2.1 Base Tokens (`AppColors`)

| Token | Value | Hex |
|---|---|---|
| `background` | `Color(red: 0, green: 0, blue: 0)` | `#000000` |
| `backgroundElevated` | `Color(red: 0.06, green: 0.06, blue: 0.06)` | `#0F0F0F` |
| `backgroundMuted` | `Color(red: 0.10, green: 0.10, blue: 0.10)` | `#1A1A1A` |
| `foreground` | `Color.white` | `#FFFFFF` |
| `foregroundMuted` | `Color(white: 0.70)` | `#B3B3B3` |
| `foregroundSubtle` | `Color(white: 0.50)` | `#808080` |
| `border` | `Color(white: 1.0).opacity(0.12)` | white/12% |
| `borderStrong` | `Color(white: 1.0).opacity(0.18)` | white/18% |

### 2.2 Semantic Status Colors

| Token | Value | Hex | Use |
|---|---|---|---|
| `success` | `Color(red: 0.059, green: 0.871, blue: 0.604)` | `#0FDF9C` | Positive outcomes, healthy metrics |
| `warning` | `Color(red: 1.0, green: 0.584, blue: 0.098)` | `#FF9519` | Caution, low-range metrics |
| `error` | `Color(red: 0.996, green: 0.278, blue: 0.235)` | `#FE473C` | Critical, failures |
| `info` | `Color(red: 0.098, green: 0.612, blue: 1.0)` | `#199CFF` | Informational |

### 2.3 Accent Colors (theme-adaptive)

Accent colors resolve at runtime through `ThemeManager.shared.current`:

```swift
static var accentPrimary: Color { ThemeManager.shared.current.accentPrimary }
static var accentSecondary: Color { ThemeManager.shared.current.accentSecondary }
static var accentTertiary: Color { ThemeManager.shared.current.accentTertiary }
static var accentMuted: Color { ThemeManager.shared.current.accentMuted }
```

`accentMuted` is always `accentPrimary.opacity(0.15)`.

### 2.4 The 5 Themes (`AppTheme`)

| Theme | ID | Primary | Secondary | Tertiary |
|---|---|---|---|---|
| **Statesman** *(default)* | `aurora_command` | `#1969DC` deep blue | `#D4AA2C` gold | `#4C8EEB` lighter blue |
| **Gold & Blue** | `gold_standard` | `#D4AA2C` gold | `#3B82F6` blue | `#F0CF60` pale gold |
| **Royal Blue** | `cerulean_command` | `#1969DC` deep blue | `#D4AA2C` gold | `#96BAF9` pale steel blue |
| **Crimson** | `crimson_authority` | `#DC3232` red | `#D4AA2C` gold | `#FA807A` pale red |
| **Monochrome** | `operative_green` | `white×0.90` | `white×0.60` | `white×0.75` |

Theme definitions in `AppTheme.swift`. All shipped themes use the same dark base — only the accent palette changes.

### 2.5 ThemeManager

```swift
// Read the active theme
let primary = AppColors.accentPrimary  // resolves through ThemeManager.shared.current

// Switch themes
ThemeManager.shared.setTheme(.goldStandard)
```

`ThemeManager` is an `ObservableObject` singleton. It persists the selection to `UserDefaults` under key `"app_theme_id"`, defaulting to `"aurora_command"`.

### 2.6 Metric Color Helper

```swift
static func metricColor(for value: CGFloat) -> Color {
    switch value {
    case 0...20:   return metricCritical  // error
    case 20..<40:  return metricLow       // warning
    case 40..<70:  return metricHealthy   // success
    default:       return metricHigh      // accentTertiary
    }
}
```

### 2.7 Grade Color Helper

```swift
static func gradeColor(for grade: String) -> Color {
    switch grade {
    case "A+", "A", "A-":        return success
    case "B+", "B", "B-":        return metricHealthy
    case "C+", "C", "C-":        return warning
    case "D+", "D", "D-", "F":   return error
    default:                     return foregroundMuted
    }
}
```

### 2.8 Gradient and Glow Helpers

```swift
// Standard accent gradient (leading → trailing)
static var accentGradient: LinearGradient {
    LinearGradient(
        colors: [accentPrimary, accentTertiary, accentSecondary],
        startPoint: .leading, endPoint: .trailing
    )
}

// Subtle topLeading glow for key interactive surfaces
static var accentGlow: LinearGradient {
    LinearGradient(
        colors: [accentPrimary.opacity(0.12), accentPrimary.opacity(0.0)],
        startPoint: .topLeading, endPoint: .bottomTrailing
    )
}

// Severity gradient: 0.0 (low) → 1.0 (critical)
// low (0–0.33): success → accentTertiary
// medium (0.33–0.66): warning → success
// critical (0.66+): error → warning
static func severityGradient(for severity: Double) -> LinearGradient

// Shadow array for card glow
static func cardGlow(color: Color) -> [Shadow] {
    [
        Shadow(color: color.opacity(0.4), radius: 18, x: 0, y: 0),
        Shadow(color: color.opacity(0.2), radius: 32, x: 0, y: 0)
    ]
}
```

---

## 3. Typography

All text uses **SF Pro** exclusively. Monospaced design is reserved for literal numeric data values only.

```swift
struct AppTypography {
    // Display
    static let displayLarge  = Font.system(size: 40, weight: .bold,     design: .default)
    static let displayMedium = Font.system(size: 28, weight: .semibold, design: .default)

    // Titles
    static let title        = Font.system(size: 24, weight: .semibold, design: .default)
    static let headline     = Font.system(size: 18, weight: .semibold, design: .default)
    static let subheadline  = Font.system(size: 16, weight: .medium,   design: .default)

    // Body
    static let body      = Font.system(size: 15, weight: .regular, design: .default)
    static let bodySmall = Font.system(size: 14, weight: .regular, design: .default)

    // Labels
    static let caption = Font.system(size: 13, weight: .medium,  design: .default)
    static let label   = Font.system(size: 12, weight: .medium,  design: .default)
    static let micro   = Font.system(size: 11, weight: .regular, design: .default)

    // Data — monospaced only for numeric values
    static let data      = Font.system(size: 24, weight: .semibold, design: .monospaced)
    static let dataLarge = Font.system(size: 48, weight: .bold,     design: .monospaced)

    // Brand mark
    static let brand      = Font.system(size: 52, weight: .black, design: .default)
    static let brandSmall = Font.system(size: 36, weight: .black, design: .default)

    // Screen titles — uppercase authority
    static let screenTitle = Font.system(size: 22, weight: .heavy, design: .default)
}
```

| Token | Size | Weight | Design | Use |
|---|---|---|---|---|
| `displayLarge` | 40 | bold | default | Hero titles |
| `displayMedium` | 28 | semibold | default | Section heroes |
| `title` | 24 | semibold | default | Card and sheet titles |
| `headline` | 18 | semibold | default | List items, subheadings |
| `subheadline` | 16 | medium | default | Supporting subheads |
| `body` | 15 | regular | default | Primary body copy |
| `bodySmall` | 14 | regular | default | Secondary body, option text |
| `caption` | 13 | medium | default | Labels, metadata |
| `label` | 12 | medium | default | Uppercase category labels |
| `micro` | 11 | regular | default | Badges, status chips, footers |
| `data` | 24 | semibold | **monospaced** | Metric values, counts |
| `dataLarge` | 48 | bold | **monospaced** | Forecast hero values |
| `brand` | 52 | black | default | Title screen mark |
| `brandSmall` | 36 | black | default | Compact brand mark |
| `screenTitle` | 22 | heavy | default | Screen header titles |

---

## 4. Spacing

4pt base grid. All layout uses these constants — no hardcoded values.

```swift
struct AppSpacing {
    static let xxs: CGFloat = 4
    static let xs:  CGFloat = 8
    static let sm:  CGFloat = 12
    static let md:  CGFloat = 16
    static let lg:  CGFloat = 20
    static let xl:  CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 40

    static let cardPadding:     CGFloat = 20   // standard card inner padding
    static let sectionPadding:  CGFloat = 28   // horizontal section padding
    static let tabBarClearance: CGFloat = 80   // bottom padding to clear custom tab bar
}
```

---

## 5. Motion

Standard iOS easing throughout. No dramatic or staggered animations — stagger delay returns 0 per design direction.

```swift
enum AppMotion {
    static let quickSnap = Animation.easeOut(duration: 0.15)
    static let standard  = Animation.easeOut(duration: 0.2)
    static let dramatic  = Animation.spring(duration: 0.4, bounce: 0.1)
    static let fadeDuration: Double = 0.2

    static func staggerDelay(for index: Int, base: Double = 0.05) -> Double { 0 }
}
```

| Constant | Value | Use |
|---|---|---|
| `quickSnap` | easeOut 0.15s | Button press, toggle, tab switch |
| `standard` | easeOut 0.20s | Content reveal, metric update |
| `dramatic` | spring 0.4s / bounce 0.1 | Sheet presentation, grade reveal |
| `fadeDuration` | 0.2s | Opacity crossfades |

---

## 6. Haptic Feedback

Centralized through `HapticEngine.shared`. Never call UIKit feedback generators directly.

```swift
// Impact
HapticEngine.shared.light()      // tab switches, toggles, selector taps
HapticEngine.shared.medium()     // option selection, card interactions
HapticEngine.shared.heavy()      // decision confirmation, fire cabinet member

// Notification
HapticEngine.shared.success()    // positive outcomes, achievements
HapticEngine.shared.warning()    // negative outcomes, metric critical thresholds
HapticEngine.shared.error()      // failures, game over

// Selection
HapticEngine.shared.selection()  // sliders, pickers
```

---

## 7. Button Styles

No gradients on buttons. All styles apply `.scaleEffect(0.97)` on press via `AppMotion.quickSnap`.

### `CommandButtonStyle` — primary CTA

Full-width, solid `accentPrimary` fill, black text with 1pt letter-spacing. `isEnabled: Bool = true` parameter — disabled state uses `foregroundSubtle.opacity(0.3)` fill. Medium haptic.

```swift
Button("Confirm Order") { }
    .buttonStyle(CommandButtonStyle())

Button("Submit") { }
    .buttonStyle(CommandButtonStyle(isEnabled: false))
```

- Corner radius: 10 | Vertical padding: 14 | Label: 15pt semibold tracking 1

### `SecondaryButtonStyle` — flat secondary

`white.opacity(0.06)` fill, white foreground. Border visible only on press (`white.opacity(0.12)`). Light haptic.

- Corner radius: 10 | Padding: vertical 12, horizontal 16 | Label: 14pt medium tracking 0.5

### `TacticalButtonStyle` — contextual secondary

`white.opacity(0.08)` fill, white foreground, no border overlay. Light haptic.

- Corner radius: 12 | Padding: vertical 12, horizontal 16 | Label: 14pt medium

### `AccentButtonStyle` — inline accent

Solid `accentPrimary` fill, black foreground. No `isEnabled` toggle — use `CommandButtonStyle` when full-width or disabled state needed. Medium haptic.

- Corner radius: 12 | Padding: vertical 12, horizontal 16 | Label: 14pt semibold

### `GhostButtonStyle` — text only

No background, `foregroundMuted` text, opacity 0.5 on press. No haptic.

- Padding: vertical 10, horizontal 14 | Label: 14pt medium

### `OutlineButtonStyle` — flat secondary (alias)

`white.opacity(0.08)` fill, white foreground. Visually identical to `TacticalButtonStyle`. Light haptic.

- Corner radius: 12 | Padding: vertical 12, horizontal 16 | Label: 14pt medium

### `DestructiveButtonStyle` — danger

`error.opacity(0.18)` fill, white foreground. Heavy haptic.

- Corner radius: 12 | Padding: vertical 12, horizontal 16 | Label: 14pt medium

---

## 8. View Modifiers

### `.cardStyle(_:padding:)`

Applies a consistent card surface. All variants use cornerRadius 12.

```swift
someView.cardStyle()
someView.cardStyle(.elevated)
someView.cardStyle(.interactive)
someView.cardStyle(.metric)
someView.cardStyle(.accent)
someView.cardStyle(.default, padding: AppSpacing.md)
```

| Variant | Background | Border |
|---|---|---|
| `.default` | `AppColors.border` | `borderStrong` |
| `.elevated` | `backgroundElevated` | `border` |
| `.interactive` | `backgroundElevated` | `borderStrong` |
| `.metric` | `backgroundMuted` | `borderStrong` |
| `.accent` | `backgroundElevated` | `accentPrimary.opacity(0.3)` |

### `.appLabelStyle()`

Uppercase tracking data category label pattern.

```swift
Text("FISCAL POLICY").appLabelStyle()
// → label font (12pt medium), foregroundSubtle, .uppercase, tracking 2
```

### `.screenBackground()`

Fills the screen with `AppColors.background.ignoresSafeArea()` via ZStack. Used on every root view.

```swift
ScrollView { ... }
    .screenBackground()
```

### `.accentGlow(color:radius:)`

Subtle directional shadow glow. Radius is capped at 6 internally.

```swift
icon.accentGlow(color: AppColors.accentPrimary)
icon.accentGlow(color: AppColors.success, radius: 8)
```

### `.shimmerLoading()`

Moving white gradient overlay for skeleton loading states. Linear sweep, 1.4s repeat.

```swift
Text("Loading...").shimmerLoading()
```

### `.staggerEntrance(index:offset:)`

Fades content in on appear. Stagger delay is currently `0` — all items appear simultaneously.

```swift
ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
    ItemRow(item: item).staggerEntrance(index: index)
}
```

---

## 9. Component Library

### `CommandCard`

Generic content card with optional heading.

```swift
CommandCard(title: "INTELLIGENCE BRIEF", subtitle: "Classified summary") {
    Text("Content goes here")
}
```

- Title: `label` font (12pt), uppercase, `foregroundSubtle`
- Subtitle: `bodySmall` (14pt), `foregroundMuted`
- Background: `white.opacity(0.05)`, cornerRadius 12
- Padding: `AppSpacing.cardPadding` (20pt)

### `MetricCard`

Compact metric tile used in the horizontal scroll selector on DeskView. `frame(width: 80)` at call site.

```swift
MetricCard(
    label: "Economy",
    value: 72.0,
    icon: "chart.line.uptrend.xyaxis",
    isActive: activeMetric == "economy",
    onTap: { activeMetric = "economy" }
)
.frame(width: 80)
```

- Value: `data` font (24pt mono), `metricColor(for:)` when active else `foreground`
- Label: `micro` (11pt), uppercase, single line `minimumScaleFactor(0.65)`
- Mini arc: 28×28, lineWidth 3.5, track `AppColors.border`, fill AngularGradient `[accentPrimary, accentTertiary, accentSecondary]`, 270° arc from 135°
- Background: `color.opacity(0.08)` active, `white.opacity(0.04)` inactive
- Corner radius: **8** (exception — smaller than standard 12)
- Light haptic on tap

### `InteractiveCard`

Pressable content wrapper for list rows and tappable surfaces.

```swift
InteractiveCard(isHighlighted: item == selected, onTap: { select(item) }) {
    Text(item.name)
}
```

- Background: `accentPrimary.opacity(0.08)` highlighted, `white.opacity(0.05)` default
- Padding: `AppSpacing.md` (16pt) | Corner radius: 12 | Light haptic on tap

### `DossierCard`

Structured card with category + title header and arbitrary content body.

```swift
DossierCard(category: "ECONOMY", title: "Budget Position", detail: "Q4") {
    Text("Details...")
}
```

- Category: `micro` (11pt), `accentPrimary`
- Title: `headline` (18pt semibold), `foreground`
- Detail: `micro`, `foregroundSubtle` (trailing)
- Background: `backgroundElevated`, cornerRadius 12, padding `md` (16pt)

### `ScenarioOptionCard`

Decision option in the DeskView scenario card.

```swift
ScenarioOptionCard(
    option: option,
    index: 0,
    isSelected: selectedOptionId == option.id,
    isDimmed: dimmedOptionIds.contains(option.id),
    onSelect: { selectOption(option) },
    onAdvisor: { advisorOption = option }  // nil hides the advisor button
)
```

- Letter badge (A/B/C/D): 22×22 circle, filled `accentPrimary` selected, `accentPrimary.opacity(0.12)` unselected
- Option text: `bodySmall` (14pt), medium weight; `.foregroundSubtle` when dimmed
- Cabinet stance row: support count (green `checkmark.circle.fill`) + oppose count (red `xmark.circle.fill`), rendered only when advisor feedback present
- Background: `accentPrimary.opacity(0.10)` selected; `white.opacity(0.02)` dimmed; `white.opacity(0.05)` default
- Corner radius: **10** | Padding: 14pt | Medium haptic on select
- Advisor button: top-right overlay, `person.text.rectangle` icon, `foregroundSubtle`

### `ScreenHeader`

Unified header used across all main screens.

```swift
ScreenHeader(
    protocolLabel: "EXECUTIVE_COMMAND_LINK",
    title: "Desk",
    subtitle: "Turn 12"
) {
    // optional trailing content
}
```

- `protocolLabel`: 9pt monospaced, tracking 1.5, `foregroundSubtle.opacity(0.5)` — omit by passing `""`
- `title`: `.uppercased()`, 22pt heavy, tracking 1.5, `foreground`
- `subtitle`: `body` (15pt), `foregroundMuted`
- Top padding: `AppSpacing.lg` (20pt)

---

## 10. Navigation

### CustomTabBar (7 tabs)

Replaces the system `TabView` chrome. Rendered at the bottom of `MainTabView`.

| Index | Label | Icon (inactive) | Icon (active) |
|---|---|---|---|
| 0 | Desk | `rectangle.grid.2x2.fill` | `rectangle.grid.2x2.fill` |
| 1 | World | `globe` | `globe.americas.fill` |
| 2 | Cabinet | `person.3` | `person.3.fill` |
| 3 | Econ | `chart.line.uptrend.xyaxis` | `chart.line.uptrend.xyaxis` |
| 4 | Policy | `doc.plaintext` | `doc.plaintext.fill` |
| 5 | Archive | `archivebox` | `archivebox.fill` |
| 6 | System | `gear` | `gearshape.fill` |

**Visual spec:**
- Active icon: 17pt semibold, `accentPrimary`
- Inactive icon: 17pt regular, `foregroundSubtle`
- Label: 10pt regular, matches icon color
- Top separator: 1pt `AppColors.border`
- Background: `AppColors.background` (pure black — not frosted glass)
- Bottom padding: `max(safeAreaBottom, 12)`
- Tab switch: `AppMotion.quickSnap` animation, light haptic

A floating `circle.grid.2x1` game menu button is overlaid at the trailing edge of the bar.

---

## 11. Gauge Patterns

All gauges share the same arc construction: **270° arc** (trim 0.75 of circle), starting at 135°, filled with an `AngularGradient` across the theme accent colors.

### `AnimatedCircularGraphView` — focus mode gauge

Used as the DeskView single-metric focus display.

```swift
AnimatedCircularGraphView(
    value: 72.0,
    label: "Economy",
    subLabel: "Current Standing"
)
.frame(maxWidth: .infinity)
```

- Container: 160×160 ZStack, 24pt outer padding
- Track: `backgroundMuted`, lineWidth 10, lineCap `.round`
- Fill: `AngularGradient(colors: [accentPrimary, accentTertiary, accentSecondary], center: .center, startAngle: 135°, endAngle: 405°)`, lineWidth 10
- Arc: `trim(from: 0, to: animatedValue/100 * 0.75)`, rotationEffect 135°
- Center value: 64pt bold monospaced, color from `metricColor(for:)`, `.contentTransition(.numericText())`
- Center label: 15pt semibold, `foreground`
- Center sublabel: `caption` (13pt), `foregroundSubtle`
- Appear animation: `AppMotion.dramatic`; value change: `AppMotion.standard`

### Grid mini gauges — DeskView grid mode

`LazyVGrid` with 3 columns, one tile per metric.

- Arc frame: 32×32
- Track: `AppColors.border`, lineWidth 4
- Fill: same AngularGradient, lineWidth 4
- Value: `data` font (24pt mono), `metricColor(for:)`, `.monospacedDigit()`
- Label: `micro` (11pt), uppercase, `foregroundSubtle`
- Cell background: `error.opacity(0.06)` when value < 25, else `white.opacity(0.04)`
- Cell corner radius: 10 | Cell padding: 12

### `MetricCard` mini arc

- Arc frame: 28×28 | Track lineWidth: 3.5 | Fill lineWidth: 3.5
- Same AngularGradient and arc geometry
- See Section 9 for full `MetricCard` spec

---

## 12. Data Presentation Patterns

### `FiscalSliderCard`

Slider with metric-color-adaptive icon header. Used for tax rate, interest rate, etc.

```swift
FiscalSliderCard(
    label: "Tax Rate",
    subtitle: "Personal income tax",
    icon: "percent",
    value: taxRate,
    range: 0...50,
    unit: "%",
    helpTitle: "Tax Rate",
    helpText: "Controls personal income tax bracket.",
    onChange: { taxRate = $0 }
)
```

- Icon container: 40×40 rounded rect, `sliderColor.opacity(0.1)` fill; icon in `sliderColor`
- `sliderColor` = `metricColor(for: value / range.upperBound * 100)`
- Label: `caption` (13pt) semibold | Subtitle: `micro` (11pt), `foregroundSubtle`
- Current value: `data` font (24pt mono) + `InfoButton`
- Slider: `.tint(sliderColor)`, selection haptic on change
- Range labels: `micro`, `foregroundSubtle`
- Background: `backgroundElevated`, cornerRadius 12, padding 20

### `BudgetSliderCard`

Budget category percentage slider with 3pt sparkline bar. Used for sector budget allocations.

```swift
BudgetSliderCard(
    label: "Defence",
    icon: "shield.fill",
    value: defenceBudget,
    color: AppColors.error,
    helpTitle: "Defence Budget",
    helpText: "Percentage of total budget allocated to defence.",
    onChange: { defenceBudget = $0 }
)
```

- Icon + label row header
- Value: `data` font (24pt mono), `.monospacedDigit()`
- Slider: `.tint(color)`, 0–100%, selection haptic on change
- **Sparkline bar**: 3pt `GeometryReader` ZStack — `AppColors.border` track, `color` fill at `value/100` width, `AppMotion.quickSnap` animation
- Background: `backgroundElevated`, cornerRadius 12, padding 20

### `ForecastCard`

Large metric value card with trend badge and sparkline. Used for GDP, inflation, deficit.

```swift
ForecastCard(
    title: "GDP Growth",
    icon: "chart.line.uptrend.xyaxis",
    value: "+2.4%",
    rawValue: 62.0,
    trend: "STABLE",
    trendColor: AppColors.success
)
```

- Header: icon + title (`caption` medium, `foregroundMuted`) + trailing trend badge
- Trend badge: `micro` text, `trendColor`, `trendColor.opacity(0.12)` pill, cornerRadius 6
- Value: `dataLarge` (48pt mono), `trendColor`, `.monospacedDigit()`
- **Sparkline bar**: 3pt GeometryReader ZStack — `AppColors.border` track, `trendColor.opacity(0.6)` fill at `rawValue/100`, `AppMotion.standard` animation
- Background: `backgroundElevated`, cornerRadius 12, padding 20

### `EndGameReviewView` — term review presentation

Sequential reveal with timed animations triggered in `onAppear`.

**Grade section:**
```swift
Text(review.performanceGrade)
    .font(.system(size: 96, weight: .black, design: .monospaced))
    .foregroundColor(AppColors.gradeColor(for: review.performanceGrade))
    .scaleEffect(gradeScale, anchor: .bottomLeading)
    .shadow(color: gradeColor.opacity(0.4), radius: 20)
```
- Card: `gradeColor.opacity(0.06)` fill + `Rectangle().stroke(gradeColor.opacity(0.25), lineWidth: 1)`

**`MetricDeltaRow`:**
- Name: `caption` semibold, `foreground`
- Range text: `micro`, `foregroundMuted`, `.monospacedDigit()`
- Delta value: `data` (24pt mono), `deltaColor` (success/error/foregroundSubtle based on sign)
- Bar: 60×2 ZStack — `border` track, `deltaColor` fill at `abs(netChange)/20` proportion
- Row: `backgroundElevated` + `Rectangle().stroke(border, lineWidth: 1)`, padding 14

**Achievement card:** `success.opacity(0.06)` + `Rectangle().stroke(success.opacity(0.25), lineWidth: 1)`, `checkmark.seal.fill`
**Failure card:** `error.opacity(0.06)` + `Rectangle().stroke(error.opacity(0.25), lineWidth: 1)`, `xmark.seal.fill`
**Key decision card:** `backgroundElevated` + `Rectangle().stroke(border, lineWidth: 1)`

**Reveal timing:**
1. t=0: header visible (`AppMotion.standard`)
2. t=0.6s: grade scales 0.3× → 1.0× (`AppMotion.dramatic`), `HapticEngine.shared.heavy()`
3. t=1.2s: metrics section visible
4. t=1.8s: achievements/failures/decisions visible

---

## 13. Aesthetic Detail Rules

- **Corner radius**: 12pt for cards and panels. Buttons: 10pt (`CommandButtonStyle`, `SecondaryButtonStyle`) or 12pt (all others). Grid cells and mini tiles: 8–10pt.
- **Card fill**: `Color.white.opacity(0.04)` or `white.opacity(0.05)` for primary card surfaces. `AppColors.backgroundElevated` (`#0F0F0F`) for elevated content.
- **No decorative shadows**: Cards have no drop shadows. Glow helpers exist but are used sparingly on key interactive surfaces only.
- **No gradients on buttons**: All button fills are solid.
- **Stroke pattern**: `Rectangle().stroke(color, lineWidth: 1)` or `.strokeBorder(color, lineWidth: 1)` on `RoundedRectangle`. Never SwiftUI's `.border()` modifier.
- **Uppercase labels**: Category labels and section headers use `.uppercased()` with tracking 1.5–3. Use `.appLabelStyle()` for standard category labels (tracking 2).
- **Monospaced digits**: `.monospacedDigit()` on any numeric text that changes length at runtime.
- **Card padding**: `AppSpacing.cardPadding` (20pt) for all standard cards. `DossierCard` and `InteractiveCard` use `AppSpacing.md` (16pt).
- **Section padding**: `AppSpacing.sectionPadding` (28pt) horizontal.
- **Bottom padding**: `AppSpacing.tabBarClearance` (80pt) on all scrollable screens.

---

## 14. Web Admin Note

The web admin interface currently uses a violet accent palette (`oklch(0.60 0.25 285)`) that is **not** aligned with the iOS Statesman design system. This is a known deviation — the web interface will be updated to align with the iOS palette in a future revision.

Do not use the web interface as a color or pattern reference. The canonical system is this document, based on the iOS source files.

CSS custom properties used in the current web admin (reference only — not canonical):
- `--color-accent`: currently violet, will change to Statesman blue
- `--color-background`: `oklch(0.06 0 0)`
- `--color-foreground`: `oklch(0.95 0 0)`
