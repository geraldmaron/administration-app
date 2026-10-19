import { passages } from "./scenario-audit-contract.js";
import { PREMISE_DEBT } from "./scenario-premise-debt.js";
const DOMAINS = [
    {
        id: "economic distress",
        claim: /\b(recession|unemployment|layoffs?|jobless|austerity|credit crunch|bank run|run on (?:the |a )?bank|revenue shortfall|insolven\w+|foreclos\w+|downturn)\b/i,
        gates: ["unemploymentBand", "inflationBand", "costOfLivingBand", "cyclePhase", "commodityBand", "conditionActive", "metric"],
    },
    {
        id: "war footing",
        claim: /\b(ceasefire|cease-fire|offensive|front line|frontline|war aims)\b/i,
        gates: ["warState", "conditionActive", "coalition"],
    },
    {
        id: "street unrest",
        claim: /\b(protesters?|riots?|rioters?|demonstrators?|marchers?)\b/i,
        gates: ["conditionActive", "operatorPressure", "stateGrievance", "cohortStrain", "crimeTrend"],
    },
    {
        id: "natural disaster",
        claim: /\b(flood\w*|earthquake|wildfire|hurricane|cyclone|drought|tornado)\b/i,
        gates: ["conditionActive"],
    },
    {
        id: "outbreak",
        claim: /\b(outbreak|pandemic|epidemic|quarantine)\b/i,
        gates: ["conditionActive"],
    },
    {
        id: "crime wave",
        claim: /\b(crime wave|murders? (?:are|is) up|violent crime)\b/i,
        gates: ["crimeTrend", "conditionActive", "stateGrievance"],
    },
];
/** What the room says and the memo's standing paragraph claim about the world before any reply is chosen. */
function premiseText(def) {
    const beats = def.opening.map((beat) => beat.text);
    const context = def.context ? [def.context.standing, def.context.inaction] : [];
    return [def.subject, ...beats, ...context].join(" ");
}
/** Every player-visible string the scenario renders, particulars and the locus descriptor included. */
function allText(def) {
    return passages(def).map((passage) => passage.text).join(" ");
}
/** A premise the scenario states and its own gates would not enforce. */
export function auditPremiseGates(defs, findings) {
    for (const def of defs) {
        const text = premiseText(def);
        const kinds = new Set(def.conditions.map((condition) => condition.kind));
        for (const domain of DOMAINS) {
            const hit = domain.claim.exec(text);
            if (!hit || domain.gates.some((kind) => kinds.has(kind)))
                continue;
            findings.push({
                kind: "premise-ungated",
                severity: "warning",
                scenario: def.id,
                message: `the opening or standing paragraph asserts ${domain.id} ("${hit[0]}") but no condition reads it, so this can be dealt to a board where it is false. ` +
                    `Gate it on one of ${domain.gates.join(", ")}, or, if the scenario opens that state itself, say so in the brief.`,
            });
        }
    }
}
const FIRST_PERSON_GROUND = /\bour (?:crossing|border|checkpoint|port|trucks?|customs|inspectors?)\b/i;
const BODY_NOUN = /\bthe (?:compact|bloc|alliance|pact|union|organization|association|coalition|treaty)\b/i;
/** Wording that contradicts, or floats free of, what the cast and the place actually bind. */
export function auditScenarioBinding(defs, findings) {
    for (const def of defs) {
        const text = allText(def);
        const claimsOurs = FIRST_PERSON_GROUND.exec(text);
        if (def.locus.ground === "counterpart" && claimsOurs) {
            findings.push({
                kind: "context-first-person-abroad",
                severity: "warning",
                scenario: def.id,
                message: `the event is on the counterpart's ground but the prose says "${claimsOurs[0]}", so the President is told they own a place the map puts abroad. ` +
                    "Say what the United States actually holds there: a consulate, a treaty right, a shipment, a citizen.",
            });
        }
        const body = BODY_NOUN.exec(text);
        const bound = def.subjects !== undefined || /\{\{[a-zA-Z]*(?:org|compact|bloc|alliance)[a-zA-Z]*\}\}/.test(text);
        if (body && !bound) {
            findings.push({
                kind: "context-body-unbound",
                severity: "warning",
                scenario: def.id,
                message: `the prose leans on "${body[0]}" but nothing binds which organization it is, so the President cannot open it, read its rules or see it again. ` +
                    "Name a registry organization or entity through a subject slot.",
            });
        }
    }
}
const ECONOMIC_CONDITIONS = new Set(["recession", "inflation-shock", "unemployment-shock", "fiscal-crisis", "energy-shortage", "housing-crunch"]);
const DISASTER_CONDITIONS = new Set(["earthquake", "flood", "drought", "cyclone", "wildfire", "tornado", "winter-storm", "heat-wave"]);
/**
 * Whether one condition reads the board state its class turns on. The kind
 * alone is not enough: a recession gate does not establish a flood and a
 * readiness bound does not establish a recession, so a condition on a named
 * condition or a metric has to name the right one.
 */
