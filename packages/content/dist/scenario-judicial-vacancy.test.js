import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, openConversation, openNomination, projectReply } from "@admin/engine";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { auditScenarioCommands } from "./scenario-audit-command.js";
import { castScenario, castStillBound } from "./scenario-cast.js";
import { judicialBoards } from "./preview-board-judicial.js";
import { auditReachability } from "./scenario-reachability.js";
const base = FIXTURE_SCENARIOS[0];
const scenario = { ...base, id: "judicial-vacancy-probe", cast: { pick: "judicialVacancy" },
    conditions: [{ kind: "judicialVacancy" }], subject: "A nomination for {{judicialSeat}}",
    opening: [{ speaker: { kind: "narrator" }, text: "{{judicialNominee}} brings {{judicialNomineeRecord}}; {{judicialAlternate}} brings {{judicialAlternateRecord}}. Both can be nominated for {{judicialSeat}}." }],
    replies: [{ ...base.replies[0], id: "nominate-first", commitment: { kind: "position", cost: {}, judicialNomination: { action: "submit", candidate: "first" },
                remembered: "The President submitted a nominee for a vacant Court seat.",
                rejoinder: { speaker: { kind: "narrator" }, text: "The name enters vetting; no Senate vote has been taken." } } },
        { ...base.replies[0], id: "nominate-alternate", tone: "principled", commitment: { kind: "position", cost: {}, judicialNomination: { action: "submit", candidate: "alternate" },
                remembered: "The President submitted the second eligible nominee for a vacant Court seat.",
                rejoinder: { speaker: { kind: "narrator" }, text: "This name enters vetting; no Senate vote has been taken." } } }],
};
describe("judicial vacancy scenario binding", () => {
    it("reaches real chief and associate vacancies separately", () => {
        for (const seat of ["chief", "associate"]) {
            const def = { ...scenario, id: `vacancy-${seat}`, conditions: [{ kind: "judicialVacancy", seat }] };
            const boards = judicialBoards([def]);
            expect(boards.some((state) => castScenario(state, def)?.judicialVacancy?.seat === (seat === "chief" ? 1 : 2))).toBe(true);
            expect(auditReachability([def])).toEqual([]);
        }
    });
    it("pins a real vacancy and eligible candidate, then opens the nomination without seating them", () => {
        const state = judicialBoards([scenario])[0];
        const cast = castScenario(state, scenario);
        const frozen = cast.judicialVacancy;
        expect(cast.occurrence).toBe(`${scenario.id}@judicial:${frozen.institution}:${frozen.vacancyOpenedDay}`);
        expect(cast.script.subject).toContain(frozen.title);
        expect(cast.script.opening[0].text).toContain(frozen.nomineeName);
        expect(cast.script.opening[0].text).toContain(frozen.alternateName);
        expect(cast.script.opening[0].text).toContain(frozen.nomineeRecord);
        expect(cast.script.opening[0].text).toContain(frozen.alternateRecord);
        const thread = openConversation(state, cast.script, createRngStreams(state.seed));
        expect(thread.replies).toHaveLength(2);
        expect(thread.replies.every((reply) => reply.available)).toBe(true);
        expect(openNomination(state, frozen.office, frozen.nominee).ok).toBe(true);
        const option = cast.script.options[0];
        expect(projectReply(state, cast.script, option, createRngStreams(state.seed)).available).toBe(true);
        const committed = commitReply(state, cast.script, option, createRngStreams(state.seed));
        expect(committed.ok).toBe(true);
        if (!committed.ok)
            return;
        const after = apply(state, committed.packet);
        expect(Object.values(after.nominations).some((nomination) => nomination.office === frozen.office &&
            nomination.nominee === frozen.nominee && nomination.stage === "vetting")).toBe(true);
        expect(after.institutions[frozen.institution]?.vacancy).toBe(true);
        expect(castStillBound(after, cast)).toBe(false);
        const alternateOption = cast.script.options[1];
        const alternateCommit = commitReply(state, cast.script, alternateOption, createRngStreams(state.seed));
        expect(alternateCommit.ok).toBe(true);
        if (!alternateCommit.ok)
            return;
        const alternateAfter = apply(state, alternateCommit.packet);
        expect(Object.values(alternateAfter.nominations).some((nomination) => nomination.office === frozen.office &&
            nomination.nominee === frozen.alternate && nomination.stage === "vetting")).toBe(true);
    });
    it("withdraws an old option when the candidate or vacancy changes", () => {
        const state = judicialBoards([scenario])[0];
        const cast = castScenario(state, scenario);
        const frozen = cast.judicialVacancy;
        const changed = { ...state, people: { ...state.people, [frozen.nominee]: { ...state.people[frozen.nominee], alive: false } } };
        expect(castStillBound(changed, cast)).toBe(false);
        expect(projectReply(changed, cast.script, cast.script.options[0], createRngStreams(changed.seed)).available).toBe(false);
        expect(commitReply(changed, cast.script, cast.script.options[0], createRngStreams(changed.seed)).ok).toBe(false);
    });
    it("requires the gate and executable reply", () => {
        const findings = [];
        auditScenarioCommands(scenario, findings);
        expect(findings).toEqual([]);
        auditScenarioCommands({ ...scenario, conditions: [] }, findings);
        expect(findings.some((finding) => finding.kind === "ungrounded-command")).toBe(true);
    });
});
