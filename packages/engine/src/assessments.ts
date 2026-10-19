import { TRAIT_KEYS, type NationId, type TraitKey } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { MagnitudeBand } from "./projection.js";
import type { Reading, ReadingSource } from "./reading.js";
import { selectNation, selectRelationship } from "./state.js";
import { campaignDay } from "./nomination.js";
import { possessive } from "./naming.js";
import { atWarAsParty } from "./war-party.js";
import { icElement, type IcElementId } from "./ic-elements.js";
import { collectionAgainst, elementCapability, elementPoliticization, type PressureDirection } from "./intelligence.js";

// A finished intelligence assessment, which is the one thing in this game that
// must never be a single truth value.
//
// The temptation in a political simulation is to have intelligence return the
// answer, possibly with a percentage on it, and let a good agency return it
// more often. That would model neither what an assessment is nor what is
// interesting about one. A real judgment carries two separate axes — how likely
// the thing is, and how much the community trusts its own reasoning — and it
// says out loud what it is missing, what else could be true, and which element
// disagrees and by how much.
//
// That shape is also the only honest way to model pressure. An administration
// leaning on the community cannot make an adversary less dangerous. What it can
// move is the wording: a judgment hardens or softens by one step, the
// confidence does not rise with it, the dissent gets louder rather than quieter,
// and the assessment carries a line saying it was changed. Nothing about the
// world moves at all, which is exactly the point.

export type AssessmentId = string;

/**
 * Likelihood and confidence are different questions and the product keeps them
 * apart. Likelihood is about the world. Confidence is about the evidence.
 */
export type Likelihood = "remote" | "unlikely" | "roughly even" | "likely" | "almost certain";
export type Confidence = "low" | "moderate" | "high";

export const LIKELIHOOD_LADDER: readonly Likelihood[] = [
  "remote",
  "unlikely",
  "roughly even",
  "likely",
  "almost certain",
];

/** The questions the community is actually equipped to answer about a country. */
export type AssessmentQuestion = "intent" | "capability" | "stability";

export const ASSESSMENT_QUESTIONS: readonly AssessmentQuestion[] = ["intent", "capability", "stability"];

export type SourceCharacterization = {
  readonly element: IcElementId;
  /** Reliability of what this element brought, not of the element. */
  readonly reliability: "strong" | "moderate" | "limited";
  readonly note: string;
};

export type AssessmentDissent = {
  readonly element: IcElementId;
  readonly confidence: Confidence;
  readonly note: string;
};

/** The record that a judgment's language was changed after it was written. */
export type WordingChange = {
  readonly day: number;
  readonly date: GameDate;
  readonly direction: PressureDirection;
  readonly from: Likelihood;
  readonly to: Likelihood;
  readonly note: string;
};

export type Assessment = {
  readonly id: AssessmentId;
  readonly question: AssessmentQuestion;
  readonly target: NationId;
  readonly issuedDay: number;
  readonly issuedDate: GameDate;
  readonly judgment: string;
  readonly likelihood: Likelihood;
  readonly confidence: Confidence;
  /** Why the confidence is what it is. A confidence with no basis is a number wearing a word. */
  readonly confidenceBasis: string;
  readonly sources: readonly SourceCharacterization[];
  /** What is not known, named. Low confidence with no gaps listed would be a contradiction. */
  readonly gaps: readonly string[];
  readonly alternative: string;
  readonly dissents: readonly AssessmentDissent[];
  /** Present once somebody leaned on it. Never removed. */
  readonly changes: readonly WordingChange[];
};

// --- Deriving the judgment -------------------------------------------------

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Map a 0..1 reading onto the likelihood ladder. Ordinary forecasts and
 * intelligence assessments share this so a "likely" Hill play and a "likely"
 * intent judgment mean the same band.
 */
export function likelihoodFromUnitInterval(reading: number): Likelihood {
  if (reading < 0.15) return "remote";
  if (reading < 0.4) return "unlikely";
  if (reading < 0.6) return "roughly even";
  if (reading < 0.85) return "likely";
  return "almost certain";
}

