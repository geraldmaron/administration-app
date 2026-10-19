import { subjectRequirementsMet, bindStorySubjects } from "./scenario-subjects.js";
import { cohortEffects, resolveImpact } from "./impact-model.js";
import { financialEstimate, jitterTreasury } from "./scenario-cost.js";
import {
  coalitionFlag,
  createRngStreams,
  familyCounterpart,
  matchRole,
  selectCabinetHolder,
  selectNation,
  selectPolicyStance,
  selectRelationship,
  selectActiveConflicts,
  selectRemoval,
  transmittableActs,
  pressReading,
  conflictsAsParty,
  revealedPreference,
  reliefOrderSubjects,
  type Campaign,
  type AcuteCondition,
  type ConversationScript,
  type ReplyOption,
  type ScriptedBeat,
  type SpeakerRef,
  type TradeSectorId,
} from "@admin/engine";
import { worldSettlements, worldCities, type Nation, type NationId, type RoleId, type StateId } from "@admin/world";
import {
  REVEALED_PREFERENCE_EVIDENCE_FLOOR,
  scenarioFiredFlag,
  type ScenarioClass,
  type ScenarioCondition,
  type ScenarioDef,
  type ScenarioRejoinder,
  type ScenarioSeverity,
  type ScenarioSpeaker,
  type WeightBoost,
} from "./scenario.js";
import { flagSetFlag } from "./scenario-deed-flags.js";
import { isLowConfidence } from "./scenario-intel.js";
import { pulseMet } from "./scenario-pulse.js";
import { BOARD_STATE_GATES } from "./scenario-cast-recheck.js";
import { firstWithGeography, geographyMet, answeredTariffInForce, bordersHome, ourTariffSector, responseTariff, tariffLiftRequest, sharedBodies, sharedOrganizationName } from "./scenario-cast-bodies.js";
import { bindOutlet, boundOutletName } from "./scenario-outlet.js";
import { locusLocales, resolveLocus, type ResolvedLocus } from "./scenario-locus.js";
import { boundPlace, institutionNamed, renderText, type PlaceTokens } from "./scenario-text.js";
import { nationPhrase, takesDefiniteArticle } from "./nation-article.js";
import { gazetteerEffects, domesticSignatureEffects } from "./scenario-gazetteer.js";
import { governorStandingEffects } from "./scenario-governor.js";
import { cohortStrainMet, stateGrievanceMet } from "./scenario-gates.js";
import { executiveStateMet } from "./scenario-oversight.js";
import { roleHintTargets } from "./scenario-role-hints.js";
import { effectiveWeight, worstConditionSeverity } from "./scenario-cast-weight.js";
import { boundCondition, boundConditionLive, calendarMet, strickenNation, ticketMet } from "./scenario-cast-conditions.js";
import { reportCounterpart, reportGate, reportStillLive, reportTokens, selectScenarioReport, type FrozenCollectionReport } from "./scenario-report.js";
import { matterGate, matterStillLive, selectScenarioMatter, type FrozenOversightMatter } from "./scenario-matter.js";
import { selectScenarioTradeMeasure, tradeMeasureDisplayName, tradeMeasureGate, tradeResponseAvailable, type FrozenTradeMeasure } from "./scenario-trade.js";
import { billChamberProvision, billGate, billProvision, billStillLive, selectScenarioBill, type FrozenBill } from "./scenario-bill.js";
import { judicialVacancyGate, judicialVacancyStillLive, selectScenarioJudicialVacancy, type FrozenJudicialVacancy } from "./scenario-judicial-vacancy.js";
import { castKey } from "./scenario-cast-key.js";
import { orderCaseGate, orderCaseStillLive, selectScenarioOrderCase, type FrozenOrderCase } from "./scenario-order-case.js";
import { renderScenarioBrief } from "./scenario-brief-render.js";
import { bandMatches, belligerent, rankedByField, warCounterpart } from "./scenario-counterpart.js";

export { roleHintTargets };

/**
 * Whose ground a scenario is standing on — the one question a season read and a
 * condition bind both have to answer first. Home where the locus says nothing,
 * because a selector carries no locus at all and trouble at home is the case
 * that has none.
 */
function groundNation(campaign: Campaign, counterpart: NationId, def: ScenarioSelectorLike): NationId {
  return def.locus?.ground === "counterpart" ? counterpart : campaign.founding.nation;
}

// Casting is where authored writing meets the live board: a scenario names a
// way of finding its counterpart, and the campaign supplies whoever that is
// this time. The same text is a different decision when the chair across the
// table changes — which is the point.

/**
 * Everything binding, liveness, and weight actually read. A `ScenarioDef`
 * satisfies it, and so does a bodiless `ScenarioSelector` — which is the point:
 * a draw over a large pool touches only this much of each candidate.
 */
export type ScenarioSelectorLike = {
  readonly id: string;
  readonly subjects?: ScenarioDef["subjects"];
  // The pacing director ranks on class, and it ranks selectors rather than
  // bodies for the same reason the draw does: a pool of five figures cannot
  // afford to render candidates it is about to discard.
  readonly class: ScenarioClass;
  // The director paces on severity the same way it paces on class, and it does
  // so over selectors, so severity has to be resident in the cheap half.
  readonly severity: ScenarioSeverity;
  readonly cast: ScenarioDef["cast"];
  readonly conditions: readonly ScenarioCondition[];
  readonly weight: number;
  readonly boosts?: readonly WeightBoost[];
  readonly once?: boolean;
  /**
   * Locus binds selection may need without loading the body: `state` gates
   * `stateGrievance`, `ground` says whose season a calendar gate is read in,
   * and `bind` says the place comes from the running condition rather than
   * from a roll.
   */
  readonly locus?: { readonly state?: StateId; readonly ground?: "home" | "counterpart"; readonly bind?: "condition"; readonly settlement?: "small" | "commercial-port" | "road-border"; readonly settlementId?: ScenarioDef["locus"]["settlementId"] };
  /** The arc this scenario belongs to, where it belongs to one. See `family` on ScenarioDef. */
  readonly family?: ScenarioDef["family"];
};

