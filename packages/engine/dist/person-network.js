import { PersonConnection as PersonConnectionSchema } from "@admin/world";
import { fnv1aFrom, FNV_OFFSET } from "@admin/world";
import { bestCandidate, derive } from "./person-network-rules.js";
/**
 * Which of a cast's possible ties actually get drawn.
 *
 * The rules that decide what a pair IS live in `person-network-rules.ts`. This
 * file decides how many of those readings a circle has room for, and in what
 * order they are offered a seat.
 *
 * ### What this replaced, and why it had to go
 *
 * The rules used to test for collisions rather than for shared history. Two
 * people who named the same school and were ten years apart in age were seated
 * as mentor and protégé, with the sentence "They share an alma mater and the
 * senior figure mentored the junior there." On a real 5,401-person cast that
 * one rule produced 14,318 of 16,203 edges — 88% of every tie in the game,
 * carrying one sentence. And it was not merely unsupported, it was false by
 * construction: a plausible degree spans about eight years, so requiring a
 * ten-year age gap guaranteed the two were never at that school together.
 * Every one of those 14,318 edges asserted a "there" the same rule had ruled
 * out.
 *
 * Three more things the census found. Nothing gated on nationality, so 228
 * edges joined people from different countries — an Afghan and a Chinese
 * official "staffed the same administration years before this campaign
 * opened". Nothing gated on time, so 39 of 169 career ties joined two people
 * whose shared working world never overlapped in a single year. And the degree
 * histogram was `{6: 5401}` — a perfectly regular graph, because a floor pass
 * kept seating edges until everybody had the maximum. The cap was a quota.
 *
 * The floor is gone with it. Where the record shows no shared history the graph
 * now says nothing, which is why degrees run from zero to six.
 */
/** Nobody carries more ties than a reader can hold. There is deliberately no floor. */
const MAX_PER_PERSON = 6;
/**
 * A person has a mentor, not four, and a senior figure forms a couple of people
 * rather than a following. Without these two the highest-scoring rule simply
 * took every seat: mentorship ran to 47% of the whole graph, which is the same
 * monoculture the rewrite was for, in better sentences.
 */
const MAX_MENTORS_PER_PERSON = 1;
const MAX_PROTEGES_PER_PERSON = 2;
/**
 * And no more than this many ties out of any ONE shared world.
 *
 * Without it a circle was six people from whichever bucket the seating reached
 * first — six colleagues out of party organizing, or six out of local
 * government — which reads as one fact repeated even when every sentence under
 * it cites different years. A working life passes through several worlds, and
 * the circle should show that it did.
 */
const MAX_PER_PROVENANCE = 3;
/** Descending score, then the pair's own name — the order seating consumes. */
function byScore(a, b) {
    return b.score - a.score || `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`);
}
function makeHashFor(seed) {
    const prefixHash = fnv1aFrom(FNV_OFFSET, `${seed}::person-network:`);
    const cache = new Map();
    return (from) => {
        const cached = cache.get(from);
        if (cached !== undefined)
            return cached;
        const hashed = fnv1aFrom(fnv1aFrom(prefixHash, from), ":");
        cache.set(from, hashed);
        return hashed;
    };
}
/** The unordered pair, as one number, for a cast this side of 94 million. */
function pairKey(width, i, j) {
    return i < j ? i * width + j : j * width + i;
}
/**
 * Puts each unordered pair to the rules at most once across every band and
 * bucket it appears in, always in cast order, because `bestCandidate` is not
 * symmetric — it names the pair's two people in its own sentences.
 */
function pairVisitor(derived, hashFor, seen, into, publicOnly = false) {
    const width = derived.length;
    return (i, j) => {
        if (i === j)
            return;
        const key = pairKey(width, i, j);
        if (seen.has(key))
            return;
        seen.add(key);
        const low = i < j ? i : j;
        const high = i < j ? j : i;
        const best = bestCandidate(derived[low], derived[high], hashFor, publicOnly);
        if (best)
            into.push(best);
    };
}
function bucketBy(derived, open, keysOf) {
    const buckets = new Map();
    derived.forEach((person, index) => {
        if (open[index] === 0)
            return;
        for (const key of keysOf(person)) {
            const bucket = buckets.get(key);
            if (bucket)
                bucket.push(index);
            else
                buckets.set(key, [index]);
        }
    });
    return buckets;
}
function eachPair(members, visit) {
    for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1)
            visit(members[i], members[j]);
    }
}
function eachBucketPair(buckets, visit) {
    for (const bucket of buckets.values())
        eachPair(bucket, visit);
}
/**
 * The bands, and why they are the whole cost story.
 *
 * Every rule but the counterpart one now needs the two people to be of the same
 * nationality AND to share a discrete key — a school, a career archetype, a
 * party. So a band enumerates one bucket at a time, keyed by nation and that
 * discrete thing, and only over people who still have a seat open. Someone at
 * `MAX_PER_PERSON` never comes back under it, so a pair the cap already
 * excludes is never built, scored or sorted.
 *
 * With the floor pass gone there is no second sweep at all. The old one existed
 * to drag people up to a minimum degree, which is the quota this module no
 * longer keeps.
 */
