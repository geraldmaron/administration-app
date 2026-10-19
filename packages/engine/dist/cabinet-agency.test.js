import { describe, expect, it } from "vitest";
import { foundedForBalance } from "./balance-harness.js";
import { appointActing, deputyFor, dismissMinister, selectActing, selectAppointableFor, selectChairRunner, vacates } from "./appointments.js";
import { breakRateOf, cabinetRiskRate, chiefOfStaffDiscipline, factionPressure, rivalFaction, selectFactions } from "./cabinet.js";
import { projectFactionReconciliation, reconcileFaction } from "./cabinet-faction.js";
import { revoltPacket } from "./cabinet-revolt.js";
import { cabinetAgendaPackets, triageBar } from "./cabinet-week.js";
import { answerResignationOffer, projectMinisterProposal, projectResignationAnswer, takeMinisterProposal } from "./cabinet-agenda-acts.js";
import { decideMinister, ministerTerms } from "./minister-will.js";
import { apply } from "./effects.js";
import { createRngStreams } from "./rng.js";
import { deriveImplementationQuality, institutionDef, leaderDeliveryTerm, seatOfficer } from "./institutions.js";
import { cabinetLoyaltyPhase, COMPETENCE_DECAY_FLOOR, competenceDecayFor, POLITICAL_FLOOR, politicalShiftFor } from "./loyalty.js";
const TREASURY = "role-treasury-minister";
const ENERGY = "role-energy-secretary";
const founded = foundedForBalance("cabinet-agency").campaign;
function applyAll(campaign, packets) {
    return packets.reduce((state, packet) => apply(state, packet), campaign);
}
function holderOf(campaign, role) {
    return campaign.people[campaign.player.cabinet[role]];
}
function withPerson(campaign, id, base) {
    const runtime = campaign.people[id];
    return { ...campaign, people: { ...campaign.people, [id]: { ...runtime, base: { ...runtime.base, ...base } } } };
}
function withQuality(campaign, institution, implementationQuality) {
    const runtime = campaign.institutions[institution];
    return { ...campaign, institutions: { ...campaign.institutions, [institution]: { ...runtime, implementationQuality } } };
}
function dismissed(campaign, role) {
    const result = dismissMinister(campaign, role);
    if (!result.ok)
        throw new Error(result.reason);
    return apply(campaign, result.packet);
}
describe("an acting officer", () => {
    it("is seated from the chair's own bench the day a Secretary leaves, through vacates", () => {
        const deputy = deputyFor(founded, TREASURY, holderOf(founded, TREASURY).base.id);
        const after = dismissed(founded, TREASURY);
        expect(after.player.cabinet[TREASURY]).toBeUndefined();
        expect(selectActing(after, TREASURY)).toBe(deputy);
        expect(after.institutions["INST-TREASURY"].actingLeader).toBe(deputy);
        expect(after.institutions["INST-TREASURY"].actingExpiresDay).toBeGreaterThan(0);
    });
    it("is seated by the President through appointActing, and refused where somebody holds the chair", () => {
        const refused = appointActing(founded, TREASURY, holderOf(founded, ENERGY).base.id);
        expect(refused.ok).toBe(false);
        const emptied = apply(founded, { source: "action", actor: "player", turn: founded.turn, narration: { summary: "x" }, effects: vacates(founded, TREASURY, "dismissed", holderOf(founded, TREASURY).base.id).filter((effect) => effect.kind !== "acting" && effect.kind !== "institution") });
        const pick = deputyFor(emptied, TREASURY);
        const seated = appointActing(emptied, TREASURY, pick);
        expect(seated.ok).toBe(true);
        const after = apply(emptied, seated.packet);
        expect(selectActing(after, TREASURY)).toBe(pick);
        expect(appointActing(after, ENERGY, pick).ok).toBe(false);
    });
    it("stands down when a confirmed Secretary takes the chair, in both records", () => {
        const after = dismissed(founded, TREASURY);
        const acting = selectActing(after, TREASURY);
        const confirmed = seatOfficer(after, "INST-TREASURY", acting);
        expect(selectActing(confirmed, TREASURY)).toBeUndefined();
        expect(confirmed.actings?.[TREASURY]).toBeUndefined();
        expect(confirmed.player.cabinet[TREASURY]).toBe(acting);
    });
    it("runs the department in the chair runner's reading while the chair is empty", () => {
        const after = dismissed(founded, TREASURY);
        expect(selectChairRunner(founded, TREASURY)?.base.id).toBe(founded.player.cabinet[TREASURY]);
        expect(selectChairRunner(after, TREASURY)?.base.id).toBe(selectActing(after, TREASURY));
    });
    it("is nobody's acting once the body's authority has lapsed", () => {
        const after = dismissed(founded, TREASURY);
        const runtime = after.institutions["INST-TREASURY"];
        const { actingLeader: _gone, ...lapsed } = runtime;
        const campaign = { ...after, institutions: { ...after.institutions, ["INST-TREASURY"]: lapsed } };
        expect(selectActing(campaign, TREASURY)).toBeUndefined();
        const chores = cabinetAgendaPackets(campaign).flatMap((packet) => packet.effects);
        expect(chores).toContainEqual({ kind: "acting", seat: TREASURY });
    });
});
describe("a revolt, told the American way", () => {
    const streams = createRngStreams(founded.seed);
    const holder = holderOf(founded, TREASURY);
    it("stamps a cabinet leak as one, so a story can say where it came from", () => {
        const packet = revoltPacket(founded, "leak", founded.turn, TREASURY, holder.base, streams.stream("t", 1));
        expect(packet.provenance?.systems?.slice(0, 2)).toEqual(["cabinet", "leak"]);
    });
    it("goes out through vacates with a stamped decision, and a break costs more than a quiet exit", () => {
        const loyal = withPerson(founded, holder.base.id, { loyalty: 0.55, ambition: 0.2, traits: [] });
        const quiet = revoltPacket(loyal, "resignation", founded.turn, TREASURY, holderOf(loyal, TREASURY).base, streams.stream("t", 2));
        const bitter = withPerson(founded, holder.base.id, { loyalty: 0.05, ambition: 0.95, traits: ["principled"] });
        const loud = revoltPacket(bitter, "resignation", founded.turn, TREASURY, holderOf(bitter, TREASURY).base, streams.stream("t", 3));
        for (const packet of [quiet, loud]) {
            expect(packet.provenance?.decision?.question).toBe("minister-break");
            expect(packet.effects.some((effect) => effect.kind === "cabinet")).toBe(true);
            expect(packet.effects.some((effect) => effect.kind === "acting")).toBe(true);
        }
        expect(quiet.provenance?.decision?.acts).toBe(false);
        expect(loud.provenance?.decision?.acts).toBe(true);
        const standing = (packet) => packet.effects.reduce((sum, effect) => sum + (effect.kind === "metric" ? (effect.deltas.standing ?? 0) : 0), 0);
        expect(standing(loud)).toBeLessThan(standing(quiet));
    });
    it("forms a primary camp, not a parliamentary challenge, and a President can end it at a stated price", () => {
        const packet = revoltPacket(founded, "challenge", founded.turn, TREASURY, holder.base, streams.stream("t", 4));
        expect(packet.provenance?.systems).toEqual(["cabinet", "primary"]);
        const split = apply(founded, packet);
        const faction = rivalFaction(TREASURY);
        expect(selectFactions(split).map((entry) => entry.id)).toContain(faction);
        const before = factionPressure(split);
        expect(before).toBeGreaterThan(0);
        const price = projectFactionReconciliation(split, faction);
        if (!price.ok)
            throw new Error(price.reason);
        expect(price.cost.standing).toBeLessThan(0);
        const result = reconcileFaction(split, faction);
        if (!result.ok)
            throw new Error(result.reason);
        const mended = apply(split, result.packet);
        expect(factionPressure(mended)).toBe(0);
        expect(selectFactions(mended)).toEqual([]);
        expect(mended.player.metrics.standing).toBeLessThan(split.player.metrics.standing);
        expect(mended.people[holder.base.id].base.loyalty).toBeGreaterThan(split.people[holder.base.id].base.loyalty);
    });
});
describe("a Secretary's own decisions", () => {
    const holder = holderOf(founded, TREASURY);
    // The same chair, the same week, the same department in trouble; one Secretary
    // a band lower in loyalty and a band higher in integrity than the other.
    const troubled = withQuality(founded, "INST-TREASURY", 0.45);
    const steady = withPerson(troubled, holder.base.id, { loyalty: 0.8, integrity: 0.4, ambition: 0.5, traits: [] });
    const shaken = withPerson(troubled, holder.base.id, { loyalty: 0.45, integrity: 0.85, ambition: 0.5, traits: [] });
    it("decides an offer to resign through weigh, and two chairs a band apart decide it differently", () => {
        const calm = decideMinister(steady, "minister-offer", TREASURY, holderOf(steady, TREASURY).base);
        const offered = decideMinister(shaken, "minister-offer", TREASURY, holderOf(shaken, TREASURY).base);
        expect(calm.acts).toBe(false);
        expect(offered.acts).toBe(true);
        const packets = cabinetAgendaPackets(shaken);
        const offer = packets.find((packet) => packet.provenance?.decision?.question === "minister-offer");
        expect(offer?.provenance?.decision?.subject).toBe(TREASURY);
        expect(cabinetAgendaPackets(steady).some((packet) => packet.provenance?.decision?.question === "minister-offer" && packet.provenance.decision.actor === holder.base.id)).toBe(false);
    });
    it("weighs only the terms its question may weigh", () => {
        const terms = ministerTerms("minister-break", holder.base, { overruled: 3, exposure: 0.5, partisanship: 1 });
        expect(terms.map((term) => term.key)).toEqual(["loyalty", "ambition", "integrity", "principle", "times-overruled", "department-exposure", "co-partisanship"]);
    });
    it("puts an offer on the agenda that the President can accept at a price shown first", () => {
        const campaign = applyAll(shaken, cabinetAgendaPackets(shaken));
        const offer = campaign.cabinetAgenda.offers.find((entry) => entry.role === TREASURY);
        const price = projectResignationAnswer(campaign, offer.id, "accept");
        if (!price.ok)
            throw new Error(price.reason);
        const answered = answerResignationOffer(campaign, offer.id, "accept");
        if (!answered.ok)
            throw new Error(answered.reason);
        const metric = answered.packet.effects.find((effect) => effect.kind === "metric");
        expect(metric && metric.kind === "metric" ? metric.deltas : undefined).toEqual(price.cost);
        const after = apply(campaign, answered.packet);
        expect(after.player.cabinet[TREASURY]).toBeUndefined();
        expect(selectActing(after, TREASURY)).toBeDefined();
        expect(after.cabinetAgenda.offers).toEqual([]);
    });
    it("keeps a Secretary who is asked to stay, and they do not offer again next week", () => {
        const campaign = applyAll(shaken, cabinetAgendaPackets(shaken));
        const offer = campaign.cabinetAgenda.offers.find((entry) => entry.role === TREASURY);
        const answered = answerResignationOffer(campaign, offer.id, "decline");
        if (!answered.ok)
            throw new Error(answered.reason);
        const after = apply(campaign, answered.packet);
        expect(after.player.cabinet[TREASURY]).toBe(holder.base.id);
        expect(after.people[holder.base.id].base.loyalty).toBeGreaterThan(campaign.people[holder.base.id].base.loyalty);
        const next = { ...after, turn: after.turn + 1 };
        const offers = cabinetAgendaPackets(next).filter((packet) => packet.provenance?.decision?.question === "minister-offer");
        expect(offers.some((packet) => packet.provenance?.decision?.actor === holder.base.id)).toBe(false);
    });
});
describe("a department's request", () => {
    const quiet = Object.keys(founded.institutions).reduce((campaign, id) => withQuality(campaign, id, Math.max(0.75, campaign.institutions[id].implementationQuality)), founded);
    it("does not arise while no department has crossed a trigger", () => {
        const packets = cabinetAgendaPackets(quiet);
        expect(packets.some((packet) => packet.provenance?.systems?.includes("proposal"))).toBe(false);
    });
    it("arises when a department falls under the delivery line, priced before it is taken, one a week", () => {
        const failing = withQuality(quiet, "INST-TREASURY", 0.4);
        const packets = cabinetAgendaPackets(failing);
        const asked = packets.filter((packet) => packet.provenance?.systems?.includes("proposal"));
        expect(asked).toHaveLength(1);
        expect(asked[0].provenance?.decision?.question).toBe("minister-proposal");
        const campaign = applyAll(failing, packets);
        const proposal = campaign.cabinetAgenda.proposals[0];
        expect(campaign.cabinetAgenda.lastProposalTurn).toBe(failing.turn);
        expect(cabinetAgendaPackets(campaign).some((packet) => packet.provenance?.systems?.includes("proposal"))).toBe(false);
        const price = projectMinisterProposal(campaign, proposal.id);
        if (!price.ok)
            throw new Error(price.reason);
        expect(price.cost.treasury).toBeLessThan(0);
        const taken = takeMinisterProposal(campaign, proposal.id);
        if (!taken.ok)
            throw new Error(taken.reason);
        const metric = taken.packet.effects.find((effect) => effect.kind === "metric");
        expect(metric && metric.kind === "metric" ? metric.deltas : undefined).toEqual(price.cost);
        // A request is the cabinet's own business, never an authored decision handed off.
        const kinds = new Set(taken.packet.effects.map((effect) => effect.kind));
        for (const kind of kinds)
            expect(["metric", "institution", "person", "cabinetAgenda", "nomination", "feed"]).toContain(kind);
    });
    it("reaches the Desk in the order the Chief of Staff reads the building", () => {
        const two = withQuality(withQuality(quiet, "INST-TREASURY", 0.35), "INST-DOE", 0.5);
        const asked = cabinetAgendaPackets(two).find((packet) => packet.provenance?.systems?.includes("proposal"));
        expect(asked?.provenance?.decision?.subject).toBe(TREASURY);
        expect(triageBar(two)).toBeGreaterThan(0);
    });
});
describe("loyalty's politics and competence's fall", () => {
    const holder = holderOf(founded, TREASURY);
    it("costs a Secretary from across the aisle and far from the President's politics a little each week, never past the floor", () => {
        const crosser = { ...holder, base: { ...holder.base, party: "party-usa-republican", ideology: { economicLeftRight: 0.9, authLibertarian: 0.8, nationalistGlobalist: 0.9 } }, loyaltyAtAppointment: holder.base.loyalty };
        const drift = politicalShiftFor(founded, crosser);
        expect(drift).toBeLessThan(0);
        const atFloor = { ...crosser, base: { ...crosser.base, loyalty: holder.base.loyalty - POLITICAL_FLOOR } };
        expect(politicalShiftFor(founded, atFloor)).toBe(0);
        const near = { ...crosser, base: { ...crosser.base, loyalty: holder.base.loyalty - POLITICAL_FLOOR + 0.0005 } };
        expect(politicalShiftFor(founded, near)).toBeGreaterThanOrEqual(-0.0005);
        const ownSide = { ...holder, base: { ...holder.base, ideology: founded.founding.leader.ideology } };
        expect(politicalShiftFor(founded, ownSide)).toBe(0);
    });
    it("marks a Secretary's competence down only while their department is underwater, and never under the floor", () => {
        expect(competenceDecayFor(founded, TREASURY, holder)).toBe(0);
        const underwater = withQuality(founded, "INST-TREASURY", 0.3);
        expect(competenceDecayFor(underwater, TREASURY, holder)).toBeLessThan(0);
        const spent = { ...holder, base: { ...holder.base, competence: COMPETENCE_DECAY_FLOOR } };
        expect(competenceDecayFor(underwater, TREASURY, spent)).toBe(0);
    });
    it("takes the fall out of the Secretary's competence in the week's loyalty phase", () => {
        const underwater = withQuality(founded, "INST-TREASURY", 0.3);
        const before = holderOf(underwater, TREASURY).base.competence;
        const fall = competenceDecayFor(underwater, TREASURY, holderOf(underwater, TREASURY));
        const after = applyAll(underwater, cabinetLoyaltyPhase(underwater));
        expect(holderOf(after, TREASURY).base.competence).toBeCloseTo(before + fall, 6);
        expect(holderOf(applyAll(founded, cabinetLoyaltyPhase(founded)), TREASURY).base.competence).toBe(holderOf(founded, TREASURY).base.competence);
    });
});
describe("the heads of the bodies below the cabinet", () => {
    it("carry their competence into what their agency delivers, and a Secretary's department does not double-count it", () => {
        const fema = institutionDef("INST-FEMA");
        const runtime = founded.institutions["INST-FEMA"];
        expect(deriveImplementationQuality(runtime, fema, 0.95)).toBeGreaterThan(deriveImplementationQuality(runtime, fema, 0.5));
        expect(leaderDeliveryTerm(institutionDef("INST-TREASURY"), 0.2)).toBe(0);
    });
    it("rank a mid-term bench by fit to the President, not by competence alone", () => {
        const open = dismissed(founded, TREASURY);
        const bench = selectAppointableFor(open, TREASURY);
        const firstAcross = bench.findIndex((runtime) => runtime.base.party !== "party-usa-democrat");
        const lastOwn = bench.map((runtime) => runtime.base.party === "party-usa-democrat").lastIndexOf(true);
        if (firstAcross >= 0)
            expect(lastOwn).toBeLessThan(firstAcross);
    });
});
describe("the Chief of Staff's hold on the building", () => {
    it("is a bounded share of every break rate, and moves with the chief", () => {
        const chief = founded.institutions["INST-PRESIDENCY"].leader;
        const strong = withPerson(founded, chief, { competence: 1, loyalty: 1 });
        const weak = withPerson(founded, chief, { competence: 0.2, loyalty: 0.1 });
        expect(chiefOfStaffDiscipline(strong)).toBe(0.15);
        expect(chiefOfStaffDiscipline(weak)).toBe(-0.15);
        const secretary = holderOf(founded, TREASURY).base;
        expect(breakRateOf(strong, secretary)).toBeLessThan(cabinetRiskRate(secretary));
        expect(breakRateOf(weak, secretary)).toBeGreaterThan(cabinetRiskRate(secretary));
    });
});
