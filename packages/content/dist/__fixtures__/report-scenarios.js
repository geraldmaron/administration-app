import { FIXTURE_SCENARIOS } from "./scenarios.js";
const base = FIXTURE_SCENARIOS.find((scenario) => scenario.id === "fixture-the-border-reading");
const warning = {
    ...base,
    id: "fixture-issued-warning",
    subject: "A sourced warning about {{reportTarget}} reaches the President",
    cast: { pick: "collectionReport", bind: "target" },
    locus: { site: "capital", ground: "home", descriptor: "the secure briefing room where the issued report is on the desk" },
    conditions: [{ kind: "collectionReport", targetKind: "foreign-nation", topic: "external-intent", confidence: "moderate", shared: false }],
    boosts: undefined, transmission: undefined,
    particulars: [{ label: "Findings", value: "{{reportFindingCount}}" }, { label: "Report age", value: "{{reportAgeDays}} days" }, { label: "Confidence", value: "{{reportConfidence}}" }, { label: "Exposure", value: "{{reportExposure}}" }],
    opening: [
        { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "The issued report says {{reportFinding}} The source is {{reportSource}}, and the community rates that finding {{reportConfidence}} confidence. We can still ask what it missed." },
        { speaker: { kind: "narrator" }, text: "The President has the finding, not the other government's answer. A public move may deter one course and make a different course harder to see." },
    ],
    replies: [
        { id: "seek-another-assessment", tone: "principled", text: "Ask the intelligence community to test the warning against another source before taking an overt step.",
            commitment: { kind: "position", cost: { treasury: -80, standing: -0.02 }, remembered: "The President asked for another assessment of the issued warning and held an overt response while the community tested it.", rejoinder: { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "The community is checking the source chain again. The delay may narrow our options if the move comes before the answer does." } } },
        { id: "make-a-diplomatic-demarche", tone: "firm", text: "Send a formal diplomatic warning to {{reportTarget}} and make clear that the reported move would carry a cost.",
            commitment: { kind: "instrument", instrument: "diplomatic", rung: 1 } },
        { id: "hold-the-warning", tone: "evasive", text: "Keep the report inside the government and hold the current posture while watching for corroboration.",
            commitment: { kind: "position", cost: { standing: -0.03 }, remembered: "The administration kept the issued warning inside the government and held its posture while it waited for corroboration.", rejoinder: { speaker: { kind: "narrator" }, text: "The report remains on the desk. No new finding has arrived, and the choice to wait has become part of the record." } } },
    ],
};
const sharedWarning = {
    ...base,
    id: "fixture-shared-warning-followup",
    subject: "The President weighs support after a shared warning",
    cast: { pick: "collectionReport", bind: "recipient" },
    locus: { site: "capital", ground: "home", descriptor: "the secure room where the recipient's request is read beside the shared report" },
    conditions: [{ kind: "collectionReport", targetKind: "foreign-nation", topic: "external-intent", confidence: "moderate", shared: true }],
    boosts: undefined, transmission: undefined,
    particulars: [{ label: "Findings", value: "{{reportFindingCount}}" }, { label: "Report age", value: "{{reportAgeDays}} days" }, { label: "Confidence", value: "{{reportConfidence}}" }, { label: "Exposure", value: "{{reportExposure}}" }],
    opening: [
        { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "The warning shared with {{reportRecipient}} rests on this finding: {{reportFinding}} The source is {{reportSource}}. We have to decide what support, if any, follows the warning." },
        { speaker: { kind: "narrator" }, text: "The report names {{reportTarget}} as the subject and {{reportRecipient}} as the recipient. Those are different governments, and an answer to one reaches the other." },
    ],
    replies: [
        { id: "offer-contingent-assistance", tone: "conciliatory", text: "Offer {{reportRecipient}} contingent assistance if the reported move becomes overt, without promising a response today.",
            commitment: { kind: "instrument", instrument: "assistance", rung: 1 } },
        { id: "request-joint-review", tone: "principled", text: "Ask {{reportRecipient}} to compare its own evidence with the shared warning before either government commits itself.",
            commitment: { kind: "position", cost: { treasury: -60, standing: -0.02 }, remembered: "The President sought a joint review with the warning's recipient before committing this administration to a public response.", rejoinder: { speaker: { kind: "cabinet", roleHint: "foreign" }, text: "Their analysts will meet ours under the same restriction as the original warning. It buys clarity, but it also spends time." } } },
        { id: "decline-follow-on", tone: "evasive", text: "Tell {{reportRecipient}} the warning stands, but decline a further commitment until the underlying finding changes.",
            commitment: { kind: "position", cost: { standing: -0.04 }, remembered: "The administration told the recipient that the warning stood but made no further commitment on the present finding.", rejoinder: { speaker: { kind: "narrator" }, text: "The recipient has the warning and no additional assurance. Its next move belongs to its own government." } } },
    ],
};
export const REPORT_SCENARIO_FIXTURES = [warning, sharedWarning];
