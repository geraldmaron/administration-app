import { GOVERNOR_ASSENT_FLOOR, authorizes, governorAssents, hasLapsed, emergencyCauseLabel, selectDeclaredEmergencies, weeksToLapse, } from "@admin/engine";
import { STATE_CAPITOLS, STATE_ECONOMY_AXES, districtsOfState, worldCities } from "@admin/world";
import { formatRatio } from "../format/figures";
import { place } from "../navigation/places";
import { conditionReadings } from "./board-state";
import { assembleDistrictDossier } from "./district-dossier";
import { leanWords, outputWords, peopleWords } from "./nation-overview";
import { stateApprovalReading } from "./state-approval";
import { stateVitals } from "./state-vitals";
// One state, read the way its dossier lays it out: who governs it and how
// they stand toward the administration, how it rates the President beside how
// it would vote, who it sends to Congress, what its economy is made of, and
// what it is living through and remembers. Every figure comes from the
// dataset row or the campaign's live overlay; nothing is estimated here.
export const PARTY_WORDS = { democrat: "Democrat", republican: "Republican", independent: "Independent" };
export const ECONOMY_AXIS_LABELS = {
    industrial: "Industry and manufacturing",
    agricultural: "Farming",
    energy: "Energy",
    tech: "Technology",
    services: "Services",
    defense: "Defense",
};
/** How a governor's disposition reads, with the assent line as the edge between the middle two words. */
export function governorDispositionWord(disposition) {
    if (disposition >= 0.7)
        return "Allied";
    if (disposition >= GOVERNOR_ASSENT_FLOOR)
        return "Cooperative";
    if (disposition >= 0.25)
        return "Guarded";
    return "Opposed";
}
function governorReading(campaign, governor) {
    return {
        name: campaign.people[governor.person]?.base.name ?? "The governor",
        party: governor.party,
        partyWord: PARTY_WORDS[governor.party],
        disposition: governor.disposition,
        dispositionWord: governorDispositionWord(governor.disposition),
        assents: governorAssents(governor),
        assentFloor: GOVERNOR_ASSENT_FLOOR,
        ...(governor.termEnds ? { termEnds: governor.termEnds } : {}),
    };
}
const SEAT_CLASS_YEAR = { 1: "Class I", 2: "Class II", 3: "Class III" };
function houseOf(districts) {
    const democrat = districts.filter((district) => district.holder === "democrat").length;
    const republican = districts.filter((district) => district.holder === "republican").length;
    return { seats: districts.length, democrat, republican, unheld: districts.length - democrat - republican };
}
function industryOf(economy) {
    return STATE_ECONOMY_AXES.map((axis) => ({ axis, label: ECONOMY_AXIS_LABELS[axis], share: economy[axis], text: formatRatio(economy[axis]) })).sort((a, b) => b.share - a.share);
}
/** The state's largest metros in the gazetteer, biggest first. */
/** A Senate seat with the member who holds it, matched by state and class. */
function senateSeat(campaign, state, seat) {
    const member = (campaign.congress.members ?? []).find((row) => row.chamber === "senate" && row.state === state && row.seatClass === seat.seatClass);
    const name = member ? campaign.people[member.person]?.base.name : undefined;
    return {
        party: seat.party,
        partyWord: PARTY_WORDS[seat.party],
        up: SEAT_CLASS_YEAR[seat.seatClass],
        ...(member && name ? { senator: { name, href: place.person(member.person) } } : {}),
    };
}
export function stateMetros(id, limit = 6) {
    return worldCities
        .filter((city) => city.state === id)
        .sort((a, b) => b.population - a.population)
        .slice(0, limit)
        .map((city) => ({ id: city.id, name: city.name, population: city.population, populationText: peopleWords(city.population), lon: city.lon, lat: city.lat }));
}
function memoryOf(campaign, id) {
    const runtime = campaign.states[id];
    const claims = (runtime?.claims ?? []).map((claim) => ({ signature: claim.signature, reason: claim.reason, weeksLeft: Math.max(0, claim.expiresTurn - campaign.turn), weight: claim.weight }));
    const marks = (runtime?.marks ?? []).map((mark) => ({ signature: mark.signature, reason: mark.reason, forYou: mark.valence > 0, weight: mark.weight }));
    const emergencies = selectDeclaredEmergencies(campaign)
        .filter((emergency) => !hasLapsed(emergency, campaign.turn) && authorizes(emergency, id))
        .map((emergency) => ({
        id: emergency.id,
        title: `Emergency declared: ${emergencyCauseLabel(emergency.cause)}`,
        statewide: emergency.scope.kind === "state",
        weeksLeft: Math.max(0, weeksToLapse(emergency, campaign.turn)),
    }));
    return { claims, marks, emergencies };
}
/** One state's dossier, or undefined for a state the campaign does not carry. */
export function stateDossier(campaign, id) {
    const runtime = campaign.states[id];
    if (!runtime)
        return undefined;
    const districts = districtsOfState(id).flatMap((district) => assembleDistrictDossier(campaign, district.id) ?? []);
    const capitol = STATE_CAPITOLS.find((row) => row.state === id);
    const approval = stateApprovalReading(campaign, id);
    const { character } = runtime.base;
    return {
        id,
        name: runtime.base.name,
        href: place.state(id),
        electoralVotes: runtime.base.electoralVotes,
        population: runtime.population,
        populationText: peopleWords(runtime.population),
        grpText: outputWords(runtime.base.grp),
        lean: runtime.lean,
        leanText: leanWords(runtime.lean),
        ...(approval ? { approval } : {}),
        ...(capitol ? { capitol: { name: capitol.capitol, city: capitol.city } } : {}),
        ...(runtime.governor ? { governor: governorReading(campaign, runtime.governor) } : {}),
        senate: (runtime.delegation?.senate ?? []).map((seat) => senateSeat(campaign, id, seat)),
        house: houseOf(districts),
        districts,
        vitals: stateVitals(campaign, id) ?? [],
        industry: industryOf(character.economy),
        federalDependence: character.federalDependence,
        urbanization: character.urbanization,
        metros: stateMetros(id),
        conditions: conditionReadings(campaign).filter((reading) => reading.state === id),
        ...memoryOf(campaign, id),
    };
}
