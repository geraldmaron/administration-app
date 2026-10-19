import { describe, it, expect } from "vitest";
import { notchName, ratingSpread, US_EFFECTIVE_RATE_OPEN } from "./sovereign.js";
import { CHARTER_USA_CONSTITUTION, CRADLE_POTOMAC, LEADER_TABLE_AS_OF, US_ID, debtToGdp, defaultFlagDesign, worldDataset, } from "@admin/world";
import { buildCampaign, nationB, person } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { stampOf, weigh } from "./willingness.js";
import { campaignStatus, ruleValue } from "./rules.js";
import { applyRules } from "./rules-effects.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { selectFiscalStatement } from "./fiscal.js";
import { defaultLeaderDraft } from "./leader.js";
import { readPlayerCommitments } from "./ledger-reading.js";
import { makeCampaignSeed } from "./rng.js";
import { CURRENT_SCHEMA_VERSION, MIN_READABLE_SCHEMA_VERSION, createSave, loadSave, normalizeCampaign } from "./save.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { openedProceeding } from "./court-procedure.js";
// The cabinet is drafted from the pool of the seed it will be sealed under:
// the parties' floor members are drawn per seed, so their ids differ by seed.
function foundingChoices(seedText = "save-v26-seed") {
    const seed = makeCampaignSeed(seedText);
    const pool = generateFoundingPool(seed, worldDataset);
    const candidates = draftCabinetCandidates(CHARTER_USA_CONSTITUTION, US_ID, pool);
    const cabinet = Object.fromEntries(Object.entries(candidates).map(([role, list]) => [role, list[0].id]));
    return {
        nationId: US_ID,
        nationName: "United States",
        name: "Test Leader",
        title: "President",
        charterId: CHARTER_USA_CONSTITUTION.id,
        cradleId: CRADLE_POTOMAC,
        compactIds: [],
        cabinet,
        flag: defaultFlagDesign,
        leader: { ...defaultLeaderDraft(), name: "Test Leader" },
    };
}
describe("save format", () => {
    it("preserves a pending proceeding and its recorded lower judgment across reload", () => {
        const base = buildCampaign();
        const proceeding = {
            ...openedProceeding("order-relief-program:1", "order-relief-program", 1, 7),
            stage: "supreme-merits",
            lower: { holding: "struck-down", ruledTurn: 5, ground: "silent", enforcement: "stayed-pending-appeal" },
            appeal: "granted",
        };
        const campaign = { ...base, judiciary: { ...base.judiciary, proceedings: [proceeding] } };
        expect(loadSave(JSON.parse(JSON.stringify(createSave(campaign))))).toEqual(normalizeCampaign(campaign));
    });
    it("loads legacy pending order review without inventing past lower-court findings", () => {
        const base = buildCampaign();
        const campaign = { ...base, orders: [{ id: "order-relief-program:1", order: "order-relief-program", turn: 1, contested: true, challengeChance: 0.4, review: { dueTurn: 7, status: "pending" } }] };
        const restored = loadSave({ schemaVersion: 63, campaign });
        expect(restored.judiciary).toEqual(campaign.judiciary);
        expect(restored.orders).toEqual(campaign.orders);
        const packets = judicialReviewPhase(CHARTER_USA_CONSTITUTION)(restored);
        const advanced = packets.reduce((state, packet) => apply(state, packet), restored);
        expect(advanced.judiciary.proceedings).toHaveLength(1);
        expect(advanced.judiciary.proceedings?.[0]).toMatchObject({ filedTurn: restored.turn, stage: "threshold" });
        expect(advanced.judiciary.proceedings?.[0]?.lower).toBeUndefined();
        expect(advanced.judiciary.cases).toEqual(restored.judiciary.cases);
    });
    it("round-trips a campaign through save and load", () => {
        const campaign = buildCampaign();
        const save = createSave(campaign);
        expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        const restored = loadSave(JSON.parse(JSON.stringify(save)));
        expect(restored).toEqual(normalizeCampaign(campaign));
    });
    it("refuses a save with an incompatible schema version", () => {
        const save = createSave(buildCampaign());
        const incompatible = { ...save, schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
        expect(() => loadSave(incompatible)).toThrow(new RegExp(`schema v${CURRENT_SCHEMA_VERSION + 1}`));
        expect(() => loadSave(incompatible)).toThrow(/no migration path/);
    });
    it("round-trips the structured commitment and counsel an entry now carries", () => {
        const base = buildCampaign();
        const entry = {
            turn: 2,
            actor: "player",
            description: "The channel closes quietly, and nobody says which side closed it.",
            commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: false },
            counsel: { role: "role-foreign-minister", person: person.id, stance: "for", successChance: 0.31 },
        };
        const campaign = { ...base, ledger: [...base.ledger, entry] };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(campaign))));
        expect(restored.ledger.at(-1)).toEqual(entry);
        expect(readPlayerCommitments(restored)).toEqual([
            { turn: 2, instrument: "diplomatic", rung: 1, target: nationB.id, landed: false, counsel: entry.counsel },
        ]);
    });
    // Every format before v29 is refused rather than migrated. The party the
    // president ran as became a choice at v29, and there is nothing in an older
    // save to recover it from — the field it would be derived from is the
    // derivation this version exists to retire.
    it.each([13, 14, 15, 17, 21, 22, 23, 24, 25, 26, 27, 28])("refuses a v%i save rather than inventing a party for it", (version) => {
        const save = { schemaVersion: version, campaign: buildCampaign() };
        expect(() => loadSave(save)).toThrow(/no migration path/);
    });
    it("round-trips a campaign founded as an Independent, party and anchor intact", () => {
        const campaign = sealFounding(makeCampaignSeed("independent-save"), worldDataset, {
            ...foundingChoices("independent-save"),
            leader: { ...defaultLeaderDraft(), name: "Test Leader", party: "independent" },
        });
        expect(campaign.congress.administrationParty).toBe("independent");
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(campaign))));
        expect(restored.congress.administrationParty).toBe("independent");
        expect(restored.congress.caucusAnchor).toBe(campaign.congress.caucusAnchor);
        expect(restored.founding.leader.party).toBe("independent");
    });
    // v51 retired every earlier format rather than re-dating it: a campaign
    // founded on the old calendar would open with every stored date wrong.
    it.each([48, 49, 50])("refuses a v%i save founded on the retired calendar", (version) => {
        expect(() => loadSave({ schemaVersion: version, campaign: buildCampaign() })).toThrow(/no migration path/);
    });
    it("fills what a campaign held only in memory lacks before it is written", () => {
        const campaign = buildCampaign();
        const { foundingDate: _date, issuedActs: _acts, judiciary: _court, pledges: _pledges, ...rest } = campaign;
        const { platform: _platform, staff: _staff, ...founding } = campaign.founding;
        const written = createSave({ ...rest, founding }).campaign;
        expect(written.foundingDate).toEqual(campaign.calendar);
        expect(written.issuedActs).toEqual({});
        expect(written.judiciary).toEqual({ cases: [] });
        expect(written.pledges).toEqual([]);
        expect(written.founding.platform).toEqual([]);
        expect(written.founding.staff).toEqual({});
        expect(written.vicePresident).toBeUndefined();
    });
    // The stamp says the foreign cast was drawn against the leader table. A save
    // from before the table was drawn without it, and filling the stamp in on
    // load would let every screen claim its leaders were modeled on real ones.
    it("stamps a new founding with the leader table, and never stamps a save that lacks it", () => {
        const campaign = sealFounding(makeCampaignSeed("save-leader-table"), worldDataset, foundingChoices("save-leader-table"));
        expect(campaign.founding.leaderTable).toBe(LEADER_TABLE_AS_OF);
        const { leaderTable: _stamp, ...founding } = campaign.founding;
        const loaded = loadSave(JSON.parse(JSON.stringify(createSave({ ...campaign, founding }))));
        expect(loaded.founding.leaderTable).toBeUndefined();
        expect(loadSave(JSON.parse(JSON.stringify(createSave(campaign)))).founding.leaderTable).toBe(LEADER_TABLE_AS_OF);
    });
    it("refuses versions this build cannot read", () => {
        expect(() => loadSave({ schemaVersion: 1, campaign: buildCampaign() })).toThrow(/no migration path/);
        expect(() => loadSave({ schemaVersion: 47, campaign: buildCampaign() })).toThrow(/no migration path/);
        expect(() => loadSave({ schemaVersion: MIN_READABLE_SCHEMA_VERSION - 1, campaign: buildCampaign() })).toThrow(/no migration path/);
        expect(() => loadSave({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, campaign: buildCampaign() })).toThrow(/no migration path/);
    });
    it("keeps the background mark on an entry that carries one, and adds none to an entry without", () => {
        const base = buildCampaign();
        const marked = { turn: 2, actor: "world", description: "The week's apportionment is released.", background: true };
        const plain = { turn: 2, actor: "player", description: "The President signs the order." };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave({ ...base, ledger: [...base.ledger, marked, plain] }))));
        expect(restored.ledger.at(-2)).toEqual(marked);
        expect(restored.ledger.at(-1)).toEqual(plain);
        expect("background" in restored.ledger.at(-1)).toBe(false);
    });
    it("keeps a story's filing date, and leaves a story filed before dates were kept undated", () => {
        const base = buildCampaign();
        const undated = { turn: 1, kind: "drift", visibility: "public", headline: "Filed before the day was kept." };
        const dated = { turn: 2, kind: "press", visibility: "public", headline: "Filed on a day.", date: { year: 2029, month: 1, day: 30 } };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave({ ...base, feed: [undated, dated] }))));
        expect(restored.feed).toEqual([undated, dated]);
        expect("date" in restored.feed[0]).toBe(false);
    });
    it("opens the economy's three records on a v51 save that has none, on the country it holds", () => {
        const founded = sealFounding(makeCampaignSeed("save-v51-economy"), worldDataset, foundingChoices("save-v51-economy"));
        expect(founded.macro).toBeDefined();
        // A v51 save carries the United States' debt gross, so the fixture does
        // too, and loadSave is what puts it back on the founding's public-debt terms.
        const us = founded.nations[founded.founding.nation];
        const grossDebtEra = {
            ...founded,
            nations: { ...founded.nations, [us.base.id]: { ...us, stats: { ...us.stats, economy: { ...us.stats.economy, debt: 32_998_616 } } } },
        };
        const { macro: _macro, books: _books, debtLimit: _limit, ...v51 } = grossDebtEra;
        const loaded = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 51, campaign: v51 })));
        expect(loaded.macro).toEqual(founded.macro);
        expect(loaded.books).toEqual(founded.books);
        expect(loaded.debtLimit).toEqual(founded.debtLimit);
    });
    // Every v51 save kept the United States' debt gross, the figure the dataset
    // carried before debt held by the public replaced it. Opened unconverted it
    // reads the country 19 points more indebted than it is: a 1.20 ratio and
    // interest near a quarter of revenue, against 1.01 and the low twenties.
    // The expected figures are the published ones, not the loader's constants.
    it("reads a v51 save's debt ratio and interest burden on debt held by the public, not the gross figure it was written with", () => {
        const founded = sealFounding(makeCampaignSeed("save-v51-debt-rebase"), worldDataset, foundingChoices("save-v51-debt-rebase"));
        const us = founded.nations[founded.founding.nation];
        const grossDebtEra = {
            ...founded,
            nations: { ...founded.nations, [us.base.id]: { ...us, stats: { ...us.stats, economy: { ...us.stats.economy, debt: 32_998_616 } } } },
        };
        const { macro: _macro, books: _books, debtLimit: _limit, ...v51 } = grossDebtEra;
        const loaded = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 51, campaign: v51 })));
        const loadedUs = loaded.nations[us.base.id];
        expect(debtToGdp(loadedUs.stats)).toBeCloseTo(1.01, 2);
        const statement = selectFiscalStatement(loaded);
        expect(statement.outlay.debtService / statement.revenueTotal).toBeLessThan(0.23);
    });
    it("opens the books on the rating a v51 save holds now, not the one it was founded on", () => {
        const founded = sealFounding(makeCampaignSeed("save-v51-downgraded"), worldDataset, foundingChoices("save-v51-downgraded"));
        const us = founded.nations[founded.founding.nation];
        const { macro: _macro, books: _books, debtLimit: _limit, ...v51 } = {
            ...founded,
            nations: { ...founded.nations, [us.base.id]: { ...us, stats: { ...us.stats, economy: { ...us.stats.economy, sovereignRating: "BBB" } } } },
        };
        const loaded = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 51, campaign: v51 })));
        expect(us.base.stats.economy.sovereignRating).toBe("AA");
        // The published score, held inside the letter the save carries: the top of BBB.
        expect(notchName(loaded.books[us.base.id].rating.score)).toBe("BBB+");
        // The Treasury's own average rate, with the spread a BBB+ issuer pays over a top-rated one.
        expect(loaded.books[us.base.id].rates.effective).toBeCloseTo(US_EFFECTIVE_RATE_OPEN + ratingSpread(14), 9);
    });
    it("keeps the books' trail through a round trip, and reads a save without one as no trail kept yet", () => {
        const founded = sealFounding(makeCampaignSeed("save-books-trail"), worldDataset, foundingChoices("save-books-trail"));
        const us = founded.founding.nation;
        const opened = founded.books[us];
        expect("trail" in opened).toBe(false);
        const untrailed = loadSave(JSON.parse(JSON.stringify(createSave(founded))));
        expect(untrailed.books).toEqual(founded.books);
        expect("trail" in untrailed.books[us]).toBe(false);
        const trail = {
            readings: [
                { turn: founded.turn, market: 0.0431, debtToGdp: 1.012 },
                { turn: founded.turn + 1, market: 0.0433, debtToGdp: 1.013 },
            ],
            openingInterestShare: 0.204,
        };
        const trailed = { ...founded, books: { ...founded.books, [us]: { ...opened, trail } } };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(trailed))));
        expect(restored.books[us].trail).toEqual(trail);
        expect(restored).toEqual(trailed);
    });
    // The pressure regime was a stored composite nothing read, and it was deleted
    // rather than carried. A save that still has the key must load without it and
    // write back without it, because a key no type describes and no writer
    // maintains is a shape that goes stale in the file while looking current.
    it("drops a stored pressure regime on load, and round-trips without it", () => {
        const campaign = buildCampaign();
        const carried = {
            ...campaign,
            regime: {
                level: "strained",
                score: 0.42,
                scoreHistory: [0.1, 0.42],
                enteredTurn: 1,
                peak: "strained",
                drivers: [{ kind: "pressureLevel", reason: "the removal count is climbing", weight: 0.4 }],
                relief: { active: false, pressedRun: 2, granted: 0 },
            },
        };
        const loaded = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 52, campaign: carried })));
        expect("regime" in loaded).toBe(false);
        expect(loaded).toEqual(normalizeCampaign(campaign));
        const again = loadSave(JSON.parse(JSON.stringify(createSave(loaded))));
        expect("regime" in again).toBe(false);
        expect(again).toEqual(normalizeCampaign(campaign));
    });
    // One test per stored field this version adds, in the two states each can be
    // in: filled, and absent on a save written before it existed. Absence is the
    // correct reading of an old save for every one of them except the two series,
    // which read as empty because a reader of a series is asking for a series.
    it("round-trips every field this version adds, and reads an older save's absence as absence", () => {
        const base = buildCampaign();
        const filled = {
            ...base,
            economyHistory: [{ turn: 1, growth: 0.021, inflation: 0.026, unemployment: 0.041, costOfLiving: 0.03 }],
            actings: { "role-treasury-minister": person.id },
            cabinetAgenda: {
                proposals: [
                    { id: "proposal:1", role: "role-foreign-minister", person: person.id, turn: 3, summary: "Reopen the channel." },
                ],
                offers: [{ id: "offer:1", role: "role-foreign-minister", person: person.id, turn: 4, reason: "He will not defend it." }],
                lastProposalTurn: 3,
            },
            feedDigest: [{ turn: 2, region: "region-europe", count: 6, kinds: ["npc-action", "drift"] }],
            congress: {
                ...base.congress,
                seatingOn: { house: base.congress.chambers.house, senate: base.congress.chambers.senate, seatsTurn: 12 },
            },
        };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(filled))));
        expect(restored.economyHistory).toEqual(filled.economyHistory);
        expect(restored.actings).toEqual(filled.actings);
        expect(restored.cabinetAgenda).toEqual(filled.cabinetAgenda);
        expect(restored.feedDigest).toEqual(filled.feedDigest);
        expect(restored.congress.seatingOn).toEqual(filled.congress.seatingOn);
        const { economyHistory: _series, actings: _actings, cabinetAgenda: _agenda, feedDigest: _digest, ...older } = base;
        const opened = loadSave(JSON.parse(JSON.stringify({ schemaVersion: 52, campaign: older })));
        expect(opened.actings).toBeUndefined();
        expect(opened.cabinetAgenda).toBeUndefined();
        // The two series read as empty rather than absent.
        expect(opened.economyHistory).toEqual([]);
        expect(opened.feedDigest).toEqual([]);
    });
    // A minister's proposal can carry the act taking it would perform. The field
    // is optional, so a save written before ministers could bring one opens with
    // no act on any proposal and needs no new schema version.
    it("round-trips the act a minister's proposal carries, of every kind, and reads its absence as absence", () => {
        const base = buildCampaign();
        const proposal = { role: "role-defense-minister", person: person.id, turn: 3, summary: "Raise the posture." };
        const filled = {
            ...base,
            cabinetAgenda: {
                proposals: [
                    { ...proposal, id: "proposal:order", act: { kind: "order", order: "order-border-controls" } },
                    { ...proposal, id: "proposal:posture", act: { kind: "posture", command: "CCMD-INDOPACOM", posture: "heightened" } },
                    { ...proposal, id: "proposal:engagement", act: { kind: "engagement", target: nationB.id, engagement: "summit" } },
                    { ...proposal, id: "proposal:plain" },
                ],
                offers: [],
            },
        };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(filled))));
        expect(restored.cabinetAgenda).toEqual(filled.cabinetAgenda);
        expect(restored.cabinetAgenda?.proposals.map((entry) => entry.act?.kind)).toEqual(["order", "posture", "engagement", undefined]);
        expect("act" in restored.cabinetAgenda.proposals[3]).toBe(false);
    });
    it("refuses a malformed save rather than guessing its shape", () => {
        expect(() => loadSave({ notASave: true })).toThrow(/malformed/);
        expect(() => loadSave(null)).toThrow(/malformed/);
        expect(() => loadSave("not even an object")).toThrow(/malformed/);
    });
});
describe("the rules layer survives a save, and a legacy flag becomes two rules", () => {
    it("reads a campaign marked before the layer existed as having both rules set", () => {
        const legacy = {
            ...buildCampaign(),
            godMode: { enabled: true, enabledTurn: 1, actions: 1, branchPoints: [] },
        };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(legacy))));
        expect(ruleValue(restored, "information.omniscient")).toBe(true);
        expect(ruleValue(restored, "removal.immune")).toBe(true);
        expect(restored.rules?.log).toHaveLength(2);
        expect(campaignStatus(restored).status).toBe("sandbox");
        // No suspension: whether this device has paid is asked after the load.
        expect(restored.rules?.suspended).toBeUndefined();
    });
    it("keeps a filled rules block, its log and its suspension, byte for byte", () => {
        const suspended = applyRules(applyRules(buildCampaign(), {
            kind: "rules",
            change: { kind: "set", rule: "removal.immune", value: true, date: { year: 2029, month: 3, day: 4 } },
        }), { kind: "rules", change: { kind: "suspend", since: { year: 2029, month: 4, day: 1 }, reason: "no entitlement on this device" } });
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(suspended))));
        expect(restored.rules).toEqual(suspended.rules);
        expect(ruleValue(restored, "removal.immune")).toBe(false);
    });
    it("gives a campaign that has changed no rule no rules block at all", () => {
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(buildCampaign()))));
        expect(restored.rules).toBeUndefined();
    });
});
describe("a decision's reason survives a save, and an absent one stays absent", () => {
    const decision = stampOf(weigh("governor-consent", [{ key: "party-match", source: "interest", value: 0.7 }], {
        threshold: 0.5,
        noiseBound: 0.05,
        noise: 0.01,
    }), "USA", "CO", "public");
    it("round-trips the stamp on the ledger entry that carries it", () => {
        const base = buildCampaign();
        const state = apply(base, {
            source: "simulate",
            actor: "world",
            turn: base.turn,
            narration: { summary: "The governor consents." },
            provenance: { origin: "world", decision },
            effects: [{ kind: "metric", deltas: { standing: 0.01 } }],
        });
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(state))));
        expect(restored.ledger.at(-1)?.causal?.decision).toEqual(decision);
    });
    it("writes no empty stamp for a packet that decided nothing", () => {
        const base = buildCampaign();
        const state = apply(base, {
            source: "action",
            actor: "player",
            turn: base.turn,
            narration: { summary: "An ordinary week." },
            effects: [{ kind: "metric", deltas: { standing: 0.01 } }],
        });
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(state))));
        expect("decision" in (restored.ledger.at(-1)?.causal ?? {})).toBe(false);
    });
});
