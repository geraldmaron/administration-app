import { foreignLeaderFor, graftDisclosed, institutionDef, institutionForRole, judiciaryBenchSeats, selectActiveNominations, selectFactions, selectFormerService, selectGovernor, figureRapport, selectHill, selectInstitutionLedBy, selectLoyaltyTrend, selectNation, selectPerson, } from "@admin/engine";
import { worldCities, worldDataset } from "@admin/world";
import { cabinetSeats } from "../cabinet/seats";
import { charterOf } from "../campaign/founding-options";
import { roleTitle } from "../format/figures";
import { leadTitle } from "../world/leaders";
import { nominationStanding } from "../government/machine";
import { caucusName, caucusParty } from "../congress/party-words";
import { personBackground } from "./person-background";
export * from "./person-background";
function hillStanding(campaign, personId) {
    const member = selectHill(campaign).find((entry) => entry.person?.id === personId);
    if (!member) {
        const seat = campaign.congress.members?.find((entry) => entry.person === personId);
        if (!seat)
            return undefined;
        return { kind: "hill", post: seat.seat, title: seat.chamber === "house" ? "Representative" : "Senator", chamber: seat.chamber === "house" ? "House" : "Senate", caucus: seat.party === "independent" ? "Independent" : caucusName(seat.party) };
    }
    return {
        kind: "hill",
        post: member.figure.post,
        title: member.post.title,
        chamber: member.post.chamber === "house" ? "House" : "Senate",
        caucus: caucusName(caucusParty(campaign, member.figure.caucus)),
        disposition: figureRapport(campaign.people, member.figure),
        influence: member.figure.influence,
    };
}
function officeStanding(campaign, personId, titles) {
    const seat = cabinetSeats(campaign).find((row) => row.holder?.id === personId);
    if (seat?.isPlayer)
        return { kind: "president" };
    if (seat) {
        const institution = institutionForRole(seat.role);
        return { kind: "cabinet", role: seat.role, title: roleTitle(seat.role, titles), ...(institution ? { institution } : {}) };
    }
    const bench = judiciaryBenchSeats(campaign).find((row) => row.personId === personId);
    if (bench)
        return { kind: "justice", seat: bench.seat, chief: bench.senior };
    return undefined;
}
export function personStanding(campaign, personId) {
    const runtime = selectPerson(campaign, personId);
    if (!runtime || !runtime.alive)
        return { kind: "deceased" };
    if (runtime.municipalCity && runtime.currentRole === "role-mayor")
        return { kind: "mayor", city: runtime.municipalCity, cityName: worldCities.find((city) => city.id === runtime.municipalCity)?.name ?? runtime.municipalCity, ...(runtime.state ? { state: runtime.state } : {}) };
    const titles = charterOf(campaign).roleTitles;
    const office = officeStanding(campaign, personId, titles) ?? hillStanding(campaign, personId);
    if (office)
        return office;
    if (runtime.state && runtime.currentRole === "role-governor") {
        const standing = selectGovernor(campaign, runtime.state);
        return {
            kind: "governor",
            state: runtime.state,
            stateName: campaign.states[runtime.state]?.base.name ?? runtime.state,
            ...(standing ? { party: standing.party, disposition: standing.disposition } : {}),
        };
    }
    const agency = selectInstitutionLedBy(campaign, personId);
    if (agency) {
        const office = agency.offices[0];
        const circuit = campaign.institutions[agency.id]?.lowerBenchSeat?.circuit;
        return { kind: "agency", institution: agency, title: office?.title ?? agency.name, removal: office?.removal ?? "at-will", ...(circuit ? { circuit } : {}) };
    }
    const nationality = runtime.base.nationality;
    if (nationality !== campaign.founding.nation) {
        const nationName = selectNation(campaign, nationality)?.base.identity.name ?? nationality;
        const leads = foreignLeaderFor(campaign, nationality);
        if (leads && leads.person === personId) {
            // Their own country's chair, titled the way that country titles it; the
            // campaign's charter is the player's, and a foreign national holds no
            // `currentRole` for it to name.
            const charter = worldDataset.charters.find((entry) => entry.id === selectNation(campaign, nationality)?.base.identity.government);
            const lead = charter?.cabinetRoles[0];
            return { kind: "foreign-leader", nation: nationality, nationName, ...(lead ? { title: leadTitle(campaign, nationality, lead, charter.roleTitles) } : {}) };
        }
        return { kind: "foreign", nation: nationality, nationName };
    }
    const former = selectFormerService(campaign, personId);
    if (former)
        return { kind: "former", role: former.role, title: roleTitle(former.role, titles), departure: former.departure };
    return { kind: "available" };
}
function counselOf(campaign, personId) {
    return campaign.ledger
        .flatMap((entry) => {
        const counsel = entry.counsel;
        if (!counsel)
            return [];
        if (counsel.person === personId)
            return [{ entry, stance: counsel.stance, primary: true }];
        const voice = counsel.room?.find((candidate) => candidate.person === personId);
        return voice ? [{ entry, stance: voice.stance, primary: false }] : [];
    })
        .reverse();
}
/** Internal recipient decisions are engine audit evidence, never dossier facts. */
function dossierRecord(entry) {
    if (!entry.causal || (!("internalDecisions" in entry.causal) && !entry.causal.graft))
        return entry;
    const causal = Object.fromEntries(Object.entries(entry.causal).filter(([key]) => key !== "internalDecisions" && (key !== "decision" || !entry.causal?.graft)));
    return { ...entry, causal };
}
export function personDossier(campaign, personId) {
    const runtime = selectPerson(campaign, personId);
    if (!runtime)
        return undefined;
    const titles = charterOf(campaign).roleTitles;
    const counsel = counselOf(campaign, personId);
    const advised = new Set(counsel.map((row) => row.entry));
    const namedIn = campaign.ledger
        .filter((entry) => graftDisclosed(campaign, entry) && !advised.has(entry) && (entry.causal?.entities ?? []).includes(personId))
        .reverse();
    const nomination = selectActiveNominations(campaign).find((row) => row.nominee === personId);
    const trend = selectLoyaltyTrend(campaign, personId);
    const faction = runtime.affiliation ? selectFactions(campaign, titles).find((row) => row.id === runtime.affiliation) : undefined;
    const background = personBackground(runtime.base, titles);
    return {
        standing: personStanding(campaign, personId),
        ...(nomination
            ? {
                nomination: {
                    nomination,
                    officeTitle: institutionDef(nomination.institution)?.offices.find((office) => office.id === nomination.office)?.title ?? String(nomination.office),
                    standing: nominationStanding(nomination),
                },
            }
            : {}),
        ...(trend ? { loyaltyTrend: trend } : {}),
        ...(faction ? { faction } : {}),
        counsel: counsel.map((row) => ({ ...row, entry: dossierRecord(row.entry) })),
        namedIn: namedIn.map(dossierRecord),
        education: background.education,
        eligible: background.eligible,
    };
}
