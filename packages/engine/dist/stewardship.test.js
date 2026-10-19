import { describe, expect, it } from "vitest";
import { Person } from "@admin/world";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { counselOnReply, dissentingCounsel } from "./counsel.js";
import { projectAction } from "./resolution.js";
import { createRngStreams } from "./rng.js";
import { stewardSway } from "./stewardship.js";
const FOREIGN_ROLE = "role-foreign-affairs";
const DEFENSE_ROLE = "role-defense";
function seatMinister(campaign, role, overrides) {
    const minister = Person.parse({ ...person, id: `PER-${role}`, name: `Holder of ${role}`, eligibleRoles: [role], ...overrides });
    return {
        ...campaign,
        people: { ...campaign.people, [minister.id]: { base: minister, alive: true, currentRole: role } },
        player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [role]: minister.id } },
    };
}
const ALP = "ALP";
const diplomaticRequest = (campaign) => ({ actor: campaign.founding.nation, target: ALP, instrument: "diplomatic", rung: 2 });
describe("the seated minister sways the odds", () => {
    it("a capable foreign minister beats an empty chair, inside the one estimator", () => {
        const vacant = buildCampaign();
        const staffed = seatMinister(vacant, FOREIGN_ROLE, { competence: 0.9 });
        expect(stewardSway(staffed, diplomaticRequest(staffed))).toBeGreaterThan(stewardSway(vacant, diplomaticRequest(vacant)));
        const streams = () => createRngStreams(vacant.seed);
        const vacantProjection = projectAction(vacant, diplomaticRequest(vacant), streams());
        const staffedProjection = projectAction(staffed, diplomaticRequest(staffed), streams());
        if (!vacantProjection.ok || !staffedProjection.ok)
            throw new Error("the fixture should project cleanly");
        expect(staffedProjection.projection.successChance).toBeGreaterThan(vacantProjection.projection.successChance);
    });
    it("never prices another nation's moves with the player's cabinet", () => {
        const campaign = seatMinister(buildCampaign(), FOREIGN_ROLE, { competence: 0.95 });
        expect(stewardSway(campaign, { actor: ALP, target: campaign.founding.nation, instrument: "diplomatic", rung: 2 })).toBe(1);
    });
});
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
describe("counsel comes from who the minister is", () => {
    it("a hawk backs the hard answer; a dove opposes it at any odds", () => {
        const hawkish = seatMinister(buildCampaign(), DEFENSE_ROLE, { traits: ["hawkish"], ideology: { economicLeftRight: 0, authLibertarian: 0.6, nationalistGlobalist: 0.2 } });
        const dovish = seatMinister(buildCampaign(), DEFENSE_ROLE, { traits: ["dovish"], ideology: { economicLeftRight: 0, authLibertarian: -0.4, nationalistGlobalist: -0.2 } });
        const hawk = counselOnReply(hawkish, script, replyWith(0.6));
        const dove = counselOnReply(dovish, script, replyWith(0.6));
        expect(hawk?.kind === "counsel" && hawk.stance).toBe("for");
        expect(dove?.kind === "counsel" && dove.stance).toBe("against");
        expect(dove?.kind === "counsel" && dove.reason).toBe("instinct-against");
    });
    it("a cautious minister turns on thin odds even when the move suits them", () => {
        const cautiousHawk = seatMinister(buildCampaign(), DEFENSE_ROLE, {
            traits: ["hawkish", "cautious"],
            ideology: { economicLeftRight: 0, authLibertarian: 0.5, nationalistGlobalist: 0 },
        });
        const counsel = counselOnReply(cautiousHawk, script, replyWith(0.15));
        expect(counsel?.kind === "counsel" && counsel.stance).not.toBe("for");
        expect(counsel?.kind === "counsel" && counsel.reason).toBe("thin-odds");
    });
    it("conviction is the same competence that moves the resolved odds", () => {
        const campaign = seatMinister(buildCampaign(), DEFENSE_ROLE, { competence: 0.85, traits: ["hawkish"] });
        const counsel = counselOnReply(campaign, script, replyWith(0.6));
        expect(counsel?.kind === "counsel" && counsel.conviction).toBe(0.85);
    });
    it("a dead minister leaves a vacant chair, not a ghost opinion", () => {
        const campaign = seatMinister(buildCampaign(), DEFENSE_ROLE, {});
        const holder = campaign.player.cabinet[DEFENSE_ROLE];
        const dead = {
            ...campaign,
            people: { ...campaign.people, [holder]: { ...campaign.people[holder], alive: false } },
        };
        const counsel = counselOnReply(dead, script, replyWith(0.6));
        expect(counsel?.kind).toBe("vacant");
    });
});
describe("dissent from the rest of the room", () => {
    const hawk = { traits: ["hawkish"], ideology: { economicLeftRight: 0, authLibertarian: 0.6, nationalistGlobalist: 0.2 } };
    const dove = { traits: ["dovish"], ideology: { economicLeftRight: 0, authLibertarian: -0.4, nationalistGlobalist: -0.2 } };
    it("surfaces a genuinely different stance from another seated minister", () => {
        const campaign = seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, dove);
        const primary = counselOnReply(campaign, script, replyWith(0.6));
        const dissent = dissentingCounsel(campaign, script, replyWith(0.6));
        expect(primary?.kind === "counsel" && primary.stance).toBe("for");
        expect(dissent?.kind === "counsel" && dissent.stance).toBe("against");
        expect(dissent?.role).toBe(FOREIGN_ROLE);
    });
    it("stays silent when the rest of the cabinet actually agrees — a manufactured disagreement is dishonest", () => {
        const campaign = seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, hawk);
        expect(dissentingCounsel(campaign, script, replyWith(0.6))).toBeUndefined();
    });
    it("says nothing when there is no other appointed minister to ask", () => {
        const campaign = seatMinister(buildCampaign(), DEFENSE_ROLE, hawk);
        expect(dissentingCounsel(campaign, script, replyWith(0.6))).toBeUndefined();
    });
    it("never lets the head of state counsel themselves, even when they would clearly dissent", () => {
        const base = buildCampaign();
        const leadRole = base.founding.leadRole;
        const leadHolderId = base.player.cabinet[leadRole];
        const dovishLead = {
            ...base,
            people: { ...base.people, [leadHolderId]: { ...base.people[leadHolderId], base: { ...person, ...dove } } },
        };
        const campaign = seatMinister(dovishLead, DEFENSE_ROLE, hawk);
        const primary = counselOnReply(campaign, script, replyWith(0.6));
        expect(primary?.kind === "counsel" && primary.stance).toBe("for");
        // Without the exclusion, the dovish head of state would read as a clear
        // dissenter here — there just isn't anyone else seated to voice it.
        expect(dissentingCounsel(campaign, script, replyWith(0.6))).toBeUndefined();
    });
    it("a vacant primary chair has no stance to dissent from, however the rest of the room feels", () => {
        // DEFENSE_ROLE is the reply's actual domain (military); FOREIGN_ROLE is
        // seated too, so there is a living minister who could otherwise read as
        // a dissenter — but there is no primary opinion left to dissent against.
        const campaign = seatMinister(seatMinister(buildCampaign(), DEFENSE_ROLE, hawk), FOREIGN_ROLE, dove);
        const holder = campaign.player.cabinet[DEFENSE_ROLE];
        const primaryVacant = {
            ...campaign,
            people: { ...campaign.people, [holder]: { ...campaign.people[holder], alive: false } },
        };
        expect(counselOnReply(primaryVacant, script, replyWith(0.6))?.kind).toBe("vacant");
        expect(dissentingCounsel(primaryVacant, script, replyWith(0.6))).toBeUndefined();
    });
});
// A spoken position carries no instrument, so its coercion can only come from
// its tone. Pricing every tone the same made the cabinet answer "walk in and
// listen" exactly as it answered "clear it before dawn" — the room looked
// scripted because the one field that distinguished the options never reached
// it.
function spokenReply(tone) {
    return {
        option: { id: `spoken-${tone}`, tone, text: "…", commitment: { kind: "position", cost: {}, remembered: "…" } },
        available: true,
        cost: {},
        risks: [],
        ripples: [],
        rippleVisibility: "always",
    };
}
const TONES = ["conciliatory", "evasive", "principled", "firm", "coercive"];
describe("a spoken position's tone is what the room reacts to", () => {
    const hawkish = () => seatMinister(buildCampaign(), FOREIGN_ROLE, {
        traits: ["hawkish"],
        ideology: { economicLeftRight: 0, authLibertarian: 0.6, nationalistGlobalist: 0.2 },
    });
    const dovish = () => seatMinister(buildCampaign(), FOREIGN_ROLE, {
        traits: ["dovish"],
        ideology: { economicLeftRight: 0, authLibertarian: -0.4, nationalistGlobalist: -0.2 },
    });
    it("a hawk backs the coercive line and opposes the conciliatory one", () => {
        const campaign = hawkish();
        const coercive = counselOnReply(campaign, script, spokenReply("coercive"));
        const conciliatory = counselOnReply(campaign, script, spokenReply("conciliatory"));
        expect(coercive?.kind === "counsel" && coercive.stance).toBe("for");
        expect(conciliatory?.kind === "counsel" && conciliatory.stance).toBe("against");
    });
    it("a dove reads the same two replies the other way round", () => {
        const campaign = dovish();
        const conciliatory = counselOnReply(campaign, script, spokenReply("conciliatory"));
        expect(conciliatory?.kind === "counsel" && conciliatory.stance).toBe("for");
    });
    it("does not return one stance for every tone — the regression that made the cabinet look scripted", () => {
        const campaign = hawkish();
        const stances = new Set(TONES.map((tone) => {
            const counsel = counselOnReply(campaign, script, spokenReply(tone));
            return counsel?.kind === "counsel" ? counsel.stance : "none";
        }));
        expect(stances.size).toBeGreaterThan(1);
    });
});
describe("justice counsel sits with the Attorney General", () => {
    const INTERIOR = "role-interior-minister";
    const AG = "role-attorney-general";
    function positionReply() {
        return {
            option: {
                id: "hold-the-line",
                tone: "principled",
                text: "…",
                commitment: { kind: "position", cost: { standing: -0.02 }, remembered: "held" },
            },
            available: true,
            cost: {},
            risks: [],
            ripples: [],
            rippleVisibility: "always",
        };
    }
    it("routes a domestic justice-class position to the Attorney General, not Interior", () => {
        const campaign = seatMinister(seatMinister(buildCampaign(), INTERIOR, {}), AG, {});
        const justice = {
            ...script,
            counterpart: campaign.founding.nation,
            scenarioClass: "justice",
        };
        const counsel = counselOnReply(campaign, justice, positionReply());
        expect(counsel?.kind === "counsel" && counsel.role).toBe(AG);
    });
    it("keeps ordinary domestic trouble with Interior", () => {
        const campaign = seatMinister(seatMinister(buildCampaign(), INTERIOR, {}), AG, {});
        const home = { ...script, counterpart: campaign.founding.nation };
        const counsel = counselOnReply(campaign, home, positionReply());
        expect(counsel?.kind === "counsel" && counsel.role).toBe(INTERIOR);
    });
});
