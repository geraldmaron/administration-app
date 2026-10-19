import { CONDITION_KINDS, type ConditionKind as EngineConditionKind } from "@admin/engine";
import { CohortId, InstitutionKind } from "@admin/world";
import { z } from "zod";
import { ReadableFlag } from "./scenario-deed-flags.js";
import { ScenarioPolicyDomain } from "./scenario-labels.js";
import { ScenarioRoleHint } from "./scenario-speaker.js";
import { EXECUTIVE_STATE_CONDITIONS } from "./scenario-oversight.js";
import { PULSE_CONDITIONS } from "./scenario-pulse.js";

// Who a scenario is with, and what must be true of the board for it to be live:
// the cast pick and the condition union, with the bound helper and the mirrored
// condition-kind enum they are both written against.
//
// A module of their own because scenario.ts sits at its size ceiling and every
// wave that teaches content a new thing to gate on lands here. All three names
// are re-exported from scenario.ts, which stays the import path scenario-cast.ts,
// scenario-audit.ts and the studio-cli brief resolve them from.

// Who the scenario is with. A cast names a way of finding a counterpart on
// the live board, not a country: "tensest" finds whoever the player's reading
// says is closest to the edge, "closest" the firmest friend, "band" a nation
// matching a shape. "nation" pins a specific id and must justify itself as a
// set-piece. "none" is trouble at home — no foreign counterpart at all.
//
// Two of them read the wars rather than the relationships, because tension and
// belligerence are not the same fact and a war scenario that binds the wrong
// one is a scenario about the country the player is not fighting.
// "warCounterpart" is the principal opposite the player in the hottest war the
// player is in; "belligerent" is a principal of the hottest war the player is
// not in, which is what an ally's-war scenario needs to be able to require.
export const ScenarioCast = z.discriminatedUnion("pick", [
  z.object({ pick: z.literal("tensest") }),
  z.object({ pick: z.literal("closest") }),
  z.object({
    pick: z.literal("band"),
    archetype: z.string().optional(),
    powerTier: z.number().int().optional(),
    militaryTier: z.number().int().optional(),
    stabilityBand: z.string().optional(),
  }),
  z.object({ pick: z.literal("nation"), nation: z.string().min(1) }),
  z.object({ pick: z.literal("warCounterpart") }),
  // Omitting `side` takes whichever principal the player reads as tensest, so
  // a scenario about somebody else's war does not have to know who started it.
  z.object({ pick: z.literal("belligerent"), side: z.enum(["aggressor", "defender"]).optional() }),
  z.object({ pick: z.literal("none") }),
  // The counterpart is at home: whoever the board says is bearing the condition
  // the scenario is about. Trouble at home had exactly one cast — "none", no
  // counterpart at all — so a week about a disaster could name no governor, no
  // mayor and no stricken state, and every domestic scenario had to write around
  // the fact that nobody was on the other side of it.
  z.object({ pick: z.literal("stricken") }),
  // The counterpart is a masthead, not a government: one of the game's own
  // fictional outlets (a paper, a network, a show), named, or unnamed for the
  // national desk coldest to the administration this week, whatever its format. The country slot stays home, so nothing a reply
  // does reaches a foreign capital; `{{outlet}}` renders the masthead's name.
  z.object({ pick: z.literal("outlet"), outlet: z.string().min(1).optional() }),
  // Bind the counterpart to the report subject or the government it was shared with.
  z.object({ pick: z.literal("collectionReport"), bind: z.enum(["target", "recipient", "home"]) }),
  z.object({ pick: z.literal("tradeMeasure") }),
  z.object({ pick: z.literal("liveBill") }),
  z.object({ pick: z.literal("judicialVacancy") }),
  z.object({ pick: z.literal("pendingOrderCase") }),
]);
export type ScenarioCast = z.infer<typeof ScenarioCast>;

const bounds = { atLeast: z.number().optional(), atMost: z.number().optional() };

