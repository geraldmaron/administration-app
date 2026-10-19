import { apply, commitReply, compareDates, createRngStreams, eligibleConsequences, hasFlag, INSTRUMENT_IDS, makeCampaignSeed, outstandingInstrumentActs, resolveDueInstruments, } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { sealedCampaign } from "../__fixtures__/campaign.js";
import { auditConsequences, consequenceAuditPasses } from "../consequence-audit.js";
import { compileConsequences } from "../consequence-compile.js";
import { ConsequenceDef, ConsequencePack } from "../consequence.js";
import { eligibleScenarios } from "../scenario-cast.js";
import { CORE_FLAG_VOCABULARY } from "./core.js";
import { CORE_CONSEQUENCES, coreConsequencePack } from "./core-consequences.js";
const BANDS = ["low", "mid", "high"];
const VALENCES = ["success", "partial", "failure"];
describe("the bundled aftermath ships clean", () => {
    it("every card parses as the schema the pipeline validates", () => {
        for (const def of CORE_CONSEQUENCES) {
            expect(() => ConsequenceDef.parse(def), def.id).not.toThrow();
        }
        expect(() => ConsequencePack.parse(coreConsequencePack)).not.toThrow();
    });
    it("clears the whole consequence audit with no errors", () => {
        const findings = auditConsequences(CORE_CONSEQUENCES, CORE_FLAG_VOCABULARY);
        const errors = findings.filter((finding) => finding.severity === "error");
        expect(errors, errors.map((error) => `${error.consequence}: ${error.message}`).join("\n")).toEqual([]);
        expect(consequenceAuditPasses(findings)).toBe(true);
    });
    // The floor claim, stated as arithmetic rather than as a comment: every cell
    // of the matrix has a card that nothing gates, nothing spends, and no failure
    // branch narrows — which is what makes the draw safe to call blind.
    it("fills all forty-five cells with unconditioned cards", () => {
        const cells = [];
        for (const instrument of INSTRUMENT_IDS) {
            for (const band of BANDS) {
                for (const valence of VALENCES) {
                    const guaranteed = CORE_CONSEQUENCES.filter((def) => def.instrument === instrument &&
                        def.valence === valence &&
                        def.rungBands.includes(band) &&
                        !def.conditions &&
                        !def.riskAffinity &&
                        def.once !== true);
                    cells.push(`${instrument}/${band}/${valence}=${guaranteed.length}`);
                }
            }
        }
        expect(cells).toHaveLength(45);
        expect(cells.filter((cell) => cell.endsWith("=0"))).toEqual([]);
        expect(cells.every((cell) => Number(cell.split("=")[1]) >= 2)).toBe(true);
    });
    it("the draw finds something for every situation a resolver can produce", () => {
        const campaign = sealedCampaign();
        const pool = compileConsequences(CORE_CONSEQUENCES);
        const target = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
        for (const instrument of INSTRUMENT_IDS) {
            for (const rung of [1, 2, 3, 4, 5]) {
                for (const valence of VALENCES) {
                    const situation = { actor: campaign.founding.nation, target: target, instrument, rung, valence };
                    expect(eligibleConsequences(campaign, pool, situation), `${instrument}/${rung}/${valence}`).not.toHaveLength(0);
                }
            }
        }
    });
    it("varies its recipes rather than writing seventy-two metric moves", () => {
        const kinds = new Set(CORE_CONSEQUENCES.flatMap((def) => def.effects.map((recipe) => recipe.kind)));
        expect(kinds).toEqual(new Set(["metric", "relationship", "grudge", "feed"]));
    });
    it("puts its flags into the vocabulary a later pack may gate on", () => {
        const written = CORE_CONSEQUENCES.flatMap((def) => def.sets ?? []);
        expect(written.length).toBeGreaterThan(0);
        for (const flag of written)
            expect(CORE_FLAG_VOCABULARY).toContain(flag);
    });
});
// --- The decision tree, end to end ------------------------------------------
const CHAIN_FLAG = "opened-back-channel";
/** A follow-up that exists only for a campaign where the back channel opened. */
const theChannelCallsBack = {
    id: "the-channel-calls-back",
    class: "foreign-crisis",
    severity: "serious",
    dilemmaShape: "containment",
    subject: "The channel calls back",
    cast: { pick: "tensest" },
    conditions: [{ kind: "flag", flag: CHAIN_FLAG, is: true }],
    weight: 1,
    locus: { site: "capital", ground: "counterpart", descriptor: "a hotel suite booked under a company name" },
    opening: [
        {
            speaker: { kind: "narrator" },
            text: "The same intermediary asks for an hour, and asks for it on the day the recall was supposed to have settled everything.",
        },
    ],
    replies: [
        {
            id: "take-the-hour",
            tone: "conciliatory",
            text: "Give them the hour. Somewhere with no flag on the table and nobody taking a note.",
            commitment: { kind: "instrument", instrument: "diplomatic", rung: 1 },
        },
        {
            id: "let-them-wait",
            tone: "firm",
            text: "They can ask again in writing, and they can ask the way everybody else asks.",
            commitment: {
                kind: "position",
                cost: { standing: -0.02 },
                remembered: "{{leader}} left the channel unanswered and made them come back through the front door.",
                rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "The people who asked for it have thanked us and the people who did not have said nothing, which is how these things usually go." },
            },
        },
    ],
};
/**
 * The draw is weighted and seeded, so a test that wants a particular card to
 * fire hands the resolver a pool of the cards that carry the flag rather than
 * hunting for a seed that happens to pick one. What is under test is the loop —
 * aftermath writes a flag, the flag opens a scenario — not which of two cards
 * in a cell won a coin toss.
 */
