# Election and Campaign Simulation Games — Competitive Research

## Scope

This brief covers four major election/campaign simulation titles and emergent 2024+ entrants:

- **The Political Machine series** (Stardock, 2004–2024) — the longest-running campaign sim
- **270soft President Infinity** (2008–2024+) — highest mechanical depth, historical play
- **270soft Congress Infinity** (2014+) — downballot-focused variant
- **The Campaign Trail** (browser game, 2012–2024) — educational, 25-question narrative format
- **Newer entrants**: 2024 U.S. Election Simulator, President Simulator

**Out of scope**: Democracy series (economic systems, not campaigns); board and card-game variants; single-candidate gov sims; real-money betting platforms. These games are campaign *simulators*, not governance sims—they omit policymaking, legislative negotiation, and crisis response once the candidate is in office.

## Findings

### 1. **State-by-state polling models compute state lean, then perturb it**

**The Political Machine (Stardock, all editions)**  
States are classified by lean: blue (D), red (R), pink (swing), gray (uncertain). Each state holds 3–55 electoral votes based on population. Polling updates weekly. Campaign actions—ads, rallies, endorsements, field offices—nudge state polling. Ad effectiveness is state- and demographic-conditional: "tax cuts work better with Republican Texas than with Democratic Massachusetts." A candidate wins a state's full electoral college by winning popular vote in that state. [Source: Political Machine wiki](https://thepoliticalmachine.fandom.com/wiki/The_Political_Machine), [Game Developer postmortem](https://www.gamedeveloper.com/business/postmortem-stardock-s-i-the-political-machine-i-).

**President Infinity (270soft, all editions)**  
The sim maintains a population of virtual voters, each tagged with demographic attributes (age, income, education, gender, party, race class). Players control candidate positioning on policy axes; undecided voters swing based on how close a candidate's position is to their preference. The "Voter Detail" setting controls simulation granularity—higher resolution = more realistic dynamics for small-population constituencies. [Source: President Infinity help file](https://270soft.com/president-infinity-help-file/president-infinity-help-file-tutorial/), [270soft wiki](https://270soft.fandom.com/wiki/President_Infinity).

