import { Charter } from "../schemas/org-cradle-charter.js";
import { US_ID } from "./nations.js";
import { worldCities } from "./cities.js";
// The United States is the seat of play, so it carries what NPC nations do
// not need: a fully authored constitutional charter and named places for the
// situation map. The nation record itself lives with its peers in nations.ts.
// No people live here: every person a campaign meets, the starting cabinet
// included, is generated from the seed and the role profiles in people.ts, so
// a named record on a country would be a person no campaign ever draws.
// --- Charter ---------------------------------------------------------------
// One founding path, not three: the player takes an office that already
// exists. The ids in cabinetRoles stay the cross-charter contract the engine
// keys on; roleTitles carries the American titles the player actually reads.
export const CHARTER_USA_CONSTITUTION = Charter.parse({
    id: "charter-usa-constitution",
    name: "The Constitution of the United States",
    removalMechanism: "impeachment",
    // The full table, in the order of succession the departments were created
    // in — which is the order a real cabinet is seated and ranked in, and the
    // same `cabinetRank` the institution catalog already carried for each
    // secretary's office. It used to stop after Justice, so ten departments had
    // a capacity reading and no minister: the roster and the executive branch
    // were two accounts of one government and disagreed on screen about who was
    // in the chair.
    cabinetRoles: [
        "role-president",
        "role-foreign-minister",
        "role-treasury-minister",
        "role-defense-minister",
        "role-attorney-general",
        "role-interior-minister",
        "role-agriculture-secretary",
        "role-commerce-secretary",
        "role-labor-secretary",
        "role-health-secretary",
        "role-housing-secretary",
        "role-transportation-secretary",
        "role-energy-secretary",
        "role-education-secretary",
        "role-veterans-secretary",
        "role-homeland-secretary",
        "role-intelligence-director",
    ],
    institutions: [
        { name: "The Presidency", role: "Directly elected executive, fixed four-year term.", kind: "executive" },
        { name: "Congress", role: "Brings and tries impeachment; otherwise cannot remove the President.", kind: "assembly" },
        { name: "the Federal Judiciary", role: "Reviews statutes and executive acts; the last check an order faces.", kind: "judiciary" },
    ],
    decisionConstraint: "Treaties require the consent of two-thirds of Senators present. Bills for raising revenue originate in the House; other legislation may originate in either chamber. The President cannot dissolve Congress, and neither chamber can remove the President by ordinary vote.",
    successionRule: "The Vice President assumes the Presidency for the remainder of the term.",
    roleTitles: {
        "role-president": "President",
        "role-foreign-minister": "Secretary of State",
        "role-treasury-minister": "Secretary of the Treasury",
        "role-defense-minister": "Secretary of Defense",
        "role-attorney-general": "Attorney General",
        "role-interior-minister": "Secretary of the Interior",
        "role-agriculture-secretary": "Secretary of Agriculture",
        "role-commerce-secretary": "Secretary of Commerce",
        "role-labor-secretary": "Secretary of Labor",
        "role-health-secretary": "Secretary of Health and Human Services",
        "role-housing-secretary": "Secretary of Housing and Urban Development",
        "role-transportation-secretary": "Secretary of Transportation",
        "role-energy-secretary": "Secretary of Energy",
        "role-education-secretary": "Secretary of Education",
        "role-veterans-secretary": "Secretary of Veterans Affairs",
        "role-homeland-secretary": "Secretary of Homeland Security",
        "role-intelligence-director": "Director of National Intelligence",
    },
    parties: [
        {
            id: "party-usa-democrat",
            name: "Democratic Party",
            shortName: "Democrat",
            kind: "major",
            beliefs: { economicLeftRight: -0.4, authLibertarian: -0.2, nationalistGlobalist: -0.3 },
            cohesion: 0.8,
        },
        {
            id: "party-usa-republican",
            name: "Republican Party",
            shortName: "Republican",
            kind: "major",
            beliefs: { economicLeftRight: 0.4, authLibertarian: 0.2, nationalistGlobalist: 0.3 },
            cohesion: 0.8,
        },
        {
            id: "party-usa-independent",
            name: "Independent",
            shortName: "Independent",
            kind: "independent",
            // Not a centrist party: the bloc of people who joined neither party.
            //
            // The mean sits on the economic center because that is what averaging a
            // bloc containing both ends produces, and because ticket assignment is
            // read off this axis — a president who runs as an independent is not
            // asserting a position between the parties, they are asserting no party.
            // The two axes that are not the center are the ones the record actually
            // supports: people outside both parties are markedly more anti-
            // institutional than either caucus, and somewhat more protectionist than
            // the party that nominates on trade openness.
            //
            // What makes this bloc different is `cohesion`, not the mean. At 0.3 the
            // same act that moves a whipped caucus by 0.6 moves this one by a
            // fraction of that, in whichever direction the mean points — which is why
            // an independent president cannot whip the very bloc they ran as.
            beliefs: { economicLeftRight: 0, authLibertarian: -0.35, nationalistGlobalist: 0.15 },
            cohesion: 0.3,
        },
    ],
});
export const usaCharter = CHARTER_USA_CONSTITUTION;
// --- Who the American bench runs as -------------------------------------------
/**
 * How often a generated American in each seat carries no party, beside a
 * Democrat and a Republican at one each.
 *
 * The charter's generic draw weighs every major ticket twice and every minor
 * once, which put a fifth of America's political class outside both parties:
 * nine independent governors and an Independent House Majority Leader. The
 * record the leader table opened (us-bench.sources.md, 2026-09-23) has two
 * independents in the Senate, one in the House, none among the fifty
 * governors and none among the confirmed secretaries of the last four
 * administrations, and every congressional leader belongs to a caucus. A seat
 * with no entry keeps the generic draw: the bureau chiefs are career officials
 * whose party is incidental to the job, and a journalist owes no ticket.
 */