// The condition kinds the engine can put on the board: six authored disaster
// exposures a country is struck by, seven it generates out of its own state.
// Mirrored from the engine's list rather than restated (as
// `ScenarioPolicyDomain` is): a writer's invented kind must not parse.
export const ConditionKind = z.enum(CONDITION_KINDS as unknown as [EngineConditionKind, ...EngineConditionKind[]]);
export type ConditionKind = z.infer<typeof ConditionKind>;

// What must be true of the board for this scenario to be live. Relationship
// and counterpartTrait conditions read the cast counterpart, so the same
// nation can open one door as a friend and a different one as an adversary
// within a single campaign. cabinetAttribute reads whoever actually holds the
// named chair — a vacant one never satisfies it — so who the player appointed
// is itself part of what content the board can show.
export const ScenarioCondition = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("metric"), metric: z.enum(["approval", "treasury", "stability", "militaryReadiness", "standing"]), ...bounds }),
  z.object({ kind: z.literal("alignment"), axis: z.enum(["economicLeftRight", "authLibertarian", "nationalistGlobalist"]), ...bounds }),
  z.object({ kind: z.literal("relationship"), field: z.enum(["trust", "alignment", "tension", "tradeDependence", "militaryThreat"]), ...bounds }),
  z.object({
    kind: z.literal("counterpartTrait"),
    trait: z.enum(["aggression", "opportunism", "legalism", "isolationism", "riskTolerance", "vengefulness", "reliability", "transparency"]),
    ...bounds,
  }),
  z.object({
    kind: z.literal("cabinetAttribute"),
    roleHint: ScenarioRoleHint,
    attribute: z.enum(["competence", "loyalty", "ambition", "integrity", "charisma"]),
    ...bounds,
  }),
  // `agedAtLeast` is how a follow-up arrives as a callback rather than a
  // script: a consequence that lands the very next week reads as the game
  // executing an if-statement, while one that comes back cold — the deed half
  // forgotten, the flag still true — reads as the world having remembered.
  // "Set at least N turns ago", read off the turn-stamped marker each `sets`
  // flag leaves beside itself.
  z.object({ kind: z.literal("flag"), flag: ReadableFlag, is: z.boolean(), agedAtLeast: z.number().int().min(1).optional() }),
  z.object({ kind: z.literal("turn"), ...bounds }),
  z.object({ kind: z.literal("removalPressure"), ...bounds }),
  // Whether the founding charter has a body of this kind at all. A junta has
  // no independent court and a confederal council no single executive seat,
  // so a scenario about the courts defying the government is simply not a
  // thing that can happen under every government — this is how it says so,
  // and it is what lets `{{judiciary}}` be safe to write.
  z.object({ kind: z.literal("charterInstitution"), institution: InstitutionKind, present: z.boolean() }),
  // What the board is actually carrying. Until these existed, the war and
  // disaster classes were gated on tension and stability — proxies for a war
  // and a famine rather than the war and the famine themselves — so a scenario
  // about the front could open in a country at peace and one about the floods
  // could open in a country with no flood. `role` is the *player's* part in it:
  // "none" is the honest way to write a scenario that is only interesting while
  // the country is out of a fight everyone else is in.
  z.object({ kind: z.literal("warState"), role: z.enum(["any", "aggressor", "defender", "none"]) }),
  // Bounds read the severity of the worst matching condition, so a scenario can
  // ask for an outbreak and a different one can ask for an outbreak that has
  // got out of hand. `condition` omitted means any kind at all.
  z.object({ kind: z.literal("conditionActive"), condition: ConditionKind.optional(), ...bounds }),
  // Whether the capitals have gathered against somebody — the player's own
  // government or the nation the scenario is cast onto. The engine forms
  // coalitions out of shared alarm and stamps a flag while one stands; a flag
  // condition could not reach it, because a flag is a literal string and the
  // subject of a coalition is whichever nation the board bound. This is the
  // world-neutral way to ask "is anyone standing with us, or against us".
  z.object({ kind: z.literal("coalition"), against: z.enum(["player", "counterpart"]), present: z.boolean() }),
  // A foreign answer already landed in the trade ledger. The response must
  // also be legal against the selected partner before the week can be dealt.
  z.object({ kind: z.literal("tradeMeasure"), origin: z.literal("retaliation"),
    responseSector: z.string().min(1), responseRate: z.number().positive().max(1) }),
  z.object({ kind: z.literal("liveBill"), stage: z.enum(["markup", "conference"]), act: z.string().min(1).optional(), responseText: z.enum(["base", "targeted", "both"]).optional() }),
  z.object({ kind: z.literal("judicialVacancy"), seat: z.enum(["chief", "associate"]).optional() }),
  z.object({ kind: z.literal("pendingOrderCase"), posture: z.literal("adverse-lower").optional(),
    ruleState: z.enum(["unimplemented", "operative"]).optional() }),
  // Whether the player and the counterpart sit inside any of the same compacts.
  // A demand between bloc partners is a different week from the same demand
  // across a bloc line, and until this existed content had no way to tell them
  // apart.
  //
  // `orgKind` and `tradeCompetence` narrow which shared body counts. A customs
  // dispute needs a body that removes tariffs, not a defense pact the two
  // happen to sit in, and the world gives the United States no such body with
  // anyone, so a scenario that needs one is honestly undealable until the data
  // extends. Absent both, any shared body counts, as before.
  z.object({
    kind: z.literal("sharedMembership"),
    present: z.boolean(),
    orgKind: z.enum(["defense", "economic", "political"]).optional(),
    tradeCompetence: z.enum(["customs-union", "fta"]).optional(),
  }),
  // Whether the counterpart shares a land border with the player's own country.
  // A checkpoint, a crossing or a frontier incident that involves the player's
  // trucks, citizens or troops is only a scenario for a neighbor.
  z.object({ kind: z.literal("sharesBorder"), present: z.boolean() }),
  // Whether a U.S. tariff on the counterpart is still in force. `answered`
  // (the default) is the tariff the counterpart's retaliation answers;
  // `response` is the one this administration laid back on the retaliation
  // gate's response goods. A week that proposes to trade away either one
  // describes nothing once the President has lifted it.
  z.object({ kind: z.literal("tariffInForce"), present: z.boolean(), of: z.enum(["answered", "response"]).optional() }),
  // What this administration has actually legislated, as against what it has
  // said. `stance` is a program id from the engine's catalogue; `active: false`
  // is how a scenario asks for a government that has *not* taken that road.
  z.object({ kind: z.literal("policyStance"), domain: ScenarioPolicyDomain, stance: z.string().min(1), active: z.boolean() }),
  // What the press is doing: the corps's standing (0..1), the weeks since the
  // administration last answered a question, the share of desks that have
  // turned hostile (0..1), or where one named desk stands (0..1). `outlet` is
  // required for "outlet" and read only there; an id not on the roster never
  // satisfies anything.
  z.object({
    kind: z.literal("press"),
    measure: z.enum(["standing", "silenceWeeks", "hostileShare", "outlet"]),
    outlet: z.string().min(1).optional(),
    ...bounds,
  }),
  // The pressure the player's own country is under from people the state does
  // not command: an insurgency in the provinces, a street that will not go
  // home. `conditionActive` reads the six authored disasters and unrest; this
  // reads the two continuous pressures the nation carries between them.
  z.object({ kind: z.literal("operatorPressure"), field: z.enum(["insurgency", "protest"]), ...bounds }),
  // The shape of the player's own country. A scenario about a fishing fleet, a
  // blockade, or a port strike is only a scenario for a country with a coast,
  // and one about transit rights through a neighbor is only a scenario for a
  // country without one.
  // `of: "counterpart"` reads the cast government instead: a week that sends ships to a
  // counterpart's harbor cannot be dealt to a landlocked one, a land corridor needs a
  // neighbor on land ("bordered"), and a strait needs a chokepoint the nation holds.
  z.object({ kind: z.literal("geography"), field: z.enum(["coastal", "landlocked", "bordered", "chokepoint"]), is: z.boolean(), of: z.enum(["player", "counterpart"]).optional() }),
  // What the world has read off this government's own record: whether it steps
  // back when it is pressed, climbs when it is tested, and stands by the states
  // it has signed with. Every other condition asks what the board is; this one
  // asks who the player has shown themselves to be, which is the only gate that
  // can open the scenario where a counterpart says "you will do what you did
  // last time" and is right.
  //
  // Bounded like the rest, and floored on evidence rather than on the scalar:
  // see REVEALED_PREFERENCE_EVIDENCE_FLOOR.
  z.object({
    kind: z.literal("revealedPreference"),
    trait: z.enum(["concedesUnderPressure", "escalatesWhenTested", "honorsFriends"]),
    ...bounds,
  }),
  // What a state remembers of acts that hit it. Bounds read the signed net
  // mark weight (−1..1 via grievanceReading). `scope: "locus"` needs
  // locus.state or the gate can never evaluate (audit error).
  z.object({
    kind: z.literal("stateGrievance"),
    /** Omitted means any mark at all. Prefixed "omitted:" names an omission. */
    signature: z.string().min(1).optional(),
    scope: z.enum(["locus", "any"]),
    ...bounds,
  }),
  // Signed net cohort strain (−1..1).
  z.object({
    kind: z.literal("cohortStrain"),
    cohort: CohortId,
    /** Omitted = any strain. Prefixed "omitted:" reads only neglect. */
    cause: z.string().min(1).optional(),
    ...bounds,
  }),
  // When in the year it is. Content could gate on the turn and on nothing else,
  // so a scenario about a heating crisis or a hurricane season had no way to ask
  // for the season it belongs to, and authors wrote the month into the prose —
  // which reads wrong the first time the gate fires in July. `months` is
  // one-based calendar months.
  z.object({
    kind: z.literal("calendar"),
    months: z.array(z.number().int().min(1).max(12)).min(1).optional(),
    season: z.enum(["winter", "spring", "summer", "fall"]).optional(),
  }),
  // What the administration ran on, as against what it has done. The platform is
  // on the board and no condition read it, so a scenario could not ask for the
  // President who campaigned on a plank and is now being asked to break it —
  // which is the most reliably interesting week a platform produces.
  z.object({
    kind: z.literal("ticket"),
    party: z.string().min(1).optional(),
    background: z.string().min(1).optional(),
    route: z.string().min(1).optional(),
    plank: z.string().min(1).optional(),
  }),
  /** Keep an authored transmission tied to an act the administration can send this week. */
  z.object({ kind: z.literal("legislationAvailable"), act: z.string().min(1) }),
  z.object({
    kind: z.literal("collectionReport"),
    targetKind: z.enum(["foreign-nation", "domestic-state"]),
    status: z.enum(["findings", "no-result"]).optional(),
    topic: z.enum(["military-readiness", "external-intent", "domestic-security", "financial-pressure", "stability"]).optional(),
    basis: z.enum(["pursuit", "state-condition", "governor-request"]).optional(),
    condition: ConditionKind.optional(),
    confidence: z.enum(["low", "moderate", "high"]).optional(),
    exposed: z.boolean().optional(),
    shared: z.boolean().optional(),
    recipientAffected: z.boolean().optional(),
    /** Require the issued product's original collection tasking to remain open. */
    activeTasking: z.boolean().optional(),
  }),
  // The country's economic and civic pulse, and the commodity markets, in
  // bands a household would use. See scenario-pulse.ts.
  ...PULSE_CONDITIONS,
  ...EXECUTIVE_STATE_CONDITIONS, // the executive branch's own state: one named body, the oversight matters against it, the shutdown, the appropriation, the rules in flight. See scenario-institutions.ts and scenario-oversight.ts.
]);
export type ScenarioCondition = z.infer<typeof ScenarioCondition>;