function chainPool() {
    const carriers = CORE_CONSEQUENCES.filter((def) => (def.sets ?? []).includes(CHAIN_FLAG));
    expect(carriers.length, `no bundled card sets ${CHAIN_FLAG}`).toBeGreaterThan(0);
    return compileConsequences(carriers);
}
function scriptAgainst(campaign) {
    const counterpart = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
    const option = {
        id: "recall-the-ambassador",
        tone: "firm",
        text: "Bring our ambassador home tonight, and let them read about it in the morning.",
        commitment: { kind: "instrument", instrument: "diplomatic", rung: 3 },
    };
    return {
        script: {
            id: "the-chain-proof",
            counterpart: counterpart,
            subject: "The chair we are about to empty",
            opening: [{ speaker: { kind: "narrator" }, text: "The channel has gone quiet and the chair is still filled." }],
            options: [
                option,
                {
                    id: "hold-the-post",
                    tone: "conciliatory",
                    text: "Leave the post filled. An empty chair says a thing we cannot walk back.",
                    commitment: {
                        kind: "position",
                        cost: { standing: -0.02 },
                        remembered: "The ambassador stayed, and staying was itself the answer.",
                        rejoinder: { speaker: { kind: "narrator" }, text: "The chair stayed filled and the channel it was meant to reach stayed quiet all the same, for eleven days and counting now." },
                    },
                },
            ],
        },
        option,
    };
}
/** A recall is gated on having a mission worth disrupting, so the proof gives the founding nation one. */
/** The campaign on the day its last outstanding operation falls due, with every due operation executed. */
function executeOutstanding(campaign) {
    const due = outstandingInstrumentActs(campaign).map((act) => act.dueDate);
    expect(due.length, "nothing was ordered").toBeGreaterThan(0);
    const last = due.reduce((latest, date) => (compareDates(date, latest) > 0 ? date : latest));
    return resolveDueInstruments({ ...campaign, calendar: last }).campaign;
}
function withDiplomaticReach(campaign, reach) {
    const id = campaign.founding.nation;
    const runtime = campaign.nations[id];
    return {
        ...campaign,
        nations: {
            ...campaign.nations,
            [id]: { ...runtime, stats: { ...runtime.stats, softPower: { ...runtime.stats.softPower, diplomaticReach: reach } } },
        },
    };
}
describe("aftermath opens a follow-up turns later", () => {
    it("a committed reply fires a card whose flag makes a gated scenario eligible", () => {
        // The recall lands on a roll drawn at execution from the campaign's own
        // seed, about even odds; this campaign is one where it lands.
        const before = withDiplomaticReach(sealedCampaign("chain-proof-3"), 0.8);
        const { script, option } = scriptAgainst(before);
        // Gated shut on the campaign as founded: nothing has opened a channel.
        expect(eligibleScenarios(before, [theChannelCallsBack])).toHaveLength(0);
        const result = commitReply(before, script, option, createRngStreams(makeCampaignSeed("chain-proof-2")), {
            consequences: chainPool(),
            context: { scenarioClass: "foreign-crisis" },
        });
        expect(result.ok).toBe(true);
        if (!result.ok)
            return;
        // The aftermath is spoken in the thread, not on a results screen.
        expect(result.beats.length).toBeGreaterThan(1);
        expect(result.beats.some((beat) => beat.speaker.kind === "narrator")).toBe(true);
        // Recalling an ambassador takes days, so signing only orders it; the card
        // rides with the order and is drawn the day it executes.
        const ordered = apply(before, result.packet);
        expect(hasFlag(ordered, CHAIN_FLAG)).toBe(false);
        const after = executeOutstanding(ordered);
        const executed = Object.values(after.issuedActs ?? {}).find((act) => act.kind === "instrument");
        expect(executed?.outcome?.landed, "the recall did not land on this seed; pick one where it does").toBe(true);
        expect(hasFlag(after, CHAIN_FLAG)).toBe(true);
        const laterTurn = { ...after, turn: after.turn + 1 };
        const live = eligibleScenarios(laterTurn, [theChannelCallsBack]);
        expect(live).toHaveLength(1);
        expect(live[0]?.def.id).toBe("the-channel-calls-back");
    });
});
