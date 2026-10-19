const TERMINAL = new Set(["act", "decline", "allow-default"]);
export const CASE_FAMILIES = [
    { kind: "authored-scenario", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "defer", "allow-default"], clock: "deteriorating", defaultKind: "declined" },
    { kind: "bill", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
    { kind: "nomination", urgency: "soft", responseRequirement: "president", allowed: ["act", "decline", "defer"], clock: "none", defaultKind: "none" },
    { kind: "budget", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
    { kind: "executive-order", urgency: "soft", responseRequirement: "president", allowed: ["act", "decline"], clock: "none", defaultKind: "none" },
    { kind: "emergency", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "defer", "delegate", "allow-default"], clock: "operational", defaultKind: "escalated" },
    { kind: "military-authorization", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "allow-default"], clock: "opportunity", defaultKind: "failed" },
    { kind: "foreign-request", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "defer", "delegate", "allow-default"], clock: "opportunity", defaultKind: "declined" },
    { kind: "treaty", urgency: "hard", responseRequirement: "president", allowed: ["act", "decline", "defer", "allow-default"], clock: "opportunity", defaultKind: "failed" },
    { kind: "compact-call", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "delegate"], clock: "none", defaultKind: "none" },
    { kind: "oversight", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
    { kind: "court-response", urgency: "hard", responseRequirement: "president", allowed: ["act", "defer", "delegate", "allow-default"], clock: "statutory", defaultKind: "legal-default" },
    { kind: "press-response", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "defer", "delegate", "allow-default"], clock: "opportunity", defaultKind: "declined" },
    { kind: "institution-request", urgency: "soft", responseRequirement: "delegable", allowed: ["act", "decline", "delegate"], clock: "none", defaultKind: "none" },
    { kind: "delayed-consequence", urgency: "soft", responseRequirement: "president", allowed: ["act", "decline"], clock: "none", defaultKind: "none" },
];
export function familyContract(kind) {
    const found = CASE_FAMILIES.find((row) => row.kind === kind);
    if (found === undefined)
        throw new Error(`no case family ${kind}`);
    return found;
}
export function familyCanEnd(contract) {
    if (contract.allowed.some((kind) => TERMINAL.has(kind)))
        return true;
    return contract.clock !== "none" && contract.defaultKind !== "none";
}
// The words are the Default column of the case-kind contract. Nothing in the engine
// executes them yet. They are stored so a later effect can be checked against
// the sentence the contract already names.
const DEFAULT_PHRASE = {
    "authored-scenario": "authored deterioration/withdrawal or none",
    bill: "constitutional result",
    nomination: "vacancy continues",
    budget: "shutdown/lapse/default law",
    "executive-order": "none",
    emergency: "deterioration/escalation",
    "military-authorization": "target/opportunity changes",
    "foreign-request": "offer withdrawn or relationship inference",
    treaty: "offer expiry/standing obligation",
    "compact-call": "offer expiry/standing obligation",
    oversight: "ruling/enforcement",
    "court-response": "ruling/enforcement",
    "press-response": "story proceeds without response",
    "institution-request": "none",
    "delayed-consequence": "none",
};
function defaultOutcome(contract) {
    const phrase = DEFAULT_PHRASE[contract.kind];
    switch (contract.defaultKind) {
        case "none":
            return { kind: "none" };
        case "escalated":
            return { kind: "escalated", successorFactory: phrase };
        case "delegated":
            throw new Error(`case family ${contract.kind} has a delegated default and no institution on the raise`);
        case "declined":
        case "legal-default":
        case "failed":
            return { kind: contract.defaultKind, outcomeId: phrase };
    }
}
function familyClock(contract, id, dueAt) {
    if (contract.clock === "none")
        return { kind: "none" };
    if (dueAt === undefined)
        throw new Error(`case ${id} needs a due date`);
    return { kind: contract.clock, dueAt };
}
/** A raise that already satisfies the family's contract. */
export function raiseForFamily(input) {
    const contract = familyContract(input.kind);
    return {
        id: input.id,
        kind: input.kind,
        title: input.title,
        subject: input.subject,
        clock: familyClock(contract, input.id, input.dueAt),
        defaultOutcome: defaultOutcome(contract),
        urgency: contract.urgency,
        responseRequirement: contract.responseRequirement,
        allowedDispositions: contract.allowed,
    };
}