const schoolKey = (person) => person.school === undefined ? [] : [`${person.nationality}:${person.school}`];
const partyKey = (person) => person.party === undefined ? [] : [`${person.nationality}:${person.party}`];
const careerKeys = (person) => [...person.archetypeSet].map((archetype) => `${person.nationality}:${archetype}`);
/** Every tie built on a shared working world at home — 0.86 down to 0.62. */
function careerBand(derived, open, visit) {
    eachBucketPair(bucketBy(derived, open, careerKeys), visit);
}
/** Mentor at a school, and the peer tie, 0.86 and 0.58. */
function schoolBand(derived, open, visit) {
    eachBucketPair(bucketBy(derived, open, schoolKey), visit);
}
/**
 * Prior counterpart, 0.70 — the one band that is deliberately cross-national,
 * because a counterpart is by definition somebody else's diplomat. The field is
 * the foreign-seat holders against the corps rather than the corps against
 * itself.
 */
function counterpartBand(derived, open, visit) {
    const corps = [];
    const seats = [];
    derived.forEach((person, index) => {
        if (open[index] === 0 || !person.spans.has("diplomatic-corps"))
            return;
        corps.push(index);
        if (person.foreignSeat)
            seats.push(index);
    });
    for (const seat of seats) {
        for (const other of corps) {
            if (derived[seat].nationality === derived[other].nationality)
                continue;
            visit(seat, other);
        }
    }
}
/** Rival and ally, 0.66 and 0.52, where the arena is a shared party rather than a shared post. */
function partyBand(derived, open, visit) {
    eachBucketPair(bucketBy(derived, open, partyKey), visit);
}
const BANDS = [careerBand, schoolBand, counterpartBand, partyBand];
function seat(seating, candidate, fromCount, toCount) {
    const { score: _score, fallback: _fallback, ...connection } = candidate;
    seating.chosen.push(PersonConnectionSchema.parse(connection));
    seating.count.set(candidate.from, fromCount + 1);
    seating.count.set(candidate.to, toCount + 1);
    for (const end of [candidate.from, candidate.to]) {
        const key = `${end}:${candidate.provenance}`;
        seating.perWorld.set(key, (seating.perWorld.get(key) ?? 0) + 1);
    }
    if (candidate.kind === "mentor") {
        seating.proteges.set(candidate.from, (seating.proteges.get(candidate.from) ?? 0) + 1);
        seating.mentors.set(candidate.to, (seating.mentors.get(candidate.to) ?? 0) + 1);
    }
}
function worldFull(seating, candidate) {
    return [candidate.from, candidate.to].some((end) => (seating.perWorld.get(`${end}:${candidate.provenance}`) ?? 0) >= MAX_PER_PROVENANCE);
}
/** Whether the mentorship quota still has room for this particular one. */
function mentorshipAllowed(seating, candidate) {
    if (candidate.kind !== "mentor")
        return true;
    return ((seating.mentors.get(candidate.to) ?? 0) < MAX_MENTORS_PER_PERSON &&
        (seating.proteges.get(candidate.from) ?? 0) < MAX_PROTEGES_PER_PERSON);
}
/** Seat every pair in a band that leaves both ends under the cap. */
function seatUnderCap(seating, band) {
    for (const first of band) {
        const candidate = mentorshipAllowed(seating, first) ? first : first.fallback;
        if (!candidate)
            continue;
        const fromCount = seating.count.get(candidate.from) ?? 0;
        const toCount = seating.count.get(candidate.to) ?? 0;
        if (fromCount >= MAX_PER_PERSON || toCount >= MAX_PER_PERSON)
            continue;
        if (worldFull(seating, candidate))
            continue;
        seat(seating, candidate, fromCount, toCount);
    }
}
/** Who still has a seat open, as a mask the buckets are filtered through. */
function openSeats(derived, seating) {
    const open = new Uint8Array(derived.length);
    for (let index = 0; index < derived.length; index += 1) {
        if ((seating.count.get(derived[index].id) ?? 0) < MAX_PER_PERSON)
            open[index] = 1;
    }
    return open;
}
/**
 * Deterministic social graph over a cast. Derived on demand from
 * `(seed, people)` rather than stored on the campaign save — the same contract
 * the dossier and cabinet tie graph follow, so no migration is required when
 * the rule changes.
 */