const US_INDEPENDENT_WEIGHT = {
    ...Object.fromEntries(CHARTER_USA_CONSTITUTION.cabinetRoles.slice(1).map((role) => [role, 0])),
    "role-congressional-leader": 0,
    "role-opposition-leader": 0,
    "role-governor": 0,
    "role-committee-chair": 0.02,
};
export function usPartyWeightsFor(role) {
    const independent = US_INDEPENDENT_WEIGHT[role];
    return independent === undefined ? undefined : { democrat: 1, republican: 1, independent };
}
/**
 * The fewest members of each major party a seat's bench carries.
 *
 * A bench of eight drawn even between the parties comes up with one Republican
 * or none about one seed in thirty, and a President then has no co-partisan to
 * shortlist for that chair. Each floor is what the seat's own seating needs:
 * three for a cabinet chair so its shortlist leads with more than one of the
 * President's own party; five congressional leaders so one party can hold
 * every majority post after its running mate and chief of staff have left the
 * Hill for the White House; seventeen committee chairs for thirteen gavels, the
 * two leadership chairs and those same two departures; and eight bureau chiefs
 * for the four political offices a President fills from them. The fifty
 * governors carry no floor: their bench is exactly as deep as their career
 * prose, so a fifty-first would repeat a sentence, and the statehouses seat
 * whichever party the bench holds by lean.
 */
const US_PARTY_QUOTA = {
    ...Object.fromEntries(CHARTER_USA_CONSTITUTION.cabinetRoles.slice(1).map((role) => [role, 3])),
    "role-congressional-leader": 5,
    "role-committee-chair": 17,
    "role-agency-head": 8,
};
export function usPartyQuotaFor(role) {
    return US_PARTY_QUOTA[role] ?? 0;
}
export function usaPlacesFrom(cities) {
    const usCities = cities.filter((city) => city.nation === US_ID);
    const capital = usCities.find((city) => city.kind === "capital");
    const originLat = capital?.lat ?? 0;
    const originLon = capital?.lon ?? 0;
    return usCities.map((city) => ({
        name: city.name,
        kind: city.kind,
        dLat: city.lat - originLat,
        dLon: city.lon - originLon,
    }));
}
export const usaPlaces = usaPlacesFrom(worldCities);
