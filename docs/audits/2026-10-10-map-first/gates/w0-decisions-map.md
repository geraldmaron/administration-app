# W0 deletion map: ADRs and RFCs to DECISIONS.md

Every file in `docs/ADRs/` and `docs/RFCs/` is listed with where its still-valid rules went in [DECISIONS.md](../../../DECISIONS.md), or "obsolete" with the reason. Rules were checked against source on 2026-10-10. Git keeps the originals.

**Totals:** 42 records. 36 contribute at least one rule; 6 are wholly obsolete.

## ADRs

| Record | Went to | What did not carry, and why |
|---|---|---|
| `0001-cabinet-shared-pool.md` | §4.9 | The 20-row drawer, per-setup exclusion and the Justice gate are old founding-screen behavior; DESIGN.md governs founding. |
| `0002-local-first-conversation-engine.md` | §1.1, §7.1 | The client/server resolver split and parity fixtures describe code that doesn't exist. |
| `0003-layered-procedural-headshots.md` | §11.1, §11.4 | The procedural and photo renderers are superseded by drawn faces; only determinism per person carries. |
| `0004-curated-country-presets.md` | Obsolete | There is no country choice. Founding authors a President, not a nation. |
| `0005-bio-weaver-on-top-of-hand-authored.md` | §4.9, §7.1 | Hand-authored candidate paragraphs and the weaver's four lines describe a deleted screen. |
| `0006-secrets-via-1password.md` | §12.1 | None. |
| `0007-central-game-engine.md` | §1.5, §1.7 | The two-language parity contract describes code that doesn't exist. |
| `0008-pregen-pipeline-as-canon.md` | §7.1, §7.2 | Conversation-pool sizes and costs are out of date. |
| `0009-glossary-as-authoritative.md` | §7.10 | Token syntax, Wikipedia health checks and sheet UI were never built; DESIGN.md governs search and term links. |
| `0010-system-adaptive-term-and-election.md` | §2.6 | Per-system term lengths and election framings don't apply to a US-only seat. |
| `0011-typescript-canonical-engine.md` | §1.1, §1.5 | None beyond the deleted client. |
| `0012-one-ui-runtime-three-surfaces.md` | §8.6 | The Expo/react-native-web runtime is forbidden in the player. |
| `0013-hybrid-pacing-and-determinism.md` | §1.2, §2.1 | Real-time drift between sessions is contrary to §2.1. |
| `0014-god-mode-entitlement-model.md` | §10.4, §10.6, §10.9 | The StoreKit, Play Billing and Stripe store list and mobile account sync don't apply; Steam is the only storefront. |
| `0015-image-model-selection.md` | §12.2 | The specific model pick isn't a rule: the operator names the model per run and two backends exist. |
| `0016-one-composition-vocabulary.md` | Obsolete | It is the old player's composition vocabulary, and DESIGN.md governs all visuals. |
| `0017-scenario-families-pin-their-cast.md` | §7.8 | None. |
| `0018-the-grail-is-generated-from-a-catalogue.md` | Obsolete | The Grail and its catalogue are deleted in W0b, and DESIGN.md is the single brief. |
| `0019-the-emergency-declaration-is-an-act-not-a-room.md` | §6.7, §12.5 | "No emergency route" conflicts with DESIGN.md's `/nation/emergency`; the Matter-board and oversight surfaces are old UI. |
| `0020-real-time-buys-no-world-time.md` | §2.1, §2.2 | None. |
| `0021-web-first-desktop-player.md` | §8.1 to §8.5, §9.1, §9.2 | "Mobile is not a composition constraint" conflicts with DESIGN.md's phone and desktop parity. |
| `0022-faces-are-drawn-from-the-record.md` | §11.1 to §11.4 | None. |

## RFCs

| Record | Went to | What did not carry, and why |
|---|---|---|
| `0001-production-conversation-batch.md` | Obsolete | A batch plan for a deleted client's conversation pool; the one-gate principle is restated from current source in §7.2. |
| `0002-world-agency-expansion.md` | Obsolete | A mechanics sketch for a deleted client; the current engine's equivalents are stated from source in §1, §6 and §4.10. |
| `0004-maron-rebuild.md` | §1.1, §1.2, §1.5, §1.6, §1.13, §4.1, §4.2, §4.6, §4.7, §4.8, §4.9, §7.2, §7.4, §8.2, §8.7, §10.6 | The fictional playable nation, cradle placement, the three-surface runtime, real-time drift, cloud save, the currency toggle, a Next.js studio and runtime content fetch are all obsolete. |
| `0005-the-cerebral-layer.md` | §1.10, §7.9 | Never accepted, but the revealed-preference profile and the unreliable briefing are built. The counsel ledger, fuse staging and dilemma catalog aren't built and aren't rules. |
| `0006-the-oval-office.md` | §4.1 | The "instrument bar" (memos, signing ceremony, daily brief, inbox) is old UI; DESIGN.md governs. |
| `0007-units-granularity-commitments.md` | §4.3, §4.4, §6.6 | None. |
| `0009-political-geography.md` | §1.4, §5.1, §5.2, §5.4 to §5.7 | The player surfaces it specified are old UI. |
| `0011-consequence-activation.md` | §7.7 | Draft. The deed grammar and its emitters are built. The obligation ledger, fuse lane and marker archival aren't built and aren't rules. |
| `0012-the-pressure-regime.md` | Obsolete | The regime was a stored composite nothing read, and save v53 strips it (`packages/engine/src/save.ts`). |
| `0013-the-demos.md` | §5.8 to §5.11 | None. |
| `0014-the-crisis-arc.md` | §7.8 | Draft. Only the 112-day lapse is built, as the scenario-family lapse. The arc grammar and dispositions aren't built. |
| `0015-scale-and-the-standing-world.md` | §1.11, §1.12, §4.5, §4.11, §6.4, §6.5, §7.5 | Detail tiers, nation regions, the new bands, the pool-coverage gate and band hysteresis aren't built and aren't rules. |
| `0016-depth-and-the-living-surface.md` | §1.14, §5.3, §12.3 | The pre-baked map plate conflicts with DESIGN.md's runtime projection; the state and district dossier layouts are old UI. |
| `0017-vitals-lattice.md` | §1.3, §1.4, §6.1 to §6.3 | None. |
| `0018-the-locale-and-the-emergency.md` | §6.7 | The locale dossier surfaces are old UI. |
| `0020-parametric-portraits.md` | §11.1 to §11.4 | None. |
| `0021-living-world-and-god-mode.md` | §2.1, §2.3, §2.4, §10.1 to §10.9 | Clock speeds and controls, the masthead seal, the paid catalog, store text and the launch plan are UI or unbuilt, and DESIGN.md plus the owner's settings-row decision govern. The client-side Steam ownership check isn't built. |
| `0022-presidential-case-and-attention-system.md` | §3.1 to §3.6 | None. |
| `0022-appendix-decision-source-matrix.md` | §3.1, §3.3 | The per-source migration rows are working notes, not rules. |
| `0023-causal-simulation-graph-and-commodity-markets.md` | §1.9 | The commodity spine is built. The machine-readable causal-edge registry was cut. |

## Rules flagged against source

These rules carry a **Source check** note in DECISIONS.md: §1.1, §1.12, §2.4, §2.5, §7.3, §7.5, §7.10, §10.9, §11.1, §12.2 and §12.5.

## Note for the history-reference gate

This record has to name `0004-maron-rebuild.md` to map it. The planned `scripts/verify-no-history-references.mjs` needs to exempt this file, or the record has to be excluded from its scan.