/**
 * A transmission with its counterpart bound. Deliberately not part of the
 * `ConversationScript` the engine opens: the script is the thread, and the
 * whole point of a transmission is that it is not in the thread.
 */
export type ResolvedTransmission = {
  readonly relay: string;
  readonly attribution: string;
  readonly text: string;
  readonly nation: NationId;
  readonly nationName: string;
  /**
   * What the card credits above the text. The nation for a government, and
   * a placement for anyone else operating on its territory.
   */
  readonly source: string;
};

export type CastScenario = {
  readonly def: ScenarioDef;
  /** Frozen identity of this staging. Legacy casts and one-run family members use the template id. */
  readonly occurrence?: string;
  readonly counterpart: NationId;
  readonly script: ConversationScript;
  readonly weight: number;
  /** Where on the earth this is happening, if the scenario declares a locus. */
  readonly locus?: ResolvedLocus;
  /** What the counterpart said, if they said anything. Read beside the thread, never in it. */
  readonly transmission?: ResolvedTransmission;
  /** Issued intelligence as it read when this decision was raised. */
  readonly report?: FrozenCollectionReport;
  readonly matter?: FrozenOversightMatter;
  readonly tradeMeasure?: FrozenTradeMeasure;
  readonly bill?: FrozenBill;
  readonly judicialVacancy?: FrozenJudicialVacancy;
  readonly orderCase?: FrozenOrderCase;
};

export { scenarioOccurrenceKey } from "./scenario-occurrence.js";

// --- Binding ---

export function bindCounterpart(campaign: Campaign, def: ScenarioSelectorLike): NationId | undefined {
  const oversight = matterGate(def.conditions);
  if (oversight?.origin === "inspector-general" && !selectScenarioMatter(campaign, oversight, def.id)) return undefined;
  // A member of a running family binds to the country the family opened
  // against, not to whatever its own rule would rank today. A beat whose
  // family has not opened binds to nothing, which is what stops a follow-up
  // arriving before the thing it follows.
  if (def.family && def.family.role !== "opener") {
    return familyCounterpart(campaign, def.family.id);
  }
  switch (def.cast.pick) {
    case "tensest":
      return firstWithGeography(campaign, rankedByField(campaign, "tension"), def.conditions);
    case "closest":
      return firstWithGeography(campaign, rankedByField(campaign, "trust"), def.conditions);
    case "band":
      return firstWithGeography(campaign, bandMatches(campaign, def.cast), def.conditions);
    case "nation":
      return selectNation(campaign, def.cast.nation as NationId) ? (def.cast.nation as NationId) : undefined;
    case "warCounterpart":
      // Tension is re-ranked every turn and belligerence is not: a front-week
      // scenario bound by tension can land on a country the player is at peace
      // with while a war elsewhere holds its gate open. Unbound with no war of
      // the player's own, exactly like a band with no match.
      return warCounterpart(campaign);
    case "belligerent":
      return belligerent(campaign, def.cast.side);
    case "none":
      // Trouble at home: the script's counterpart slot points back at the
      // player's own nation, and the engine's relationship lookups no-op.
      return campaign.founding.nation;
    case "stricken":
      // The government bearing the condition the scenario is about. Its state
      // and its governor come from the bound condition, through the locus and
      // the place tokens, so the country is all this has to answer.
      return strickenNation(campaign);
    case "outlet":
      // A newspaper at home. The country slot is the player's own, as for
      // "none", and the week is unbound when no masthead answers the cast.
      return bindOutlet(campaign, def.cast) ? campaign.founding.nation : undefined;
    case "collectionReport": {
      const gate = reportGate(def.conditions);
      const report = gate ? selectScenarioReport(campaign, gate, def.id) : undefined;
      return report ? reportCounterpart(campaign, report, def.cast.bind) : undefined;
    }
    case "tradeMeasure": {
      const gate = tradeMeasureGate(def.conditions);
      return gate ? selectScenarioTradeMeasure(campaign, gate, def.id)?.actor : undefined;
    }
    case "liveBill": {
      const gate = billGate(def.conditions);
      return gate && selectScenarioBill(campaign, gate, def.id) ? campaign.founding.nation : undefined;
    }
    case "judicialVacancy":
      return selectScenarioJudicialVacancy(campaign, def.id, judicialVacancyGate(def.conditions)?.seat) ? campaign.founding.nation : undefined;
    case "pendingOrderCase":
      return selectScenarioOrderCase(campaign, def.id, orderCaseGate(def.conditions)) ? campaign.founding.nation : undefined;
  }
}

// --- Conditions ---

function inBounds(value: number, atLeast?: number, atMost?: number): boolean {
  if (atLeast !== undefined && value < atLeast) return false;
  if (atMost !== undefined && value > atMost) return false;
  return true;
}

