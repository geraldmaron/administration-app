import type { NationId, StateId } from "@admin/world";
import type { Campaign } from "./state.js";
import { selectActivePursuits } from "./state.js";
import { createRngStreams, hashIndex } from "./rng.js";
import type { IntelSubject } from "./intel-authority.js";
import { PRODUCT_CYCLE_DAYS, type CollectionFinding, type CollectionProduct, type CollectionTasking } from "./intelligence.js";
import { icElement, type Discipline } from "./ic-elements.js";
import { tradeSector } from "./trade-sectors.js";
import { collectionTopics } from "./collection-focus.js";

const band = (value: number): string => value >= 0.7 ? "high" : value >= 0.4 ? "mixed" : "low";

function finding(topic: CollectionFinding["topic"], observation: string, source: string, day: number, basis?: CollectionFinding["basis"]): CollectionFinding {
  return { topic, observation, source, asOfDay: day, ...(basis ? { basis } : {}) };
}

function pursuitFindings(campaign: Campaign, target: NationId, day: number): readonly CollectionFinding[] {
  return [...selectActivePursuits(campaign)].filter((p) => p.actor === target)
    .sort((a, b) => b.lastActedTurn - a.lastActedTurn || a.id.localeCompare(b.id))
    .map((pursuit) => {
      const destination = campaign.nations[pursuit.target]?.base.identity.name ?? "another government";
      const method = pursuit.overt ? "visible pressure" : "a concealed pressure effort";
      return finding("external-intent", `Reporting points to ${method} toward ${destination}, with ${pursuit.aim} as the assessed aim. The next move remains uncertain.`, "observed government activity in this collection cycle", day,
        { kind: "pursuit", id: pursuit.id, target: pursuit.target, overt: pursuit.overt, lastActedTurn: pursuit.lastActedTurn });
    });
}

function borderIncidentFindings(campaign: Campaign, target: NationId, day: number): readonly CollectionFinding[] {
  return Object.values(campaign.borderIncidents ?? {})
    .filter((incident) => incident.parties.includes(target) && incident.assessment !== undefined &&
      campaign.turn >= incident.assessment.turn &&
      campaign.turn - incident.assessment.turn < Math.ceil(PRODUCT_CYCLE_DAYS / 7))
    .sort((a, b) => b.openedTurn - a.openedTurn || a.id.localeCompare(b.id))
    .map((incident) => {
      const assessment = incident.assessment!;
      const [a, b] = incident.parties;
      const subject = `the ${campaign.nations[a]?.base.identity.name ?? a}–${campaign.nations[b]?.base.identity.name ?? b} border incident`;
      const result = assessment.finding === "likely-inadvertent"
        ? "The available orders logs and radio records make inadvertent fire likely; they do not establish who fired first."
        : "The review cannot establish who fired first or whether either command ordered it.";
      return finding("external-intent", `Review of ${subject}: ${result} Evidence strength: ${assessment.confidence}.`,
        assessment.evidence.length ? `border incident assessment: ${assessment.evidence.join("; ")}` : "border incident assessment; no decisive records", day,
        { kind: "border-incident", id: incident.id, parties: [...incident.parties], assessmentTurn: assessment.turn,
          finding: assessment.finding, confidence: assessment.confidence });
    });
}

function forceFindings(campaign: Campaign, target: NationId, day: number): readonly CollectionFinding[] {
  return Object.values(campaign.commitments).filter((entry) => entry.actor === target && entry.status === "active" &&
      (entry.kind === "deployment" || entry.kind === "basing"))
    .sort((a, b) => b.startedTurn - a.startedTurn || a.id.localeCompare(b.id))
    .map((entry) => {
      const destination = entry.target.kind === "nation" ? campaign.nations[entry.target.id as NationId]?.base.identity.name : undefined;
      const place = destination ? `for ${destination}` : "for an existing commitment";
      return finding("military-readiness", `An active ${entry.kind} ${place} ties down forces. Its purpose is not established by its location.`, "active force commitment record", day);
    });
}