**The Campaign Trail (Dan Bryan)**  
After each of 25 decision nodes (debates, policy stances, events, gaffes), national and state-level polling trackers update. The model is deterministic and calibrated against historical election data—state polling reflects the outcome distribution of the real election the player is attempting. [Source: Campaign Trail wiki](https://thewikitrail.miraheze.org/wiki/The_Campaign_Trail_(game)).

**Inference**: All three use state as the unit of analysis. Political Machine abstracts state dynamics to a single color; President Infinity models voter-level heterogeneity; Campaign Trail builds a lookup table from history. None model the mechanisms of state-level swing—they assume swing is proportional to campaign effort, not to macroeconomic or event-driven shocks.

### 2. **Campaign actions have scalar effects: each action spends a resource and shifts polling**

**The Political Machine** (all editions)  
Campaign funding is the bottleneck resource. Players spend money on: TV/radio/newspaper ads (effectiveness varies by state and issue), fundraisers (replenish funds), rallies (raise awareness), debates (gain/lose support on key issues), surrogates (campaign without the candidate). Ads are targeted: an abortion ad plays differently in Utah vs. California. In 2024, the new **Political Action Cards** system lets players spend Political Capital to deploy Fact Check cards (deflect opponent attacks), scandal-exposure cards (uncover opponent vulnerabilities), or ideology-position cards. Each card has a condition and effect. [Source: Political Machine Steam store](https://store.steampowered.com/app/2512090/The_Political_Machine_2024/), [Softpedia review](https://www.softpedia.com/reviews/games/pc/the-political-machine-2024-review-537541.shtml).

**Congress Infinity** (270soft)  
Players manage 435 (House) or 30+ (Senate) simultaneous races. Surrogates barnstorm, fundraisers refill coffers, ads target voters, and field operations (footsoldiers) engage undecideds. Scandal research is available but costly. [Source: Congress Infinity wiki](https://270soft.fandom.com/wiki/Congress_Infinity).

**Inference**: These games treat campaign actions as **mechanical levers**, not as narrative/story elements. Each action has a resource cost (money, stamina, political capital) and a calculated effect (polling shift, awareness raise, demographic targeting). This is the opposite of our governor model—the player does not spend resources on campaigns; instead, *governance outcomes* should cascade into election outcomes.

### 3. **Endorsements and events create momentum shocks; momentum is tracked separately from base polling**

**The Political Machine series**  
Endorsements are treated as discrete events that move polling in a candidate's favor. An endorsement from a recognizable political figure boosts the candidate's standing in that state or nationally. [Source: Political Machine wiki](https://thepoliticalmachine.fandom.com/wiki/The_Political_Machine).

**Real-world 2020 precedent**: The 270soft help file cites Biden's comeback after Jim Clyburn's endorsement followed by a "stampede of endorsements" from competitors—a cascade effect where one high-profile event triggers a momentum shift. This mirrors game design where a single high-value event can reset polling trajectories. [Source: Axios/Fast Company coverage](https://www.fastcompany.com/91218688/what-its-like-to-play-the-political-machine-game), [Political Machine postmortem](https://www.gamedeveloper.com/business/postmortem-stardock-s-i-the-political-machine-i-).

**Inference**: Campaign momentum is tracked as **separate from structural polling**. It is event-driven and volatile. For our game: a scandal, a foreign-policy success, or a failed domestic crisis could create a momentum shock (instant -10 to +10 shift), distinct from the slow baseline decay of popularity. This creates narrative drama.

### 4. **Issue positioning is a two-axis space (left/center/right); voters have ideological distance metrics; flip-flopping is penalized**

**President Infinity**  
Candidates specify their position on key policy axes (healthcare, taxation, immigration, etc.). Voters have ideal points on each axis. Voter utility for a candidate is inversely proportional to the distance from the voter's ideal. *Changing* a position induces a flip-flopping penalty: nearby voters are alienated by the reversal, and news coverage highlights the inconsistency. This makes late-campaign pivots risky. [Source: President Infinity wiki](https://270soft.fandom.com/wiki/President_Infinity), [Critical review](https://emf140mini2017.wordpress.com/2017/01/19/critical-review-3-president-infinity/).

**The Campaign Trail**  
Player choices on foreign policy, economic policy, and social issues set the candidate's implicit position. Choosing multiple inconsistent positions triggers advisor warnings ("you're flip-flopping"). Some optimal choices are framed as gaffes. [Source: Campaign Trail wiki](https://the-campaign-trail.fandom.com/wiki/The_Campaign_Trail).

**Inference**: Issue positioning is a **constraint on strategy**. You cannot run as both pro-business and pro-labor. Moving toward the center generalizes appeal but alienates base voters. Moving to an edge energizes the base but limits swing-voter appeal. For us: the player's policy record *is* their implicit positioning. If they've been dovish for 2 years, a sudden hawkish war declaration is costly (scandal, alienation). This is the inverse of campaign positioning—it's *lock-in* rather than *optionality*.

### 5. **Field offices have empirically measurable but non-decisive effects on turnout and election outcomes**

**Ground game literature** (Obama 2008, Harris 2024)  
Field offices increase voter contact (phone calls, door knocks), which boosts turnout among favorable voters. Obama's 2008 ground game flipped several swing states; Harris's 2024 field presence was large but insufficient to overcome other headwinds. A field office cannot compensate for an unpopular candidate or adverse macro conditions, but in a close race it can shift a state. [Sources: OU political science paper](https://academic.oup.com/poq/article/73/5/1023/1867345), [Goodauthority analysis](https://goodauthority.org/news/campaign-field-offices-2024-harris-trump-ground-game-volunteers/)].

**Congress Infinity and Political Machine** both include field operations as actions.

**Inference**: Ground game is **necessary but not sufficient**. For us: governing well in a state (reducing unemployment, passing popular legislation) should boost baseline turnout. Poor governance should suppress it. Campaign visits are less important than constituency satisfaction.

### 6. **Coattails and downballot effects are modeled only in Congress Infinity; most campaign sims ignore them**

**Congress Infinity** (270soft)  
The game allows simultaneous House (435) or Senate (30+) races under the player's party banner. Winners/losers are determined in part by the party's presidential or gubernatorial standing—coattails. No other campaign sim in our research covers this systematically. [Source: Congress Infinity wiki](https://270soft.fandom.com/wiki/Congress_Infinity).

**Real-world coattail mechanics**: A popular presidential candidate drives turnout among party voters, benefiting downballot candidates. The reverse is also true: a toxic presidential race can suppress party turnout. Recent academic work confirms the effect is real but modulated by candidate-specific factors (local race quality, campaign spending, prior polarization). [Source: Coattail effect research](https://onlinelibrary.wiley.com/doi/full/10.1111/ajps.70025).

**Inference**: Coattails are **abstracted away** in campaign sims because they focus on one race. For us: coattails are essential. A popular president should boost House/Senate races in their party; an embattled one should hurt. This cascades from our governance model into Congress composition, creating a feedback loop.

### 7. **News and scandal events are mostly canned or randomly triggered; few games model emergent crisis cascades**

**The Political Machine 2024**  
Scandals are exposed via Fact Check and scandal cards. These are narrative triggers, not emergent failures. Gaffes are codified as sub-optimal choices. [Source: Political Machine 2024 Steam](https://store.steampowered.com/app/2512090/The_Political_Machine_2024/).

**President Simulator**  
Players define scandals at character setup. During play, scandal events are mixed into a random news pool. Covert actions (blackmail, surveillance) can trigger new scandals when exposed. This is more emergent than Political Machine, but still shallow—scandals are triggers, not consequences of policy decisions. [Source: President Simulator](https://fantasypresidentcareer.com/).

**Campaign Trail**  
News events are presented as multiple-choice prompts (debate gaffes, economic shocks, foreign crises). Responses are deterministic—the same answer always yields the same polling shift. No cascading consequences. [Source: Campaign Trail wiki](https://the-campaign-trail.fandom.com/wiki/The_Campaign_Trail).

**Inference**: All three treat events as **exogenous shocks**, not as consequences of player strategy. This is appropriate for campaign sims, where external news (recession, scandal) is outside the candidate's control. For our game: this is a strength we should protect. A recession should not result from player choices; it should arrive as a scenario that the player must govern through.

## Mechanics Worth Stealing

### 1. **State-by-state polling dashboard with demographic drill-down**

**What it is**: A grid where each row is a state, columns show base lean, current polling, trend arrow, undecided %, by-demographic breakdown (urban/suburban/rural, age cohorts, income bands). Visual codebook: blue=D lean, red=R lean, pink=swing, gray=toss-up.

**Why it works**: It makes the electoral college math transparent and legible. The player can see at a glance: "I'm losing California (base) but gaining Nevada (effort payoff). Ohio is a toss-up; what do I do?" This is the entire campaign sim loop compressed into one screen.

**Cost for us**: We already track state lean (`50-state partisan lean`). We track `mandate` and removal pressure. We would add a state-by-state polling column (derived from mandate + state-level grievances) and a demographic slider showing which cohorts are satisfied vs. alienated. This is a data-visualization problem, not a simulation problem. **Cost: low**.

**Fit score**: **5/5**. The player *must* see the state-level impact of their decisions. This is the primary feedback loop for elections. Without it, elections feel arbitrary.

---

### 2. **Momentum as a volatile, event-driven multiplier on base polling**

**What it is**: A separate metric from base polling. Base = structural partisan lean + player satisfaction. Momentum = recent shocks (scandal, military victory, economic data release, endorsement). Momentum has a half-life: it decays back to base over weeks. A scandal can spike momentum ±10 for 2–4 weeks, then fade.

**Why it works**: It explains why races tighten and then settle. It creates narrative arcs. A popular bill can temporarily boost standing; a gaffe can crater it. Without momentum, the game is deterministic and flat.

**Cost for us**: We track `mandateScore` (composite of five metrics). We could add a `momentum` field (delta from base), which decays weekly toward zero. Major story beats (scandal, military victory, economic shock) set momentum. This would cascade into election polling without requiring campaign-action modeling.

**Fit score**: **4/5**. High value, low cost. The only risk is that momentum steals narrative agency from the player—a random scandal could decide an election. We'd need to ensure scandals arise from player decisions (long-term neglect, not random events). Our scenario system already supports this.

---

### 3. **Issue positioning as a continuous record, not a campaign tool**

**What it is**: The player's policy decisions over four years implicitly position them on key axes: (isolationist↔interventionist), (austerity↔stimulus), (permissive↔restrictive on civil liberties). States and demographics reward/punish alignment. A state that is isolationist-leaning alienates from a president who went to war.

**Why it works**: It makes governance *visible* as electoral strategy. It punishes flip-flopping (you can't go isolationist, then interventionist, then isolationist without paying a cost). It rewards coherence.

**Cost for us**: We have decision trees in scenarios. Each decision could tag the player with an axis score (±war, ±spending, ±liberty). Aggregate these into a positioning vector. At election time, compute each state/demographic's distance to that vector and adjust polling. This is straightforward probability math. **Cost: medium** (requires tagging 300 scenarios with axis labels; building state/demographic preference profiles).

**Fit score**: **4/5**. High payoff for players who replay and experiment with different governing philosophies. Risk: could reduce player agency if their position is locked in by early choices. Mitigation: make positioning visible so players can see the electoral consequences of their choices *before* reaching the election.

---

### 4. **Turnout as a proxy for state satisfaction, not as a campaign action**

**What it is**: Each state has a turnout multiplier (80%–120% of baseline). High player satisfaction → high turnout. Neglected grievances → low turnout. During elections, states with high turnout are more likely to swing; low-turnout states become predictable.

**Why it works**: It rewards governing for each state, not just for the national aggregate. It creates asymmetric vulnerability: if you've neglected the Rust Belt, your normally-Democratic base won't turn out, and you lose winnable states.

**Cost for us**: We have `nation.states[*].grievances` (planned, not yet shipped). Compute turnout = 1 - (grievances / maxGrievances). At election time, increase polling swing in high-turnout states. This is a one-week implement once grievance data is available. **Cost: very low**.

**Fit score**: **5/5**. This is the most direct way to make elections a *referendum* on governance rather than on campaign machinery.

---

### 5. **Coattails computed from the president's popularity, applied to congressional elections**

**What it is**: At midterm and general election, Congress races are re-solved. Each representative or senator's win probability is modified by a coattail factor: +/- 5–10% depending on the president's mandate score and state-level satisfaction. A popular president lifts the party ticket; an unpopular one drags it down.

**Why it works**: It creates strategic consequences for the player's governing choices. Congress opposition that results from negligence feels more earned than arbitrary opposition.

**Cost for us**: We already have Congress as aggregate chambers + named leaders. We'd add a hidden layer: 435 (House) or 100 (Senate) pseudo-agents with implicit win probabilities, derived from baseline partisan lean ± coattails. At election time, re-solve and update Congress composition and named leaders. This is an implementation detail. **Cost: medium** (requires creating a pseudo-Congress model; integrating it into the existing Congress system).

**Fit score**: **4/5**. High value for player agency and systemic depth. Risk: if Congress is abstract (just aggregate lean), coattails feel invisible. We'd need to surface Congress opposition by state/district to make it legible.

---

## Their Weaknesses / Our Openings

### 1. **Campaign sims are strategy-flat for experienced players**

**Evidence**: Steam reviews of The Political Machine 2016 report "certain strategies which assure victory on all but the highest difficulty." Once you know the meta (build ads early, target swing states, accumulate funds), the game becomes deterministic. [Source: Softpedia review](https://www.softpedia.com/reviews/games/pc/the-political-machine-2016-review-500164.shtml).

**Why it happens**: Campaign mechanics are reductive. There are only a few levers (ads, rallies, debates, endorsements) and the effects are scalar (higher spending = more polling points). Once the player maps the function, there is no longer a strategy problem.

**Our opening**: *Governance* has asymmetric, emergent complexity. Policies have ripple effects across years. A popular bill can have unintended consequences later. Events are triggered by the player's *neglect* (e.g., a scandal emerges because the issue has been ignored for 18 months). Elections are a *consequence* of governance, not a separate minigame. This makes replayability intrinsic, not opt-in.

---

### 2. **Event narration is disjointed; news does not build emotional arcs**

**Evidence**: President Infinity criticism: "news clips do not create an engrossing narrative—they are just disjointed stories." The game randomly draws from a pool of events with no causal thread. [Source: Critical review](https://emf140mini2017.wordpress.com/2017/01/19/critical-review-3-president-infinity/).

**Why it happens**: Campaign sims treat events as independent shocks. There is no memory system (X was ignored for 3 months, so now Y happens as a consequence). Events are randomly triggered, not emergent.

**Our opening**: Our scenarios are *authored prose*, and they already feature callback and consequence chains. A player's inaction on immigration creates a cascade: neglect → domestic unrest → recruitment crisis → electoral vulnerability. News is not random; it is *authored* and *causal*. This is our primary narrative advantage.

---

### 3. **Primaries are shallow or absent; delegate math is underbaked**

**Evidence**: Political Machine 2024 adds a primary mode for the first time, but reviews note it "doesn't fully capture unique elements of caucuses or delegate distribution." Historical delegates, viability thresholds, and state-specific rules (Iowa's recount, Nevada's alignment) are abstracted away. [Source: Softpedia review](https://www.softpedia.com/reviews/games/pc/the-political-machine-2024-review-537541.shtml).

**Why it happens**: Primaries are combinatorially complex. Modeling them accurately requires state-by-state delegate rules, candidate viability rules, and sequential/simultaneous state timing. Most campaign sims skip this.

**Our opening**: We are doing a *general* only (no primaries for the player). This removes the combinatorial burden and lets us focus on state-by-state polling dynamics. We can be more *accurate* in the general than campaign sims are in their primaries.

---

### 4. **Governance and campaign are decoupled; election outcomes feel arbitrary**

**Evidence**: Both Political Machine and President Infinity isolate campaign from any prior player state. You start a new game; the candidate has no prior record. Elections are decided by campaign effort, not by "did the candidate do a good job?" [Source: multiple Steam reviews](https://steamcommunity.com/app/404620/reviews/?p=1&browsefilter=toprated&filterLanguage=all).

**Why it happens**: Campaign sims are intentionally designed to let the player *try* winning despite being a fictional nobody. They are not sequels to a governing game.

**Our opening**: Elections *are* referenda on the player's governance. A popular, effective president wins re-election. An embattled one loses. The player's prior policy record is *the* deciding factor. This makes elections a *goal* (stay popular enough to win), not a *minigame* (win the campaign despite being unpopular).

---

### 5. **No mechanism for state-by-state consequences or regional variation in impact**

**Evidence**: Neither Political Machine nor President Infinity models how a policy decision in one state (e.g., a federal project in Ohio, a tariff on agricultural goods) affects that state's satisfaction and polling differentially. Policies are national; effects are national. [Sources: Political Machine wiki, President Infinity wiki](https://270soft.fandom.com/wiki/President_Infinity).

**Why it happens**: Modeling state-by-state policy impacts requires detailed economic/political microdata per state. Campaign sims are abstracted enough to avoid this. They focus on *persuasion* (moving voters' minds), not on *material conditions* (improving/worsening voters' lives).

**Our opening**: We are *intentionally* building state economic character and congressional delegations. A tariff affects agricultural states differently than financial-center states. This is planned in our PLAN.md, not yet implemented. When it lands, elections will be highly contingent on prior policy choices, making elections feel *earned* or *lost*.

---

## Sources

### Primary (Developer / Official)
- [The Political Machine (Stardock) Official Wiki](https://thepoliticalmachine.fandom.com/wiki/The_Political_Machine)
- [Postmortem: Stardock's The Political Machine (Game Developer)](https://www.gamedeveloper.com/business/postmortem-stardock-s-i-the-political-machine-i-)
- [President Infinity Help File (270soft)](https://270soft.com/president-infinity-help-file/president-infinity-help-file-tutorial/)
- [Congress Infinity Official Wiki (270soft Fandom)](https://270soft.fandom.com/wiki/Congress_Infinity)
- [270soft About Page](https://270sims.com/about/)
- [President Infinity 2024 – 270sims](https://270sims.com/us-presidential-election-game/)
- [The Campaign Trail Wiki](https://the-campaign-trail.fandom.com/wiki/The_Campaign_Trail)

### Secondary (Reviews, Criticism, Analysis)
- [The Political Machine 2024 – Steam Store](https://store.steampowered.com/app/2512090/The_Political_Machine_2024/)
- [The Political Machine 2024 Review (Softpedia)](https://www.softpedia.com/reviews/games/pc/the-political-machine-2024-review-537541.shtml)
- [The Political Machine 2016 – Steam Community Reviews](https://steamcommunity.com/app/404620/reviews/?p=1&browsefilter=toprated&filterLanguage=all)
- [The Political Machine 2016 Review (Common Sense Media)](https://www.commonsensemedia.org/game-reviews/the-political-machine-2016)
- [Critical Review: President Infinity (Introduction to Electronic Media and Film)](https://emf140mini2017.wordpress.com/2017/01/19/critical-review-3-president-infinity/)
- [What It's Like to Play The Political Machine Game (Fast Company)](https://www.fastcompany.com/91218688/what-its-like-to-play-the-political-machine-game)
- [Playable Campaigns (Unwinnable Magazine)](https://unwinnable.com/2023/08/09/playable-campaigns/)

### Academic & Real-World Context
- [Did Obama's Ground Game Matter? (Oxford Political Science Quarterly)](https://academic.oup.com/poq/article/73/5/1023/1867345)
- [Coattail Effect – Wikipedia](https://en.wikipedia.org/wiki/Coattail_effect)
- [A Drag on the Ticket? Top-of-Ticket Effects on Down-Ballot Races (American Journal of Political Science)](https://onlinelibrary.wiley.com/doi/full/10.1111/ajps.70025)
- [Campaign Field Offices 2024 Analysis (GoodAuthority)](https://goodauthority.org/news/campaign-field-offices-2024-harris-trump-ground-game-volunteers/)
- [Strategic Flip-Flopping in Political Competition (International Economic Review)](https://onlinelibrary.wiley.com/doi/10.1111/iere.12778)

### Supporting Sources
- [The Political Machine 2024 – Wikipedia](https://en.wikipedia.org/wiki/The_Political_Machine_2024)
- [President Forever 2008 + Primaries – Wikipedia](https://en.wikipedia.org/wiki/President_Forever_2008_+_Primaries)
- [The Campaign Trail (Video Game) – TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/TheCampaignTrail)
- [President Simulator](https://fantasypresidentcareer.com/)
- [2024 U.S. Election Simulator – Steam](https://store.steampowered.com/app/2542440/)
