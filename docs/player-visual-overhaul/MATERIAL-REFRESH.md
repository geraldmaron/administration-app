# Material direction — implementation checkpoint

Status: shared components and three representative compositions changed in the isolated implementation worktree. Logo work is deferred at the owner’s request. This record supersedes the earlier conservative palette/chrome direction.

## Direction and reuse

Use Material 3’s tonal containers, rounded shapes, active destination containers and stronger type hierarchy within the existing React design system. This is an adaptation, not an installation of Google’s component library. No new dependency. Official guidance consulted through Context7: [shape and drawer customization](https://m3.material.io/blog/material-3-compose-stable), [navigation indicators](https://m3.material.io/blog/migrating-material-3), and [motion theming](https://m3.material.io/blog/m3-expressive-motion-theming). No native implementation snippets were copied into the web app.

The stronger alternative was a wholesale component-library migration. Its failure mode is replacing working keyboard, save and route behavior while the visual problem remains unresolved. Accepted with controls: extend current primitives, test their visible outcomes, and avoid implying full Material conformance.

## What changed

- Theme-aware navigation and masthead replace the permanent dark chrome. Active destinations, tabs and segmented choices use filled tonal containers.
- Shared type expands page titles to a responsive 28–40px scale, with larger key quotes and clearer grouping. Shape tokens use 24px cards and 28px sheets; buttons and navigation use rounded selection states.
- Brief national readings use responsive tonal cards with real figures, history and week-over-week movement.
- Economy uses an area history, circular supplier composition, a diverging percentage-change comparison and a linked supply→commodity→domestic exposure flow. Existing supplier bars and full commodity table remain available for exact comparisons.
- Security pairs a ring assessment with a compact history on a fixed 0–100% scale.
- Extended `Series.variant`, `Gauge.shape` and `ShareBar.shape`. These are variants of the existing components. Area fill closes each known run separately, preserving unknown gaps. Ring legends preserve exact printed values; no information is chart-only.
- The supplier dataset does not assign all world supply to countries. The ring includes an explicit neutral unassigned segment and coverage note; it does not silently normalize known country percentages into a complete world total.
- Full-page accessibility inspection exposed an existing invalid phone date label and interactive map container marked as an image. Date now has an explicit screen-reader reading; interactive map containers use labeled groups.

## Controls and remaining acceptance

Motion uses actual recorded observations and explicit finite replay. No wall-clock market feed, invented military movement, fake uncertainty or guessed causal contribution. The supply flow depicts current modeled connections, not a reconstructed historical chain. Unknown and unassigned information stays visible.

The new compositions are an implementation checkpoint. All remaining route families inherit tokens and shared controls, but their bespoke redesign and nested-state acceptance are still open. The logo is unchanged. Full application visual acceptance requires review of those remaining families; passing the representative matrix does not close BL-136.

Verification is appended to VERIFICATION.md with the exact final commands and inspected captures. Prior broad-suite limitations still apply.
