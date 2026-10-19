import { describe, expect, it } from "vitest";
import { Person } from "@admin/world";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { makeCampaignSeed } from "./rng.js";
import { buildPersonNetwork, personNetworkFor } from "./person-network.js";
/**
 * Fixtures written as biographies rather than as attribute bags, because every
 * rule now reads a working life on a timeline. Each one's spans are worked out
 * in the comment beside it in years-before-now — `age - startAge` back to
 * `age - startAge - years` — which is the only arithmetic these rules do.
 */
const make = (fields) => Person.parse({ ...person, ...fields });
/** Diplomatic corps 35 → 5 years ago. Entered the world 35 years back. */
const senior = make({
    id: "PER-NET-SENIOR",
    name: "Ada Morales",
    age: 60,
    career: [{ archetype: "diplomatic-corps", years: 30, startAge: 25 }],
    party: "party-democrat",
});
/** Diplomatic corps 17 → 2 years ago: twelve years alongside Morales, eighteen years behind her. */
const junior = make({
    id: "PER-NET-JUNIOR",
    name: "Ben Price",
    age: 40,
    career: [{ archetype: "diplomatic-corps", years: 15, startAge: 23 }],
    party: "party-democrat",
});
/** Same school as Price, same study years, an entirely different working life. */
const classmate = make({
    id: "PER-NET-CLASSMATE",
    name: "Cleo Adeyemi",
    age: 40,
    career: [{ archetype: "business", years: 15, startAge: 23 }],
    party: "party-republican",
});
/** Same party as the two below, no working world in common with either. */
const partisanLeft = make({
    id: "PER-NET-PARTISAN-L",
    name: "Dara Okonkwo",
    age: 50,
    education: { school: "SCH-USA-YALE", field: "economics", postgraduate: false },
    career: [{ archetype: "local-government", years: 25, startAge: 25 }],
    party: "party-green",
    ideology: { economicLeftRight: -0.9, authLibertarian: -0.6, nationalistGlobalist: -0.7 },
});
const partisanRight = make({
    id: "PER-NET-PARTISAN-R",
    name: "Eli Braun",
    age: 50,
    education: { school: "SCH-USA-STANFORD", field: "economics", postgraduate: false },
    career: [{ archetype: "labor-union", years: 25, startAge: 25 }],
    party: "party-green",
    ideology: { economicLeftRight: 0.9, authLibertarian: 0.7, nationalistGlobalist: 0.8 },
});
/** A foreign diplomat whose posting ran alongside Morales's. */
const foreignCounterpart = make({
    id: "PER-NET-FOREIGN",
    name: "Fen Liu",
    nationality: "ALP",
    age: 58,
    career: [{ archetype: "diplomatic-corps", years: 28, startAge: 26 }],
    eligibleRoles: ["role-foreign-minister"],
    party: undefined,
});
const HOME = [senior, junior, classmate, partisanLeft, partisanRight];
function edgeBetween(network, a, b) {
    return network.find((edge) => (edge.from === a.id && edge.to === b.id) || (edge.from === b.id && edge.to === a.id));
}
describe("buildPersonNetwork", () => {
    it("is deterministic for the same seed and cast", () => {
        const seed = makeCampaignSeed("person-network-determinism");
        const once = buildPersonNetwork(HOME, seed);
        const twice = buildPersonNetwork(HOME, seed);
        expect(twice).toEqual(once);
    });
    it("never emits a self-edge", () => {
        const network = buildPersonNetwork(HOME, makeCampaignSeed("person-network-self"));
        for (const edge of network) {
            expect(edge.from).not.toBe(edge.to);
        }
    });
    it("makes a mentorship out of seniority in a shared working world, pointing senior to junior", () => {
        const network = buildPersonNetwork(HOME, makeCampaignSeed("person-network-mentor"));
        const edge = edgeBetween(network, senior, junior);
        expect(edge).toBeDefined();
        expect(edge.kind).toBe("mentor");
        expect(edge.provenance).toBe("diplomatic");
        // Directional, and one edge rather than two: the senior figure is `from`.
        expect(edge.from).toBe(senior.id);
        expect(edge.to).toBe(junior.id);
        // The reason cites the facts the rule actually read.
        expect(edge.reason).toContain("the diplomatic corps");
        expect(edge.reason).toContain("Morales");
        expect(edge.reason).toContain("Price");
    });
    it("refuses a mentorship when the two entered the same world together", () => {
        // Same working world, same years, four years apart in age: colleagues.
        const peerOfSenior = make({
            id: "PER-NET-COEVAL",
            name: "Gil Sanders",
            age: 56,
            career: [{ archetype: "diplomatic-corps", years: 26, startAge: 25 }],
        });
        const network = buildPersonNetwork([senior, peerOfSenior], makeCampaignSeed("person-network-coeval"));
        const edge = edgeBetween(network, senior, peerOfSenior);
        expect(edge).toBeDefined();
        expect(edge.kind).toBe("former-colleague");
    });
    it("refuses a school tie between two people whose study years cannot have overlapped", () => {
        // The defect this module was rewritten for: a shared alma mater and a wide
        // age gap used to be read as mentorship "there". Twenty years apart, the
        // two were never on that campus in the same year, and neither taught.
        const oldAlum = make({
            id: "PER-NET-ALUM-OLD",
            name: "Hana Ito",
            age: 65,
            career: [{ archetype: "medicine", years: 30, startAge: 25 }],
            party: undefined,
        });
        const youngAlum = make({
            id: "PER-NET-ALUM-YOUNG",
            name: "Ivo Marek",
            age: 38,
            career: [{ archetype: "activism", years: 12, startAge: 25 }],
            party: undefined,
        });
        const network = buildPersonNetwork([oldAlum, youngAlum], makeCampaignSeed("person-network-alumni"));
        expect(network).toHaveLength(0);
    });
    it("reads two people out of the same school in the same years as peers, not as mentor and protégé", () => {
        const network = buildPersonNetwork(HOME, makeCampaignSeed("person-network-peer"));
        const edge = edgeBetween(network, junior, classmate);
        expect(edge).toBeDefined();
        expect(edge.kind).toBe("peer");
        expect(edge.provenance).toBe("education");
    });
    it("needs an arena before ideology can make a rivalry", () => {
        const seed = makeCampaignSeed("person-network-rival");
        const shareAParty = buildPersonNetwork([partisanLeft, partisanRight], seed);
        expect(shareAParty).toHaveLength(1);
        expect(shareAParty[0].kind).toBe("rival");
        expect(shareAParty[0].provenance).toBe("party");
        // The same two readings, with the party taken away: no arena, no tie.
        const strangers = buildPersonNetwork([partisanLeft, make({ ...partisanRight, id: "PER-NET-STRANGER", party: undefined })], seed);
        expect(strangers).toHaveLength(0);
    });
    it("keeps a working life inside one country, and a counterpart across two", () => {
        const network = buildPersonNetwork([senior, junior, foreignCounterpart], makeCampaignSeed("person-network-abroad"));
        for (const edge of network) {
            const from = [senior, junior, foreignCounterpart].find((p) => p.id === edge.from);
            const to = [senior, junior, foreignCounterpart].find((p) => p.id === edge.to);
            if (from.nationality === to.nationality)
                continue;
            expect(edge.kind, "the only tie that may cross a border is a counterpart").toBe("prior-counterpart");
        }
        const across = edgeBetween(network, senior, foreignCounterpart);
        expect(across).toBeDefined();
        expect(across.kind).toBe("prior-counterpart");
        expect(across.provenance).toBe("diplomatic");
    });
    it("says nothing about two people who share no history at all", () => {
        const alone = make({
            id: "PER-NET-ALONE",
            name: "Jo Winter",
            age: 44,
            education: { school: "SCH-USA-MIT", field: "engineering", postgraduate: false },
            career: [{ archetype: "state-media", years: 20, startAge: 24 }],
            party: undefined,
            ideology: { economicLeftRight: 0.3, authLibertarian: 0.3, nationalistGlobalist: 0.3 },
        });
        const network = buildPersonNetwork([...HOME, alone], makeCampaignSeed("person-network-alone"));
        for (const edge of network) {
            expect(edge.from).not.toBe(alone.id);
            expect(edge.to).not.toBe(alone.id);
        }
    });
    it("caps a person at six ties and keeps no floor under them", () => {
        // A cast wide enough for the cap to bind: twelve people in one working
        // world, all of an age, so every pair is a colleague candidate.
        const crowd = Array.from({ length: 12 }, (_, index) => make({
            id: `PER-NET-CROWD-${index}`,
            name: `Crowd ${index}`,
            age: 50 + (index % 3),
            career: [{ archetype: "civil-service", years: 25, startAge: 25 }],
            party: undefined,
        }));
        const network = buildPersonNetwork(crowd, makeCampaignSeed("person-network-cap"));
        const counts = new Map();
        for (const edge of network) {
            counts.set(edge.from, (counts.get(edge.from) ?? 0) + 1);
            counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1);
        }
        expect(counts.size).toBeGreaterThan(0);
        for (const count of counts.values()) {
            expect(count).toBeLessThanOrEqual(6);
        }
    });
});
describe("the network memo", () => {
    it("survives the object replacement a commit performs, when the cast has not changed", () => {
        // `apply()` replaces `campaign.people` on every commit, and a week turn
        // shifts loyalty on it. Keyed on that object, the memo missed every week
        // and rebuilt the whole pair sweep — ~2.1s on a full cast — for a
        // byte-identical graph. The sweep reads only authored biography, so the
        // honest key is the roster.
        const campaign = buildCampaign();
        const first = personNetworkFor(campaign.people, campaign.seed);
        // The shape a week turn leaves behind: a new record, new runtimes, new
        // `base` objects, a moved loyalty — and the same people.
        const shifted = Object.fromEntries(Object.entries(campaign.people).map(([id, runtime]) => [
            id,
            { ...runtime, base: { ...runtime.base, loyalty: Math.min(1, runtime.base.loyalty + 0.01) } },
        ]));
        const second = personNetworkFor(shifted, campaign.seed);
        expect(second, "the same graph, not merely an equal one").toBe(first);
    });
    it("rebuilds when somebody leaves the cast", () => {
        const campaign = buildCampaign();
        const first = personNetworkFor(campaign.people, campaign.seed);
        const [goneId] = Object.keys(campaign.people);
        const buried = {
            ...campaign.people,
            [goneId]: { ...campaign.people[goneId], alive: false },
        };
        const second = personNetworkFor(buried, campaign.seed);
        expect(second).not.toBe(first);
        for (const edge of second) {
            expect(edge.from).not.toBe(goneId);
            expect(edge.to).not.toBe(goneId);
        }
    });
    it("rebuilds under a different seed, on the same cast", () => {
        const campaign = buildCampaign();
        const first = personNetworkFor(campaign.people, campaign.seed);
        const second = personNetworkFor(campaign.people, makeCampaignSeed("a-different-world"));
        expect(second).not.toBe(first);
    });
});
it("public biography graph is byte-identical when private ideology and traits change before ranking", () => {
    const seed = makeCampaignSeed("public-network-private-mutation");
    const changed = HOME.map((entry) => ({ ...entry, ideology: { economicLeftRight: 1, authLibertarian: -1, nationalistGlobalist: 1 }, ambition: 1, loyalty: 0, integrity: 0, competence: 1, traits: [] }));
    expect(JSON.stringify(buildPersonNetwork(changed, seed, true))).toBe(JSON.stringify(buildPersonNetwork(HOME, seed, true)));
    expect(buildPersonNetwork(HOME, seed, true).some((edge) => ["ally", "rival", "mentor"].includes(edge.kind))).toBe(false);
});
