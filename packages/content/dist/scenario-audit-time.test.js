import { describe, expect, it } from "vitest";
import { auditConsequence } from "./consequence-audit.js";
import { CORE_CONSEQUENCES } from "./packs/core-consequences.js";
import { CORE_SCENARIOS } from "./packs/core.js";
import { ScenarioDef } from "./scenario.js";
import { auditPasses, auditScenario } from "./scenario-audit.js";
import { TIME_FINDING_KINDS, timeClaimsIn } from "./scenario-audit-time.js";
const severitiesIn = (text) => timeClaimsIn(text).map((claim) => claim.severity);
describe("the time gate reads a commit-time line", () => {
    it.each([
        "Eleven weeks later a researcher abroad published from her own government's copies.",
        "Months later the matter was reopened on a clerk's note.",
        "Years later nobody in the department remembered the file.",
        "The ministry answered the following year.",
        "The extra sittings cleared four hundred cases by spring.",
        "The conviction came inside eight weeks.",
        "Over the coming months the yards took on half the crews again.",
        "Receipts fall back next quarter.",
        "The government spent the rest of the year being reminded of it.",
        "The Secretary was charged in autumn.",
        "By the end of the year the fund was empty.",
        "The mortgages repriced within the month.",
    ])("flags an anchored flash-forward as an error: %s", (line) => {
        expect(severitiesIn(line)).toContain("error");
    });
    it.each([
        "After six months, the program was dismantled.",
        "The vote carried after five weeks and two contracts lapsed while it ran.",
        "The strike collapsed after two weeks of escalating tension.",
        "They found it in eleven weeks.",
        "The county raised its half in seven months, mostly from the people who drive across it.",
        "In eight weeks the convictions were in.",
        "Weeks passed, and the convoy was forgotten.",
        "Months went by and the families never came home.",
        "Half a year passed before the bill cleared the Senate.",
        "A decade later, historians called it the turning point.",
        "It was autumn before anyone in Congress mentioned it again.",
        "By Christmas, grocery prices had doubled.",
        "Nine days of foot traffic passed before the council relented.",
        "In the third week the guards stopped checking papers.",
        "Two incidents at the wire in the fourth week were both reported as accidental discharges.",
        "The strike ended in its second month.",
        "Eight days later the minister resigned.",
        "Over the following twelve months the plant shed four hundred jobs.",
    ])("flags a flash-forward told as a report: %s", (line) => {
        expect(severitiesIn(line)).toContain("error");
    });
    it.each([
        "Senior intelligence asset retires after nineteen years of service.",
        "The order lapses after ninety days.",
        "The contracts are signed and the first units arrive in two weeks.",
        "The next enrollment figures are published in six weeks and the trend in them does not turn back.",
        "The next hosted function is in eleven days and the same cordon rule still stands.",
        "In twelve days two parties arrive expecting the same room, and the one turned away is turned away in public.",
        "The price had doubled in six weeks before anyone drafted the order.",
        "The strike is in its third week and the halls are still out.",
        "The camp has been in its second month without a supply run.",
        "The upland claim is for animals that have to be sold in the third week.",
    ])("leaves alone an interval that is a term, a schedule or backstory: %s", (line) => {
        expect(timeClaimsIn(line)).toEqual([]);
    });
    it.each([
        "It could take months, and nobody in this room can promise otherwise.",
        "This will take years to unwind.",
        "If the host holds firm, it might be spring before anyone moves.",
        "The review is due in the spring.",
        "They plan to open the talks next quarter.",
    ])("passes a forecast: %s", (line) => {
        expect(timeClaimsIn(line)).toEqual([]);
    });
    it.each([
        "The last time this happened, it took years.",
        "Last time, the review took nine weeks and named nobody.",
        "In 2011 the same inquiry reported eight months later.",
        "The one before that settled by spring and lost the vote anyway.",
        "Historically a recount runs into the following month.",
    ])("passes a precedent: %s", (line) => {
        expect(timeClaimsIn(line)).toEqual([]);
    });
    it.each([
        "The count took eleven weeks.",
        "Two days later a passenger came forward with the footage.",
        "The supply was off for eleven days.",
        "He was gone inside a week.",
    ])("warns on a softer shape: %s", (line) => {
        expect(severitiesIn(line)).toEqual(["warning"]);
    });
    it.each([
        "The next morning the cable was answered.",
        "She has kept that registry for nineteen years.",
        "The administration did not commit next year's money before next year had been agreed.",
        "It suspended its inspection regime for a quarter in exchange for the berths.",
        "A tide chart went up with the next spring tides circled on it.",
        "Did it take months last time?",
    ])("leaves alone what is true tonight: %s", (line) => {
        expect(timeClaimsIn(line)).toEqual([]);
    });
    it("reads each sentence on its own, so a forecast does not excuse the next line", () => {
        expect(severitiesIn("It could take months. The ruling came down eight weeks later.")).toEqual(["error"]);
    });
    it("reads overlapping shapes as one claim at its strongest", () => {
        const claims = timeClaimsIn("The farming states spent the following twelve months arguing about it.");
        expect(claims.map((claim) => [claim.severity, claim.phrase])).toEqual([["error", "the following twelve months"]]);
    });
});
const base = CORE_SCENARIOS.find((def) => def.id === "the-notice-on-the-lease");
function withRejoinder(text) {
    const [first, ...rest] = base.replies;
    const commitment = { ...first.commitment, rejoinder: { speaker: { kind: "narrator" }, text } };
    return { ...base, replies: [{ ...first, commitment }, ...rest] };
}
const timeFindings = (def) => auditScenario(def).filter((finding) => TIME_FINDING_KINDS.has(finding.kind));
describe("the time gate on a scenario", () => {
    it("errors on a flash-forward in a rejoinder and stops the publish", () => {
        const def = withRejoinder("Understood. Eleven weeks later a researcher abroad published the same correspondence from her own copies.");
        const findings = timeFindings(def);
        expect(findings.map((finding) => [finding.kind, finding.severity])).toEqual([["commit-time-flash-forward", "error"]]);
        expect(findings[0].message).toContain("Eleven weeks later");
        expect(auditPasses(findings)).toBe(false);
    });
    it("reads the remembered line, the press line and the inaction text as commit-time copy", () => {
        const [first, ...rest] = base.replies;
        const def = {
            ...base,
            context: { ...base.context, inaction: "Silence runs the notice down, and the host signs with somebody else by spring." },
            replies: [
                {
                    ...first,
                    press: "Basing talks reopen, and the rent doubles the following year",
                    commitment: { ...first.commitment, remembered: "The agreement was reopened, and the talks took the rest of the year." },
                },
                ...rest,
            ],
        };
        expect(timeFindings(def).filter((finding) => finding.severity === "error")).toHaveLength(3);
    });
    it("leaves the briefing alone: an opening may say what happened eleven weeks ago", () => {
        const def = {
            ...base,
            opening: [{ ...base.opening[0], text: `${base.opening[0].text} Eleven weeks later the same letter went to two other governments.` }, ...base.opening.slice(1)],
        };
        expect(timeFindings(def)).toEqual([]);
    });
    it("passes the core pack clean", () => {
        expect(CORE_SCENARIOS.flatMap(timeFindings)).toEqual([]);
    });
});
describe("the time gate on a consequence card", () => {
    it("errors on a flash-forward in a beat", () => {
        const card = CORE_CONSEQUENCES[0];
        const findings = auditConsequence({ ...card, beats: ["Two weeks later the central bank is buying its own currency again."] }).filter((finding) => TIME_FINDING_KINDS.has(finding.kind));
        expect(findings.map((finding) => [finding.kind, finding.severity])).toEqual([["commit-time-flash-forward", "error"]]);
    });
});
describe("a callback's age", () => {
    const gate = (condition) => ScenarioDef.safeParse({ ...base, conditions: [condition] });
    it("is read off a flag that was set", () => {
        expect(gate({ kind: "flag", flag: "lease-held-to-term", is: true, agedAtLeast: 6 }).success).toBe(true);
    });
    it("is refused on a flag that must still be unset, which carries no age to read", () => {
        const parsed = gate({ kind: "flag", flag: "lease-talks-opened", is: false, agedAtLeast: 6 });
        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toEqual(["conditions.0.agedAtLeast"]);
    });
    it("dates the lease arc's close from the notice itself", () => {
        const close = CORE_SCENARIOS.find((def) => def.id === "the-terms-they-finally-signed");
        expect(close.conditions.filter((condition) => condition.kind === "flag")).toEqual([
            { kind: "flag", flag: "scenario:the-notice-on-the-lease", is: true, agedAtLeast: 6 },
            { kind: "flag", flag: "lease-talks-opened", is: false },
        ]);
    });
});