function conditionMet(
  campaign: Campaign,
  counterpart: NationId,
  condition: ScenarioCondition,
  def: ScenarioSelectorLike,
): boolean {
  switch (condition.kind) {
    case "metric":
      return inBounds(campaign.player.metrics[condition.metric], condition.atLeast, condition.atMost);
    case "alignment":
      return inBounds(campaign.player.alignments[condition.axis], condition.atLeast, condition.atMost);
    case "relationship": {
      const edge = selectRelationship(campaign, campaign.founding.nation, counterpart);
      return edge !== undefined && inBounds(edge[condition.field], condition.atLeast, condition.atMost);
    }
    case "counterpartTrait": {
      const traits = selectNation(campaign, counterpart)?.traits;
      return traits !== undefined && inBounds(traits[condition.trait], condition.atLeast, condition.atMost);
    }
    case "cabinetAttribute": {
      const roles = Object.keys(campaign.player.cabinet) as RoleId[];
      const role = matchRole(roles, roleHintTargets(condition.roleHint));
      const holder = role ? selectCabinetHolder(campaign, role) : undefined;
      // A vacant or dead chair satisfies nothing — who the player actually
      // appointed is the point, not who a charter merely lists.
      return holder !== undefined && holder.alive && inBounds(holder.base[condition.attribute], condition.atLeast, condition.atMost);
    }
    case "flag": {
      if ((campaign.player.flags[condition.flag] ?? false) !== condition.is) return false;
      if (condition.agedAtLeast === undefined || !condition.is) return true;
      return flagAgedAtLeast(campaign, condition.flag, condition.agedAtLeast);
    }
    case "turn":
      return inBounds(campaign.turn, condition.atLeast, condition.atMost);
    case "removalPressure":
      return inBounds(selectRemoval(campaign).pressure, condition.atLeast, condition.atMost);
    case "charterInstitution":
      return (institutionNamed(campaign, condition.institution) !== undefined) === condition.present;
    case "warState":
      return warStateMet(campaign, condition.role);
    case "conditionActive": {
      // A gate on a condition is a gate on it running. Read bare, an unbounded
      // gate took the worst severity of nothing, zero, and held on every quiet board.
      const worst = worstConditionSeverity(campaign, condition.condition);
      return worst > 0 && inBounds(worst, condition.atLeast, condition.atMost);
    }
    case "coalition": {
      const subject = condition.against === "player" ? campaign.founding.nation : counterpart;
      return (campaign.player.flags[coalitionFlag(subject)] ?? false) === condition.present;
    }
    case "sharedMembership":
      return sharedBodies(campaign, counterpart, condition).length > 0 === condition.present;
    case "sharesBorder":
      return bordersHome(campaign, counterpart) === condition.present;
    case "tariffInForce":
      return (condition.of === "response" ? responseTariff(campaign, def, counterpart) !== undefined
        : answeredTariffInForce(campaign, def.family, counterpart)) === condition.present;
    case "calendar":
      return calendarMet(campaign, condition, groundNation(campaign, counterpart, def));
    case "ticket":
      return ticketMet(campaign, condition);
    case "legislationAvailable":
      return transmittableActs(campaign).some((act) => act.id === condition.act);
    case "collectionReport": {
      const report = selectScenarioReport(campaign, condition, def.id);
      return report !== undefined && (def.cast.pick !== "collectionReport" ||
        reportCounterpart(campaign, report, def.cast.bind) === counterpart);
    }
    case "tradeMeasure": {
      const measure = selectScenarioTradeMeasure(campaign, condition, def.id);
      return measure !== undefined && measure.actor === counterpart;
    }
    case "liveBill":
      return selectScenarioBill(campaign, condition, def.id) !== undefined && counterpart === campaign.founding.nation;
    case "judicialVacancy":
      return selectScenarioJudicialVacancy(campaign, def.id, condition.seat) !== undefined && counterpart === campaign.founding.nation;
    case "pendingOrderCase":
      return selectScenarioOrderCase(campaign, def.id, condition) !== undefined && counterpart === campaign.founding.nation;
    case "policyStance":
      return (selectPolicyStance(campaign, condition.domain).id === condition.stance) === condition.active;
    case "press": {
      const reading = pressReading(campaign, condition.measure, condition.outlet);
      return reading !== undefined && inBounds(reading, condition.atLeast, condition.atMost);
    }
    case "operatorPressure":
      return inBounds(operatorPressure(campaign, condition.field), condition.atLeast, condition.atMost);
    case "geography":
      return geographyMet(campaign, counterpart, condition);
    case "revealedPreference":
      return revealedPreferenceMet(campaign, condition.trait, condition.atLeast, condition.atMost);
    case "stateGrievance":
      return stateGrievanceMet(campaign, condition, def.locus);
    case "cohortStrain":
      return cohortStrainMet(campaign, condition);
    case "inflationBand":
    case "unemploymentBand":
    case "costOfLivingBand":
    case "crimeTrend":
    case "cyclePhase":
    case "commodityBand":
      return pulseMet(campaign, condition);
    case "institutionState":
    case "oversightMatter":
    case "shutdown":
    case "appropriation":
    case "pendingRule":
      return executiveStateMet(campaign, condition);
  }
}

/**
 * Whether the world's file on this government says what the scenario claims it
 * says — and whether there is a file at all.
 *
 * The evidence floor is checked before the scalar, not after, because the
 * profile reports the midpoint for a trait nothing has tested and a bound of
 * `atMost: 0.5` would otherwise be true of every campaign on turn one. A
 * scenario whose counterpart tells the player they always fold has to be
 * unreachable until they have actually folded.
 */
