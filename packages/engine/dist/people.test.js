import { describe, it, expect } from "vitest";
import { HERITAGE_SKIN_TONES, PortraitAgeBand, PortraitGenderPresentation, PortraitHeritage, PortraitSkinTone, ageBandFor, attireOptionsFor, leaderConstraintFor, NATION_LEADER_CONSTRAINTS, nationLeadRole, parsePortraitRef, personPoolSpecs, roleProfileByRole, US_GOVERNOR_BENCH_PER_PARTY, US_ID, seatHeritageMixFor, usPartyQuotaFor, usaCharter, worldDataset, } from "@admin/world";
import { createRngStreams, makeCampaignSeed, replay } from "./rng.js";
import { careerBankDepth } from "./bio.js";
import { birthplacePool, candidatesForRole, generateNationPool, generateWorldPool } from "./people.js";
import { personIdFor } from "./person-id.js";
const GOVERNOR_ROLE = "role-governor";
const seed = (s) => createRngStreams(makeCampaignSeed(s));
const worldFor = (s) => generateWorldPool(worldDataset.nations, personPoolSpecs, seed(s), worldDataset.charters);
describe("campaign person pool", () => {
    const depthFor = (spec, role) => spec.roleDepth?.[role] ?? spec.depthPerRole;
    it("staffs every role of every nation with real depth", () => {
        const pool = worldFor("staffing");
        for (const spec of personPoolSpecs) {
            for (const role of spec.roles) {
                const candidates = candidatesForRole(pool, spec.nation, role);
                const depth = depthFor(spec, role);
                const quota = spec.nation === US_ID ? usPartyQuotaFor(role) : 0;
                // Abroad a bench is exactly its depth. At home the quota pass may
                // append members so each major party reaches its floor, and never more
                // than the floor asks for — and the statehouses carry a bench of their
                // own past the fifty chairs, because a gubernatorial election with an
                // empty bench cannot change a seat's party.
                const appended = 2 * (spec.nation === US_ID && role === GOVERNOR_ROLE ? US_GOVERNOR_BENCH_PER_PARTY : quota);
                expect(candidates.length, `${spec.nation} / ${role}`).toBeGreaterThanOrEqual(depth);
                expect(candidates.length, `${spec.nation} / ${role}`).toBeLessThanOrEqual(depth + appended);
                if (appended === 0)
                    expect(candidates.length, `${spec.nation} / ${role}`).toBe(depth);
            }
        }
    });
    it("gives each major party at least its floor on every American bench that has one", () => {
        for (const seedText of ["floor-a", "floor-b", "floor-c"]) {
            const pool = worldFor(seedText).filter((person) => person.nationality === US_ID);
            const us = personPoolSpecs.find((spec) => spec.nation === US_ID);
            for (const role of us.roles) {
                const quota = usPartyQuotaFor(role);
                if (quota === 0)
                    continue;
                const bench = candidatesForRole(pool, US_ID, role);
                for (const party of ["party-usa-democrat", "party-usa-republican"]) {
                    expect(bench.filter((person) => person.party === party).length, `${seedText} ${role} ${party}`).toBeGreaterThanOrEqual(quota);
                }
            }
        }
    });
    it("seats almost nobody outside both parties in the offices the record fills from them", () => {
        const pool = worldFor("independents").filter((person) => person.nationality === US_ID);
        for (const role of ["role-governor", "role-congressional-leader", ...usaCharter.cabinetRoles.slice(1)]) {
            const bench = candidatesForRole(pool, US_ID, role);
            expect(bench.filter((person) => person.party === "party-usa-independent"), role).toEqual([]);
        }
    });
    // The bio composer walks its career bank by shortlist position, so a bench
    // deeper than the bank wraps and two people come out with the identical
    // opening sentence. Governors, bureau chiefs and committee chairs used to be
    // excused here because they are seated one to a chair rather than shortlisted
    // — but fifty governors over twelve lines is still four governors to a
    // sentence, read one dossier after another. Their banks are now a line per
    // chair, so the rule binds on every seat in the game and excuses nobody.
    it("keeps every nation's bench inside the depth the bio composer can tell apart", () => {
        for (const spec of personPoolSpecs) {
            for (const role of spec.roles) {
                expect(depthFor(spec, role), `${spec.nation} ${role}`).toBeLessThanOrEqual(careerBankDepth(role));
            }
        }
    });
    it("is reproducible: the same seed deals the identical cast twice", () => {
        const [a, b] = replay(makeCampaignSeed("repeat"), (streams) => generateWorldPool(worldDataset.nations, personPoolSpecs, streams, worldDataset.charters));
        expect(a).toEqual(b);
    });
    it("deals a different cast from a different seed", () => {
        const names = (s) => worldFor(s).map((p) => p.name);
        const a = names("campaign-alpha");
        const b = names("campaign-beta");
        const changed = a.filter((n, i) => n !== b[i]).length;
        expect(changed / a.length).toBeGreaterThan(0.5);
    });
    it("gives every person a unique id and a resolvable nationality", () => {
        const pool = worldFor("ids");
        const ids = new Set(pool.map((p) => p.id));
        expect(ids.size).toBe(pool.length);
        const nations = new Set(worldDataset.nations.map((n) => n.id));
        for (const person of pool)
            expect(nations.has(person.nationality)).toBe(true);
    });
    it("keeps every attribute inside the window its seat was authored with", () => {
        for (const spec of personPoolSpecs.slice(0, 12)) {
            const pool = generateNationPool(spec, "test", seed("windows"));
            for (const person of pool) {
                const profile = roleProfileByRole.get(person.eligibleRoles[0]);
                for (const key of ["competence", "loyalty", "ambition", "integrity", "charisma"]) {
                    expect(person[key], `${person.name} ${key}`).toBeGreaterThanOrEqual(profile.attributes[key].min);
                    expect(person[key], `${person.name} ${key}`).toBeLessThanOrEqual(profile.attributes[key].max);
                }
                // The incumbent of a foreign lead chair is the table's age, which may
                // sit outside what the seat's profile allows (leader-fidelity.test.ts
                // holds that age to its band); everyone else is the seat's.
                const role = person.eligibleRoles[0];
                if (leaderConstraintFor(spec.nation, role) && person.id === personIdFor(spec.nation, role, 0))
                    continue;
                expect(person.age).toBeGreaterThanOrEqual(profile.ageRange.min);
                expect(person.age).toBeLessThanOrEqual(profile.ageRange.max);
            }
        }
    });
    it("offers a cabinet draft that is a real choice, not a formality", () => {
        const pool = worldFor("draft");
        const spec = personPoolSpecs[0];
        const draft = candidatesForRole(pool, spec.nation, "role-treasury-minister");
        expect(draft.length).toBeGreaterThan(1);
        // Best-first, and the candidates differ on more than one axis — otherwise
        // the "choice" is just picking the top row.
        expect(draft[0].competence).toBeGreaterThanOrEqual(draft[draft.length - 1].competence);
        expect(new Set(draft.map((p) => p.loyalty)).size).toBeGreaterThan(1);
    });
    it("every person resolves to a portrait whose facets are all legal", () => {
        const pool = worldFor("portraits");
        for (const person of pool) {
            const facets = parsePortraitRef(person.portraitRef);
            const nation = person.nationality;
            const role = person.eligibleRoles[0];
            const party = person.party?.replace("party-usa-", "");
            expect(seatHeritageMixFor(nation, role, party).some((m) => m.heritage === facets.heritage), `${person.name} heritage ${facets.heritage} allowed for ${nation} ${role}`).toBe(true);
            expect(HERITAGE_SKIN_TONES[facets.heritage]).toContain(facets.skinTone);
            expect(attireOptionsFor(role).map((o) => o.value)).toContain(facets.attire);
            expect(facets.ageBand).toBe(ageBandFor(person.age));
        }
    });
    it("spans the full range of appearance across the world cast", () => {
        const facets = worldFor("range").map((p) => parsePortraitRef(p.portraitRef));
        const seen = (pick) => new Set(facets.map(pick));
        expect(seen((f) => f.heritage).size).toBe(PortraitHeritage.options.length);
        expect(seen((f) => f.gender).size).toBe(PortraitGenderPresentation.options.length);
        expect(seen((f) => f.ageBand).size).toBe(PortraitAgeBand.options.length);
        expect(seen((f) => f.skinTone).size).toBe(PortraitSkinTone.options.length);
    });
    // Three defects that a uniform draw produced, measured on the cast rather
    // than on the tables, because the cast is what a player sees. Each held at a
    // loose bound: the point is that the shape is right, not that a particular
    // seed lands on a particular number.
    it("does not put pattern hair loss on feminine-presenting officials", () => {
        const facets = worldFor("baldness").map((p) => parsePortraitRef(p.portraitRef));
        const feminine = facets.filter((f) => f.gender === "feminine");
        expect(feminine.length).toBeGreaterThan(50);
        expect(feminine.filter((f) => f.hairStyle === "bald").length).toBe(0);
    });
    it("varies head covering by nation instead of applying one rate everywhere", () => {
        // Three seeds: Iran's cabinet is a tenth women, so one seed seats too few
        // to measure a share on.
        const pool = ["covering", "covering-2", "covering-3"].flatMap(worldFor);
        const coveredShare = (nation) => {
            const facets = pool
                .filter((p) => p.nationality === nation)
                .map((p) => parsePortraitRef(p.portraitRef))
                .filter((f) => f.gender !== "masculine");
            // Asserted rather than skipped: a nation dropping out of the pool would
            // otherwise turn this into a test that passes by measuring nothing.
            expect(facets.length, `${nation} has a cast to measure`).toBeGreaterThan(10);
            return facets.filter((f) => f.hairStyle === "covered").length / facets.length;
        };
        // A secular northern European cabinet and a theocratic one should not
        // photograph the same way. Before this, both sat at about one in five.
        expect(coveredShare("ISL"), "ISL covered share").toBeLessThan(0.2);
        expect(coveredShare("IRN"), "IRN covered share").toBeGreaterThan(0.5);
    });
    it("keeps ceremonial dress rare among heads of government", () => {
        const pool = worldFor("ceremonial");
        const heads = pool.filter((p) => ["role-president", "role-prime-minister"].includes(p.eligibleRoles[0]));
        expect(heads.length).toBeGreaterThan(20);
        const ceremonial = heads.filter((p) => parsePortraitRef(p.portraitRef).attire === "ceremonial").length;
        expect(ceremonial / heads.length, "ceremonial share of heads of government").toBeLessThan(0.25);
    });
    it("gives the cast facial hair and eyewear, so a gallery is not one face in many suits", () => {
        const facets = worldFor("features").map((p) => parsePortraitRef(p.portraitRef));
        const masculine = facets.filter((f) => f.gender === "masculine");
        const bearded = masculine.filter((f) => f.facialHair !== "none").length / masculine.length;
        expect(bearded, "masculine facial hair share").toBeGreaterThan(0.2);
        expect(facets.filter((f) => f.gender === "feminine").every((f) => f.facialHair === "none")).toBe(true);
        const glasses = facets.filter((f) => f.eyewear === "glasses").length / facets.length;
        expect(glasses, "eyewear share").toBeGreaterThan(0.15);
    });
    it("draws the American cabinet from several heritages, not one", () => {
        const pool = worldFor("usa-mix");
        const heritagesFor = (nation) => new Set(pool
            .filter((p) => p.nationality === nation)
            .map((p) => parsePortraitRef(p.portraitRef).heritage)).size;
        expect(heritagesFor("USA"), "USA heritage spread").toBeGreaterThan(2);
    });
    // Presentation is no longer asked to vary inside every nation: a
    // government the record says seats no women (Afghanistan, Saudi Arabia)
    // draws none, and leader-fidelity.test.ts holds every cabinet to its share.
    it("does not staff any single nation with one age or one skin tone", () => {
        const pool = worldFor("per-nation-range");
        for (const spec of personPoolSpecs) {
            const facets = pool
                .filter((p) => p.nationality === spec.nation)
                .map((p) => parsePortraitRef(p.portraitRef));
            expect(new Set(facets.map((f) => f.ageBand)).size, `${spec.nation} age range`).toBeGreaterThan(1);
            expect(new Set(facets.map((f) => f.skinTone)).size, `${spec.nation} tone range`).toBeGreaterThan(1);
        }
    });
    it("seats a woman in exactly the lead chairs the leader table does, whatever the seed", () => {
        const women = Object.values(NATION_LEADER_CONSTRAINTS)
            .filter((row) => row.sex === "F")
            .map((row) => row.nation)
            .sort();
        for (const seedText of ["seniority-a", "seniority-b"]) {
            const pool = worldFor(seedText);
            const byId = new Map(pool.map((person) => [person.id, person]));
            const drawn = Object.keys(NATION_LEADER_CONSTRAINTS)
                .filter((nation) => {
                const incumbent = byId.get(personIdFor(nation, nationLeadRole(nation), 0));
                return parsePortraitRef(incumbent.portraitRef).gender === "feminine";
            })
                .sort();
            expect(drawn, seedText).toEqual(women);
        }
        expect(women).toHaveLength(15);
    });
    it("adding a nation does not disturb another nation's cast for the same seed", () => {
        const spec = personPoolSpecs[7];
        // Handed the same slate the world pool hands it. The isolation this test
        // defends is between *nations*, not between call sites: a standalone call
        // that was given no tickets while the world pool gives the nation its own
        // would differ for a reason that has nothing to do with another nation
        // being added.
        const alone = generateNationPool(spec, worldDataset.nations[7].identity.name, seed("stability"), worldDataset.nations[7].partySystem?.parties ?? []);
        const inWorld = generateWorldPool(worldDataset.nations, personPoolSpecs, seed("stability")).filter((p) => p.nationality === spec.nation);
        expect(inWorld).toEqual(alone);
    });
    it("gives every politician a ticket from their own country, never another's", () => {
        const pool = worldFor("tickets");
        const ticketsByNation = new Map(worldDataset.nations.map((nation) => [
            nation.id,
            new Set((nation.partySystem?.parties ?? (nation.id === US_ID ? (usaCharter.parties ?? []) : [])).map((party) => party.id)),
        ]));
        const americans = pool.filter((person) => person.nationality === US_ID);
        expect(americans.length).toBeGreaterThan(0);
        for (const person of pool) {
            if (person.party === undefined)
                continue;
            const own = ticketsByNation.get(person.nationality);
            expect(own?.has(person.party), `${person.name} (${person.nationality})`).toBe(true);
        }
    });
    it("leaves a country that runs no parties unlabeled, rather than inventing one", () => {
        const pool = worldFor("tickets");
        const partyless = new Set(worldDataset.nations
            .filter((nation) => nation.partySystem?.contest === "none")
            .map((nation) => nation.id));
        expect(partyless.size).toBeGreaterThan(0);
        const theirs = pool.filter((person) => partyless.has(person.nationality));
        expect(theirs.length).toBeGreaterThan(0);
        expect(theirs.every((person) => person.party === undefined)).toBe(true);
    });
    it("puts a politician on the platform of the ticket they carry", () => {
        const pool = worldFor("tickets");
        const byId = new Map(worldDataset.nations.flatMap((nation) => (nation.partySystem?.parties ?? []).map((party) => [party.id, party])));
        const ticketed = pool.filter((person) => person.party !== undefined && byId.has(person.party));
        expect(ticketed.length).toBeGreaterThan(100);
        // Ideology used to be three independent draws and the party was chosen
        // afterwards, so a politician could carry a ticket whose platform they sat
        // nowhere near. The ticket is drawn first now and the person around it.
        const near = ticketed.filter((person) => {
            const beliefs = byId.get(person.party).beliefs;
            const gap = (Math.abs(person.ideology.economicLeftRight - beliefs.economicLeftRight) +
                Math.abs(person.ideology.authLibertarian - beliefs.authLibertarian) +
                Math.abs(person.ideology.nationalistGlobalist - beliefs.nationalistGlobalist)) /
                3;
            return gap < 0.4;
        });
        expect(near.length / ticketed.length).toBeGreaterThan(0.9);
    });
});
describe("where a person is from", () => {
    const pool = worldFor("birthplace");
    const placesFor = (nation) => new Set(birthplacePool(nation));
    it("names a place from the person's own country, never from anywhere else", () => {
        for (const person of pool) {
            const places = placesFor(person.nationality);
            if (places.size === 0)
                continue;
            expect(person.birthplace, `${person.id} has no birthplace`).toBeDefined();
            expect(places.has(person.birthplace), `${person.id}: ${person.birthplace}`).toBe(true);
        }
    });
    // A country the dataset gives one or two cities would put its whole cast in
    // the same place, which is a fact about the country wearing a person's
    // clothes. Below the floor the record says nothing rather than something.
    it("says nothing at all for a country too thinly mapped to distinguish anybody", () => {
        const thin = personPoolSpecs.filter((spec) => placesFor(spec.nation).size === 0);
        expect(thin.length, "the floor never binds, so it is not doing anything").toBeGreaterThan(0);
        for (const spec of thin) {
            const cast = pool.filter((person) => person.nationality === spec.nation);
            expect(cast.length).toBeGreaterThan(0);
            for (const person of cast)
                expect(person.birthplace, `${person.id}`).toBeUndefined();
        }
    });
    it("says a place the way somebody from there would say it", () => {
        const american = pool.filter((person) => person.nationality === US_ID && person.birthplace);
        expect(american.length).toBeGreaterThan(0);
        // A US metro takes its state spelled out, because three Springfields are
        // three towns and because naming the state is how an American answers the
        // question. The district that is its own jurisdiction is the one exception:
        // it is already the whole answer and does not take a second one.
        for (const person of american) {
            if (person.birthplace === "Washington, D.C.")
                continue;
            expect(person.birthplace, `${person.id}`).toMatch(/, [A-Z][a-z]/);
            expect(person.birthplace, `${person.id} still carries its postal code`).not.toMatch(/, [A-Z]{2}$/);
        }
        // Nowhere else does: the dataset holds no second tier of place abroad, and
        // inventing one would be the fabrication this field exists to avoid.
        const abroad = pool.filter((person) => person.nationality !== US_ID && person.birthplace);
        const withState = abroad.filter((person) => person.birthplace.includes(","));
        expect(withState, withState.map((p) => p.birthplace).join(" / ")).toHaveLength(0);
    });
    it("spreads a cast across the places it has rather than piling it on the largest", () => {
        const american = pool
            .filter((person) => person.nationality === US_ID && person.birthplace)
            .map((person) => person.birthplace);
        const distinct = new Set(american).size;
        // The bench is deep enough that a uniform draw over 200 metros should reach
        // most of them; a generator that had quietly collapsed onto the capital
        // would show up here long before it showed up on a screen.
        expect(distinct).toBeGreaterThan(100);
        const commonest = Math.max(...[...new Set(american)].map((place) => american.filter((p) => p === place).length));
        expect(commonest / american.length).toBeLessThan(0.1);
    });
    it("is drawn, not stamped: another seed sends the same seat somewhere else", () => {
        const again = worldFor("birthplace-other");
        const byId = new Map(again.map((person) => [person.id, person]));
        const american = pool.filter((person) => person.nationality === US_ID && person.birthplace);
        const moved = american.filter((person) => byId.get(person.id)?.birthplace !== person.birthplace);
        expect(moved.length / american.length).toBeGreaterThan(0.5);
    });
    it("is reproducible: the same seed sends everybody home to the same place", () => {
        const again = worldFor("birthplace");
        expect(again.map((person) => person.birthplace)).toEqual(pool.map((person) => person.birthplace));
    });
});