function supportFindings(campaign: Campaign, target: NationId, day: number): readonly CollectionFinding[] {
  return Object.values(campaign.commitments).filter((entry) => entry.actor === target && entry.status === "active" &&
      entry.target.kind === "nation" && (entry.kind === "aid" || entry.kind === "arms"))
    .sort((a, b) => b.startedTurn - a.startedTurn || a.id.localeCompare(b.id))
    .map((entry) => {
      const recipient = campaign.nations[entry.target.id as NationId]?.base.identity.name;
      if (!recipient) return undefined;
      return finding("external-intent", `An active ${entry.kind} commitment to ${recipient} is recorded. The record does not establish an unannounced objective.`,
        "active foreign support commitment record", day);
    }).filter((entry): entry is CollectionFinding => entry !== undefined);
}

function conditionFindings(campaign: Campaign, target: NationId, day: number): readonly CollectionFinding[] {
  return Object.values(campaign.conditions).filter((entry) => entry.nation === target && entry.status === "active" &&
      ["fiscal-crisis", "recession", "inflation-shock", "unrest"].includes(entry.kind))
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))
    .map((entry) => finding(entry.kind === "unrest" ? "stability" : "financial-pressure",
      `A ${entry.kind.replace(/-/g, " ")} remains active at ${band(entry.severity)} severity.`, "current condition record", day));
}

function retaliationFindings(campaign: Campaign, target: NationId, day: number): readonly CollectionFinding[] {
  return Object.values(campaign.trade.measures).filter((measure) => measure.origin === "retaliation" &&
      measure.kind === "tariff" && measure.target === target && (measure.actor ?? measure.target) === target &&
      measure.liftedTurn === undefined && measure.imposedTurn <= campaign.turn)
    .sort((a, b) => b.imposedTurn - a.imposedTurn || a.id.localeCompare(b.id))
    .map((measure) => {
      const sector = tradeSector(measure.sector);
      if (!sector) return undefined;
      return finding("financial-pressure",
        `A ${Math.round(measure.rate * 100)}% retaliatory tariff on American ${sector.name.toLowerCase()} remains in force. The register does not establish the government's next move.`,
        "active trade measure register", day);
    }).filter((entry): entry is CollectionFinding => entry !== undefined);
}

function foreignFindings(campaign: Campaign, target: NationId, day: number): readonly CollectionFinding[] {
  const nation = campaign.nations[target];
  if (!nation) return [];
  const stats = nation.stats;
  return [
    ...pursuitFindings(campaign, target, day),
    ...borderIncidentFindings(campaign, target, day),
    ...supportFindings(campaign, target, day),
    ...forceFindings(campaign, target, day),
    ...conditionFindings(campaign, target, day),
    ...retaliationFindings(campaign, target, day),
    finding("military-readiness", `Military readiness appears ${band(stats.military.readiness)}.`, "current force readiness estimate", day),
    finding("financial-pressure", `Reserve cover appears ${stats.economy.reserves < stats.economy.gdp * 0.05 ? "thin" : "substantial"} relative to annual output.`, "current reserves and output estimate", day),
    finding("stability", `Regime stability appears ${band(stats.politics.regimeStability)}; protest pressure is ${band(stats.politics.protestPressure)}.`, "current political conditions estimate", day),
  ];
}

function relevantFindings(campaign: Campaign, target: NationId, day: number, discipline: Discipline, focus?: CollectionTasking["focus"]): readonly CollectionFinding[] {
  const topics = collectionTopics(discipline, focus, "foreign-nation");
  return foreignFindings(campaign, target, day).filter((entry) => topics.includes(entry.topic));
}

/**
 * A report is a bounded take from the eligible record, not the front of a
 * permanently ordered list. Interleave eligible topics, then advance through
 * that one sequence by the number of findings issued each cycle. A topic and
 * its pool can have common factors without making any entry unreachable.
 * No state is advanced while drafting or reading a report.
 */
function selectCycleFindings(available: readonly CollectionFinding[], limit: number, seed: string, key: string, day: number): readonly CollectionFinding[] {
  if (limit <= 0 || available.length <= limit) return available.slice(0, limit);
  const topics = [...new Set(available.map((entry) => entry.topic))];
  const start = hashIndex(`${seed}:${key}:topics`, topics.length);
  const orderedTopics = [...topics.slice(start), ...topics.slice(0, start)];
  const pools = orderedTopics.map((topic) => {
    const entries = available.filter((entry) => entry.topic === topic);
    const offset = hashIndex(`${seed}:${key}:${topic}`, entries.length);
    return [...entries.slice(offset), ...entries.slice(0, offset)];
  });
  const sequence: CollectionFinding[] = [];
  for (let round = 0; sequence.length < available.length; round += 1) {
    let found = false;
    for (const pool of pools) {
      const entry = pool[round];
      if (!entry) continue;
      sequence.push(entry);
      found = true;
    }
    if (!found) break;
  }
  const cycle = Math.floor(day / PRODUCT_CYCLE_DAYS);
  const offset = (cycle * limit) % sequence.length;
  return Array.from({ length: limit }, (_, index) => sequence[(offset + index) % sequence.length]!);
}