function revealedPreferenceMet(
  campaign: Campaign,
  trait: "concedesUnderPressure" | "escalatesWhenTested" | "honorsFriends",
  atLeast?: number,
  atMost?: number,
): boolean {
  const profile = revealedPreference(campaign);
  const evidence =
    trait === "honorsFriends" ? profile.evidence.friendshipTests : profile.evidence.pressedCommitments;
  if (evidence < REVEALED_PREFERENCE_EVIDENCE_FLOOR) return false;
  return inBounds(profile[trait], atLeast, atMost);
}

/**
 * Whether the player and the counterpart hold any compact in common. A
 * domestic scenario's counterpart is the player's own nation, and a country
 * shares every one of its compacts with itself — which would read as "we are
 * bloc partners with ourselves", so it is false there rather than trivially
 * true. The audit refuses the condition on a domestic scenario for the same
 * reason it refuses a relationship bound: there is nobody on the other side.
 */
/** What the player's own country is carrying from people the state does not command. */
function operatorPressure(campaign: Campaign, field: "insurgency" | "protest"): number {
  const stats = selectNation(campaign, campaign.founding.nation)?.stats;
  if (!stats) return 0;
  return field === "insurgency" ? stats.security.insurgencyPressure : stats.politics.protestPressure;
}

/**
 * Whether the flag's most recent stamping is at least `age` turns behind the
 * current one. Only the last `age - 1` turns are scanned: a marker inside that
 * window means the deed is still warm, and a flag whose marker is older than
 * the window — or that predates markers entirely — is old enough by
 * construction. That keeps the walk O(age) however long the campaign runs,
 * the same bound `turnsSinceStaged` holds itself to.
 */
function flagAgedAtLeast(campaign: Campaign, flag: string, age: number): boolean {
  for (let back = 0; back < age; back += 1) {
    const turn = campaign.turn - back;
    if (turn < 0) break;
    if (campaign.player.flags[flagSetFlag(flag, turn)] === true) return false;
  }
  return true;
}

export function scenarioLive(campaign: Campaign, def: ScenarioSelectorLike, counterpart: NationId): boolean {
  if (!subjectRequirementsMet(campaign, def.subjects)) return false;
  if ((def.locus?.settlement || def.locus?.settlementId) && (groundNation(campaign, counterpart, def) !== "USA" || !worldSettlements.some((place) =>
    (!def.locus?.state || place.state === def.locus.state) && (!def.locus?.settlementId || place.id === def.locus.settlementId) &&
    (def.locus?.settlement === undefined || (def.locus.settlement === "commercial-port" ? place.commercialPort : def.locus.settlement === "road-border" ? place.roadBorderCrossing : place.population <= 100000))))) return false;
  if (def.once && (campaign.player.flags[scenarioFiredFlag(def.id)] ?? false)) return false;
  if ((def.once || def.family) && campaign.cases?.[`scenario:${def.id}`] !== undefined) return false;
  if (def.family?.role === "opener" && campaign.scenarioFamilies[def.family.id] !== undefined) return false;
  // A decision that says its place is wherever the thing is happening is not a
  // decision at all once nothing is happening. This is the withdrawal: the week
  // the fire ends the scenario stops being live, so it is never staged again and
  // silence about it is never charged.
  if (def.locus?.bind === "condition" && boundCondition(campaign, def, groundNation(campaign, counterpart, def)) === undefined) {
    return false;
  }
  return def.conditions.every((condition) => conditionMet(campaign, counterpart, condition, def));
}

function premiseStillHolds(campaign: Campaign, cast: CastScenario): boolean {
  return cast.def.conditions.filter((condition) => BOARD_STATE_GATES.has(condition.kind)).every((condition) => conditionMet(campaign, cast.counterpart, condition, cast.def));
}

/**
 * Whether the decision in front of the President is still about something.
 *
 * A bound scenario carries the record it was cast against, and this asks the
 * board whether that record is still running. It is the recheck a frozen case
 * needs and liveness cannot give it: once a case is raised the pick is pinned on
 * purpose, so the only honest way to withdraw it is to ask about the pinned
 * record by id. A cast with no bind is always still about something.
 */
export function castStillBound(campaign: Campaign, cast: CastScenario): boolean {
  if (!premiseStillHolds(campaign, cast)) return false;
  if (cast.def.cast.pick === "collectionReport") {
    if (!cast.report || !reportStillLive(campaign, cast.report,
      cast.def.conditions.some((condition) => condition.kind === "collectionReport" && condition.activeTasking === true))) return false;
  }
  if (cast.def.cast.pick === "tradeMeasure") {
    const gate = tradeMeasureGate(cast.def.conditions);
    if (!gate || !cast.tradeMeasure || !tradeResponseAvailable(campaign, cast.tradeMeasure, gate)) return false;
  }
  if (cast.def.cast.pick === "liveBill" && (!cast.bill || !billStillLive(campaign, cast.bill))) return false;
  if (cast.def.cast.pick === "judicialVacancy" && (!cast.judicialVacancy || !judicialVacancyStillLive(campaign, cast.judicialVacancy))) return false;
  if (cast.def.cast.pick === "pendingOrderCase" && (!cast.orderCase || !orderCaseStillLive(campaign, cast.orderCase))) return false;
  if (cast.def.conditions.some((condition) => condition.kind === "oversightMatter" && condition.origin === "inspector-general") &&
    (!cast.matter || !matterStillLive(campaign, cast.matter))) return false;
  const pinned = cast.locus?.condition;
  if (pinned === undefined) return true;
  return boundConditionLive(campaign, pinned);
}