/**
 * Map a 0..1 evidence-quality reading onto confidence. Independent of
 * likelihood: a highly likely outcome can rest on thin evidence.
 */
export function confidenceFromEvidence(evidence: number): Confidence {
  return evidence < 0.45 ? "low" : evidence < 0.72 ? "moderate" : "high";
}

function likelihoodFor(reading: number): Likelihood {
  return likelihoodFromUnitInterval(reading);
}

function confidenceFor(evidence: number): Confidence {
  return confidenceFromEvidence(evidence);
}

/**
 * The community's reading of the question, 0..1, before anything is written
 * down.
 *
 * Every term is a fact already on the board. Intelligence in this game is not a
 * separate oracle with private knowledge of a hidden variable: it is a reading
 * of the same world the player is living in, which is why a good community is
 * worth having — it reads it accurately and says how sure it is — and why
 * pressure cannot help. There is nothing to bend except the sentence.
 */
function readingFor(campaign: Campaign, question: AssessmentQuestion, target: NationId): number {
  const nation = selectNation(campaign, target);
  if (!nation) return 0.5;
  const stats = nation.stats;

  if (question === "intent") {
    const bilateral = selectRelationship(campaign, campaign.founding.nation, target);
    const tension = bilateral?.tension ?? 0.2;
    const threat = bilateral?.militaryThreat ?? 0.1;
    const trust = bilateral?.trust ?? 0;
    const atWar = atWarAsParty(campaign, target);
    return clamp01(tension * 0.4 + threat * 0.35 - trust * 0.15 + (atWar ? 0.15 : 0));
  }

  if (question === "capability") {
    const military = stats.military;
    const strength =
      (military.branchStrength.land +
        military.branchStrength.air +
        military.branchStrength.naval +
        military.branchStrength.cyber +
        military.branchStrength.space) /
      5;
    return clamp01(strength * 0.5 + military.readiness * 0.3 + military.doctrineQuality * 0.2);
  }

  const politics = stats.politics;
  // Read as a probability of *instability*, so the ladder means the same
  // direction in all three questions: high is the thing the president would
  // want to hear about.
  return clamp01(
    politics.protestPressure * 0.3 +
      politics.factionalism * 0.25 +
      stats.security.insurgencyPressure * 0.25 +
      (1 - politics.regimeStability) * 0.2,
  );
}

const QUESTION_DISCIPLINES: Readonly<Record<AssessmentQuestion, readonly IcElementId[]>> = {
  // Intent is a human-source and signals question first, with the diplomatic
  // bureau in the room because it is the one that writes the footnote.
  intent: ["IC-CIA", "IC-NSA", "IC-INR", "IC-DIA"],
  // Order of battle is a military question. It is the wrong question for INR
  // and the right one for DIA, which is exactly the distinction that gets lost
  // when a game has one "intelligence" number.
  capability: ["IC-DIA", "IC-NGA", "IC-NRO", "IC-NSA"],
  stability: ["IC-CIA", "IC-INR", "IC-DHS", "IC-TREASURY"],
};

function reliabilityFor(capability: number): SourceCharacterization["reliability"] {
  return capability < 0.5 ? "limited" : capability < 0.72 ? "moderate" : "strong";
}

function sourcesFor(campaign: Campaign, contributors: readonly IcElementId[]): readonly SourceCharacterization[] {
  return contributors.map((id) => {
    const def = icElement(id);
    const capability = elementCapability(campaign, id);
    return {
      element: id,
      reliability: reliabilityFor(capability),
      note: `${def?.abbr ?? id}: ${def?.disciplines.join(", ") ?? "reporting"}, running at ${Math.round(capability * 100)} percent of what it should.`,
    };
  });
}

/**
 * The most a standing collection program can add to the community's confidence.
 *
 * Deliberately smaller than the spread between a healthy community and a
 * hollowed-out one: tasking the NSA at a government firms up a judgment, and it
 * does not turn agencies nobody is funding into agencies that know things.
 */
