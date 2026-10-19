# Dossiers, World and the act flow: owner review, 2026-10-10

The owner played the build and asked for these. A fresh session executes them; tracked as BL-100 in `docs/BACKLOG.md`. Read DESIGN.md first.

## What the owner said

- **Every dossier** (`/washington/office/:id`, `/washington/person/:id`, a judge's file, a nation's file, a state's file) is boring and does not read like an official profile: it needs proper background, the ratings, more icons and visual indicators, and a more official look.
- **The person relationship map is poor.**
- **`/world`** is weak, visually boring and not official-feeling.
- **The act flow** (after "Act on …") falls off: it is boring and clunky.
- **A nation's file** (`/world/nation/SVN`) has no icons or visuals; the comparison and the act need to be more immersive.

## Pieces already built to reuse (this session)

| Piece | Where | Use it for |
|---|---|---|
| `PersonCard`, `BandDial`, `ShareDial`, `LeanDial` | `apps/web/src/washington/card/` | a dossier's subject plate and its ratings |
| Briefing memorandum: precedence banner, masthead with seal, To/From/Date/Place fields, numbered sections with icons | `apps/web/src/decision/Situation.tsx`, `decision.css` (`memo__*`) | the official head of every dossier: lift it into a shared `Dossier` frame |
| `Tag` (tones, solid) | `@admin/ui-web` | status, staffing, party, posture |
| `Radar` | `@admin/ui-web` | a person's five readings; a nation's standing across its measures |
| `DoorTile` | `apps/web/src/shell/DoorTile.tsx` | every "go to" link: the app's one navigation pattern (actions are buttons) |
| `HelpTip`, `GlossaryTip` | `@admin/ui-web`, `apps/web/src/shell/` | a short visible line per area, a tip where the glossary has the term |
| The flag-colored rule under every header | `shell/shell.css` `.screen-head::after` | already on every screen |

## Direction

1. **One dossier frame** used by office, person, judge, nation and state files: a file banner ("Dossier · The White House" or "Country file · Department of State"), an ID plate (portrait or flag, name, post, tags), a vitals grid where each fact has its icon, the ratings as dials or a radar with a one-line meaning each, then numbered sections (Background, Record, Relationships, Acts) like the memorandum.
2. **Relationships** as a radial ego network: the subject in the middle, ties around it grouped by kind (party, office, rival), line weight for strength, color for warm or cold, faces on the nodes, each node a door; a ranked list as its accessible twin.
3. **World home**: a standing headline (allies, rivals, crises), region tiles with counts and their flags, the governments that need the President as `PersonCard`-style plates with flags.
4. **The act flow** as a staged desk: choose the objective (icon tiles), choose the act (cards with cost, time and risk as dials or tags), terms with a live preview, then review and authorize, keeping the compare-and-authorize rule (a "do nothing" baseline column, one named verb, a receipt). Each stage keeps the map framed on the target.
5. **A nation's file**: flag masthead, leader plate, posture and relationship as dials, economy and forces with icons, the act door as a `DoorTile`.

## Order

Dossier frame first (office and person), then nation file and act flow, then World home, then the relationship map. Verify each at 390×844 and 1440×900 in the browser.
