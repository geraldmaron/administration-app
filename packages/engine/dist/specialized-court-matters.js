import { selectCurrentLaws } from "./state.js";
import { justiceStrikePropensity, strikeDownChance } from "./strike-odds.js";
import { DOMESTIC_EMERGENCY_CONSTRUCTION_CAP } from "./order-subjects.js";
import { leasePlanningArea } from "./order-authority-subjects.js";
export function agencyRuleProcess(orderId, noticeWeeks, execution) {
    if (orderId !== "order-energy-leasing")
        return undefined;
    const chair = execution?.chair.base;
    return { noticeWeeks, commentsAnswered: Boolean(chair && chair.competence >= 0.5),
        siteReviewPreserved: Boolean(chair && (chair.competence + chair.integrity) / 2 >= 0.55) };
}
/** A filed matter is built from the signed rule and the state it actually threatens. */
export function specializedMatter(state, record, rule) {
    if (record.order === "order-entry-suspension") {
        const refusal = state.services?.["consular-visas"]?.entryRefusals?.find((entry) => entry.orderRecordId === record.id);
        if (!refusal)
            return undefined;
        return {
            kind: "entry-suspension", title: "Family visa applicant v. Department of State",
            parties: [{ name: "Family visa applicant and U.S. family sponsor", role: "plaintiff" },
                { name: "Department of State", role: "defendant" }],
            injury: `A family visa application was refused under this entry suspension on turn ${refusal.decidedTurn}; the U.S. sponsor's reunification is delayed.`,
            jurisdiction: "Federal district-court challenge to the proclamation's statutory scope under 8 U.S.C. §1182(f), not review of the individual consular denial or a removal order under §1252. Reviewability is contested; the U.S. sponsor has no automatic constitutional admission claim.",
            question: "Does the entry suspension exceed the class and national-interest findings allowed by 8 U.S.C. §1182(f)?",
            authority: "8 U.S.C. §1182(f); Trump v. Hawaii, 585 U.S. 667 (2018), assumes statutory reviewability without deciding it; Department of State v. Muñoz, 602 U.S. 899 (2024), rejects a spouse's asserted fundamental admission right.",
            disputedFacts: "Whether the proclamation's stated finding supports this class-wide restriction; the consular refusal itself is recorded, not presumed reversible.",
            reliefSought: "Prospective relief against this proclamation if unlawful; the consular officer must reconsider the application under remaining immigration law, without automatic admission.",
            affected: "Applicants refused under this specific entry-suspension record.",
            evidence: [`Visa application record: ${refusal.id}.`, `Refusal turn: ${refusal.decidedTurn}.`,
                `Recorded ground: ${refusal.ground}.`],
        };
    }
    if (record.order === "order-emergency-construction" && record.subject?.kind === "construction") {
        const construction = record.subject;
        const source = state.militaryConstructionProjects?.find((project) => project.id === construction.sourceId);
        const declaration = state.emergencies[construction.declarationId];
        const notice = record.constructionNotice;
        if (!source?.hostState || !declaration || !notice || construction.amount <= 0)
            return undefined;
        const host = state.states[source.hostState]?.base.name;
        if (!host)
            return undefined;
        return {
            kind: "emergency-construction", state: source.hostState,
            title: `House of Representatives v. Department of Defense: ${source.name}`,
            parties: [{ name: "U.S. House of Representatives", role: "plaintiff" },
                { name: "Department of Defense", role: "defendant" }],
            injury: `The President redirected ${construction.amount} in unobligated funds from Congress's enacted appropriation for ${source.name} in ${host}. The House asserts injury to its appropriations power; its standing is disputed.`,
            jurisdiction: "Federal-question action challenging the military-construction redirection; the House's institutional standing must be resolved before merits review.",
            question: "Did the declared emergency require this military construction to support use of the armed forces, as 10 U.S.C. §2808 requires?",
            authority: "10 U.S.C. §2808 and the enacted military-construction appropriation.",
            disputedFacts: "Whether the identified staging and logistics project directly supports the armed forces in the declared emergency, and whether its first contract waited until the congressional notice period ended.",
            reliefSought: "Bar future obligations under this challenged redirection if unlawful; preserve amounts already obligated and spent.",
            affected: `The ${source.name} appropriation and its planned work in ${host}.`,
            evidence: [`Source appropriation: ${source.appropriationBill}.`,
                `Appropriated: ${source.appropriated}; already obligated: ${source.obligated}; redirected: ${construction.amount}.`,
                `Emergency declaration: ${declaration.id}; declared turn: ${declaration.declaredTurn}.`,
                `Destination: ${notice.destinationProject}. ${notice.directSupport}`,
                `Congressional defense committees received notice on office day ${notice.receivedDay}; first contract permitted after office day ${notice.mayContractDay}.`,
                `Certified domestic project cost: ${notice.estimatedCost} million dollars. ${notice.sourceImpact}`],
        };
    }
    if (!rule || rule.id !== record.id)
        return undefined;
    if (record.order === "order-energy-leasing" && record.subject?.kind === "lease-planning") {
        const area = leasePlanningArea(record.subject.areaId);
        if (!area)
            return undefined;
        return {
            kind: "agency-procedure", title: `Coastal communities v. Department of the Interior: ${area.name}`,
            parties: [{ name: "Coastal communities affected by the leasing rule", role: "plaintiff" },
                { name: "Department of the Interior", role: "defendant" }],
            injury: `The communities allege that the final planning rule for ${area.name} narrows alternatives before environmental analysis of a proposed sale. No lease or drilling right is granted by this rule.`,
            jurisdiction: "Federal-question review of the final planning rule; whether planning alone gives these communities a concrete, ripe injury is contested.",
            question: "Did the agency answer material comments and preserve later sale- and site-specific environmental review?",
            authority: "The Outer Continental Shelf Lands Act and the agency's notice-and-comment obligations.",
            disputedFacts: "Whether the final record addresses comments and keeps environmental review for any later sale and site-specific authorization.",
            reliefSought: "Stay and vacatur of this area's planning rule; no lease sale or permit is issued or canceled by this judgment.",
            affected: `The ${area.name} planning process and interested coastal communities.`,
            arguments: ["The communities say unanswered comments or omitted site review make the rule unlawful.",
                "The agency says its final record and retained site reviews satisfy the governing requirements."],
            evidence: [`Planning area: ${area.id}; proposed sale ${area.scheduledSale}.`,
                `Approved program through: ${area.programThrough.year}-${String(area.programThrough.month).padStart(2, "0")}-${String(area.programThrough.day).padStart(2, "0")}.`,
                `Notice period: ${rule.process?.noticeWeeks ?? "not recorded"} weeks.`,
                `Material comments answered: ${rule.process?.commentsAnswered === undefined ? "not recorded" : rule.process.commentsAnswered ? "yes" : "no"}.`,
                `Later sale and site review preserved: ${rule.process?.siteReviewPreserved === undefined ? "not recorded" : rule.process.siteReviewPreserved ? "yes" : "no"}.`],
        };
    }
    if (record.order !== "order-grant-conditions")
        return undefined;
    const grant = record.subject?.kind === "grant" ? state.bills[record.subject.billId] : undefined;
    const current = grant && selectCurrentLaws(state).some((bill) => bill.id === grant.id && bill.act === "act-police-accountability");
    const statePlaintiff = Object.values(state.states).filter((entry) => entry.governor)
        .sort((a, b) => b.base.character.federalDependence - a.base.character.federalDependence || a.base.id.localeCompare(b.base.id))[0];
    if (!statePlaintiff)
        return undefined;
    return {
        kind: "federal-state", state: statePlaintiff.base.id,
        title: `${statePlaintiff.base.name} v. Department of Justice`,
        parties: [{ name: `State of ${statePlaintiff.base.name}`, role: "plaintiff" },
            { name: "Department of Justice", role: "defendant" }],
        injury: `The rule conditions ${statePlaintiff.base.name}'s access to policing grants under ${grant?.title ?? "an unidentified statute"}; the state depends on federal grants and must change reporting and misconduct-investigation practices before payment.`,
        jurisdiction: "Federal-question jurisdiction; the state faces an imminent condition on a scheduled policing-grant rule and seeks prospective review of that rule.",
        question: "Does this policing-grant condition stay within the use-of-force reporting, independent misconduct investigation and nondiscrimination terms Congress enacted?",
        authority: `${grant?.title ?? "No enacted policing-grant law identified"}${grant ? ` (${grant.id})` : ""}; federal grant conditions must be grounded in enacted terms.`,
        disputedFacts: "The state disputes whether the Department of Justice is administering the enacted policing-grant terms or imposing a new, unannounced condition.",
        reliefSought: "Set aside this grant rule if it exceeds the enacted policing-grant terms; leave the statute and unrelated awards in force.",
        affected: `${statePlaintiff.base.name}'s policing-grant administration and other states subject to this same nationwide rule.`,
        arguments: ["The state says the agency cannot add a funding condition Congress did not enact.",
            "The Department says the enacted reporting, investigation and nondiscrimination terms authorize this rule."],
        evidence: [`State federal-dependence share: ${statePlaintiff.base.character.federalDependence}.`,
            `Rule effective turn: ${rule.effectiveTurn}.`, `Enacted grant bill: ${grant?.id ?? "none recorded"}.`,
            `Bill status and subject match: ${current ? "current policing-grant law" : "no current matching law"}.`],
    };
}
/** Specific statutory and record facts constrain these cases before judicial preferences enter. */
export function specializedGround(matter, rule, ordinaryGround, record, state) {
    if (matter?.kind === "emergency-construction" && record?.subject?.kind === "construction" && state) {
        const construction = record.subject;
        const notice = record.constructionNotice;
        const source = state.militaryConstructionProjects?.find((entry) => entry.id === construction.sourceId);
        const declaration = state.emergencies[construction.declarationId];
        if (!notice || !source || !declaration?.armedForcesConflictId || !notice.destinationProject || !notice.directSupport
            || !notice.sourceImpact || !notice.contractId || notice.destinationState !== source.hostState
            || notice.estimatedCost !== construction.amount || notice.mayContractDay < notice.receivedDay + 5
            || (source.redirectedFirstContractDay !== undefined && source.redirectedFirstContractDay < notice.mayContractDay)
            || (source.redirectedContractId !== undefined && source.redirectedContractId !== notice.contractId)
            || construction.amount > DOMESTIC_EMERGENCY_CONSTRUCTION_CAP || source.redirected !== construction.amount
            || source.obligated + construction.amount > source.appropriated)
            return "forbidden";
    }
    if (matter?.kind === "agency-procedure") {
        if (!rule?.process)
            return ordinaryGround;
        return rule.process.noticeWeeks >= 4 && rule.process.commentsAnswered && rule.process.siteReviewPreserved
            ? "authorized" : "forbidden";
    }
    if (matter?.kind === "federal-state") {
        const subject = record?.subject;
        if (subject?.kind !== "grant" || !state)
            return "forbidden";
        return selectCurrentLaws(state).some((bill) => bill.id === subject.billId
            && bill.act === "act-police-accountability") ? "authorized" : "forbidden";
    }
    return ordinaryGround;
}
export function specializedThreshold(matter, rule) {
    if (matter?.kind === "agency-procedure")
        return rule?.status === "in-effect" && rule.process ? undefined : false;
    if (matter?.kind === "federal-state")
        return Boolean(rule && rule.status !== "canceled" && matter.state);
    return undefined;
}
/** A preliminary §2808 injunction needs an uncommitted balance and a merits showing. */
export function constructionInterimRelief(state, record, charter, order, ground, draw) {
    if (record.subject?.kind !== "construction")
        return false;
    const construction = record.subject;
    const project = state.militaryConstructionProjects?.find((entry) => entry.id === construction.sourceId);
    if (!project?.hostState || (project.redirected ?? 0) <= (project.redirectedObligated ?? 0))
        return false;
    // The lost named project cannot be rebuilt with money already committed elsewhere.
    // Likelihood is a preliminary forecast, not the later merits holding.
    const likelihood = strikeDownChance(charter, order, undefined, ground);
    return draw < Math.min(0.75, likelihood * 0.7);
}
function agencyDefects(rule) {
    if (!rule?.process)
        return undefined;
    return Number(rule.process.noticeWeeks < 4) + Number(!rule.process.commentsAnswered)
        + Number(!rule.process.siteReviewPreserved);
}
/** Each independently missing agency step changes the merits, beyond the legal ground's binary label. */
export function specializedMeritsChance(charter, order, matter, rule, member, ground) {
    if (matter?.kind === "federal-state" && ground)
        return ground === "forbidden" ? 1 : 0;
    if (matter?.kind !== "agency-procedure")
        return undefined;
    const defects = agencyDefects(rule);
    if (defects === undefined)
        return undefined;
    const baseline = member ? justiceStrikePropensity(charter, order, member, "silent")
        : strikeDownChance(charter, order, undefined, "silent");
    return Math.max(0.03, Math.min(0.97, baseline + (defects ? 0.17 + defects * 0.12 : -0.2)));
}
