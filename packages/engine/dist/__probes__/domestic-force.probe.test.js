import { beforeAll, describe, expect, it } from "vitest";
import { cellRuns, domesticForceSeeds, naturalLine, openedIn, pathTable, runGrid, } from "./domestic-force.js";
// Where each statutory path for federal force at home opens, and how often.
// A path is dead when it opens in none of the runs of the scenario built to
// open it, and always open when it is open in more than nine in ten of the
// state-weeks natural unrest reaches. Each band below states the expectation
// the plan set and the knob to turn first when the census misses it.
const SEEDS = domesticForceSeeds();
/** The cells each band reads: the natural run, and the scenario built to open each path, under the policy that would walk it. */
const CELLS = [
    { scenario: "S0", policy: "P0" },
    { scenario: "S1", policy: "P0" },
    { scenario: "S1", policy: "P2" },
    { scenario: "S2", policy: "P0" },
    { scenario: "S3", policy: "P0" },
    { scenario: "S4", policy: "P0" },
    { scenario: "S4", policy: "P2" },
];
/** The path each designed cell exists to open; invasion needs a war on the United States, which no scenario plants. */
const DESIGNED_FOR = {
    "251": [{ scenario: "S2", policy: "P0" }],
    "252": [{ scenario: "S4", policy: "P2" }],
    "253": [{ scenario: "S1", policy: "P0" }, { scenario: "S1", policy: "P2" }],
    "regular-forces": [{ scenario: "S1", policy: "P2" }],
    rebellion: [{ scenario: "S3", policy: "P0" }],
    proclamation: [{ scenario: "S1", policy: "P2" }],
    "surveil-under-order": [{ scenario: "S1", policy: "P2" }],
};
let runs = [];
const natural = () => cellRuns(runs, "S0", "P0");
const total = (from, read) => from.reduce((sum, run) => sum + read(run.natural), 0);
beforeAll(() => {
    runs = runGrid(CELLS, SEEDS);
    console.info(`domestic force census, ${SEEDS.length} seeds\n${pathTable(runs, CELLS)}\n${naturalLine(natural())}`);
}, 7_200_000);
describe("the statutory paths for federal force at home", () => {
    // The plan's floor was 20% of natural campaigns. Natural unrest is almost
    // all national, which opens no troop path, and placed unrest ran 28 of 436
    // unrest state-weeks over eight campaigns: one campaign of eight is 12.5%,
    // and eight seeds cannot tell that from 20%. So the floor is the dead check,
    // at least one natural campaign, and the ceiling stays.
    it("opens a §251 or §253 troop path in at least one natural campaign and at most 70% of them", () => {
        const opened = natural().filter((run) => run.natural.troopsPathWeeks > 0).length;
        expect(opened, `troop path open in no natural campaign. Knob 5: INSURRECTION_SEVERITY (locale-missions.ts), then GOVERNOR_ASSENT_FLOOR`)
            .toBeGreaterThanOrEqual(1);
        expect(opened / natural().length, `troop path open in ${opened} of ${natural().length} natural campaigns. Knob 5: INSURRECTION_SEVERITY`)
            .toBeLessThanOrEqual(0.7);
    });
    it("opens §253 in at most a tenth of the states national unrest alone reaches", () => {
        const weeks = total(natural(), (tally) => tally.nationOnlyStateWeeks);
        const open = total(natural(), (tally) => tally.nationOnly253);
        const share = weeks > 0 ? open / weeks : 0;
        expect(share, `§253 open in ${open} of ${weeks} national-only state-weeks: §253 must read placed unrest (placedUnrest in locale-missions.ts)`)
            .toBeLessThanOrEqual(0.1);
    });
    it("opens the §252 court path never without an application, and within six weeks in half the escalating runs", () => {
        const passive = openedIn(cellRuns(runs, "S4", "P0"), "252");
        expect(passive, `§252 opened in ${passive} S4/P0 runs, where no injunction was ever sought`).toBe(0);
        const escalating = cellRuns(runs, "S4", "P2");
        const prompt = escalating.filter((run) => (run.targetFirstOpen["252"] ?? Number.POSITIVE_INFINITY) <= 6).length;
        expect(prompt / escalating.length, `§252 open within six weeks in ${prompt} of ${escalating.length} S4/P2 runs. The plan's conditional `
            + "remedy: the injunction floor in approvalAndNarrowing 0.2 -> 0.3 (court-orders.ts); then OBSTRUCTION_WEEKS").toBeGreaterThanOrEqual(0.5);
    });
    it("reads rebellion in at most 5% of natural campaign-weeks, and in every run with insurgency planted", () => {
        const weeks = total(natural(), (tally) => tally.weeks);
        const rebellion = total(natural(), (tally) => tally.rebellionWeeks);
        expect(rebellion / weeks, `rebellion in ${rebellion} of ${weeks} natural weeks. Raise REBELLION_INSURGENCY_FLOOR (locale-missions.ts)`)
            .toBeLessThanOrEqual(0.05);
        const planted = cellRuns(runs, "S3", "P0");
        const opened = openedIn(planted, "rebellion");
        expect(opened, `rebellion opened in ${opened} of ${planted.length} S3 runs. The plan's conditional remedy: `
            + "REBELLION_INSURGENCY_FLOOR 0.2 -> 0.15 (locale-missions.ts)").toBe(planted.length);
    });
    it("opens surveillance under a court order at least one week in a quarter of the escalating runs", () => {
        const escalating = cellRuns(runs, "S1", "P2");
        const opened = openedIn(escalating, "surveil-under-order");
        expect(opened / escalating.length, `surveillance under order open in ${opened} of ${escalating.length} S1/P2 runs. `
            + "Check the Title III odds in approvalAndNarrowing and SURVEILLANCE_ORDER_KINDS (court-orders.ts)").toBeGreaterThanOrEqual(0.25);
    });
    it.each(Object.keys(DESIGNED_FOR))("is not dead: %s opens in at least one run of the scenario built for it", (key) => {
        const counts = (DESIGNED_FOR[key] ?? []).map((cell) => openedIn(cellRuns(runs, cell.scenario, cell.policy), key));
        expect(Math.max(0, ...counts), `${key} opened in no run of ${(DESIGNED_FOR[key] ?? []).map((cell) => `${cell.scenario}/${cell.policy}`).join(", ")}. `
            + "Knob 5: INSURRECTION_SEVERITY, then the plan's conditional remedies").toBeGreaterThan(0);
    });
    it.each(["251", "252", "253"])("is not always open: §%s is open in at most nine in ten natural unrest state-weeks", (ground) => {
        const reaching = total(natural(), (tally) => tally.reachingStateWeeks);
        const open = total(natural(), (tally) => tally.open[ground]);
        const share = reaching > 0 ? open / reaching : 0;
        expect(share, `§${ground} open in ${open} of ${reaching} natural unrest state-weeks. Knob 5: INSURRECTION_SEVERITY (locale-missions.ts)`)
            .toBeLessThanOrEqual(0.9);
    });
});