/**
 * The player's own part in the wars currently running. "any" is satisfied by
 * any war the country fights in, a joined one included; "none" by a world that
 * has a war in it the player is not a party to, which is a different situation
 * from a world at peace and the one a scenario about staying out is actually
 * about. "aggressor" and "defender" stay with the principals: joining a war is
 * neither starting one nor being invaded.
 */
function warStateMet(campaign: Campaign, role: "any" | "aggressor" | "defender" | "none"): boolean {
  const player = campaign.founding.nation;
  const active = selectActiveConflicts(campaign);
  const party = conflictsAsParty(campaign).length > 0;
  switch (role) {
    case "aggressor":
      return active.some((conflict) => conflict.aggressor === player);
    case "defender":
      return active.some((conflict) => conflict.defender === player);
    case "any":
      return party;
    case "none":
      return active.length > 0 && !party;
  }
}

// The weight half — `FLAG_AGE_SATURATION`, `effectiveWeight` and the condition
// severity reading both halves need — moved to scenario-cast-weight.ts and is
// re-exported here, so every import path that named this file still resolves.
export { effectiveWeight, FLAG_AGE_SATURATION } from "./scenario-cast-weight.js";

// --- Rendering ---

function resolveSpeakerRef(campaign: Campaign, speaker: ScenarioSpeaker): SpeakerRef {
  if (speaker.kind !== "cabinet") return speaker;
  const roles = Object.keys(campaign.player.cabinet) as RoleId[];
  const role = matchRole(roles, roleHintTargets(speaker.roleHint)) ?? roles[0];
  // A campaign with no cabinet at all leaves the beat to the narrator rather
  // than inventing an official nobody seated.
  return role ? { kind: "cabinet", role } : { kind: "narrator" };
}

/**
 * The counterpart's words, bound to whoever the board cast as the counterpart.
 *
 * Resolved here rather than in the app so the nation's own name and adjective
 * are interpolated by the same pass that renders every other authored string —
 * a transmission is player copy, and copy that took a different path to the screen
 * is copy that eventually says `{{counterpart}}` on someone's phone.
 */
function resolveTransmission(
  campaign: Campaign,
  def: ScenarioDef,
  counterpart: NationId,
  place?: PlaceTokens,
): ResolvedTransmission | undefined {
  if (!def.transmission) return undefined;
  const identity = selectNation(campaign, counterpart)?.base.identity;
  const name = identity?.name ?? String(counterpart);
  const masthead = boundOutletName(campaign, def.cast);
  return {
    relay: def.transmission.relay,
    attribution: renderText(campaign, counterpart, def.transmission.attribution, place),
    text: renderText(campaign, counterpart, def.transmission.text, place),
    nation: counterpart,
    nationName: name,
    // A dateline is a label and stays a bare name; "in {name}" is a phrase and
    // takes the article the name wants. A newspaper's words are credited to the
    // newspaper, not to the country it prints in.
    source: (def.transmission.domesticSubject ? place?.subjects?.[def.transmission.domesticSubject] : undefined) ?? masthead ?? (def.transmission.voice === "nonstate" ? `in ${nationPhrase(name, takesDefiniteArticle(identity))}` : name),
  };
}