const COLLECTION_CEILING = 0.2;

/**
 * What standing collection against this country is worth to a judgment.
 *
 * The one thing the analysis side reads out of the collection side, and the
 * reason a tasking is worth writing: a president who points HUMINT at a
 * government gets an intent judgment the community is surer of, because
 * somebody has been collecting against exactly that question.
 */
function collectionSupport(
  campaign: Campaign,
  contributors: readonly IcElementId[],
  target: NationId,
  topic: "external-intent" | "military-readiness" | "stability",
): number {
  const products = collectionAgainst(campaign, target as string, contributors)
    .filter((product) => product.findings?.some((finding) => finding.topic === topic));
  if (products.length === 0) return 0;
  const best = Math.max(...products.map((product) => product.weight));
  // A second requirement against the same question adds less than the first:
  // what a judgment needs is corroboration, not volume.
  const breadth = Math.min(1, products.length / contributors.length);
  return round3(COLLECTION_CEILING * best * (0.7 + 0.3 * breadth));
}

/** How much the community trusts its own reasoning here, 0..1. */
function evidenceFor(campaign: Campaign, contributors: readonly IcElementId[], support = 0): number {
  const total = contributors.reduce((sum, id) => sum + elementCapability(campaign, id), 0);
  const politicized = contributors.reduce((sum, id) => sum + elementPoliticization(campaign, id), 0) / contributors.length;
  // Politicization does not lower the *likelihood*, it lowers how much the
  // community trusts what it is writing — analysts who have been leaned on
  // hedge, which is a real and well-documented degradation of the product.
  return clamp01(total / contributors.length - politicized * 0.5 + support);
}

function gapsFor(campaign: Campaign, contributors: readonly IcElementId[], evidence: number): readonly string[] {
  if (evidence >= 0.72) return [];
  const weakest = [...contributors].sort(
    (a, b) => elementCapability(campaign, a) - elementCapability(campaign, b),
  )[0];
  const def = weakest ? icElement(weakest) : undefined;
  const gaps: string[] = [];
  if (def) gaps.push(`${def.abbr}'s collection against this question is thin, and the judgment leans on the rest.`);
  if (evidence < 0.45) {
    gaps.push("No independent stream corroborates the central reporting. A single stream failing would move the judgment.");
  }
  const politicized = contributors.filter((id) => elementPoliticization(campaign, id) > 0.25);
  if (politicized.length > 0) {
    gaps.push(
      `Analysts at ${politicized.map((id) => icElement(id)?.abbr ?? id).join(" and ")} have been asked for a conclusion before, and the drafting reflects it.`,
    );
  }
  return gaps;
}

// Why a confidence is what it is, in one place: a confidence with no basis is
// a number wearing a word, and two products that hedge differently about the
// same thin collection are two products disagreeing about their own evidence.
/**
 * Why a confidence is what it is, and what is holding it up.
 *
 * The band's own sentence, plus the standing collection where there is any:
 * a president who tasked the community against this question is entitled to
 * read that the judgment is leaning on what came back, rather than being left
 * to infer it from a word that would have been the same either way.
 */
function confidenceBasisFor(confidence: Confidence, support: number): string {
  return support > 0
    ? `${CONFIDENCE_BASIS[confidence]} Standing collection against this question is current, and the judgment leans on it.`
    : CONFIDENCE_BASIS[confidence];
}

const CONFIDENCE_BASIS: Readonly<Record<Confidence, string>> = {
  high: "Multiple streams converge and the reporting has held up against previous judgments.",
  moderate:
    "The reporting is consistent but thin in places, and the logic carries more of the judgment than the evidence does.",
  low: "The evidentiary basis is weak, and the judgment rests more on precedent and reasoning than on collection.",
};

const JUDGMENT_STEM: Readonly<Record<AssessmentQuestion, string>> = {
  intent: "We assess that",
  capability: "We judge that",
  stability: "We assess that",
};

