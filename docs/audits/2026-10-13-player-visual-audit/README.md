# Player visual audit and implementation specification

Recommend targeted semantic and navigation repairs first, followed by restrained refinement of the existing design system. No redesign or application source changes were made.

- [Visual report: annotated light/dark directions](REPORT.html)
- [Prioritized findings and acceptance](FINDINGS.md)
- [Implementation specification](SPECIFICATION.md)
- [Route coverage ledger](COVERAGE.csv)
- [Adversarial challenge: accepted with controls](ADVERSARIAL.md)
- [Verification and limitations](VERIFICATION.md)
- [Capture archive](evidence-index.html)

Base: `011d0c042fbb2e4e1bbb52c7b5b7b3d17e165fbb`. Isolated worktree: `~/.codex/worktrees/player-visual-audit/admin-app`. Separate localhost server on port 5187; disposable Playwright browser contexts. Original checkout and player saves were not changed.

Six findings cover contradictory commodity direction, map preference propagation, commodity identity and supplier links, chart geometry/context, repeated readings, and weak surface hierarchy. Broad desktop wrapping was not reproduced. Measured usable widths were 1128, 1152 and 1200px at desktop widths 1280, 1440 and 1920.

46 routes are inventoried, with unexercised routes explicitly marked. 324 route/state/viewport/theme combinations were captured with the existing screenshot runner; 139 sampled doors had zero crawler failures. These counts are not comprehensive visual or accessibility acceptance. Some nested routes, confirmation/error paths, dark search, settled entry, long-page tails and accessibility behaviors remain unverified. BL-136 remains open.

This is a local evidence package; raw captures are intentionally retained and not committed. The report uses annotated current captures to specify changes, not simulated screenshots of an implemented redesign.

## Proposed redesign and interactive checkpoint

[Actual redesign plan](REDESIGN-PLAN.md) expands the audit into a living workspace with temporal exploration, subject relationships and staged rollout. [Mockup record](mockup/README.md) documents the Economy preview and its limits. The inline preview is delivered in the design conversation. No application implementation has begun.