export function buildPersonNetwork(people, seed, publicOnly = false) {
    const byId = new Map(people.map((person) => [person.id, person]));
    const derived = [...byId.keys()].sort().map((id) => derive(byId.get(id)));
    const hashFor = makeHashFor(seed);
    const seen = new Set();
    const seating = {
        chosen: [],
        count: new Map(),
        mentors: new Map(),
        proteges: new Map(),
        perWorld: new Map(),
    };
    for (const band of BANDS) {
        const field = [];
        band(derived, openSeats(derived, seating), pairVisitor(derived, hashFor, seen, field, publicOnly));
        seatUnderCap(seating, field.sort(byScore));
    }
    return seating.chosen.sort((a, b) => `${a.from}:${a.to}:${a.kind}`.localeCompare(`${b.from}:${b.to}:${b.kind}`));
}
/**
 * The graph for one cast, built at most once per cast.
 *
 * The memo is not a nicety. A person dossier asks for the graph twice on every
 * render, and the first open of one after any week turn pays for it on the
 * main thread — which is where the cost of building it lands, on the frame a
 * player is waiting for.
 *
 * ### Why the key is the roster and not `campaign.people`
 *
 * It used to be `campaign.people` by identity, on the reasoning that the
 * object is replaced rather than mutated so its identity is exactly "this
 * cast, in this state". The first half is true and the second half is the bug:
 * `apply()` replaces that object on *every* commit, and a week turn shifts
 * loyalty on it. So the key changed every week while the graph did not, and
 * the cost was paid again for a byte-identical result.
 *
 * The graph depends on exactly two things. `derive` reads only authored
 * biography — nationality, career postings and their dates, school, party,
 * eligible roles, ideology, age — none of which any effect can write:
 * `PersonEffect.changes` reaches `alive`, `currentRole`, `affiliation`,
 * `loyaltyAtAppointment` and `state`, and `loyaltyShift` folds into
 * `base.loyalty`, and the sweep reads none of those. The one mutable input is
 * `alive`, which decides membership. So the honest key is the seed and the set
 * of living ids, and a week that changes only loyalty now costs nothing.
 *
 * Both levels are kept. The `WeakMap` is the hot path — the same object asking
 * twice in one render never even builds the signature — and it is weak so a
 * superseded campaign state does not hold its graph alive. `LAST_BUILT` is the
 * one that survives the commit.
 */
const NETWORK_CACHE = new WeakMap();
/** The last graph built, kept across the object replacement every commit performs. */
let LAST_BUILT;
/**
 * Who is in the cast, as a string.
 *
 * O(n log n) over ids against a rebuild that walks every bucket — orders of
 * magnitude cheaper than the thing it is deciding whether to skip. Sorted so
 * two records that hold the same cast in a different insertion order agree.
 */
function rosterSignature(people) {
    const living = [];
    for (const [id, runtime] of Object.entries(people)) {
        if (runtime.alive !== false)
            living.push(id);
    }
    return living.sort().join(",");
}
export function personNetworkFor(people, seed, publicOnly = false) {
    const cached = NETWORK_CACHE.get(people);
    // The seed is checked as well as the identity: a test that reuses one cast
    // under two seeds is asking for two different graphs, and returning the
    // first would make the second silently wrong.
    if (cached && cached.seed === seed && cached.publicOnly === publicOnly)
        return cached.network;
    const signature = rosterSignature(people);
    if (LAST_BUILT && LAST_BUILT.seed === seed && LAST_BUILT.publicOnly === publicOnly && LAST_BUILT.signature === signature) {
        NETWORK_CACHE.set(people, { seed, publicOnly, network: LAST_BUILT.network });
        return LAST_BUILT.network;
    }
    const cast = Object.values(people)
        .filter((runtime) => runtime.alive !== false)
        .map((runtime) => runtime.base);
    const network = buildPersonNetwork(cast, seed, publicOnly);
    NETWORK_CACHE.set(people, { seed, publicOnly, network });
    LAST_BUILT = { seed, publicOnly, signature, network };
    return network;
}