function renderReply(
  campaign: Campaign,
  counterpart: NationId,
  def: ScenarioDef,
  reply: ScenarioDef["replies"][number],
  place?: PlaceTokens,
  report?: FrozenCollectionReport,
  matter?: FrozenOversightMatter,
  tradeMeasure?: FrozenTradeMeasure,
  bill?: FrozenBill,
  judicialVacancy?: FrozenJudicialVacancy,
  orderCase?: FrozenOrderCase,
  locus?: ResolvedLocus,
): ReplyOption {
  let commitment: ReplyOption["commitment"];
  const renderRejoinder = (rejoinder: ScenarioRejoinder | undefined) =>
    rejoinder
      ? {
          rejoinder: {
            speaker: resolveSpeakerRef(campaign, rejoinder.speaker),
            text: renderText(campaign, counterpart, rejoinder.text, place),
          },
        }
      : {};
  if (reply.commitment.kind === "position") {
    const { rejoinder, impact, gazetteer, domestic, collection, relief, localeAct, transmit, tariff, tariffLift, directive, billText, judicialNomination, orderRescission, orderReview, ...rest } = reply.commitment;
    const live = (id: NationId): Nation | undefined => {
      const runtime = campaign.nations[id];
      return runtime ? { ...runtime.base, stats: runtime.stats, traits: runtime.traits } : undefined;
    };
    const bearer = live(campaign.founding.nation);
    const cast = live(counterpart);
    const locusCity = worldCities.find((city) => city.id === def.locus.city);
    // Where the toll and the state-scoped effects land: the place the briefing
    // was datelined, resolved once at cast, never a second draw of its own.
    const homeState = locus?.nation === campaign.founding.nation ? locus.state : undefined;
    const remembered = renderText(campaign, counterpart, reply.commitment.remembered, place);
    // One draw per occurrence: the same reply recast on another week, or in another campaign, costs differently.
    const costKey = `${campaign.seed}|${def.id}|${reply.id}|${campaign.turn}`;
    const cost = rest.cost?.treasury === undefined ? rest.cost : { ...rest.cost, treasury: jitterTreasury(rest.cost.treasury, costKey) };
    const cause = domestic?.signature ?? def.class;
    const reason = domestic?.reason ?? remembered;
    const answered = [
      ...(impact && bearer ? resolveImpact(impact, bearer, cast, locusCity?.population, locusCity?.state ?? homeState, { severity: def.severity, key: costKey }).map((effect) =>
        effect.kind !== "choiceBorrowing" ? effect : { ...effect, estimate: financialEstimate(impact, costKey) }) : []),
      ...(impact && bearer ? cohortEffects(impact, bearer, { turn: campaign.turn, cause, reason }) : []),
      ...(gazetteer ? gazetteerEffects(campaign, def, gazetteer, remembered, locus) : []),
      ...(domestic ? domesticSignatureEffects(campaign, domestic) : []),
    ];
    const resolved = [...answered, ...governorStandingEffects(campaign, locus, answered, remembered)];
    commitment = {
      ...rest,
      ...(cost ? { cost } : {}),
      ...(collection && report ? { collection: collection.action === "close"
        ? { action: "close" as const, tasking: report.tasking }
        : { action: "task" as const, request: { element: collection.element, discipline: collection.discipline,
          targetKind: report.targetKind, target: report.target, question: collection.question } } } : {}),
      ...(relief ? (() => {
        const subject = report?.targetKind === "domestic-state" && report.condition
          ? reliefOrderSubjects(campaign).find((entry) => entry.state === report.target && entry.cause === report.condition)
          : undefined;
        return subject ? { relief: subject } : { reliefRefusal: "The report has no matching Stafford declaration and unallocated recovery appropriation." };
      })() : {}),
      ...(localeAct && report && report.targetKind === "domestic-state" && report.condition
        ? { locale: { act: localeAct, state: report.target as StateId, cause: report.condition as AcuteCondition } } : {}),
      ...(transmit ? { transmit } : {}),
      ...(billText && bill ? { billText: { id: bill.id, act: bill.act, title: bill.title,
        introducedTurn: bill.introducedTurn, stage: bill.stage, text: bill.text,
        ...(billText.action === "recommend" ? { action: "recommend" as const, choice: billText.text === "house" ? bill.text?.house ?? "base" : billText.text === "senate" ? bill.text?.senate ?? "base" : billText.text } : { action: "propose" as const }) } } : {}),
      ...(judicialNomination && judicialVacancy ? { judicialNomination: { institution: judicialVacancy.institution,
        office: judicialVacancy.office, title: judicialVacancy.title, vacancyOpenedDay: judicialVacancy.vacancyOpenedDay, nominee: judicialNomination.candidate === "first" ? judicialVacancy.nominee : judicialVacancy.alternate,
        nomineeName: judicialNomination.candidate === "first" ? judicialVacancy.nomineeName : judicialVacancy.alternateName } } : {}),
      ...(orderRescission && orderCase ? { orderRescission: { proceedingId: orderCase.proceedingId,
        recordId: orderCase.recordId, orderId: orderCase.orderId, filedTurn: orderCase.filedTurn,
        stage: orderCase.stage, orderName: orderCase.orderName, question: orderCase.question } } : {}),
      ...(orderReview && orderCase?.ruleState ? { orderReview: { proceedingId: orderCase.proceedingId,
        recordId: orderCase.recordId, orderId: orderCase.orderId, filedTurn: orderCase.filedTurn,
        orderName: orderCase.orderName, question: orderCase.question, ruleState: orderCase.ruleState,
        choice: orderReview.choice } } : {}),
      ...(tariff && def.cast.pick === "tradeMeasure" ? tradeMeasure ? { tariff: { target: tradeMeasure.actor, sector: tariff.sector as TradeSectorId,
        rate: tariff.rate, answering: tradeMeasure.id, sourceSector: tradeMeasure.sector,
        sourceRate: tradeMeasure.rate, sourceTurn: tradeMeasure.imposedTurn } } : {}
        : tariff ? { tariff: { target: counterpart, sector: tariff.sector as TradeSectorId, rate: tariff.rate } } : {}),
      ...(tariffLift ? { tariffLift: tariffLiftRequest(campaign, def, counterpart, tariffLift, tradeMeasure) } : {}),
      ...(directive && matter ? { directive: { matterId: matter.id, institution: matter.institution,
        openedTurn: matter.openedTurn, matterSubject: matter.subject,
        ...(directive.kind === "inspector-removal-notice"
          ? { kind: directive.kind, reason: directive.reason }
          : { kind: directive.kind, subject: directive.kind === "investigation" ? matter.subject : directive.subject }) } } : {}),
      ...(resolved.length > 0 ? { resolved } : {}),
      // The half of the impact the model prices at nothing: it resolves into no
      // effect, so it is handed over whole or the ledger keeps no trace of it.
      ...(impact?.institutional ? { institutional: impact.institutional } : {}),
      remembered,
      ...renderRejoinder(rejoinder),
    };
  } else if (reply.commitment.kind === "instrument") {
    const { domestic, rejoinder, ...rest } = reply.commitment;
    const routed = domestic ? domesticSignatureEffects(campaign, domestic) : [];
    commitment = {
      ...rest,
      ...(routed.length > 0 ? { resolved: routed } : {}),
      ...renderRejoinder(rejoinder),
    };
  } else {
    const { rejoinder, ...rest } = reply.commitment;
    commitment = { ...rest, ...renderRejoinder(rejoinder) };
  }
  return { id: reply.id, tone: reply.tone, text: renderText(campaign, counterpart, reply.text, place), commitment };
}

export { renderScenarioBrief } from "./scenario-brief-render.js";
/** Bind a scenario to the live board and render it into a playable script. */
export function castScenario(campaign: Campaign, def: ScenarioDef): CastScenario | undefined {
  const counterpart = bindCounterpart(campaign, def);
  return counterpart ? tryCastBound(campaign, def, counterpart) : undefined;
}

