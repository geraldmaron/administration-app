import { courtStep } from "./court-procedure.js";
// Section 3613 lets an aggrieved applicant sue the provider in district court
// while a HUD complaint is pending. The respondent's written criterion is on
// the service record before filing; the court never derives guilt from intake.
function matter(complaint) {
    return {
        kind: "fair-housing-enforcement", title: "Rental applicant v. housing provider named in HUD complaint",
        parties: [{ name: "Rental applicant who filed the HUD complaint", role: "plaintiff" },
            { name: "Housing provider named in the complaint", role: "defendant" }],
        injury: `A rental applicant alleges denial on account of race in HUD complaint ${complaint.id}; the application expires on turn ${complaint.applicationDeadlineTurn}.`,
        jurisdiction: "The aggrieved applicant files a private federal district-court action under 42 U.S.C. §3613 while the HUD complaint remains pending. The respondent's rental denial is the concrete injury; discrimination remains to be proved.",
        question: "Should the provider be restrained from closing this rental application while the alleged discriminatory practice is adjudicated?",
        authority: "Fair Housing Act, 42 U.S.C. §§3604 and 3613.",
        disputedFacts: `Whether the provider's written ${complaint.writtenCriterion === "race" ? "race criterion" : "capacity explanation"} establishes unlawful treatment; the provider contests the allegation.`,
        reliefSought: "Keep this application open during the case and, if discrimination is proved, require the provider to reconsider it without the unlawful criterion. No tenancy is guaranteed.",
        affected: "The complainant's application at the named respondent provider; other housing providers are outside this case.",
        evidence: [`HUD complaint: ${complaint.id}.`, `Filed turn: ${complaint.filedTurn}.`,
            `Original application deadline: ${complaint.originalDeadlineTurn}.`,
            `Respondent's written criterion: ${complaint.writtenCriterion}.`],
    };
}
function opened(state) {
    const complaint = state.services?.["fair-housing-complaints"]?.housingComplaint;
    if (!complaint || state.turn > complaint.applicationDeadlineTurn || complaint.status !== "pending")
        return undefined;
    return { id: `fair-housing:${complaint.id}`, subject: { kind: "fair-housing-enforcement", complaintId: complaint.id },
        matter: matter(complaint), filedTurn: state.turn, stage: "threshold", nextTurn: state.turn + 1,
        history: [{ turn: state.turn, stage: "threshold",
                account: "The aggrieved applicant files a respondent-specific private Fair Housing Act action while the HUD complaint is pending." }] };
}
function complaintStatus(state, status) {
    const runtime = state.services?.["fair-housing-complaints"];
    if (!runtime?.housingComplaint)
        return [];
    return [{ kind: "institution", services: [{ ...runtime, housingComplaint: { ...runtime.housingComplaint, status,
                        ...(status === "unprotected" ? { applicationDeadlineTurn: runtime.housingComplaint.originalDeadlineTurn } : {}) } }] }];
}
function finalCase(state, proceeding, holding) {
    const matter = proceeding.matter;
    return { id: proceeding.id, subject: proceeding.subject, matter, question: matter.question,
        ground: holding === "struck-down" ? "forbidden" : "authorized", filedTurn: proceeding.filedTurn,
        dueTurn: proceeding.nextTurn, ruledTurn: state.turn, holding, votes: [],
        opinion: { majority: holding === "struck-down"
                ? "The district court finds the respondent used a prohibited racial criterion. The provider must reconsider this applicant without that criterion; the order awards no automatic tenancy and reaches no other provider."
                : "The evidence does not establish that this provider denied the application because of race. The temporary protection ends; HUD's complaint record remains available." },
        procedure: { forum: "lower", lower: holding, history: proceeding.history } };
}
function advance(state, proceeding) {
    if (state.turn < proceeding.nextTurn || proceeding.stage === "final")
        return [];
    const complaint = state.services?.["fair-housing-complaints"]?.housingComplaint;
    if (proceeding.subject.kind !== "fair-housing-enforcement" || complaint?.id !== proceeding.subject.complaintId)
        return [];
    const set = (next) => ({ kind: "courtProceeding", set: next });
    switch (proceeding.stage) {
        case "threshold":
            return [set(courtStep(proceeding, "interim", state.turn, "The court accepts the aggrieved applicant's §3613 suit against this provider; it makes no discrimination finding yet."))];
        case "interim":
            return [set(courtStep(proceeding, "lower-merits", state.turn, "The court preserves the complainant's application until the merits hearing; HUD's underlying investigation continues.", { interim: "party-stayed" })), ...complaintStatus(state, "interim-protected")];
        case "lower-merits": {
            const holding = complaint.writtenCriterion === "race" ? "struck-down" : "upheld";
            return [set(courtStep(proceeding, "appeal", state.turn, holding === "struck-down" ? "The district court finds a discriminatory denial and orders respondent-specific reconsideration."
                    : "The district court finds the allegation unproved; temporary protection remains until the judgment becomes final.", { lower: { holding, ruledTurn: state.turn, ground: holding === "struck-down" ? "forbidden" : "authorized", enforcement: "stayed-pending-appeal" } }))];
        }
        case "appeal": {
            const holding = proceeding.lower?.holding;
            if (!holding)
                throw new Error(`Fair-housing appeal has no lower judgment: ${proceeding.id}`);
            const settled = courtStep(proceeding, "final", state.turn, "The applicant and respondent let the lower judgment become final without a merits appeal.");
            const record = finalCase(state, settled, holding);
            return [set(settled), { kind: "courtCase", set: record },
                ...complaintStatus(state, holding === "struck-down" ? "reconsideration-ordered" : "unprotected"),
                { kind: "feed", items: [{ turn: state.turn, kind: "governance", visibility: "public",
                            headline: "A federal court resolves a fair-housing complaint against a named provider.",
                            facts: { instrument: record.matter.title, stake: record.opinion.majority, topicTags: ["judiciary", "housing", "civil-rights"] } }] }];
        }
        case "circuit-merits":
        case "supreme-merits":
        case "remand":
            return [];
    }
}
/** The HUD complaint predates filing; its respondent-specific remedy returns to the service record. */
export function fairHousingMatterEffects(state) {
    const complaint = state.services?.["fair-housing-complaints"]?.housingComplaint;
    if (!complaint)
        return [];
    const id = `fair-housing:${complaint.id}`;
    const existing = state.judiciary.proceedings?.find((entry) => entry.id === id);
    const filing = existing ? undefined : opened(state);
    return [...(filing ? [{ kind: "courtProceeding", set: filing }] : []),
        ...(existing ? advance(state, existing) : [])];
}
