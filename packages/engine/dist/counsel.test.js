import { describe, expect, it } from "vitest";
import { CHARTER_USA_CONSTITUTION, Person } from "@admin/world";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { cabinetViewsOnReply, counselOnReply, instinctFor, roomCounselOnReply } from "./counsel.js";
import { foundedForBalance } from "./balance-harness.js";
import { INSTRUMENT_COERCION } from "./instruments.js";
import { dispositionOf } from "./person-disposition.js";
import { CLASSES_WITH_SEATED_STANDING, classRoles } from "./stewardship.js";
const FOREIGN_ROLE = "role-foreign-affairs";
const DEFENSE_ROLE = "role-defense";
const TREASURY_ROLE = "role-treasury";
const ALP = "ALP";
function seatMinister(campaign, role, overrides) {
    const minister = Person.parse({ ...person, id: `PER-${role}`, name: `Holder of ${role}`, eligibleRoles: [role], ...overrides });
    return {
        ...campaign,
        people: { ...campaign.people, [minister.id]: { base: minister, alive: true, currentRole: role } },
        player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [role]: minister.id } },
    };
}
function replyWith(successChance) {
    return {
        option: { id: "hard-answer", tone: "coercive", text: "…", commitment: { kind: "instrument", instrument: "military", rung: 3 } },
        available: true,
        cost: {},
        successChance,
        risks: [],
        ripples: [],
        rippleVisibility: "always",
    };
}
const script = { id: "s", counterpart: ALP, subject: "…", opening: [], options: [] };
const hawk = {
    traits: ["hawkish"],
    ideology: { economicLeftRight: 0, authLibertarian: 0.6, nationalistGlobalist: 0.2 },
};
const dove = {
    traits: ["dovish"],
    ideology: { economicLeftRight: 0, authLibertarian: -0.4, nationalistGlobalist: -0.2 },
};
const cautious = {
    traits: ["cautious"],
    ideology: { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 },
};
// Someone who wants very nearly what the strike asks and no more — the only
// honest way to sit in the middle of a scale whose top rung is a military one.
const measured = {
    traits: ["hawkish"],
    ideology: { economicLeftRight: 0, authLibertarian: -0.35, nationalistGlobalist: -0.05 },
};
function counselRoles(room) {
    return room.filter((v) => v.kind === "counsel").map((v) => v.role);
}
function counselStances(room) {
    return room.filter((v) => v.kind === "counsel").map((v) => v.stance);
}
describe("roomCounselOnReply", () => {
    it("keeps a unanimous room to primary and aligned supporters — no manufactured dissent", () => {
        const campaign = seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, hawk);
        const room = roomCounselOnReply(campaign, script, replyWith(0.6));
        expect(room[0]?.kind === "counsel" && room[0].role).toBe(DEFENSE_ROLE);
        expect(room[0]?.kind === "counsel" && room[0].stance).toBe("for");
        expect(counselStances(room)).not.toContain("against");
        expect(counselStances(room).every((stance) => stance === "for")).toBe(true);
    });
    it("surfaces a split room: primary first, then the strongest dissent", () => {
        const campaign = seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, dove);
        const room = roomCounselOnReply(campaign, script, replyWith(0.6));
        expect(room[0]?.kind === "counsel" && room[0].role).toBe(DEFENSE_ROLE);
        expect(room[0]?.kind === "counsel" && room[0].stance).toBe("for");
        expect(room[1]?.kind === "counsel" && room[1].role).toBe(FOREIGN_ROLE);
        expect(room[1]?.kind === "counsel" && room[1].stance).toBe("against");
    });
    it("orders primary before dissent even when another minister would speak first by conviction", () => {
        const campaign = seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, { ...hawk, competence: 0.4 }), FOREIGN_ROLE, { ...dove, competence: 0.95 });
        const room = roomCounselOnReply(campaign, script, replyWith(0.6));
        expect(counselRoles(room)[0]).toBe(DEFENSE_ROLE);
        expect(room[1]?.kind === "counsel" && room[1].role).toBe(FOREIGN_ROLE);
    });
    it("can include a wary middle and another supporter when the room is mixed", () => {
        const campaign = seatMinister(seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, dove), TREASURY_ROLE, measured);
        const room = roomCounselOnReply(campaign, script, replyWith(0.5));
        expect(room[0]?.kind === "counsel" && room[0].role).toBe(DEFENSE_ROLE);
        expect(room[0]?.kind === "counsel" && room[0].stance).toBe("for");
        expect(counselStances(room)).toContain("against");
        expect(counselStances(room)).toContain("wary");
        expect(new Set(counselRoles(room)).size).toBe(counselRoles(room).length);
    });
    it("includes vacant chairs only when fewer than two living ministers can speak", () => {
        const staffed = seatMinister(seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, dove), TREASURY_ROLE, hawk);
        const fullRoom = roomCounselOnReply(staffed, script, replyWith(0.6));
        expect(fullRoom.some((v) => v.kind === "vacant")).toBe(false);
        const defenseHolder = staffed.player.cabinet[DEFENSE_ROLE];
        const treasuryHolder = staffed.player.cabinet[TREASURY_ROLE];
        const thin = {
            ...staffed,
            people: {
                ...staffed.people,
                [defenseHolder]: { ...staffed.people[defenseHolder], alive: false },
                [treasuryHolder]: { ...staffed.people[treasuryHolder], alive: false },
            },
        };
        const sparseRoom = roomCounselOnReply(thin, script, replyWith(0.6));
        expect(sparseRoom[0]?.kind).toBe("vacant");
        expect(sparseRoom[0]?.role).toBe(DEFENSE_ROLE);
        expect(sparseRoom.some((v) => v.kind === "counsel")).toBe(true);
        expect(sparseRoom.filter((v) => v.kind === "vacant").length).toBeGreaterThan(0);
    });
    it("respects the voice limit and never seats the head of state as counsel", () => {
        const campaign = seatMinister(seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, dove), TREASURY_ROLE, cautious);
        const room = roomCounselOnReply(campaign, script, replyWith(0.45), 3);
        const leadRole = campaign.founding.leadRole;
        expect(room.length).toBeLessThanOrEqual(3);
        expect(room.every((v) => v.role !== leadRole)).toBe(true);
    });
});
// The seats a US-shaped charter actually holds, by their dataset ids. The
// relevance table matches by hint rather than by a fixed enum, so a test of it
// has to seat the real ids.
const US_SEATS = [
    "role-foreign-minister",
    "role-treasury-minister",
    "role-defense-minister",
    "role-attorney-general",
    "role-interior-minister",
    "role-commerce-secretary",
    "role-labor-secretary",
    "role-health-secretary",
    "role-education-secretary",
    "role-veterans-secretary",
    "role-homeland-secretary",
    "role-intelligence-director",
    "role-energy-secretary",
    "role-transportation-secretary",
    "role-agriculture-secretary",
];
/** A full cabinet with mixed instincts, so the room has somewhere to disagree from. */
function seatedCabinet() {
    return US_SEATS.reduce((campaign, role, index) => seatMinister(campaign, role, index % 3 === 0 ? hawk : index % 3 === 1 ? dove : cautious), buildCampaign());
}
const spokenAnswer = {
    option: { id: "say-it-plainly", tone: "firm", text: "…", commitment: { kind: "position", cost: { standing: -0.02 }, remembered: "…" } },
    available: true,
    cost: { standing: -0.02 },
    risks: [],
    ripples: [],
    rippleVisibility: "always",
};
describe("the seats a subject belongs to", () => {
    it("seats a chair with standing in the week for every declared class", () => {
        const campaign = seatedCabinet();
        for (const scenarioClass of CLASSES_WITH_SEATED_STANDING) {
            const relevant = classRoles(campaign, scenarioClass);
            expect(relevant.length, `${scenarioClass} names no seat this charter holds`).toBeGreaterThan(0);
            const room = counselRoles(roomCounselOnReply(campaign, { ...script, scenarioClass }, spokenAnswer));
            expect(room.some((role) => relevant.includes(role)), `${scenarioClass} seated ${room.join(", ")}`).toBe(true);
        }
    });
    // The runtime finding this closes: on a terror week the Education Secretary
    // advised on a course and the Secretary of Defense — who had spoken the
    // opening beat — had no view on three of the four.
    it("puts the security seats in the room on a terror week", () => {
        const room = counselRoles(roomCounselOnReply(seatedCabinet(), { ...script, scenarioClass: "terror" }, spokenAnswer));
        expect(room).toContain("role-defense-minister");
        expect(room.some((role) => role === "role-homeland-secretary" || role === "role-intelligence-director")).toBe(true);
    });
    it("seats Health on a public-health week and Treasury on an economic one", () => {
        const campaign = seatedCabinet();
        const health = counselRoles(roomCounselOnReply(campaign, { ...script, scenarioClass: "public-health" }, spokenAnswer));
        expect(health).toContain("role-health-secretary");
        const economy = counselRoles(roomCounselOnReply(campaign, { ...script, scenarioClass: "economy" }, spokenAnswer));
        expect(economy).toContain("role-treasury-minister");
    });
    // The room is the game's only source of conflicting advice, and seating by
    // subject must not buy standing at the price of disagreement.
    it("still seats a dissenting voice once the relevant chairs are in the room", () => {
        const room = roomCounselOnReply(seatedCabinet(), { ...script, scenarioClass: "terror" }, spokenAnswer);
        expect(new Set(counselStances(room)).size).toBeGreaterThan(1);
    });
    it("names no seat for a class nobody declared, and falls back rather than throwing", () => {
        const campaign = seatedCabinet();
        expect(classRoles(campaign, "no-such-class")).toEqual([]);
        expect(classRoles(campaign, undefined)).toEqual([]);
        expect(counselRoles(roomCounselOnReply(campaign, { ...script, scenarioClass: "no-such-class" }, spokenAnswer)).length).toBeGreaterThan(0);
    });
});
describe("what an opinion is an opinion about", () => {
    it("carries the reply and the course, so a sentence can vary with the decision rather than only with the person", () => {
        const room = roomCounselOnReply(seatedCabinet(), { ...script, scenarioClass: "terror" }, spokenAnswer);
        const first = room[0];
        expect(first?.kind).toBe("counsel");
        if (first?.kind !== "counsel")
            return;
        expect(first.reply).toBe("say-it-plainly");
        expect(first.course).toEqual({ kind: "position", tone: "firm", scenarioClass: "terror" });
    });
    it("names the rung an instrument reply commits, by the catalogue name the ladder uses", () => {
        const room = roomCounselOnReply(seatedCabinet(), script, replyWith(0.6));
        const first = room[0];
        expect(first?.kind).toBe("counsel");
        if (first?.kind !== "counsel")
            return;
        expect(first.course).toEqual({ kind: "instrument", instrument: "military", rung: 3, name: expect.any(String) });
    });
});
// The finding this closes: `scoreOpinion` read three facts about a minister and
// two about the decision, none of them institutional, so thirteen of sixteen
// chairs could not reach opposition on any answer the President could give and
// no chair at all could oppose a firm one — the most common register in the
// game. A cabinet officer's objection is usually not "I disagree", it is "not
// out of my account".
describe("a department is a party to the decision, not a spectator", () => {
    const costly = (tone) => ({
        option: { id: `spend-${tone}`, tone, text: "…", commitment: { kind: "position", cost: { standing: -0.06, stability: -0.05 }, remembered: "…" } },
        available: true,
        cost: { standing: -0.06, stability: -0.05 },
        risks: [],
        ripples: [],
        rippleVisibility: "always",
    });
    it("names whose business the course is, and routes ownership to the same seat the room asks first", () => {
        const campaign = seatedCabinet();
        const terror = { ...script, scenarioClass: "terror" };
        const views = cabinetViewsOnReply(campaign, terror, spokenAnswer).filter((v) => v.kind === "counsel");
        const owners = views.filter((v) => v.stake === "owns");
        expect(owners).toHaveLength(1);
        expect(owners[0].role).toBe(classRoles(campaign, "terror")[0]);
        expect(views.filter((v) => v.stake === "standing").length).toBeGreaterThan(0);
        expect(views.filter((v) => v.stake === "outside").length).toBeGreaterThan(0);
    });
    it("lets a department with no part in the week oppose the bill it is being charged", () => {
        const campaign = seatedCabinet();
        const terror = { ...script, scenarioClass: "terror" };
        const agriculture = "role-agriculture-secretary";
        const view = cabinetViewsOnReply(campaign, terror, costly("firm")).find((v) => v.role === agriculture);
        expect(view?.kind).toBe("counsel");
        if (view?.kind !== "counsel")
            return;
        expect(view.stake).toBe("outside");
        expect(view.stance).toBe("against");
        expect(view.reason).toBe("crowded-out");
    });
    it("charges the same bill to two identical ministers and only the one outside the week objects", () => {
        const terror = { ...script, scenarioClass: "terror" };
        const outside = "role-agriculture-secretary";
        const base = seatedCabinet();
        const inside = classRoles(base, "terror")[1];
        const campaign = seatMinister(seatMinister(base, inside, cautious), outside, cautious);
        const views = cabinetViewsOnReply(campaign, terror, costly("firm"));
        const insideView = views.find((v) => v.role === inside);
        const outsideView = views.find((v) => v.role === outside);
        expect(insideView?.kind === "counsel" && insideView.stance).toBe("wary");
        expect(outsideView?.kind === "counsel" && outsideView.stance).toBe("against");
    });
    it("does not let owning the course rescue a minister whose instincts are against it", () => {
        const dovishDefense = seatMinister(seatedCabinet(), "role-defense-minister", dove);
        const strike = counselOnReply(dovishDefense, script, replyWith(0.6));
        expect(strike?.kind === "counsel" && strike.stake).toBe("owns");
        expect(strike?.kind === "counsel" && strike.stance).toBe("against");
        expect(strike?.kind === "counsel" && strike.reason).toBe("instinct-against");
    });
    it("gives every seated chair some answer it can oppose, on every register the game writes in", () => {
        const campaign = seatedCabinet();
        const terror = { ...script, scenarioClass: "terror" };
        const tones = ["conciliatory", "evasive", "principled", "firm", "coercive"];
        const opposed = new Set();
        const tonesWithOpposition = new Set();
        for (const tone of tones) {
            for (const view of cabinetViewsOnReply(campaign, terror, costly(tone))) {
                if (view.kind === "counsel" && view.stance === "against") {
                    opposed.add(view.role);
                    tonesWithOpposition.add(tone);
                }
            }
        }
        expect([...tonesWithOpposition].sort()).toEqual([...tones].sort());
        const seated = US_SEATS.filter((role) => role !== campaign.founding.leadRole);
        expect(opposed.size).toBeGreaterThanOrEqual(Math.ceil(seated.length / 2));
    });
});
// Under a charter with a written ownership table the room is routed by the
// table: the Secretary of the Interior runs lands and parks there, not a
// police ministry, and a department whose chair is empty still owns its week.
describe("counsel routed by the United States ownership table", () => {
    const HOMELAND = "role-homeland-secretary";
    const INTERIOR = "role-interior-minister";
    const underUsCharter = (campaign) => ({
        ...campaign,
        founding: { ...campaign.founding, charter: CHARTER_USA_CONSTITUTION.id },
    });
    const home = { ...script, counterpart: buildCampaign().founding.nation };
    it("keeps the Secretary of the Interior out of a riot, where hint matching seated them", () => {
        const hinted = seatedCabinet();
        const tabled = underUsCharter(hinted);
        expect(classRoles(hinted, "unrest")).toContain(INTERIOR);
        expect(classRoles(tabled, "unrest")).not.toContain(INTERIOR);
        expect(counselOnReply(tabled, { ...home, scenarioClass: "unrest" }, spokenAnswer)?.role).toBe(HOMELAND);
    });
    it("puts the owning department's empty chair at the head of the room rather than the next seat", () => {
        const campaign = underUsCharter(seatedCabinet());
        const cabinet = { ...campaign.player.cabinet };
        delete cabinet[HOMELAND];
        const vacant = { ...campaign, player: { ...campaign.player, cabinet } };
        expect(counselOnReply(vacant, { ...home, scenarioClass: "unrest" }, spokenAnswer)).toEqual({ kind: "vacant", role: HOMELAND });
    });
    it("sends a matter of no known class to Homeland Security at home and to State abroad", () => {
        const campaign = underUsCharter(seatedCabinet());
        expect(counselOnReply(campaign, { ...home, scenarioClass: "no-such-class" }, spokenAnswer)?.role).toBe(HOMELAND);
        expect(counselOnReply(campaign, { ...script, scenarioClass: "no-such-class" }, spokenAnswer)?.role).toBe("role-foreign-minister");
    });
});
describe("a minister's read of the odds", () => {
    const replies = Array.from({ length: 200 }, (_, index) => {
        const reply = replyWith(0.1 + (0.6 * index) / 199);
        return { ...reply, option: { ...reply.option, id: `answer-${index}` } };
    });
    const stancesAt = (competence) => {
        const campaign = seatMinister(buildCampaign(), DEFENSE_ROLE, { ...measured, competence });
        return replies.map((reply) => {
            const counsel = counselOnReply(campaign, script, reply);
            return counsel?.kind === "counsel" ? counsel.stance : undefined;
        });
    };
    it("is exact for a perfect hand, and closer to it the more competent the minister", () => {
        const sighted = stancesAt(1);
        const agreement = (stances) => stances.filter((stance, i) => stance === sighted[i]).length;
        const strong = agreement(stancesAt(0.95));
        const weak = agreement(stancesAt(0.2));
        expect(strong).toBeGreaterThan(weak);
        expect(stancesAt(1)).toEqual(sighted);
    });
});
describe("force appetite is read through the disposition reader", () => {
    // The figure counsel computed inline before the reader existed, restated once
    // here so the move is held to the exact numbers it used to produce.
    const inline = (subject) => {
        const hawkish = subject.traits.includes("hawkish") ? 1 : subject.traits.includes("dovish") ? -1 : 0;
        return 0.5 + 0.35 * hawkish + 0.15 * subject.ideology.authLibertarian + 0.12 * subject.ideology.nationalistGlobalist;
    };
    it("gives every seated secretary and every pooled person in founded campaigns the same figure, to the bit", () => {
        const founded = [
            foundedForBalance("counsel-appetite-1", "democrat"),
            foundedForBalance("counsel-appetite-2", "republican"),
            foundedForBalance("counsel-appetite-3", "democrat"),
        ];
        for (const { campaign } of founded) {
            const seated = Object.values(campaign.player.cabinet).map((id) => campaign.people[id].base);
            expect(seated.length).toBeGreaterThan(10);
            for (const subject of [...seated, ...Object.values(campaign.people).map((runtime) => runtime.base)]) {
                expect(dispositionOf(subject).forceAppetite, subject.id).toBe(inline(subject));
            }
        }
    });
    it("exports the instinct the room starts from: a hawk believes in force a dove does not", () => {
        const hawkish = Person.parse({ ...person, traits: ["hawkish"] });
        const dovish = Person.parse({ ...person, traits: ["dovish"] });
        const force = INSTRUMENT_COERCION.military;
        expect(instinctFor(hawkish, "instrument", force)).toBeGreaterThan(instinctFor(dovish, "instrument", force));
        for (const subject of [hawkish, dovish, person]) {
            for (const coercion of [0, 0.25, 0.5, 0.75, 1]) {
                const instinct = instinctFor(subject, "position", coercion);
                expect(instinct).toBeGreaterThanOrEqual(-1);
                expect(instinct).toBeLessThanOrEqual(1);
            }
        }
    });
});
