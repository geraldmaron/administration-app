import { INSTITUTION_STATE_FIELDS, MATTER_ORIGINS, MATTER_STAGES, PENDING_RULE_STATUSES, TOPIC_TAGS, } from "@admin/content";
import { MECHANISM_FLOOR } from "./binding.js";
/**
 * The binding contract, printed as a vocabulary rather than an instruction.
 *
 * The measurement behind this section: 41% of the shipped corpus gates on
 * nothing or on an early turn floor, 89% of every condition it does carry is
 * `turn` or `flag`, and five condition kinds — `institutionState` among them —
 * have never been used once. None of that is a writer failing to follow a rule.
 * It is what a skeleton produces: a drafter fills the slots the skeleton has,
 * and until now the brief named `conditions` in one paragraph and never said
 * what could go in it. So the whole vocabulary is enumerated here with a
 * one-line reason to reach for each, and the gate refuses a week that gates on
 * the calendar alone.
 */
export function bindingSection() {
    return `BOUND TO THE BOARD. A scenario is not finished when it reads well. It is finished when the game can
say WHY THIS WEEK, ON THIS BOARD, TO THIS PRESIDENT. Three things are required of every scenario here
and the validator refuses the batch without them.

Persistent subjects: reuse ENTITY_REGISTRY identifiers. The registry's firstAppearance establishes a
subject without inferring a name from prose. subjects binds a slot to an entity, the current governor,
a named city mayor, an actual House/Senate member, an institution, or a predecessor scenario/slot.
An inherited person stays that person; a current-office slot binds today's official. Use {{slotKey}}.
An introduced mayor is persisted through the existing person effect. Other local figures remain
unnamed offices. A domestic transmission names domesticSubject and uses letter or readout; it never
adds a governor/member to the direct-speaker channel. The sender must be an actual bound official.

Geography: locus.settlement = small uses sourced Natural Earth settlement points; commercial-port
requires an evidenced port. settlementId pins an owned set piece to a specific sourced point. The
small tier proves no rural character, crop, industry or operating capacity. Use {{settlement}} for
its name. Unsupported geography or capabilities require new sourced data or a revised premise,
never a plausible-sounding substitute. The frozen case, prose, map, effects and Record share the bind.

(a) AT LEAST ONE CONDITION THAT IS NOT A TURN FLOOR AND NOT A FLAG. "turn" says when the game may deal
a week; it never says why the week belongs to this board. This is the whole live vocabulary, and every
one of these is read by the engine today — pick the one your fiction actually depends on:

  - metric              { metric: "approval" | "treasury" | "stability" | "militaryReadiness" | "standing", atLeast/atMost }
                        Use when the week only makes sense to a government already in that position — a
                        bailout ask that only bites when the treasury is thin.
  - alignment           { axis: "economicLeftRight" | "authLibertarian" | "nationalistGlobalist", atLeast/atMost }
                        Use when only a government of this character would be offered this, or blamed for it.
  - relationship        { field: "trust" | "alignment" | "tension" | "tradeDependence" | "militaryThreat", atLeast/atMost }
                        Cast scenarios only. Use when the week exists because of what these two governments
                        already are to each other.
  - counterpartTrait    { trait: "aggression" | "opportunism" | "legalism" | "isolationism" | "riskTolerance" |
                          "vengefulness" | "reliability" | "transparency", atLeast/atMost }
                        Use when the other government's character is the reason it did this.
  - cabinetAttribute    { roleHint, attribute: "competence" | "loyalty" | "ambition" | "integrity" | "charisma", atLeast/atMost }
                        Use when the week is the player's own appointment coming back on them. A vacant chair
                        satisfies nothing, which is itself a fact worth writing to.
  - institutionState    { institution: <an engine institution id>, field: ${INSTITUTION_STATE_FIELDS.join(" | ")}, atLeast/atMost }
                        THE RICHEST GATE THE GAME HAS AND NOTHING USES IT. Every field is a number on the
                        player's own Government screen that they moved themselves — by appointing a chair,
                        leaving a seat empty, leaning on an agency, or letting work pile up. Use it whenever
                        the week is the consequence of how a body has been run. "delivery" and "politicization"
                        run nought to one; "backlog", "vacantDays" and "openMatters" are counts. Note that
                        "openMatters" counts departmental audits at ONE body and is never above one, so gate on
                        two of them and the parser refuses you — reach for oversightMatter instead.
  - oversightMatter     { origin?: ${MATTER_ORIGINS.join(" | ")}, stage?: ${MATTER_STAGES.join(" | ")}, public?, obstructed?, atLeast? }
                        Open investigations into this administration, counted across the whole government.
                        Use for the week that only happens while somebody is already looking, or only once
                        the looking has gone public, or only after this administration moved against it.
  - shutdown            { is?: boolean, weeksAtLeast?: number }
                        Use for a week that reads absurdly outside a lapse — or, with is:false, for the
                        expansion, the state visit and the ribbon that read absurdly inside one.
  - appropriation       { onPriorYear?: boolean, weeksLeftAtMost?: number }
                        "onPriorYear" is the President who never got a budget and runs on last year's numbers.
                        "weeksLeftAtMost" is the run-up, and goes negative once the money is gone. Use for
                        anything that costs money in a week where the money is the argument.
  - pendingRule         { status?: ${PENDING_RULE_STATUSES.join(" | ")}, atLeast? }
                        Use for the comment period, the week a rule binds, and the week a court stopped it.
  - removalPressure     { atLeast/atMost }   Use when the week only lands on a President already in danger.
  - charterInstitution  { institution: <kind>, present: boolean }
                        Required beside any institution token that is not universal. Also a real gate on its
                        own: a week about the courts defying the government needs a government that has courts.
  - warState            { role: "any" | "aggressor" | "defender" | "none" }
                        The war itself rather than a tension proxy. "none" is the honest way to write the week
                        that is only interesting while the country stays out of a fight everyone else is in.
  - conditionActive     { condition?: <kind>, atLeast/atMost }
                        The flood, the outbreak, the drought — the thing itself, at the severity you need it.
  - coalition           { against: "player" | "counterpart", present: boolean }   Use when the capitals have gathered.
  - sharedMembership    { present: boolean, orgKind?: "defense" | "economic" | "political", tradeCompetence?: "customs-union" | "fta" }
                        Use when the week turns on a body both governments sit in. Narrow it: a customs or tariff
                        dispute needs { "orgKind": "economic", "tradeCompetence": ... }, not any shared pact. The
                        matched body's name is {{sharedOrganization}}; write that, never "the compact".
  - tariffInForce       { present: boolean }   Use on a family close that proposes to pause or trade away the tariff the counterpart's retaliation
                        answers; it is not dealt once that tariff has been lifted. Name the tariff's sector with {{ourTariffSector}}.
                        Add "of": "response" to gate on the tariff laid back in kind on the retaliation's response goods.
                        A reply that lifts that tariff carries commitment.tariffLift { "theirs": boolean } ("theirs": true when
                        both duties end together; "which": "response" for the in-kind tariff) and needs this gate, with the
                        same "of", and a tradeMeasure cast. A reply that lays a tariff
                        carries commitment.tariff { "sector", "rate" }: on a tradeMeasure cast it answers the retaliation at
                        the gate's response sector and rate; on any other nation cast it taxes the counterpart's goods, and
                        the engine refuses it where no trade law covers that country. Both are typed commands: no impact or
                        second command beside them, and no authored cost, except that a lift may price stability and
                        standing (never treasury) for the protection it drops. A reply's words say the act, the goods
                        and the rate its commitment carries; the audit refuses a lift, pause or sanction the reply never
                        routes.
  - sharesBorder        { present: boolean }   Use when the week involves the player's own trucks, citizens or troops at a
                        land frontier. Pair with "locus": { "site": "border", "ground": "counterpart", "frontier": "home" }.
  - policyStance        { domain, stance, active: boolean }   Use when the week answers a program this administration legislated.
  - operatorPressure    { field: "insurgency" | "protest", atLeast/atMost }   Use for pressure from the country's own streets.
  - geography           { field: "coastal" | "landlocked" | "bordered" | "chokepoint", is: boolean, of?: "player" | "counterpart" }   Use when a port, a strait or its absence is the premise; add "of": "counterpart" when the place is on the cast government's ground.
  - revealedPreference  What the world has read off this government's own record. Use for the week somebody
                        acts on a pattern the player set rather than on a single deed.
  - stateGrievance      A named grievance a state carries against the federal government.
  - cohortStrain        Strain on a named population cohort. Use when the week is about who is being ground down.
  - inflationBand, unemploymentBand, costOfLivingBand, crimeTrend, cyclePhase   { in: [<band>, ...] }
                        The country's own pulse, in a household's words. Inflation "below-target" | "near-target" |
                        "elevated" | "high"; unemployment "tight" | "normal" | "slack" | "severe"; the cost of living
                        since the oath "easing" | "steady" | "rising" | "straining"; crime since the oath "falling" |
                        "steady" | "rising"; the business cycle "expansion" | "peak" | "contraction" | "trough". Bands,
                        never figures: the engine owns the number, so the prose never prints one.
  - commodityBand       { commodity: <id>, in: ["slumped" | "normal" | "elevated" | "spiking"] }
                        A traded commodity against its anchor: the pump, the bread aisle, the fertilizer bill. Write
                        the decision around the market and never type a price; the market model owns it.
  - flag / turn         Real and useful, and they do not satisfy this rule on their own.

THE ONE HONEST EXCEPTION, and it is a declaration rather than a loophole. Some weeks should deal
anywhere: a routine culture or economy week does not need a four-condition gate, and forcing one on it
manufactures a dependency the fiction cannot support. Such a week says so, in the scenario's own "premise" field
({"kind":"universal","reason":...}), and says why. Silence is not a declaration, and at most a third of this batch may claim it.
A class that turns on board state (economy, war, disaster, public health, unrest) is satisfied three ways:
gate on that class's reading; "premise" universal, with a reason naming the fact that establishes the state or
why none is presumed; or "premise" introduces, for the week that is itself the incident creating the state.
The test between the last two: does THIS week make the state true, or only report one that already exists?
A flood, a ward out of beds or a standing crowd that this week merely reports is not introduced by it.
Every universal week still owes its four particulars and its priced mechanisms.

Across the batch as a whole, vary the vocabulary. Ten scenarios whose every condition is turn and flag
have gated on the clock, not on the board, and the validator refuses that batch outright.

(b) TOPICS, on every scenario, from this closed list and nothing outside it:
  ${TOPIC_TAGS.join(", ")}
One to three. This is the room's filing system: it is how a coverage pass finds what the pool is short
of and how an upgrade or retire wave selects its batch. It is NOT a tie to game state and does not
satisfy (a). Tag what the week is about, not what desk it arrives at — "class" already says the desk.

(c) A MECHANISM SENTENCE FOR EVERY PRICED METRIC. Rule: every number in a reply's "cost" completes
"this reply moves X because ___" out of facts that are already in this scenario. Seventeen percent of
priced metrics in the shipped corpus complete no such sentence, which means the arithmetic and the
fiction were written by two different people who never spoke.

The sentence is NOT player copy — a scenario narrating its own arithmetic is exactly what gate rule 4
bans — so it rides in a "binding" object beside the scenario's own fields. The validator reads it and
the schema then strips it: it never reaches the corpus, the API or the player.

  {
    "id": "the-berth-nobody-inspected",
    ... every normal ScenarioDef field ...,
    "binding": {
      "mechanisms": [
        { "reply": "seize-the-manifest", "metric": "standing",
          "because": "the seizure is done on a foreign-flagged hull in open water and every shipper the country trades with will read it as precedent" },
        { "reply": "seize-the-manifest", "metric": "treasury",
          "because": "the berth is closed for the inspection and the port authority is owed for every idle day of it" }
      ]
    }
  }

One entry per reply-and-metric pair, at least ${MECHANISM_FLOOR} characters, naming something the beats, the context or
the reply itself already said. A metric priced with no entry is refused, and an entry for a metric the
reply does not price is refused. A reply that declares an "impact" instead of an authored "cost" owes
nothing here — the impact model prices it, and the fiction is the declaration.

The exemplars below do not show a "binding" object. They are stored as parsed scenarios, which is the
strip working as designed; write yours anyway.`;
}