function judgmentText(question: AssessmentQuestion, name: string, likelihood: Likelihood): string {
  const stem = JUDGMENT_STEM[question];
  if (question === "intent") {
    return `${stem} ${name} is ${likelihood} to escalate against United States forces or interests inside the next six months.`;
  }
  if (question === "capability") {
    return `${stem} ${name} is ${likelihood} to be able to sustain a major operation beyond its own borders without external resupply.`;
  }
  return `${stem} a serious challenge to ${name}'s government is ${likelihood} inside the next year.`;
}

/**
 * The reading that would be true instead, named off the fact that would make it
 * true.
 *
 * Three fixed sentences used to serve every country on earth with the name
 * substituted, which is the one part of an assessment a reader can immediately
 * tell is boilerplate — and it undercut the rest of the product, because a
 * community that writes the same alternative about Canada and about Iran is not
 * reasoning about either. The alternative is now read off whichever term is
 * actually carrying the judgment, so the sentence names the thing the analyst
 * would have argued about.
 */
function alternativeText(
  campaign: Campaign,
  question: AssessmentQuestion,
  target: NationId,
  name: string,
): string {
  const nation = selectNation(campaign, target);
  if (!nation) return `An alternative reading is that the reporting on ${name} is describing something else.`;
  const stats = nation.stats;
  const stem = `An alternative reading is that`;

  if (question === "intent") {
    const bilateral = selectRelationship(campaign, campaign.founding.nation, target);
    if (stats.politics.protestPressure > 0.4 || stats.politics.factionalism > 0.5) {
      return `${stem} the posture is aimed at ${possessive(name)} own street rather than at us: a government with this much pressure at home has reasons to look resolute that have nothing to do with Washington.`;
    }
    if ((bilateral?.tradeDependence ?? 0) > 0.25) {
      return `${stem} this is bargaining. ${name} sells too much of its output into this market to want the break the movement implies, and the noise is priced accordingly.`;
    }
    if (selectConflictsAbout(campaign, target)) {
      return `${stem} ${possessive(name)} forces are committed where they already are, and what we are reading as preparation against us is rotation out of that theater.`;
    }
    return `${stem} the movement is a rotation on a published schedule, and the correlation with the political calendar is coincidental.`;
  }

  if (question === "capability") {
    const military = stats.military;
    const lift = (military.airliftCapacity + military.sealiftCapacity) / 2;
    if (lift < 0.35) {
      return `${stem} ${name} has the formations and not the lift. An order of battle that cannot be moved is an order of battle for a war on its own ground.`;
    }
    if (military.readiness < 0.5) {
      return `${stem} the headline strength overstates what ${name} could generate now, because the readiness behind it has not been paid for in years.`;
    }
    if (military.doctrineQuality < 0.5) {
      return `${stem} the equipment is real and the staff work behind it is not, and a force that cannot combine arms at scale does not sustain what this judgment credits it with.`;
    }
    return `${stem} what ${name} could generate once is being read as what it could sustain, and the two are different questions.`;
  }

  const politics = stats.politics;
  if (stats.security.insurgencyPressure > 0.3) {
    return `${stem} the pressure on ${name} is regional and the capital is not its object, which is a different thing from a government in danger.`;
  }
  if (politics.factionalism > politics.protestPressure) {
    return `${stem} the split is inside ${possessive(name)} own governing coalition, and coalitions of this kind have held together under worse than this.`;
  }
  return `${stem} ${name} absorbs this the way it absorbed the last one, and what we are reading as fragility is its ordinary noise.`;
}

/** Whether this government is currently in a war, joined or its own, which changes what it can be doing anywhere else. */
function selectConflictsAbout(campaign: Campaign, target: NationId): boolean {
  return atWarAsParty(campaign, target);
}

/**
 * The element that writes the footnote.
 *
 * Dissent is attributed and in-line rather than filed separately, which is how
 * a real assessment carries it: one element agrees with the judgment and holds
 * a different confidence, or does not agree at all, and the reader can see
 * which. INR dissents on the aggressive end of an intent judgment because that
 * is the shape the record actually has.
 */
