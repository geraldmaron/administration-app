import { describe, expect, it } from "vitest";
import { defaultFlagDesign, worldDataset } from "@admin/world";
import { makeCampaignSeed } from "./rng.js";
import { draftCabinetCandidates, generateFoundingPool, sealFounding } from "./founding.js";
import { defaultLeaderDraft } from "./leader.js";
import { HILL_POSTS, chamberDisposition, leadershipDrift, figureTarget, majorityCaucus, seatLeadership, selectHill, selectHillByChamber, selectHillMember, } from "./hill.js";
import { majorityOf, openingCongress } from "./congress.js";
import { countVote } from "./congress-votes.js";
import { legislativeAct } from "./legislative-acts.js";
import { partyForCaucus, usTicket } from "./party.js";
import { DEFAULT_ADMINISTRATION_PARTY } from "./party.js";
import { CURRENT_SCHEMA_VERSION, createSave, loadSave } from "./save.js";
import { figureRapport, rapportOf, withTie } from "./ties.js";
const seed = makeCampaignSeed("hill-seed");
/** The same campaign's people, with every leader's rapport written at one value. */
function everyLeaderAt(campaign, rapport) {
    return campaign.congress.leadership.reduce((people, figure) => withTie(people, { kind: "tie", person: figure.person, cause: "Set for the test.", rapport: { set: rapport } }), campaign.people);
}
/** Where each tie effect sets a person's rapport, by person. */
function rapportSets(effects) {
    return new Map(effects.map((effect) => [effect.person, effect.rapport && "set" in effect.rapport ? effect.rapport.set : undefined]));
}
// A real founded campaign rather than a fixture: the whole claim under test is
// that the Hill is staffed out of the cast the founding actually deals.
function foundedCampaign() {
    const pool = generateFoundingPool(seed, worldDataset);
    const nation = worldDataset.nations.find((n) => n.playable);
    const charter = worldDataset.charters[0];
    const cradle = worldDataset.cradles.find((c) => c.startingNeighbors.length > 0);
    const cabinet = Object.fromEntries(Object.entries(draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0].id]));
    const choices = {
        nationId: nation.id,
        nationName: nation.identity.name,
        name: "Test President",
        title: "President",
        charterId: charter.id,
        cradleId: cradle.id,
        flag: defaultFlagDesign,
        compactIds: [],
        cabinet,
        leader: { ...defaultLeaderDraft(), name: "Test President" },
    };
    return sealFounding(seed, worldDataset, choices);
}
describe("the people on the Hill", () => {
    it("seats every post with a real person from the campaign's own cast", () => {
        const campaign = foundedCampaign();
        const hill = selectHill(campaign);
        expect(hill).toHaveLength(HILL_POSTS.length);
        for (const member of hill) {
            expect(member.person).toBeDefined();
            expect(member.person.nationality).toBe(campaign.founding.nation);
            // The form of address a sentence uses, "Speaker James", never the office's full name before the surname.
            expect(member.name.endsWith(member.person.name.split(" ").at(-1))).toBe(true);
            expect(member.name).not.toContain(" of the ");
        }
    });
    it("seats each post with a different person", () => {
        const campaign = foundedCampaign();
        const held = campaign.congress.leadership.map((figure) => figure.person);
        expect(new Set(held).size).toBe(held.length);
    });
    it("records the seat on the person, so the cast knows who is on the Hill", () => {
        const campaign = foundedCampaign();
        for (const figure of campaign.congress.leadership) {
            expect(campaign.people[figure.person]?.currentRole).toMatch(/^role-(congressional-leader|committee-chair)$/);
        }
    });
    it("gives the majority's posts to whichever caucus actually holds the chamber", () => {
        const campaign = foundedCampaign();
        for (const member of selectHill(campaign)) {
            const majority = majorityCaucus(campaign.congress.chambers[member.post.chamber]);
            const expected = member.post.id.includes("minority") ? (majority === "administration" ? "opposition" : "administration") : majority;
            expect(member.figure.caucus).toBe(expected);
        }
    });
    it("counts the chamber exactly as the room when nobody is seated", () => {
        const campaign = foundedCampaign();
        const empty = { ...campaign.congress, leadership: [] };
        expect(chamberDisposition(empty, "house", undefined, campaign.people)).toBe(empty.disposition);
        expect(countVote(empty, "house", 0, majorityOf(435)).yeas).toBe(countVote({ ...empty, leadership: [] }, "house", 0, majorityOf(435)).yeas);
    });
    it("makes the whip count a function of the people, not only the seat totals", () => {
        const campaign = foundedCampaign();
        const warm = everyLeaderAt(campaign, 1);
        const cold = everyLeaderAt(campaign, 0);
        const congress = campaign.congress;
        const required = majorityOf(435);
        expect(countVote(congress, "house", 0, required, undefined, undefined, "neutral", warm).yeas).toBeGreaterThan(countVote(congress, "house", 0, required, undefined, undefined, "neutral", cold).yeas);
        expect(chamberDisposition(congress, "house", undefined, warm)).toBeGreaterThan(chamberDisposition(congress, "house", undefined, cold));
    });
    it("settles a member back toward their own nature rather than holding a bought reading", () => {
        const campaign = foundedCampaign();
        const bought = everyLeaderAt(campaign, 1);
        const after = rapportSets(leadershipDrift(campaign.congress.leadership, campaign.congress.disposition, bought));
        expect(after.size).toBe(campaign.congress.leadership.length);
        for (const set of after.values())
            expect(set).toBeLessThan(1);
    });
    it("keeps an incumbent, and the relationship built with them, when the caucus still fits", () => {
        const campaign = foundedCampaign();
        const worked = everyLeaderAt(campaign, 0.9);
        const reseated = seatLeadership(campaign.congress, worked, campaign.founding.nation, campaign.turn + 1);
        expect(reseated.ties).toEqual([]);
        for (const figure of reseated.leadership) {
            const before = campaign.congress.leadership.find((held) => held.post === figure.post);
            expect(figure.person).toBe(before.person);
            expect(figureRapport(worked, figure)).toBe(0.9);
        }
    });
    it("replaces the majority's posts when a chamber changes hands", () => {
        const campaign = foundedCampaign();
        const house = campaign.congress.chambers.house;
        const flipped = {
            ...campaign.congress,
            chambers: {
                ...campaign.congress.chambers,
                house: { ...house, administration: house.opposition, opposition: house.administration },
            },
        };
        const before = selectHillMember(campaign, "post-house-speaker");
        const reseated = seatLeadership(flipped, campaign.people, campaign.founding.nation, campaign.turn + 1);
        const speaker = reseated.leadership.find((figure) => figure.post === "post-house-speaker");
        expect(speaker.caucus).not.toBe(before.figure.caucus);
        expect(speaker.person).not.toBe(before.figure.person);
        // The newcomer opens where their caucus stands, written as a tie with its cause.
        const opened = reseated.ties.find((effect) => effect.person === speaker.person);
        expect(opened.cause).toMatch(/Speaker/);
        const platform = usTicket(partyForCaucus(speaker.caucus, flipped.caucusAnchor)).beliefs;
        const person = campaign.people[speaker.person].base;
        expect(opened.rapport).toEqual({ set: figureTarget(flipped.disposition, speaker, person, platform, undefined, flipped) });
    });
    it("seats nobody rather than throwing when the pool has no one eligible", () => {
        const nation = worldDataset.nations.find((n) => n.playable);
        const congress = openingCongress(nation, 1, DEFAULT_ADMINISTRATION_PARTY, DEFAULT_ADMINISTRATION_PARTY);
        expect(seatLeadership(congress, {}, nation.id, 1)).toEqual({ leadership: [], ties: [] });
    });
    it("survives a save round-trip with the leadership intact", () => {
        const campaign = foundedCampaign();
        const save = createSave(campaign);
        expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        const loaded = loadSave(JSON.parse(JSON.stringify(save)));
        expect(loaded.congress.leadership).toEqual(campaign.congress.leadership);
        for (const figure of campaign.congress.leadership) {
            expect(rapportOf(loaded.people, figure.person)).toBe(figureRapport(campaign.people, figure));
        }
    });
    it("seats every post from the pool at founding, so no save needs one filled in later", () => {
        const campaign = foundedCampaign();
        expect(campaign.congress.leadership).toHaveLength(HILL_POSTS.length);
        expect(campaign.congress.lobbying).toEqual([]);
    });
    it("splits the members by the chamber they can actually carry", () => {
        const campaign = foundedCampaign();
        const house = selectHillByChamber(campaign, "house");
        const senate = selectHillByChamber(campaign, "senate");
        expect(house.length + senate.length).toBe(HILL_POSTS.length);
        for (const member of senate)
            expect(member.post.chamber).toBe("senate");
    });
});
describe("POL-4: the measure on the floor reaches the leadership", () => {
    const signatureOf = (id) => legislativeAct(id).domestic;
    it("moves the two caucuses' leaders in opposite directions on the same bill", () => {
        const campaign = foundedCampaign();
        const room = campaign.congress.disposition;
        const blind = rapportSets(leadershipDrift(campaign.congress.leadership, room, campaign.people, campaign.congress));
        const reading = rapportSets(leadershipDrift(campaign.congress.leadership, room, campaign.people, campaign.congress, signatureOf("act-tax-relief-and-growth")));
        const moved = campaign.congress.leadership.filter((figure) => (reading.get(figure.person) ?? figureRapport(campaign.people, figure)) !==
            (blind.get(figure.person) ?? figureRapport(campaign.people, figure)));
        expect(moved.length, "no leader read the bill at all").toBeGreaterThan(0);
        // A rate cut: one caucus's platform is for it and the other's is against it,
        // so the term the two sides' leaders read points opposite ways. Read off the
        // target rather than off one week of drift, which is capped at a step.
        const signature = signatureOf("act-tax-relief-and-growth");
        const pull = (caucus) => {
            const figure = campaign.congress.leadership.find((held) => held.caucus === caucus);
            const person = campaign.people[figure.person]?.base;
            const beliefs = usTicket(partyForCaucus(caucus, campaign.congress.caucusAnchor)).beliefs;
            return (figureTarget(room, figure, person, beliefs, signature, campaign.congress) -
                figureTarget(room, figure, person, undefined, undefined, campaign.congress));
        };
        expect(Math.sign(pull("administration"))).toBe(-Math.sign(pull("opposition")));
        expect(pull("administration")).not.toBe(0);
    });
    it("leaves the drift where it was when nothing on the floor says anything", () => {
        const campaign = foundedCampaign();
        const room = campaign.congress.disposition;
        expect(leadershipDrift(campaign.congress.leadership, room, campaign.people, campaign.congress, undefined)).toEqual(leadershipDrift(campaign.congress.leadership, room, campaign.people, campaign.congress));
    });
    it("reads the same signature when the posts are seated", () => {
        const campaign = foundedCampaign();
        const empty = { ...campaign.congress, leadership: [] };
        const nation = campaign.founding.nation;
        const blind = seatLeadership(empty, campaign.people, nation, campaign.turn);
        const reading = seatLeadership(empty, campaign.people, nation, campaign.turn, signatureOf("act-tax-relief-and-growth"));
        expect(reading.leadership.map((figure) => figure.person)).toEqual(blind.leadership.map((figure) => figure.person));
        const byPerson = rapportSets(blind.ties);
        expect(reading.ties.some((effect) => "set" in effect.rapport && effect.rapport.set !== byPerson.get(effect.person))).toBe(true);
    });
});