function domesticFindings(campaign: Campaign, target: StateId, day: number): readonly CollectionFinding[] {
  const state = campaign.states[target];
  if (!state) return [];
  const conditions = Object.values(campaign.conditions)
    .filter((entry) => entry.status === "active" && entry.state === target)
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));
  const requests = state.claims.filter((claim) => claim.expiresTurn > campaign.turn)
    .sort((a, b) => a.expiresTurn - b.expiresTurn || a.signature.localeCompare(b.signature));
  return [
    ...conditions.map((entry) => ({ ...finding("domestic-security", `A ${entry.kind.replace(/-/g, " ")} is recorded in ${state.base.name} at ${band(entry.severity)} severity.`, "public state condition record", day), basis: { kind: "state-condition" as const, id: entry.id, state: target, condition: entry.kind, severity: entry.severity } })),
    ...requests.map((claim) => ({ ...finding("domestic-security", `A state request remains open in ${state.base.name}: ${claim.reason}`, "governor request record", day), basis: { kind: "governor-request" as const, state: target, signature: claim.signature, expiresTurn: claim.expiresTurn,
      ...(claim.signature.startsWith("relief:") ? { condition: claim.signature.slice("relief:".length) } : {}) } })),
  ];
}

/**
 * A report on a person reports only what the engine knows: the case that named
 * them. It does not manufacture their private conduct, and it says so.
 */
function draftPersonProduct(campaign: Campaign, tasking: CollectionTasking, subject: IntelSubject, day: number, weight: number, scope: Pick<CollectionProduct, "focus" | "note">, legacyGap: readonly string[]): CollectionProduct {
  const basis = subject.basis;
  const actor = basis.kind === "pursuit" ? basis.actor : undefined;
  const draw = createRngStreams(campaign.seed).stream("collection-result", tasking.id, day).next();
  const defense = actor ? campaign.nations[actor]?.stats.security.counterIntel ?? 0.5 : 0.5;
  const chance = Math.max(0.1, Math.min(0.9, 0.15 + weight * 0.75 - defense * 0.2 - 0.05));
  const available = actor ? pursuitFindings(campaign, actor, day).filter((entry) => entry.basis?.kind === "pursuit" && entry.basis.id === basis.caseId) : [];
  const findings = draw < chance ? available.slice(0, 1) : [];
  const status = findings.length ? "findings" : "no-result";
  const name = campaign.people[subject.personId]?.base.name ?? "the subject";
  return {
    id: `product:${tasking.id}:${day}`, tasking: tasking.id, element: tasking.element, discipline: tasking.discipline,
    targetKind: "foreign-person", target: tasking.target, subject, question: tasking.question, ...scope, day, date: campaign.calendar,
    weight: status === "findings" ? weight : 0,
    summary: status === "findings" ? `${icElement(tasking.element)?.abbr ?? "The agency"} files a finding about the government ${name} leads.` : `${icElement(tasking.element)?.abbr ?? "The agency"} obtained no usable result about ${name} this cycle. This does not establish that the person is clear.`,
    status, confidence: status === "no-result" ? "low" : weight >= 0.7 ? "high" : weight >= 0.4 ? "moderate" : "low", findings,
    gaps: [`Reporting concerns the government ${name} leads. It does not establish ${name}'s private knowledge, conduct or decisions.`, ...legacyGap],
  };
}