function dissentsFor(
  campaign: Campaign,
  question: AssessmentQuestion,
  likelihood: Likelihood,
  confidence: Confidence,
): readonly AssessmentDissent[] {
  const index = LIKELIHOOD_LADDER.indexOf(likelihood);
  const dissents: AssessmentDissent[] = [];
  if (question !== "capability" && index >= 3) {
    dissents.push({
      element: "IC-INR",
      confidence: confidence === "high" ? "moderate" : "low",
      note: "INR agrees with the judgment and holds lower confidence, reading the same reporting as consistent with a posture that stops short of action.",
    });
  }
  if (question === "capability" && index <= 1) {
    dissents.push({
      element: "IC-DIA",
      confidence: "moderate",
      note: "DIA reads the sustainment picture as better than the headline judgment allows, on the strength of its attaché reporting.",
    });
  }
  const hollowed = QUESTION_DISCIPLINES[question].filter((id) => elementCapability(campaign, id) < 0.45);
  for (const id of hollowed) {
    if (dissents.some((entry) => entry.element === id)) continue;
    dissents.push({
      element: id,
      confidence: "low",
      note: `${icElement(id)?.abbr ?? id} takes no position: it does not currently have the people to hold one.`,
    });
  }
  return dissents;
}

/** The whole product, derived. Nothing here is stored until the packet applies. */
export function draftAssessment(
  campaign: Campaign,
  question: AssessmentQuestion,
  target: NationId,
): Assessment | undefined {
  const nation = selectNation(campaign, target);
  if (!nation) return undefined;
  const day = campaignDay(campaign);
  const reading = readingFor(campaign, question, target);
  const contributors = QUESTION_DISCIPLINES[question];
  const support = collectionSupport(campaign, contributors, target,
    question === "intent" ? "external-intent" : question === "capability" ? "military-readiness" : "stability");
  const evidence = evidenceFor(campaign, contributors, support);
  const likelihood = likelihoodFor(reading);
  const confidence = confidenceFor(evidence);
  const name = nation.base.identity.name;

  return {
    id: `assessment:${question}:${target}:${day}`,
    question,
    target,
    issuedDay: day,
    issuedDate: campaign.calendar,
    judgment: judgmentText(question, name, likelihood),
    likelihood,
    confidence,
    confidenceBasis: confidenceBasisFor(confidence, support),
    sources: sourcesFor(campaign, contributors),
    gaps: gapsFor(campaign, contributors, evidence),
    alternative: alternativeText(campaign, question, target, name),
    dissents: dissentsFor(campaign, question, likelihood, confidence),
    changes: [],
  };
}

// --- The behavior question -------------------------------------------------

// The eight traits are the coefficients the NPC agent multiplies to choose its
// moves. They are rolled per campaign and nothing observes them, so the only
// honest way to put one in front of a president is as a judgment about how a
// government behaves — which is the question the community is already built to
// answer. It gets the human-source and signals disciplines, plus the bureau
// that writes the footnote, because reading a leadership's disposition is an
// intent question wearing different clothes.
const BEHAVIOR_DISCIPLINES: readonly IcElementId[] = ["IC-CIA", "IC-INR", "IC-NSA", "IC-DIA"];

/** Where the ladder is undecided, and the rung thin collection cannot write past. */
const LIKELIHOOD_MIDDLE = 2;

/**
 * A trait as the community would word it.
 *
 * Thin collection does not make an adversary milder; it makes the sentence
 * vaguer. So the rung is pulled toward the middle by how little the evidence
 * carries, which is the one degradation that never flatters the reader: a
 * hollowed-out community writes "roughly even" about a government it cannot
 * see, rather than a confident wrong answer.
 */
function behaviorLikelihood(value: number, evidence: number): Likelihood {
  const rung = LIKELIHOOD_LADDER.indexOf(likelihoodFor(value));
  const pull = evidence >= 0.72 ? 0 : evidence >= 0.45 ? 1 : 2;
  const moved =
    rung > LIKELIHOOD_MIDDLE
      ? Math.max(LIKELIHOOD_MIDDLE, rung - pull)
      : Math.min(LIKELIHOOD_MIDDLE, rung + pull);
  return LIKELIHOOD_LADDER[moved]!;
}