/** Missing required subjects exclude this candidate without inventing a replacement. */
export function tryCastBound(campaign: Campaign, def: ScenarioDef, counterpart: NationId): CastScenario | undefined {
  const locus = resolveLocus(campaign, def, counterpart);
  if ((def.locus.settlement || def.locus.settlementId) && !locus || !bindStorySubjects(campaign, def, locus)) return undefined;
  return castBound(campaign, def, counterpart);
}

/**
 * Render a scenario whose counterpart is already bound. Selection binds once,
 * over selectors, and hands the winning counterpart here — so the prose of a
 * scenario that was never drawn is never interpolated.
 */
export function castBound(campaign: Campaign, def: ScenarioDef, counterpart: NationId): CastScenario {
  const gate = reportGate(def.conditions);
  const report = def.cast.pick === "collectionReport" && gate ? selectScenarioReport(campaign, gate, def.id) : undefined;
  const tradeGate = tradeMeasureGate(def.conditions);
  const tradeMeasure = def.cast.pick === "tradeMeasure" && tradeGate ? selectScenarioTradeMeasure(campaign, tradeGate, def.id) : undefined;
  const oversightGate = matterGate(def.conditions);
  const matter = oversightGate?.origin === "inspector-general" ? selectScenarioMatter(campaign, oversightGate, def.id) : undefined;
  const liveBillGate = billGate(def.conditions);
  const bill = def.cast.pick === "liveBill" && liveBillGate ? selectScenarioBill(campaign, liveBillGate, def.id) : undefined;
  const judicialVacancy = def.cast.pick === "judicialVacancy" ? selectScenarioJudicialVacancy(campaign, def.id, judicialVacancyGate(def.conditions)?.seat) : undefined;
  const orderCase = def.cast.pick === "pendingOrderCase" ? selectScenarioOrderCase(campaign, def.id, orderCaseGate(def.conditions)) : undefined;
  if (def.cast.pick === "collectionReport" && (!report || reportCounterpart(campaign, report, def.cast.bind) !== counterpart)) {
    throw new Error(`Cannot cast ${def.id}: no matching issued report for the bound counterpart`);
  }
  if (def.cast.pick === "tradeMeasure" && (!tradeMeasure || tradeMeasure.actor !== counterpart)) {
    throw new Error(`Cannot cast ${def.id}: no matching landed retaliation for the bound counterpart`);
  }
  if (oversightGate?.origin === "inspector-general" && !matter) throw new Error(`Cannot cast ${def.id}: no matching open oversight matter`);
  if (def.cast.pick === "liveBill" && (!bill || counterpart !== campaign.founding.nation)) throw new Error(`Cannot cast ${def.id}: no matching live bill`);
  if (def.cast.pick === "judicialVacancy" && (!judicialVacancy || counterpart !== campaign.founding.nation)) throw new Error(`Cannot cast ${def.id}: no matching judicial vacancy`);
  if (def.cast.pick === "pendingOrderCase" && (!orderCase || counterpart !== campaign.founding.nation)) throw new Error(`Cannot cast ${def.id}: no matching pending order case`);
  const occurrence = report ? `${def.id}@report:${report.id}${report.share ? `:${report.share.id}` : ""}` :
    tradeMeasure ? `${def.id}@trade:${tradeMeasure.id}` : bill ? `${def.id}@bill:${bill.id}` :
    judicialVacancy ? `${def.id}@judicial:${judicialVacancy.institution}:${judicialVacancy.vacancyOpenedDay}` :
    orderCase ? `${def.id}@court:${orderCase.proceedingId}` : matter ? `${def.id}@matter:${matter.id}` :
    !def.once && !def.family && campaign.cases?.[`scenario:${def.id}`] !== undefined ? `${def.id}@${campaign.turn}` : undefined;
  const rawLocus = resolveLocus(campaign, def, counterpart);
  if ((def.locus.settlement || def.locus.settlementId) && !rawLocus) throw new Error(`Cannot cast ${def.id}: required settlement unavailable`);
  const subjects = bindStorySubjects(campaign, def, rawLocus, `scenario:${occurrence ?? def.id}`);
  if (!subjects) throw new Error(`Cannot cast ${def.id}: a required story subject is unavailable`);
  const subjectCauseIds = subjects.flatMap((subject) => {
    const origin = campaign.cases?.[subject.originCase];
    const decisions = origin?.history.filter((move) => ["acted", "declined", "defaulted"].includes(move.to)).flatMap((move) => move.causeId ? [move.causeId] : []) ?? [];
    return decisions.length ? decisions : origin?.causeIds ?? [];
  });
  const place = { ...boundPlace(campaign, def, counterpart, rawLocus, subjects), ...(report ? reportTokens(campaign, report) : {}),
    ...(matter ? { matterSubject: matter.subject, matterInstitution: matter.institution } : {}),
    ...(sharedOrganizationName(campaign, def, counterpart) ? { sharedOrganization: sharedOrganizationName(campaign, def, counterpart)! } : {}),
    ...(/\{\{\s*ourTariffSector\s*\}\}/.test(JSON.stringify(def)) ? { ourTariffSector: ourTariffSector(campaign, def.family, counterpart) } : {}),
    ...(tradeMeasure ? { tradeSector: tradeMeasureDisplayName(tradeMeasure), tradeRate: `${Math.round(tradeMeasure.rate * 100)}%` } : {}),
    ...(bill ? { billTitle: bill.title, billProvision: billProvision(bill, liveBillGate?.responseText), billHouseProvision: billChamberProvision(bill, "house"), billSenateProvision: billChamberProvision(bill, "senate") } : {}),
    ...(judicialVacancy ? { judicialSeat: judicialVacancy.title, judicialNominee: judicialVacancy.nomineeName, judicialNomineeRecord: judicialVacancy.nomineeRecord,
      judicialAlternate: judicialVacancy.alternateName, judicialAlternateRecord: judicialVacancy.alternateRecord } : {}),
    ...(orderCase ? { courtOrder: orderCase.orderName, courtQuestion: orderCase.question } : {}) };
  const locus = rawLocus ? { ...rawLocus, descriptor: renderText(campaign, counterpart, def.locus.descriptor, place) } : undefined;
  const locales = locusLocales(locus);
  const beats: ScriptedBeat[] = def.opening.map((beat) => ({
    speaker: resolveSpeakerRef(campaign, beat.speaker),
    text: renderText(campaign, counterpart, beat.text, place),
  }));
  return {
    def: renderScenarioBrief(campaign, def, counterpart, place),
    ...(occurrence ? { occurrence } : {}),
    counterpart,
    weight: effectiveWeight(campaign, def, counterpart),
    locus,
    transmission: resolveTransmission(campaign, def, counterpart, place),
    ...(report ? { report } : {}),
    ...(tradeMeasure ? { tradeMeasure } : {}),
    ...(matter ? { matter } : {}),
    ...(bill ? { bill } : {}),
    ...(judicialVacancy ? { judicialVacancy } : {}),
    ...(orderCase ? { orderCase } : {}),
    script: {
      id: def.id,
      counterpart,
      subject: renderText(campaign, counterpart, def.subject, place),
      opening: beats,
      options: def.replies.map((reply) => renderReply(campaign, counterpart, def, reply, place, report, matter, tradeMeasure, bill, judicialVacancy, orderCase, locus)),
      scenarioClass: def.class,
      ...(subjects.length ? { subjects, subjectCauseIds } : {}),
      ...(def.conditions.some((condition) => condition.kind === "flag" && condition.is) ? { gatedOn: def.conditions.flatMap((condition) => condition.kind === "flag" && condition.is ? [condition.flag] : []) } : {}),
      ...(locales.length > 0 ? { locales } : {}),
      ...(report ? { visibility: "intelligence" as const } : matter && !matter.public ? { visibility: "internal" as const } : {}),
      ...(isLowConfidence(def.intelConfidence) ? { briefingDoubted: true } : {}),
    },
  };
}

