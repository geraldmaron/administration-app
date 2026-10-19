# The mobile market for political, text-heavy, and turn-based strategy games

## 1. Scope

Covered: which political/governance titles exist on mobile and how they were received (Reigns,
Suzerain, Democracy 3/4, Tropico, Plague Inc., Beholder, 60 Seconds!, Fallen London);
monetization models tolerated in this space; 2026 mobile session-length and retention
benchmarks and what they imply for a 208-turn campaign; App Store discoverability for niche
premium strategy/narrative titles; screen-size constraints for information-dense sims.

Not covered: paid user-acquisition cost modeling, platform-specific technical performance
(frame budgets, bundle size), Android-specific store mechanics, or a full teardown of any
single game's economy — those are separate research tasks if needed. Democracy 4 has **no**
native mobile port as of this writing — only a fan-made/third-party "Console Edition" clone
exists on app stores, which I flag but did not treat as evidence about Positech's own choices.

## 2. Findings

1. **Reigns is the only mobile-native political-adjacent hit, and its winning move was
   compressing the entire genre down to one input.** Card swipe left/right, binary choice,
   session length measured in single-digit minutes, sold 2 million copies as a $2.99 premium
   title, spawned five sequels including a 2026 Netflix/Witcher tie-in. [Wikipedia: Reigns
   (video game)](https://en.wikipedia.org/wiki/Reigns_(video_game)); [AppSamurai case
   study](https://appsamurai.com/blog/mobile-app-success-story-how-reigns-did-it/).
   **Fact.**

2. **Reigns treats death as the core replay loop, not a failure state to avoid.** Any of four
   meters (army, church, people, treasury) hitting a cap ends the reign; the player restarts as
   a successor, some effects and unlocked cards persist across reigns, and the developers
   designed explicitly so the player is "always able to swipe again." [Wikipedia: Reigns
   (video game)](https://en.wikipedia.org/wiki/Reigns_(video_game)). **Fact.** *Inference*: this
   is the direct mobile answer to "how do you make a losable political sim feel good to lose" —
   our own removal-pressure/impeachment ending is currently an end state, not a seed for the
   next run.

3. **Suzerain's mobile port is the field's best-documented "serious text-forward politics
   works on a phone" proof point.** Launched Dec 2022 on iOS/Android, reworked from 3D to 2D
   for performance/battery, won Pocket Gamer's Best Mobile Port of the Year (12th Pocket Gamer
   Awards), and the 2.0 update plus Kingdom of Rizia DLC shipped to mobile in Dec 2024 —
   meaning the mobile SKU gets ongoing content parity with PC, not a frozen port.
   [GamingTrend](https://gamingtrend.com/news/award-winning-suzerain-is-coming-to-android-and-ios-december-8th/);
   [Wikipedia: Suzerain (video game)](https://en.wikipedia.org/wiki/Suzerain_(video_game)).
   **Fact.** *Inference*: a text-heavy, choice-driven political drama with real reading load
   is provably viable on mobile when the interaction model is read-then-tap rather than
   read-then-manage-a-dashboard — closer to our reply-card model than to Democracy's spreadsheet.

4. **Democracy 3/4's dashboard-and-graph model is the one that visibly struggles on a phone
   screen, by the developer's own account.** Cliff Harris's own 2014 post on the iPad port
   admits the "sprawling GUI" had to be cut down for the smaller screen, and early buyers
   flagged pixelated icons, undersized touch targets (cabinet hire/fire buttons "very small,
   particularly on an iPad mini"), and UI elements that read as a straight PC port not
   re-thought for touch. [Positech/Cliff's
   Blog](https://www.positech.co.uk/cliffsblog/2014/06/08/democracy-3-is-now-on-something-called-an-ipad-whatever-that-is-d/);
   [App Store reviews via
   search](https://apps.apple.com/gb/app/democracy-3/id882525717?see-all=reviews&platform=ipad).
   **Fact.** A 148Apps reviewer separately calls the game "a dense, almost impenetrable
   experience" whose built-in tutorial is "pretty close to worthless," recommending the player
   read the manual first, and frames the whole experience as "an interactive thought exercise"
   rather than recreational play. [148Apps
   review](https://www.148apps.com/reviews/democracy-3-review/). **Fact.** *Inference*: the
   node-graph/arrow visualization that is Democracy's signature legibility device is the
   specific thing that doesn't survive the screen-size cut — not the politics, not the text,
   not the seriousness.

5. **2026 mobile benchmarks make an unmodified 208-turn campaign a retention risk, not a
   pacing detail.** Median session length across mobile is 3.1–3.5 minutes; only the top 1% of
   titles clear 22+ minutes. Median D1 retention is ~22%, D7 ~4%, D30 under 1%; even top-tier
   titles cap out around 40–50% D1. Strategy specifically sits at 25.4% D1 (vs. 32.7% for match
   games) "because their depth takes longer to hook new players." [GameAnalytics 2026 Mobile &
   PC Gaming
   Benchmarks](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks);
   [Segwise retention
   benchmarks](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies); [Mixpanel
   2026 mobile gaming
   benchmarks](https://mixpanel.com/blog/mobile-gaming-benchmarks-2026/). **Fact**, aggregated
   across genres — GameAnalytics's own 2026 report states genre-level breakdowns are
   unavailable this cycle pending a categorization rework, so the strategy-specific D1 figure
   above comes from a secondary aggregator, not GameAnalytics directly; treat it as
   `[unverified]` at the precision quoted. **Recommendation**: see §4.

## 3. Mechanics worth stealing

**A. Death-as-restart-seed (Reigns).** What it is: losing ends the run but seeds the next one
— unlocked content, a successor framing, narrative continuity across "reigns." Why it works:
it converts the moment mobile players are most likely to bounce (failure) into the strongest
retention hook (curiosity about the next run). Cost for us: currently our removal/election-loss
path is a hard stop with no next-run hook; we'd need a "next administration" framing layer over
the existing seed-replay engine (which we already have — everything is replayable from seed)
plus a small amount of persistent unlock state across runs. Fit: **4/5** — the deterministic
seed engine is unusually well-suited to this, we just haven't built the wrapper.

**B. Two-line-summary card + one-tap decision (Reigns / Suzerain both, at different text
depths).** What it is: however much reading happens, the actual input event is always a single
tap/swipe against a legible two-option (or short list) choice — never a form, never a modal
stack. Why it works: matches the 3–5 minute median mobile session; the reading can be as long
as it needs to be, but the interaction never is. Cost for us: low — our reply-card model
already does this; the risk is scope creep toward Democracy-style multi-field policy sliders,
which the evidence above says is exactly the thing that breaks on a phone. Fit: **5/5** —
mostly a "don't drift" discipline, not new build.

**C. Session-boundary content design (Fallen London's action-point ration).** What it is:
Fallen London artificially caps how much a free session can consume (an action-point pool that
refills over ~90 minutes), which forces natural stopping points and repeat visits rather than
one long binge. Why it works: it turns a technically unbounded text corpus into a habitual,
return-multiple-times-a-day product. Cost for us: **not a fit as a monetization lever**
(pay-to-refill reads as exploitative for a premium/serious positioning) but the underlying
idea — natural in-fiction stopping points every few turns, rather than "play until you're
tired" — is cheap to adopt as pure pacing/UX (e.g., a weekly "briefing complete" beat) without
attaching a paywall to it. Fit: **3/5**.

## 4. Their weaknesses / our openings

1. **Nobody has shipped a mobile-native political sim with real systemic depth (multi-actor
   relationships, budget, standing, escalation ladders) — the genre bifurcates into
   "deep-but-desktop" (Democracy) and "mobile-but-shallow" (Reigns' four meters, no named
   actors, no persistent world state beyond card unlocks).** Suzerain is the closest bridge and
   it is a linear narrative VN, not a systemic sim — no standing armies of named senators, no
   escalation ladder, no dataset of 49 other nations. Evidence: findings 1–4 above. This is the
   space our existing engine (five metrics, six opinion drivers, 50 states, ~49 nations with
   trust/tension/alignment, an instrument/rung escalation ladder) already occupies and nobody
   else does on mobile.

2. **Democracy's dashboard grammar is a proven mobile failure mode, in the developer's own
   words, not just player complaints.** Finding 4. Our openings: our "documents on a desk,
   read and answer" texture is structurally the opposite of Democracy's node-graph — it's
   already closer to Suzerain/Reigns' read-then-tap model. The risk is any future UI work that
   adds Democracy-style live graphs, sliders, or dashboards to expose the new economic-character
   and pressure-regime systems currently being designed; the evidence says that specific
   affordance is the one to avoid on our primary surface, even if it's fine as a secondary
   drill-down.

3. **A literal 208-turn, one-turn-per-week campaign at any real per-turn reading/decision
   time is a 10+ hour single campaign in a market whose D30 retention is under 1% and whose
   median session is ~3 minutes.** Finding 5. This is a direct constraint on the "variable
   campaign pacing" and "pressure regime" work in progress, not just a marketing problem:
   *recommendation* — the campaign needs strong session-boundary framing (weekly "briefing"
   beats that complete and close, à la finding C) and needs to be legible and worth returning
   to well before turn 208 for players who never do more than a handful of sessions; consider
   whether a full 4-year term needs to be the smallest satisfying unit of "finished," or whether
   shorter arcs (a crisis, a legislative session) can close with their own sense of resolution
   the way a Reigns "reign" does. This is a design question for the team, not something this
   research can settle alone — flagging it as the single largest open risk (see below).

4. **Monetization the audience actually tolerates in this genre is premium-purchase, not
   free-to-play.** Tropico mobile: $11.99, no IAP, no ads. Beholder: $4.99 premium + free demo.
   Reigns: $2.99 flat. Plague Inc. is the outlier — $0.99 base + $8.99 in paid expansions,
   still a purchase-based ladder rather than gacha/energy F2P. [Android
   Police](https://www.androidpolice.com/2019/09/05/tropico-android-launch/); [TouchArcade
   Beholder coverage referenced via
   search](https://www.gamespot.com/reviews/beholder-review/1900-6416610/); Plague Inc. Wiki.
   Democracy 3 on iPad shipped at $9.99, and Harris's own defense of that price ("go play
   Angry Birds... and stop whining") signals the developer explicitly rejected racing to
   mobile's F2P price floor. This directly validates a premium or one-time-purchase model for
   us — the audience buying serious political sims on mobile already expects and accepts to
   pay $3–$12 up front, and DLC/expansion packs (a la Plague Inc., Suzerain's Rizia DLC) are
   the accepted follow-on, not subscriptions or energy timers.

5. **Discoverability for this genre runs through App Store search-term precision and
   community-mined language, not broad paid UA.** Top 3 search results capture roughly half of
   downloads; premium narrative/story-driven titles convert visitors at 2–5%; up to 35 Custom
   Product Pages can be built to capture niche intent (e.g., "president simulator," "political
   choices game," "cabinet management") separately from a generic strategy listing.
   [MobileAction](https://www.mobileaction.co/blog/game-app-marketing-strategy/); [AppFollow
   2026 ASO
   playbook](https://appfollow.io/blog/app-store-optimization-for-games). *Recommendation*:
   ASO keyword research mining Suzerain/Reigns/Democracy player-review language is a cheap,
   concrete pre-launch task — it's a search problem, not a spend problem, for a niche title.

## 5. Sources

- https://en.wikipedia.org/wiki/Reigns_(video_game)
- https://appsamurai.com/blog/mobile-app-success-story-how-reigns-did-it/
- https://www.pcgamer.com/how-reigns-and-its-forthcoming-sequel-make-their-tinderocracy-work/ (fetched, page content was navigation-only; not used as evidence)
- https://gamingtrend.com/news/award-winning-suzerain-is-coming-to-android-and-ios-december-8th/
- https://en.wikipedia.org/wiki/Suzerain_(video_game)
- https://apps.apple.com/us/app/suzerain/id1590033408 (fetch failed, HTTP 429; not used as evidence)
- https://www.positech.co.uk/cliffsblog/2014/06/08/democracy-3-is-now-on-something-called-an-ipad-whatever-that-is-d/
- https://www.148apps.com/reviews/democracy-3-review/
- https://apps.apple.com/gb/app/democracy-3/id882525717?see-all=reviews&platform=ipad
- https://www.androidpolice.com/2019/09/05/tropico-android-launch/
- https://plagueinc.wiki.gg/wiki/Plague_Inc.
- https://www.gamespot.com/reviews/beholder-review/1900-6416610/
- https://en.wikipedia.org/wiki/60_Seconds!
- https://toucharcade.com/2016/05/02/fallen-london-review/ (fetch failed, HTTP 403; findings on Fallen London drawn from search-result summaries only, marked accordingly — session length / action-point details are `[unverified]` at source-page level)
- https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks
- https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies
- https://mixpanel.com/blog/mobile-gaming-benchmarks-2026/
- https://www.mobileaction.co/blog/game-app-marketing-strategy/
- https://appfollow.io/blog/app-store-optimization-for-games