/** How far from undecided the judgment sits — the magnitude a band may claim. */
function behaviorBand(likelihood: Likelihood): MagnitudeBand {
  const distance = Math.abs(LIKELIHOOD_LADDER.indexOf(likelihood) - LIKELIHOOD_MIDDLE);
  if (distance >= 2) return "major";
  return distance === 1 ? "moderate" : "slight";
}

export type BehaviorReading = {
  readonly key: TraitKey;
  readonly likelihood: Likelihood;
  readonly reading: Reading;
};

export type BehaviorAssessment = {
  readonly target: NationId;
  readonly confidence: Confidence;
  readonly confidenceBasis: string;
  readonly gaps: readonly string[];
  readonly traits: readonly BehaviorReading[];
};

/**
 * How a government decides, as an assessment rather than as its coefficients.
 *
 * The player's own government is not an intelligence target: an administration
 * knows its own disposition directly, at full confidence and with nothing
 * missing, which is why self-knowledge needs no gate and a foreign reading
 * does. Nothing here is stored — like every other product in this module it is
 * derived from the world the player is already living in.
 */
export function assessBehavior(campaign: Campaign, target: NationId): BehaviorAssessment | undefined {
  const nation = selectNation(campaign, target);
  if (!nation) return undefined;
  const own = target === campaign.founding.nation;
  const support = own ? 0 : collectionSupport(campaign, BEHAVIOR_DISCIPLINES, target, "external-intent");
  const evidence = own ? 1 : evidenceFor(campaign, BEHAVIOR_DISCIPLINES, support);
  const confidence = confidenceFor(evidence);
  const gaps = own ? [] : gapsFor(campaign, BEHAVIOR_DISCIPLINES, evidence);
  const source: ReadingSource = own ? "directly-observable" : "intelligence-assessment";
  return {
    target,
    confidence,
    confidenceBasis: confidenceBasisFor(confidence, support),
    gaps,
    traits: TRAIT_KEYS.map((key) => {
      const likelihood = behaviorLikelihood(nation.traits[key], evidence);
      return {
        key,
        likelihood,
        reading: {
          band: behaviorBand(likelihood),
          source,
          confidence,
          ...(gaps.length > 0 ? { gaps } : {}),
        },
      };
    }),
  };
}

// --- Reading what has been written -----------------------------------------

export function selectAssessments(campaign: Campaign): readonly Assessment[] {
  return [...campaign.security.assessments].sort((a, b) => b.issuedDay - a.issuedDay || a.id.localeCompare(b.id));
}

export function selectAssessment(campaign: Campaign, id: AssessmentId): Assessment | undefined {
  return campaign.security.assessments.find((assessment) => assessment.id === id);
}

/** Every assessment whose language was moved after it was written. */
export function selectAlteredAssessments(campaign: Campaign): readonly Assessment[] {
  return selectAssessments(campaign).filter((assessment) => assessment.changes.length > 0);
}

// --- Acts ------------------------------------------------------------------

export type AssessmentResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

/** Ask the community what it thinks. */
export function commissionAssessment(
  campaign: Campaign,
  question: AssessmentQuestion,
  target: NationId,
): AssessmentResult {
  const assessment = draftAssessment(campaign, question, target);
  if (!assessment) return { ok: false, reason: "No such nation." };
  if (campaign.security.assessments.some((existing) => existing.id === assessment.id)) {
    return { ok: false, reason: "That assessment was already commissioned this week." };
  }
  const name = selectNation(campaign, target)?.base.identity.name ?? target;

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [target as string, "INST-ODNI"],
        systems: ["intelligence"],
        visibility: "intelligence",
        confidence: assessment.confidence === "high" ? "assessed" : "contested",
      },
      narration: {
        summary: `The community delivers an assessment on ${name}: ${assessment.likelihood}, ${assessment.confidence} confidence.`,
      },
      effects: [{ kind: "assessment", issue: assessment }],
    },
  };
}

