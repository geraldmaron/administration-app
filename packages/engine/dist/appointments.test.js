import { describe, expect, it } from "vitest";
import { VICE_PRESIDENT_ROLE_ID } from "@admin/world";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { deriveConfirmedRoles, dismissMinister, projectDismissal, selectAppointableFor, } from "./appointments.js";
import { apply } from "./effects.js";
import { foundedForBalance } from "./balance-harness.js";
import { advanceTurn } from "./turn-loop.js";
import { campaignTurnPhases } from "./turn-phases.js";
import { openNomination } from "./nomination.js";
import { selectNominationForOffice } from "./nomination-stages.js";
import { institutionForRole } from "./institutions.js";
import { CURRENT_SCHEMA_VERSION, loadSave } from "./save.js";
import { selectCabinet, selectCabinetHolder, selectCabinetSeats, selectPerson, selectPlayerLedger } from "./state.js";
// The shared fixture seats one chair and it is the player's own, which is the
// one seat appointments deliberately cannot touch. Everything here needs a
// second, ordinary ministry alongside it.
const ROLE = "role-foreign-minister";
const INCUMBENT = "PER-INCUMBENT";
function seated(id, name, overrides = {}) {
    return { ...person, id, name, eligibleRoles: [ROLE], ...overrides };
}
/** The fixture campaign plus a real ministry with a real minister in it. */
function withMinistry(overrides = {}) {
    const base = buildCampaign();
    return {
        ...base,
        founding: { ...base.founding, cabinet: { ...base.founding.cabinet, [ROLE]: INCUMBENT } },
        people: {
            ...base.people,
            [INCUMBENT]: { base: seated(INCUMBENT, "Dana Ferrow", overrides), alive: true, currentRole: ROLE },
        },
        player: { ...base.player, cabinet: { ...base.player.cabinet, [ROLE]: INCUMBENT } },
    };
}
// Somebody to promote once the incumbent is gone.
function withUnderstudy(campaign, overrides = {}) {
    const id = "PER-UNDERSTUDY";
    const understudy = {
        base: seated(id, "Ilya Renko", { competence: 0.8, charisma: 0.4, ambition: 0.3, ...overrides }),
        alive: true,
    };
    return { campaign: { ...campaign, people: { ...campaign.people, [id]: understudy } }, id };
}
describe("who the player can seat", () => {
    it("offers their own living, unseated, eligible nationals, best competence first", () => {
        const { campaign, id } = withUnderstudy(withMinistry());
        const offered = selectAppointableFor(campaign, ROLE);
        expect(offered.map((runtime) => runtime.base.id)).toContain(id);
        // The incumbent is seated, so they are not on their own shortlist.
        expect(offered.map((runtime) => runtime.base.id)).not.toContain(INCUMBENT);
        expect(offered.map((runtime) => runtime.base.competence)).toEqual([...offered.map((runtime) => runtime.base.competence)].sort((a, b) => b - a));
    });
    it("leaves out the dead, the foreign, and anyone with no standing for the chair", () => {
        const base = withMinistry();
        const dead = withUnderstudy(base);
        const buried = {
            ...dead.campaign,
            people: { ...dead.campaign.people, [dead.id]: { ...dead.campaign.people[dead.id], alive: false } },
        };
        expect(selectAppointableFor(buried, ROLE).map((r) => r.base.id)).not.toContain(dead.id);
        const foreign = withUnderstudy(base, { nationality: "ZZZ" });
        expect(selectAppointableFor(foreign.campaign, ROLE).map((r) => r.base.id)).not.toContain(foreign.id);
        const unqualified = withUnderstudy(base, { eligibleRoles: ["role-journalist"] });
        expect(selectAppointableFor(unqualified.campaign, ROLE).map((r) => r.base.id)).not.toContain(unqualified.id);
    });
});
describe("dismissal", () => {
    it("empties the chair on both the seat and the person, so the two cannot disagree", () => {
        const campaign = withMinistry();
        const result = dismissMinister(campaign, ROLE);
        expect(result.ok).toBe(true);
        const next = apply(campaign, result.packet);
        expect(selectCabinetHolder(next, ROLE)).toBeUndefined();
        expect(selectPerson(next, INCUMBENT)?.currentRole).toBeUndefined();
        expect("currentRole" in selectPerson(next, INCUMBENT)).toBe(false);
    });
    // Live occupancy loses the key when a chair empties, so a surface that lists
    // "the cabinet" from it makes the whole ministry disappear on a dismissal
    // instead of standing it vacant — and an unlistable chair can never be
    // refilled.
    it("leaves the chair itself standing, so it can still be filled", () => {
        const campaign = withMinistry();
        const next = apply(campaign, dismissMinister(campaign, ROLE).packet);
        expect(selectCabinet(next)[ROLE]).toBeUndefined();
        expect(selectCabinetSeats(next)).toContain(ROLE);
        expect(selectCabinetSeats(next)).toEqual(selectCabinetSeats(campaign));
    });
    it("costs more standing to remove a minister the public knows", () => {
        const campaign = withMinistry();
        const quiet = { ...campaign, people: { ...campaign.people, [INCUMBENT]: { ...campaign.people[INCUMBENT], base: seated(INCUMBENT, "Dana Ferrow", { charisma: 0.1 }) } } };
        const beloved = { ...campaign, people: { ...campaign.people, [INCUMBENT]: { ...campaign.people[INCUMBENT], base: seated(INCUMBENT, "Dana Ferrow", { charisma: 0.9 }) } } };
        const after = (state) => {
            const result = dismissMinister(state, ROLE);
            return apply(state, result.packet).player.metrics.standing;
        };
        expect(after(beloved)).toBeLessThan(after(quiet));
    });
    // The same person who would have built a faction in office builds one out of
    // it: dismissal is not an escape from an ambitious minister, only a change of
    // where they stand while they do it.
    it("makes an ambitious minister a marked rival rather than a quiet departure", () => {
        const campaign = withMinistry();
        const ambitious = {
            ...campaign,
            people: { ...campaign.people, [INCUMBENT]: { ...campaign.people[INCUMBENT], base: seated(INCUMBENT, "Dana Ferrow", { ambition: 0.9 }) } },
        };
        const result = dismissMinister(ambitious, ROLE);
        const next = apply(ambitious, result.packet);
        expect(selectPerson(next, INCUMBENT)?.affiliation).toBeDefined();
        expect(next.player.metrics.stability).toBeLessThan(ambitious.player.metrics.stability);
    });
    it("refuses to empty the player's own chair, or one that is already empty", () => {
        const campaign = withMinistry();
        const own = dismissMinister(campaign, campaign.founding.leadRole);
        expect(own).toEqual({ ok: false, reason: expect.stringContaining("yours") });
        const emptied = apply(campaign, dismissMinister(campaign, ROLE).packet);
        expect(dismissMinister(emptied, ROLE).ok).toBe(false);
    });
});
// An empty chair is filled the way every Senate-confirmed seat is: a
// nomination into the pipeline, the deputy acting meanwhile. There is no
// same-day vote for a cabinet chair.
describe("filling an empty chair", () => {
    const OFFICE = institutionForRole(ROLE).offices[0].id;
    function vacate(campaign) {
        return apply(campaign, dismissMinister(campaign, ROLE).packet);
    }
    it("sends the candidate up rather than seating them the same day", () => {
        const { campaign, id } = withUnderstudy(withMinistry());
        const open = vacate(campaign);
        const next = apply(open, packetOf(openNomination(open, OFFICE, id)));
        expect(selectCabinetHolder(next, ROLE)).toBeUndefined();
        expect(selectNominationForOffice(next, OFFICE)).toMatchObject({ nominee: id, stage: "vetting" });
    });
    it("refuses a filled chair, so a reshuffle is always two priced decisions", () => {
        const { campaign, id } = withUnderstudy(withMinistry());
        expect(openNomination(campaign, OFFICE, id)).toEqual({ ok: false, reason: expect.stringContaining("has to be empty") });
    });
    it("refuses the dead, the foreign and the unknown, and offers nobody without standing for the chair", () => {
        const open = vacate(withMinistry());
        expect(openNomination(open, OFFICE, "PER-NOBODY").ok).toBe(false);
        const dead = withUnderstudy(open);
        const buried = { ...dead.campaign, people: { ...dead.campaign.people, [dead.id]: { ...dead.campaign.people[dead.id], alive: false } } };
        expect(openNomination(buried, OFFICE, dead.id).ok).toBe(false);
        const foreign = withUnderstudy(open, { nationality: "ZZZ" });
        expect(openNomination(foreign.campaign, OFFICE, foreign.id)).toEqual({ ok: false, reason: expect.stringContaining("not one of your nationals") });
        const unqualified = withUnderstudy(open, { eligibleRoles: ["role-journalist"] });
        expect(selectAppointableFor(unqualified.campaign, ROLE).map((runtime) => runtime.base.id)).not.toContain(unqualified.id);
    });
});
// The whole point of the actor field: a reshuffle is something the player did,
// and it has to read that way in the record beside the things that were done
// to them.
describe("the record", () => {
    it("files both halves of a reshuffle as the player's own decisions", () => {
        const { campaign, id } = withUnderstudy(withMinistry());
        const office = institutionForRole(ROLE).offices[0];
        const open = apply(campaign, dismissMinister(campaign, ROLE).packet);
        const filled = apply(open, packetOf(openNomination(open, office.id, id)));
        const decisions = selectPlayerLedger(filled).map((entry) => entry.description);
        expect(decisions).toContain("Dana Ferrow is dismissed from the cabinet.");
        expect(decisions).toContain(`Ilya Renko is put forward for ${office.title}.`);
    });
});
/** Every metric move a packet carries, summed the way apply() sums them. */
function metricSum(packet) {
    return packet.effects.reduce((total, effect) => {
        if (effect.kind !== "metric")
            return total;
        const next = { ...total };
        for (const [key, delta] of Object.entries(effect.deltas))
            next[key] = (next[key] ?? 0) + (delta ?? 0);
        return next;
    }, {});
}
function packetOf(result) {
    if (!result.ok)
        throw new Error(result.reason);
    return result.packet;
}
function withAmbition(campaign, ambition) {
    const incumbent = campaign.people[INCUMBENT];
    return { ...campaign, people: { ...campaign.people, [INCUMBENT]: { ...incumbent, base: { ...incumbent.base, ambition } } } };
}
describe("the price shown before the click", () => {
    it("prices a dismissal with the arithmetic the dismissal spends", () => {
        for (const ambition of [0.2, 0.9]) {
            const campaign = withAmbition(withMinistry({ charisma: 0.7 }), ambition);
            const projection = projectDismissal(campaign, ROLE);
            expect(projection.ok).toBe(true);
            expect(projection.ok && projection.cost).toEqual(metricSum(packetOf(dismissMinister(campaign, ROLE))));
        }
    });
    it("states the faction risk exactly when the minister leaves as a faction", () => {
        const quiet = projectDismissal(withAmbition(withMinistry(), 0.2), ROLE);
        expect(quiet.ok && quiet.resentful).toBe(false);
        expect(quiet.ok && quiet.risks.map((risk) => risk.id)).toEqual([]);
        const ambitious = withAmbition(withMinistry(), 0.9);
        const resentful = projectDismissal(ambitious, ROLE);
        expect(resentful.ok && resentful.resentful).toBe(true);
        expect(resentful.ok && resentful.risks.map((risk) => [risk.id, risk.chance])).toEqual([["dismissal-faction", 1]]);
        const after = apply(ambitious, packetOf(dismissMinister(ambitious, ROLE)));
        expect(selectPerson(after, INCUMBENT)?.affiliation).toBeDefined();
    });
    it("refuses to price what the act itself refuses", () => {
        const campaign = withMinistry();
        expect(projectDismissal(campaign, campaign.founding.leadRole)).toEqual(dismissMinister(campaign, campaign.founding.leadRole));
        const emptied = apply(campaign, packetOf(dismissMinister(campaign, ROLE)));
        expect(projectDismissal(emptied, ROLE)).toEqual(dismissMinister(emptied, ROLE));
    });
});
describe("the race, from the chair's side", () => {
    const OFFICE = institutionForRole(ROLE).offices[0].id;
    it("refuses a chair with a name already before the Senate", () => {
        const first = withUnderstudy(withMinistry());
        const open = apply(first.campaign, packetOf(dismissMinister(first.campaign, ROLE)));
        const other = "PER-OTHER";
        const withOther = { ...open, people: { ...open.people, [other]: { base: seated(other, "Noor Vashti"), alive: true } } };
        const pending = apply(withOther, openNomination(withOther, OFFICE, other).packet);
        expect(openNomination(pending, OFFICE, first.id)).toEqual({ ok: false, reason: expect.stringContaining("before the Senate") });
        expect(selectAppointableFor(pending, ROLE).map((runtime) => runtime.base.id)).not.toContain(other);
    });
});
/** A campaign as a save written before the pipeline wrote roles: a confirmed Secretary with no role on the record. */
function confirmedWithoutRole() {
    const { campaign, id } = withUnderstudy(withMinistry());
    const open = apply(campaign, packetOf(dismissMinister(campaign, ROLE)));
    const institution = institutionForRole(ROLE);
    const office = institution.offices[0].id;
    const understudy = open.people[id];
    return {
        id,
        campaign: {
            ...open,
            player: { ...open.player, cabinet: { ...open.player.cabinet, [ROLE]: id } },
            institutions: { ...open.institutions, [institution.id]: { ...open.institutions[institution.id], leader: id, vacancy: false } },
            people: { ...open.people, [id]: { ...understudy, loyaltyAtAppointment: understudy.base.loyalty } },
            nominations: {
                [`${office}:1`]: {
                    id: `${office}:1`,
                    office,
                    institution: institution.id,
                    nominee: id,
                    stage: "sworn-in",
                    stageEnteredDay: 120,
                    openedDay: 1,
                    controversies: [],
                    history: [],
                },
            },
        },
    };
}
describe("a confirmed officer's role, derived when a save loads", () => {
    it("names the chair for a confirmed officer a save written before the fix left without one", () => {
        const { campaign, id } = confirmedWithoutRole();
        expect(campaign.people[id].currentRole).toBeUndefined();
        const loaded = loadSave(JSON.parse(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, campaign })));
        expect(loaded.people[id].currentRole).toBe(ROLE);
        expect(selectAppointableFor(loaded, ROLE).map((runtime) => runtime.base.id)).not.toContain(id);
    });
    it("leaves a person whose role is set exactly as it found them", () => {
        const { campaign, id } = confirmedWithoutRole();
        const staffed = { ...campaign, people: { ...campaign.people, [id]: { ...campaign.people[id], currentRole: "role-chief-of-staff" } } };
        expect(deriveConfirmedRoles(staffed)).toBe(staffed);
    });
    it("names nobody the body no longer has, and never an acting officer", () => {
        const { campaign, id } = confirmedWithoutRole();
        const institution = institutionForRole(ROLE).id;
        const { leader: _gone, ...headless } = campaign.institutions[institution];
        const acting = {
            ...campaign,
            player: { ...campaign.player, cabinet: {} },
            institutions: { ...campaign.institutions, [institution]: { ...headless, vacancy: true, actingLeader: id, actingExpiresDay: 400 } },
        };
        expect(deriveConfirmedRoles(acting).people[id].currentRole).toBeUndefined();
    });
    it("never hands a cabinet role to a second person", () => {
        const { campaign, id } = confirmedWithoutRole();
        const ghost = { ...campaign, people: { ...campaign.people, [INCUMBENT]: { ...campaign.people[INCUMBENT], currentRole: ROLE } } };
        expect(deriveConfirmedRoles(ghost).people[id].currentRole).toBeUndefined();
    });
    it("is idempotent", () => {
        const once = deriveConfirmedRoles(confirmedWithoutRole().campaign);
        expect(deriveConfirmedRoles(once)).toBe(once);
    });
});
describe("the derivation over founded governments", () => {
    // The fixture saves the browser suite imports (the three opening parties,
    // twelve weeks on, a pledge kept) are all founded this way; each is checked
    // here with and without a Secretary the pipeline confirmed.
    function roles(campaign) {
        return new Map(Object.values(campaign.people).flatMap((runtime) => (runtime.currentRole ? [[runtime.base.id, runtime.currentRole]] : [])));
    }
    function throughThePipeline(campaign, charter) {
        const role = "role-labor-secretary";
        const office = institutionForRole(role).offices[0].id;
        // A chair the Senate did not confirm at the seal is already empty and already
        // before it, so the pipeline is the one the seal opened.
        const open = campaign.player.cabinet[role] ? apply(campaign, packetOf(dismissMinister(campaign, role))) : campaign;
        const pending = selectNominationForOffice(open, office);
        const nominee = pending?.nominee ?? selectAppointableFor(open, role)[0].base.id;
        let working = pending ? open : apply(open, openNomination(open, office, nominee).packet);
        const phases = campaignTurnPhases(charter);
        for (let week = 0; week < 40 && working.people[nominee].currentRole === undefined; week += 1)
            working = advanceTurn(working, phases);
        expect(working.people[nominee].currentRole).toBe(role);
        return working;
    }
    for (const party of ["democrat", "republican", "independent"]) {
        it(`keeps every seated role and holds each cabinet role once (${party})`, () => {
            const { campaign, charter } = foundedForBalance(`derive-${party}`, party);
            const phases = campaignTurnPhases(charter);
            const later = Array.from({ length: 12 }).reduce((state) => advanceTurn(state, phases), campaign);
            for (const state of [campaign, later, throughThePipeline(campaign, charter)]) {
                const derived = deriveConfirmedRoles(state);
                expect(deriveConfirmedRoles(derived)).toBe(derived);
                for (const [id, role] of roles(state))
                    expect(roles(derived).get(id)).toBe(role);
                const cabinet = [...roles(derived).values()].filter((role) => institutionForRole(role));
                expect(new Set(cabinet).size).toBe(cabinet.length);
                expect([...roles(derived).values()].filter((role) => role === VICE_PRESIDENT_ROLE_ID).length).toBeLessThanOrEqual(1);
            }
        });
    }
});