// --- Selection ---
/** A candidate that survived binding and its conditions, priced but not yet written out. */
export type LiveSelector<T extends ScenarioSelectorLike = ScenarioSelectorLike> = {
  readonly selector: T;
  readonly counterpart: NationId;
  readonly weight: number;
};

/**
 * Everything the board makes live this turn, as selectors. No prose is
 * interpolated here, which is what lets the pool grow to five figures: a
 * candidate costs one counterpart binding and its own conditions, and a
 * candidate that fails either costs nothing more.
 */
export function liveSelectors<T extends ScenarioSelectorLike>(
  campaign: Campaign,
  selectors: readonly T[],
): readonly LiveSelector<T>[] {
  // Binding is per *cast*, not per scenario: "the tensest nation" is one
  // answer the whole board shares, and re-deriving it for each of fifty
  // thousand candidates was the entire cost of a draw. Every distinct cast is
  // resolved once per turn and reused.
  const bound = new Map<string, NationId | undefined>();
  const bindOnce = (selector: ScenarioSelectorLike): NationId | undefined => {
    const key = castKey(selector);
    if (bound.has(key)) return bound.get(key);
    const counterpart = bindCounterpart(campaign, selector);
    bound.set(key, counterpart);
    return counterpart;
  };

  const live: LiveSelector<T>[] = [];
  for (const selector of selectors) {
    const counterpart = bindOnce(selector);
    if (!counterpart) continue;
    if (!scenarioLive(campaign, selector, counterpart)) continue;
    const weight = effectiveWeight(campaign, selector, counterpart);
    if (weight > 0) live.push({ selector, counterpart, weight });
  }
  return live;
}

/**
 * The weighted draw, over selectors alone. Deterministic for (seed, turn,
 * pool): the same campaign at the same turn always faces the same decision.
 */
export function drawSelector<T extends ScenarioSelectorLike>(
  campaign: Campaign,
  selectors: readonly T[],
): LiveSelector<T> | undefined {
  const live = liveSelectors(campaign, selectors);
  if (live.length === 0) return undefined;
  const total = live.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = createRngStreams(campaign.seed).stream("scenario", campaign.turn).next() * total;
  let cumulative = 0;
  for (const candidate of live) {
    cumulative += candidate.weight;
    if (roll < cumulative) return candidate;
  }
  return live[live.length - 1];
}

/**
 * Every live scenario, fully cast. Only what the board made live is rendered,
 * but that is still every live one — a caller putting a single decision on a
 * desk wants `selectScenario`, which renders exactly the one it drew.
 */
export function eligibleScenarios(campaign: Campaign, defs: readonly ScenarioDef[]): readonly CastScenario[] {
  return liveSelectors(campaign, defs).flatMap((candidate) => {
    const cast = tryCastBound(campaign, candidate.selector, candidate.counterpart);
    return cast ? [cast] : [];
  });
}

/** The decision this turn puts in front of the player: one draw, one body rendered. */
export function selectScenario(campaign: Campaign, defs: readonly ScenarioDef[]): CastScenario | undefined {
  const drawn = drawSelector(campaign, defs);
  return drawn ? tryCastBound(campaign, drawn.selector, drawn.counterpart) : undefined;
}

export { rememberReply } from "./scenario-reply-memory.js";
