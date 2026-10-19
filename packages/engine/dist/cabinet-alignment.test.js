import { describe, expect, it } from "vitest";
import { Person } from "@admin/world";
import { buildCampaign, person as base } from "./__fixtures__/campaign.js";
import { GAP_MEDIAN, GAP_WIDE, RECORD_MEMORY_TURNS, RIVAL_LEAK_SYSTEM, selectAimedLeaks, selectCabinetTies, selectSecretaryPairs, selectSecretaryTies, tieReading, } from "./cabinet-alignment.js";
import { balanceSeeds, foundedForBalance } from "./balance-harness.js";
import { ideologyGap } from "./person-disposition.js";
const FOREIGN = "role-foreign-minister";
const DEFENSE = "role-defense-minister";
function personWith(id, overrides) {
    return Person.parse({ ...base, id, name: `Minister ${id}`, ...overrides });
}
const CENTRIST = { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 };
function seatBoth(a, b) {
    const campaign = buildCampaign();
    return {
        ...campaign,
        people: {
            ...campaign.people,
            [a.id]: { base: a, alive: true, currentRole: FOREIGN },
            [b.id]: { base: b, alive: true, currentRole: DEFENSE },
        },
        player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [FOREIGN]: a.id, [DEFENSE]: b.id } },
    };
}
function standingBetween(campaign, person, other) {
    return selectCabinetTies(campaign, person).find((tie) => tie.a === other || tie.b === other).standing;
}
describe("who can work with whom", () => {
    it("reads two ministers who believe the same things as allies", () => {
        const a = personWith("PER-A", { ideology: CENTRIST, traits: ["pragmatic"] });
        const b = personWith("PER-B", { ideology: CENTRIST, traits: ["pragmatic"] });
        const campaign = seatBoth(a, b);
        expect(tieReading(standingBetween(campaign, a.id, b.id))).toBe("allied");
    });
    it("reads two ministers at opposite ends of every axis, with clashing temperaments, as opposed", () => {
        const a = personWith("PER-A", {
            ideology: { economicLeftRight: -1, authLibertarian: -1, nationalistGlobalist: -1 },
            traits: ["hawkish"],
            ambition: 0.2,
        });
        const b = personWith("PER-B", {
            ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 },
            traits: ["dovish"],
            ambition: 0.2,
        });
        const campaign = seatBoth(a, b);
        expect(tieReading(standingBetween(campaign, a.id, b.id))).toBe("opposed");
    });
    // The point of the trait term: two people can agree about the shape of the
    // world and still be unable to sit in the same room about what to do in it.
    it("puts a hawk and a dove at odds even where they agree ideologically", () => {
        const hawk = personWith("PER-A", { ideology: CENTRIST, traits: ["hawkish"] });
        const dove = personWith("PER-B", { ideology: CENTRIST, traits: ["dovish"] });
        const agreeable = personWith("PER-C", { ideology: CENTRIST, traits: [] });
        const split = seatBoth(hawk, dove);
        const plain = seatBoth(hawk, agreeable);
        expect(standingBetween(split, hawk.id, dove.id)).toBeLessThan(standingBetween(plain, hawk.id, agreeable.id));
    });
    // A minister who has started building a following of their own has stopped
    // being a colleague, whatever they happen to believe.
    it("breaks a tie with a minister who has become a rival faction", () => {
        const a = personWith("PER-A", { ideology: CENTRIST, traits: ["pragmatic"] });
        const b = personWith("PER-B", { ideology: CENTRIST, traits: ["pragmatic"] });
        const campaign = seatBoth(a, b);
        const split = {
            ...campaign,
            people: {
                ...campaign.people,
                [b.id]: { ...campaign.people[b.id], affiliation: "role-defense-minister-rival" },
            },
        };
        expect(standingBetween(split, a.id, b.id)).toBeLessThan(standingBetween(campaign, a.id, b.id));
    });
    it("has no tie to a minister who is out of public life", () => {
        const a = personWith("PER-A", { ideology: CENTRIST, traits: [] });
        const b = personWith("PER-B", { ideology: CENTRIST, traits: [] });
        const campaign = seatBoth(a, b);
        const gone = {
            ...campaign,
            people: { ...campaign.people, [b.id]: { ...campaign.people[b.id], alive: false } },
        };
        expect(selectCabinetTies(gone, a.id).some((tie) => tie.a === b.id || tie.b === b.id)).toBe(false);
    });
    it("says nothing about someone who holds no chair", () => {
        const campaign = buildCampaign();
        expect(selectCabinetTies(campaign, "PER-404")).toEqual([]);
    });
    // Strongest feeling first: the room's frictions are what a player scanning a
    // dossier is looking for, not an alphabetical list of colleagues.
    it("leads with the tie the minister feels most strongly", () => {
        const subject = personWith("PER-A", { ideology: CENTRIST, traits: ["hawkish"] });
        const opposite = personWith("PER-B", {
            ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 },
            traits: ["dovish"],
        });
        const campaign = seatBoth(subject, opposite);
        const ties = selectCabinetTies(campaign, subject.id);
        expect(Math.abs(ties[0].standing)).toBeGreaterThanOrEqual(Math.abs(ties[ties.length - 1].standing));
    });
});
/** A decision the President took with both chairs on record, at `turn`. */
function decision(turn, a, b, [left, right]) {
    const room = [
        { role: FOREIGN, person: a.id, stance: left },
        { role: DEFENSE, person: b.id, stance: right },
    ];
    return { turn, actor: "player", description: "The President decides.", counsel: { ...room[0], room } };
}
function withRecord(campaign, turn, entries) {
    return { ...campaign, turn, ledger: [...campaign.ledger, ...entries] };
}
function recordOf(campaign, a, b) {
    return selectCabinetTies(campaign, a).find((tie) => tie.b === b).record;
}
describe("what two Secretaries have said in the room", () => {
    const a = personWith("PER-A", { ideology: CENTRIST, traits: [] });
    const b = personWith("PER-B", { ideology: CENTRIST, traits: [] });
    const seated = seatBoth(a, b);
    const split = (count, turn = 30) => Array.from({ length: count }, () => decision(turn, a, b, ["for", "against"]));
    const agreed = (count, turn = 30) => Array.from({ length: count }, () => decision(turn, a, b, ["against", "against"]));
    it("lowers a tie by the share of decisions they split on, and raises it by the share they agreed on", () => {
        const base = standingBetween(withRecord(seated, 30, []), a.id, b.id);
        const apart = withRecord(seated, 30, split(6));
        const together = withRecord(seated, 30, agreed(6));
        expect(recordOf(apart, a.id, b.id)).toEqual({ agreed: 0, opposed: 6, term: -0.3 });
        expect(recordOf(together, a.id, b.id)).toEqual({ agreed: 6, opposed: 0, term: 0.3 });
        expect(standingBetween(apart, a.id, b.id)).toBeLessThan(base);
        expect(standingBetween(together, a.id, b.id)).toBeGreaterThanOrEqual(base);
    });
    it("reads a short record as a couple of arguments rather than a feud", () => {
        expect(recordOf(withRecord(seated, 30, split(2)), a.id, b.id).term).toBe(-0.15);
        expect(recordOf(withRecord(seated, 30, [...split(3), ...agreed(1)]), a.id, b.id).term).toBe(-0.15);
    });
    it("counts a hedge as neither side, and a decision only one of them spoke to as nothing", () => {
        const hedged = Array.from({ length: 5 }, () => decision(30, a, b, ["for", "wary"]));
        expect(recordOf(withRecord(seated, 30, hedged), a.id, b.id)).toEqual({ agreed: 0, opposed: 0, term: 0 });
    });
    it("forgets what was said more than half a year ago", () => {
        const old = withRecord(seated, 30 + RECORD_MEMORY_TURNS + 1, split(6, 30));
        expect(recordOf(old, a.id, b.id).term).toBe(0);
        const recent = withRecord(seated, 30 + RECORD_MEMORY_TURNS, split(6, 30));
        expect(recordOf(recent, a.id, b.id).term).toBe(-0.3);
    });
    it("reads the record the ledger holds now, not the one it held when last asked", () => {
        const first = withRecord(seated, 30, split(2));
        expect(recordOf(first, a.id, b.id).opposed).toBe(2);
        const later = withRecord(first, 30, split(2));
        expect(recordOf(later, a.id, b.id).opposed).toBe(4);
        expect(recordOf(first, a.id, b.id).opposed).toBe(2);
    });
    it("can take a strained pair to opposed when they keep splitting", () => {
        const hawk = personWith("PER-A", { ideology: { economicLeftRight: 0.21, authLibertarian: 0, nationalistGlobalist: 0 }, traits: ["hawkish"] });
        const dove = personWith("PER-B", { ideology: CENTRIST, traits: ["dovish"] });
        const pair = seatBoth(hawk, dove);
        const before = tieReading(standingBetween(pair, hawk.id, dove.id));
        const after = withRecord(pair, 30, Array.from({ length: 6 }, () => decision(30, hawk, dove, ["for", "against"])));
        expect(before).toBe("strained");
        expect(tieReading(standingBetween(after, hawk.id, dove.id))).toBe("opposed");
    });
});
describe("the ties the rules act on", () => {
    const a = personWith("PER-A", { ideology: CENTRIST, traits: [] });
    const b = personWith("PER-B", { ideology: CENTRIST, traits: [] });
    const campaign = seatBoth(a, b);
    const president = campaign.player.cabinet[campaign.founding.leadRole];
    it("leave the President's chair out, where the chart's ties keep it", () => {
        expect(selectCabinetTies(campaign, a.id).some((tie) => tie.b === president)).toBe(true);
        expect(selectSecretaryTies(campaign, a.id).some((tie) => tie.b === president)).toBe(false);
        expect(selectSecretaryTies(campaign, a.id).map((tie) => tie.b)).toEqual([b.id]);
        expect(selectSecretaryTies(campaign, president)).toEqual([]);
    });
    it("lists every pair of Secretaries once", () => {
        const pairs = selectSecretaryPairs(campaign);
        expect(pairs).toHaveLength(1);
        expect([pairs[0].a, pairs[0].b].sort()).toEqual([a.id, b.id].sort());
    });
    it("finds the leaks aimed between colleagues over the last half year, from either side", () => {
        const aimed = {
            turn: 30,
            actor: "world",
            description: "A leak about a colleague.",
            causal: {
                origin: "world",
                eventId: "ev-aimed",
                createdDate: { year: 2029, month: 1, day: 1 },
                systems: ["cabinet", "leak", RIVAL_LEAK_SYSTEM],
                entities: [a.id, b.id],
            },
        };
        const plain = { ...aimed, causal: { ...aimed.causal, eventId: "ev-plain", systems: ["cabinet", "leak"], entities: [a.id] } };
        const now = withRecord(campaign, 31, [aimed, plain]);
        expect(selectAimedLeaks(now, a.id)).toEqual([{ turn: 30, leaker: a.id, target: b.id }]);
        expect(selectAimedLeaks(now, b.id)).toHaveLength(1);
        expect(selectAimedLeaks(withRecord(campaign, 30 + RECORD_MEMORY_TURNS + 1, [aimed]), b.id)).toEqual([]);
    });
});
describe("what a tie is made of", () => {
    const round4 = (value) => Math.round(value * 10000) / 10000;
    // The normalizer is a measurement, so it is pinned against the measurement:
    // every Secretary pair the balance seeds found for all three parties.
    it("reads ideology against the spread of founded cabinets, recomputed over the balance seeds", () => {
        const gaps = ["democrat", "republican", "independent"].flatMap((party) => balanceSeeds(12).flatMap((seed) => {
            const { campaign } = foundedForBalance(seed, party);
            const people = Object.entries(campaign.player.cabinet)
                .filter(([role, id]) => role !== campaign.founding.leadRole && campaign.people[id]?.alive)
                .map(([, id]) => campaign.people[id].base);
            return people.flatMap((a, i) => people.slice(i + 1).map((b) => ideologyGap(a.ideology, b.ideology)));
        }));
        const sorted = [...gaps].sort((x, y) => x - y);
        const at = (share) => sorted[Math.floor(share * (sorted.length - 1))];
        expect(round4(at(0.5))).toBe(GAP_MEDIAN);
        expect(round4(at(0.75))).toBe(GAP_WIDE);
    }, 60_000);
    it("adds its readings up to the standing", () => {
        const a = personWith("PER-A", { ideology: CENTRIST, traits: ["hawkish"] });
        const b = personWith("PER-B", { ideology: { economicLeftRight: 0.4, authLibertarian: 0, nationalistGlobalist: 0 }, traits: ["dovish"] });
        const tie = selectCabinetTies(seatBoth(a, b), a.id).find((entry) => entry.b === b.id);
        const sum = 0.25 + Object.values(tie.terms).reduce((total, value) => total + value, 0);
        expect(tie.standing).toBeCloseTo(Math.max(-1, Math.min(1, sum)), 4);
        expect(tie.terms.ideology).toBeLessThan(0);
        expect(tie.terms.temperament).toBe(-0.35);
    });
    it("caps what ideology alone can do at the edge of opposed", () => {
        const a = personWith("PER-A", { ideology: { economicLeftRight: -1, authLibertarian: -1, nationalistGlobalist: -1 }, traits: [], ambition: 0.2 });
        const b = personWith("PER-B", { ideology: { economicLeftRight: 1, authLibertarian: 1, nationalistGlobalist: 1 }, traits: [], ambition: 0.2 });
        const tie = selectCabinetTies(seatBoth(a, b), a.id).find((entry) => entry.b === b.id);
        expect(tie.terms.ideology).toBe(-0.6);
        expect(tie.terms.ambition).toBe(0);
        expect(tieReading(tie.standing)).toBe("strained");
    });
    it("strains departments that answer for the same crises, and leaves the rest alone", () => {
        const { campaign } = foundedForBalance("cabinet-turf");
        const tie = (from, to) => selectCabinetTies(campaign, campaign.player.cabinet[from]).find((entry) => entry.roleB === to);
        expect(tie("role-foreign-minister", "role-defense-minister").terms.turf).toBe(-0.45);
        expect(tie("role-treasury-minister", "role-commerce-secretary").terms.turf).toBe(-0.3);
        expect(tie("role-education-secretary", "role-veterans-secretary").terms.turf).toBe(0);
    });
    it("sets two bold Secretaries against each other, the bolder the pair the harder, and never the President", () => {
        const bold = (id, ambition) => personWith(id, { ideology: CENTRIST, traits: ["ambitious"], ambition });
        const clash = (ambition) => {
            const a = bold("PER-A", ambition);
            const b = bold("PER-B", ambition);
            return selectCabinetTies(seatBoth(a, b), a.id).find((entry) => entry.b === b.id).terms.ambition;
        };
        expect(clash(0.7)).toBeLessThan(0);
        expect(clash(0.95)).toBeLessThan(clash(0.7));
        const cautious = personWith("PER-B", { ideology: CENTRIST, traits: ["cautious"], ambition: 0.2 });
        const mixed = seatBoth(bold("PER-A", 0.95), cautious);
        expect(selectCabinetTies(mixed, "PER-A").find((entry) => entry.b === cautious.id).terms.ambition).toBe(0);
        const president = mixed.player.cabinet[mixed.founding.leadRole];
        expect(selectCabinetTies(mixed, "PER-A").find((entry) => entry.b === president).terms.ambition).toBe(0);
    });
});