export function draftCollectionProduct(campaign: Campaign, tasking: CollectionTasking, day: number, weight: number): CollectionProduct {
  const scope = { ...(tasking.focus ? { focus: tasking.focus } : {}), ...(tasking.note ? { note: tasking.note } : {}) };
  const legacyGap = tasking.focus ? [] : ["This older tasking has no selected focus. Its original question is retained, but its wording does not select findings; reporting covers the discipline's available topics."];
  if (tasking.targetKind === "domestic-state") {
    const findings = selectCycleFindings(domesticFindings(campaign, tasking.target as StateId, day), 4, campaign.seed, tasking.id, day);
    return {
      id: `product:${tasking.id}:${day}`, tasking: tasking.id, element: tasking.element,
      discipline: tasking.discipline, targetKind: "domestic-state", target: tasking.target,
      question: tasking.question, ...scope, day, date: campaign.calendar, weight: 0,
      summary: findings.length ? `DHS I&A files ${findings.length} public-record finding${findings.length === 1 ? "" : "s"} about ${campaign.states[tasking.target as StateId]?.base.name ?? tasking.target}.` : "DHS I&A found no current state condition or request in the public record.",
      status: findings.length ? "findings" : "no-result", confidence: "moderate", findings,
      gaps: ["Public state records do not establish private conduct, individual intent, or an unrecorded threat.", ...legacyGap],
    };
  }
  if (tasking.targetKind === "foreign-person" && tasking.subject) return draftPersonProduct(campaign, tasking, tasking.subject, day, weight, scope, legacyGap);
  const draw = createRngStreams(campaign.seed).stream("collection-result", tasking.id, day).next();
  const available = tasking.targetKind === "foreign-nation" ? relevantFindings(campaign, tasking.target as NationId, day, tasking.discipline, tasking.focus) : [];
  const defense = tasking.targetKind === "foreign-nation" ? campaign.nations[tasking.target as NationId]?.stats.security.counterIntel ?? 0.5 : 0.5;
  const reach = tasking.discipline === "geoint" || tasking.discipline === "osint" ? 0.1 : tasking.discipline === "humint" ? -0.05 : 0;
  const chance = Math.max(0.1, Math.min(0.9, 0.15 + weight * 0.75 - defense * 0.2 + reach));
  const obtained = draw < chance ? available : [];
  const findings = selectCycleFindings(obtained, weight >= 0.65 ? 4 : weight >= 0.4 ? 2 : 1, campaign.seed, tasking.id, day);
  const status = findings.length ? "findings" : "no-result";
  return {
    id: `product:${tasking.id}:${day}`, tasking: tasking.id, element: tasking.element,
    discipline: tasking.discipline, ...(tasking.targetKind === "foreign-nation" ? { targetKind: "foreign-nation" as const } : {}), target: tasking.target,
    question: tasking.question, ...scope, day, date: campaign.calendar, weight: status === "findings" ? weight : 0,
    summary: status === "findings" ? `${icElement(tasking.element)?.abbr ?? "The agency"} files ${findings.length} finding${findings.length === 1 ? "" : "s"} against the tasking.` : `${icElement(tasking.element)?.abbr ?? "The agency"} obtained no usable result this cycle. This does not establish that the target is clear.`,
    status, confidence: status === "no-result" ? "low" : weight >= 0.7 ? "high" : weight >= 0.4 ? "moderate" : "low",
    findings, gaps: ["Sources do not establish a complete picture of intent or private decisions.", ...legacyGap],
  };
}

export function draftSurveillanceProduct(campaign: Campaign, target: NationId, day: number, id: string, exposed: boolean): CollectionProduct {
  const draw = createRngStreams(campaign.seed).stream("surveillance-result", id).next();
  const actor = campaign.nations[campaign.founding.nation]?.stats.security.intelCapability ?? 0.4;
  const defense = campaign.nations[target]?.stats.security.counterIntel ?? 0.5;
  const chance = Math.max(0.15, Math.min(0.9, 0.45 + actor * 0.5 - defense * 0.3));
  const available = relevantFindings(campaign, target, day, "humint");
  const findings = draw < chance ? selectCycleFindings(available, 2, campaign.seed, id, day) : [];
  const status = findings.length ? "findings" : "no-result";
  return {
    id, tasking: id, element: "IC-CIA", discipline: "humint",
    targetKind: "foreign-nation", target, question: "What has the standing watch found?",
    day, date: campaign.calendar, weight: status === "findings" ? 0.45 : 0,
    summary: status === "findings" ? "The operation returned limited reporting." : "The operation returned no usable result; the absence of reporting is not reassurance.",
    status, confidence: "low", findings, gaps: ["Collection cannot establish that unobserved activity is absent."], exposed,
  };
}