const CLASS_GATES = {
    economy: (c) => ["unemploymentBand", "inflationBand", "costOfLivingBand", "cyclePhase", "commodityBand", "tradeMeasure"].includes(c.kind) ||
        (c.kind === "metric" && c.metric === "treasury") ||
        (c.kind === "conditionActive" && c.condition !== undefined && ECONOMIC_CONDITIONS.has(c.condition)),
    war: (c) => c.kind === "warState" || c.kind === "coalition",
    disaster: (c) => c.kind === "conditionActive" && c.condition !== undefined && DISASTER_CONDITIONS.has(c.condition),
    "public-health": (c) => c.kind === "conditionActive" && c.condition === "pandemic",
    unrest: (c) => ["operatorPressure", "stateGrievance", "cohortStrain", "crimeTrend"].includes(c.kind) ||
        (c.kind === "conditionActive" && c.condition === "unrest"),
};
const CLASS_READING_NAMES = {
    economy: "a pulse band, the cycle, a trade measure, the treasury, or a named economic condition",
    war: "warState or coalition",
    disaster: "conditionActive on a named hazard",
    "public-health": "conditionActive on pandemic",
    unrest: "conditionActive on unrest, operatorPressure, stateGrievance, cohortStrain or crimeTrend",
};
/** The readings that would gate this scenario's class, or undefined when the class turns on no single board state. */
export function classReadings(def) {
    return CLASS_READING_NAMES[def.class];
}
/** Whether the scenario's own conditions read any of the board state its class turns on. */
export function readsClassState(def) {
    const reads = CLASS_GATES[def.class];
    return reads === undefined || def.conditions.some(reads);
}
/** Whether the scenario's class turns on a board state it does not read, so only a declared premise can account for it. */
export function needsClassPremise(def) {
    return classReadings(def) !== undefined && !readsClassState(def);
}
/**
 * A scenario in a state-dependent class that reads none of that state and
 * declares no premise. An error for anything new; the ids that shipped before
 * the rule are listed in `PREMISE_DEBT` and may only leave it.
 */
export function auditPremiseDeclared(def, findings) {
    if (readsClassState(def) || def.premise || PREMISE_DEBT.has(def.id))
        return;
    findings.push({
        kind: "premise-class-ungated",
        severity: "error",
        scenario: def.id,
        message: `a ${def.class} week reads none of the board state that class turns on (${classReadings(def) ?? "none"}), so it can be dealt on a board where its premise is false. ` +
            'Gate it, or declare "premise": { "kind": "universal", "reason": ... } for a week that deals on any board, or { "kind": "introduces", "what": ... } for the incident that creates the state.',
    });
}
/** `{{ourTariffSector}}` reads the counterpart's retaliation, so it needs a trade-measure cast or a family that pinned one. */
export function auditTariffToken(def, findings) {
    if (!/\{\{\s*ourTariffSector\s*\}\}/.test(allText(def)) || def.cast.pick === "tradeMeasure" || def.family !== undefined)
        return;
    findings.push({
        kind: "ungated-tariff-token",
        severity: "error",
        scenario: def.id,
        message: "uses {{ourTariffSector}} with no trade-measure cast or family behind it, so no retaliation is bound and the week names the goods it covers",
    });
}
/** The per-scenario premise and binding errors, as one call for the audit's main pass. */
export function auditPremiseBinding(def, findings) {
    auditPremiseDeclared(def, findings);
    auditOrganizationToken(def, findings);
    auditTariffToken(def, findings);
}
/** `{{sharedOrganization}}` renders only from a membership gate; without one it prints as a raw brace. */
export function auditOrganizationToken(def, findings) {
    const gated = def.conditions.some((condition) => condition.kind === "sharedMembership" && condition.present);
    if (gated || !/\{\{\s*sharedOrganization\s*\}\}/.test(allText(def)))
        return;
    findings.push({
        kind: "ungated-organization-token",
        severity: "error",
        scenario: def.id,
        message: "uses {{sharedOrganization}} with no sharedMembership gate, so no body is bound and the brace reaches the screen",
    });
}
const PARTICULAR_FLOOR = 4;
/** The doctrine's own floors for orienting a President: context present, four particulars on a week that matters. */
export function auditContextFloors(defs, findings) {
    for (const def of defs) {
        if (!def.context) {
            findings.push({
                kind: "context-missing",
                severity: "warning",
                scenario: def.id,
                message: "no context block: the President gets the room's argument with no standing, precedent, pressures, cost of inaction or unknowns.",
            });
        }
        const count = def.particulars?.length ?? 0;
        if (def.severity !== "routine" && count < PARTICULAR_FLOOR) {
            findings.push({
                kind: "context-thin-particulars",
                severity: "warning",
                scenario: def.id,
                message: `a ${def.severity} week carries ${count} of the ${PARTICULAR_FLOOR} particulars that pin its who, how many and how long.`,
            });
        }
    }
}
/** The kinds this family raises, so a batch can count them as a work list rather than refuse on them. */
export const PREMISE_FINDING_KINDS = new Set([
    "premise-ungated",
    "context-first-person-abroad",
    "context-body-unbound",
    "context-missing",
    "context-thin-particulars",
]);
/**
 * The whole family over a batch. Deliberately not part of `auditScenarios`: the
 * bundled packs and the publish gate assert their warning budgets, and this
 * family exists to measure the corpus before any budget is set for it.
 */
export function auditPremiseAndContext(defs) {
    const found = [];
    const sink = {
        push(finding) {
            found.push({ kind: finding.kind, severity: "warning", scenario: finding.scenario, message: finding.message });
        },
    };
    auditPremiseGates(defs, sink);
    auditScenarioBinding(defs, sink);
    auditContextFloors(defs, sink);
    return found;
}