const PRESSURE_POLITICIZATION_RISE = 0.12;
const PRESSURE_MORALE_COST = 0.06;
const PRESSURE_INTEGRITY_COST = 0.05;
// Above this, the drafting community stops absorbing it and the attempt leaks.
const LEAK_POLITICIZATION = 0.4;

function shift(likelihood: Likelihood, direction: PressureDirection): Likelihood {
  const index = LIKELIHOOD_LADDER.indexOf(likelihood);
  const moved = direction === "harden" ? index + 1 : index - 1;
  return LIKELIHOOD_LADDER[Math.max(0, Math.min(LIKELIHOOD_LADDER.length - 1, moved))]!;
}

/**
 * Lean on a judgment.
 *
 * Everything this does is to the paper. The likelihood word moves one rung, the
 * confidence never rises with it, the dissent gets a line it did not have, and
 * the assessment carries the change forever. Meanwhile the drafting agency
 * loses morale and integrity and gains politicization, which lowers the
 * confidence of everything it writes afterward — so the second time a president
 * does this, the product they are pressing is already worse because of the
 * first time.
 *
 * A president who wants the assessment to say something else has, in the end,
 * only one honest option: change the world it is reading.
 */
export function pressAssessment(
  campaign: Campaign,
  id: AssessmentId,
  direction: PressureDirection,
  ask: string,
): AssessmentResult {
  const assessment = selectAssessment(campaign, id);
  if (!assessment) return { ok: false, reason: "No such assessment." };
  if (!ask.trim()) return { ok: false, reason: "The ask has to be put in words." };
  const moved = shift(assessment.likelihood, direction);
  if (moved === assessment.likelihood) {
    return { ok: false, reason: "The judgment is already at the end of the ladder in that direction." };
  }

  const day = campaignDay(campaign);
  const lead = QUESTION_DISCIPLINES[assessment.question][0] ?? "IC-CIA";
  const leadDef = icElement(lead);
  const institution = leadDef?.institution;
  const runtime = institution ? campaign.institutions[institution] : undefined;
  const politicization = clamp01((runtime?.politicization ?? 0) + PRESSURE_POLITICIZATION_RISE);
  const leaks = politicization >= LEAK_POLITICIZATION;

  const change: WordingChange = {
    day,
    date: campaign.calendar,
    direction,
    from: assessment.likelihood,
    to: moved,
    note: ask,
  };

  const institutionEffects: readonly Effect[] =
    institution && runtime
      ? [
          {
            kind: "institution",
            institution,
            changes: {
              politicization,
              morale: clamp01(runtime.morale - PRESSURE_MORALE_COST),
              integrity: clamp01(runtime.integrity - PRESSURE_INTEGRITY_COST),
              oversightPressure: clamp01(runtime.oversightPressure + (leaks ? 0.15 : 0.05)),
            },
          },
        ]
      : [];

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [lead, ...(institution ? [institution] : []), assessment.target as string],
        systems: ["intelligence"],
        visibility: leaks ? "public" : "internal",
      },
      narration: {
        summary: leaks
          ? `The assessment is redrafted to read "${moved}" — and that it was redrafted is now outside the building.`
          : `The assessment is redrafted to read "${moved}". The confidence does not move.`,
      },
      effects: [
        { kind: "assessment", change: { id, change } },
        {
          kind: "intelligence",
          pressure: {
            id: `pressure:${id}:${day}`,
            element: lead,
            assessmentId: id,
            day,
            date: campaign.calendar,
            ask,
            direction,
            refused: false,
          },
        },
        ...institutionEffects,
        ...(leaks
          ? [
              {
                kind: "feed" as const,
                items: [
                  {
                    turn: campaign.turn,
                    kind: "press" as const,
                    visibility: "public" as const,
                    headline: "Analysts say a judgment was rewritten after the White House objected to it.",
                    facts: { subject: leadDef?.abbr ?? lead },
                  },
                ],
              },
            ]
          : []),
      ],
    },
  };
}
