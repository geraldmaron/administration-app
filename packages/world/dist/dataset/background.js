/**
 * What a career does to someone.
 *
 * Read these as "compared to an average official", not as moral judgments.
 * Intelligence work lowers `loyalty` because the trade selects for people who
 * keep their own counsel, not because spies are traitors.
 */
export const CAREER_EFFECTS = {
    "civil-service": { competence: 0.5, loyalty: 0.4, ambition: -0.3, charisma: -0.2 },
    "military-command": { competence: 0.4, loyalty: 0.5, integrity: 0.3, charisma: -0.2 },
    "intelligence-service": { competence: 0.5, loyalty: -0.3, integrity: -0.3, charisma: -0.3 },
    "diplomatic-corps": { competence: 0.4, charisma: 0.4, ambition: -0.2 },
    "private-law": { competence: 0.5, ambition: 0.3, integrity: -0.2 },
    business: { ambition: 0.5, charisma: 0.3, integrity: -0.3, loyalty: -0.2 },
    academia: { competence: 0.6, charisma: -0.3, ambition: -0.3 },
    "party-organizing": { charisma: 0.5, ambition: 0.5, loyalty: 0.3, integrity: -0.3 },
    "local-government": { charisma: 0.3, loyalty: 0.3, competence: -0.2 },
    "state-media": { charisma: 0.4, loyalty: 0.5, integrity: -0.5 },
    "independent-press": { integrity: 0.6, charisma: 0.3, loyalty: -0.5 },
    activism: { integrity: 0.5, ambition: 0.3, charisma: 0.3, loyalty: -0.3 },
    medicine: { competence: 0.5, integrity: 0.4, charisma: -0.2 },
    "labor-union": { charisma: 0.4, ambition: 0.3, loyalty: -0.2 },
    judiciary: { competence: 0.5, integrity: 0.4, loyalty: -0.3, charisma: -0.2 },
};
export const FIELD_EFFECTS = {
    law: { competence: 0.3, integrity: 0.2 },
    economics: { competence: 0.3, ambition: 0.1 },
    engineering: { competence: 0.3, charisma: -0.2 },
    "military-science": { competence: 0.2, loyalty: 0.4, charisma: -0.2 },
    medicine: { competence: 0.3, integrity: 0.3 },
    "international-relations": { competence: 0.2, charisma: 0.3 },
    "public-administration": { competence: 0.3, loyalty: 0.3, ambition: -0.2 },
    journalism: { charisma: 0.3, integrity: 0.3, loyalty: -0.3 },
    theology: { integrity: 0.3, loyalty: 0.2, charisma: 0.2 },
    "natural-sciences": { competence: 0.4, charisma: -0.3 },
};
/**
 * What the name on the certificate does.
 *
 * `regional` is not a penalty on competence — a competent official is produced
 * everywhere. What a less-networked school changes is what the graduate had to
 * do to get into the room, which reads as loyalty and integrity rather than as
 * a lower ceiling.
 */
export const TIER_EFFECTS = {
    "global-elite": { competence: 0.4, ambition: 0.4, charisma: 0.2 },
    "national-flagship": { competence: 0.2, loyalty: 0.2, ambition: 0.1 },
    regional: { loyalty: 0.3, integrity: 0.3, ambition: -0.2 },
    "service-academy": { loyalty: 0.5, competence: 0.2, charisma: -0.2 },
};
const POSTGRADUATE_EFFECT = { competence: 0.3, ambition: 0.1 };
/**
 * Which working lives plausibly lead to which chair.
 *
 * A defense minister who has never been near the forces is possible and
 * interesting; one drawn from a pool that never includes military command is a
 * simulation that cannot produce a general. These are the draws, not a
 * requirement — the last post in a career is what the seat mostly reflects.
 */
export const ROLE_CAREER_POOL = {
    "role-prime-minister": ["party-organizing", "private-law", "local-government", "business", "civil-service"],
    "role-president": ["party-organizing", "private-law", "military-command", "business", "local-government"],
    "role-monarch": ["military-command", "diplomatic-corps", "academia"],
    "role-junta-chairman": ["military-command", "intelligence-service"],
    "role-first-councillor": ["party-organizing", "civil-service", "academia"],
    "role-council-chair": ["civil-service", "party-organizing", "local-government"],
    "role-court-chancellor": ["private-law", "civil-service", "academia"],
    "role-foreign-minister": ["diplomatic-corps", "academia", "private-law", "party-organizing"],
    "role-treasury-minister": ["business", "academia", "civil-service", "private-law"],
    "role-defense-minister": ["military-command", "civil-service", "party-organizing"],
    "role-interior-minister": ["civil-service", "local-government", "private-law", "party-organizing"],
    "role-intelligence-director": ["intelligence-service", "military-command", "civil-service"],
    "role-electoral-affairs-minister": ["civil-service", "private-law", "local-government"],
    "role-attorney-general": ["private-law", "civil-service", "academia"],
    "role-opposition-leader": ["party-organizing", "activism", "labor-union", "independent-press", "business"],
    "role-journalist": ["independent-press", "state-media", "academia"],
    "role-congressional-leader": ["party-organizing", "private-law", "local-government", "labor-union"],
    "role-committee-chair": ["civil-service", "private-law", "academia", "local-government"],
    "role-governor": ["local-government", "party-organizing", "private-law", "business"],
    // The ten department secretaries. Each route is where that department's
    // people actually come from, which is what makes two secretaries read
    // differently rather than being one profile under ten names.
    "role-agriculture-secretary": ["local-government", "business", "civil-service", "academia"],
    "role-commerce-secretary": ["business", "private-law", "civil-service"],
    "role-labor-secretary": ["labor-union", "activism", "party-organizing", "private-law"],
    "role-health-secretary": ["academia", "civil-service", "business"],
    "role-housing-secretary": ["local-government", "business", "civil-service", "activism"],
    "role-transportation-secretary": ["local-government", "business", "civil-service"],
    "role-energy-secretary": ["academia", "business", "civil-service"],
    "role-education-secretary": ["academia", "local-government", "civil-service", "activism"],
    "role-veterans-secretary": ["military-command", "civil-service", "local-government"],
    "role-homeland-secretary": ["intelligence-service", "military-command", "civil-service", "private-law"],
    // The two benches a vacancy generates (vacancy-bench-roles.ts). Neither is a
    // seat in the dataset's pool.
    "role-federal-judge": ["private-law", "academia", "civil-service", "judiciary"],
    "role-general-officer": ["military-command", "intelligence-service"],
};
export const ROLE_BACKGROUND_RULES = {
    "role-federal-judge": { field: "law", finalPost: "judiciary" },
    "role-general-officer": { field: "military-science", finalPost: "military-command" },
};
export function backgroundRuleFor(role) {
    return ROLE_BACKGROUND_RULES[role];
}
/** Anything unmapped gets the broad civilian route rather than throwing: a new seat should not break generation. */
const DEFAULT_CAREER_POOL = ["civil-service", "private-law", "business", "academia"];
export function careerPoolFor(role) {
    return ROLE_CAREER_POOL[role] ?? DEFAULT_CAREER_POOL;
}
const ATTRIBUTES = ["competence", "loyalty", "ambition", "integrity", "charisma"];
/**
 * Where a background places someone on each attribute, as a position in [0, 1].
 *
 * Longer service in a post counts for more than a brief one, but with sharply
 * diminishing returns: thirty years in the civil service is more civil-servant
 * than five, and not six times more. Without the damping a single long post
 * would swamp every other fact about a life.
 */
export function backgroundPosition(education, career, tier) {
    const totals = {
        competence: 0,
        loyalty: 0,
        ambition: 0,
        integrity: 0,
        charisma: 0,
    };
    const add = (weights, scale = 1) => {
        for (const attribute of ATTRIBUTES) {
            totals[attribute] += (weights[attribute] ?? 0) * scale;
        }
    };
    add(TIER_EFFECTS[tier]);
    add(FIELD_EFFECTS[education.field]);
    if (education.postgraduate)
        add(POSTGRADUATE_EFFECT);
    for (const post of career) {
        add(CAREER_EFFECTS[post.archetype], tenureWeight(post.years));
    }
    const placed = {};
    for (const attribute of ATTRIBUTES)
        placed[attribute] = squash(totals[attribute]);
    return placed;
}
/**
 * How much a post of this length counts.
 *
 * A square root rather than a linear span: the difference between two years and
 * ten is most of what a post does to someone, and the difference between twenty
 * and thirty is nearly none.
 */
export function tenureWeight(years) {
    return Math.sqrt(Math.max(0, years) / 10);
}
/**
 * A summed nudge, as a position in [0, 1].
 *
 * A logistic curve rather than a clamp, so an unusually consistent life keeps
 * pushing toward the end of its window instead of piling up against a wall
 * where every extreme background produces the identical maximum.
 */
export function squash(total) {
    return 1 / (1 + Math.exp(-total));
}
/**
 * What pushed one reading where it landed, hardest push first.
 *
 * The dossier's assessment of a person is only worth printing if it can name
 * the fact behind it — the same discipline the relationship graph works under,
 * where a tie nobody's record supports is not written. A reading is the sum of
 * a school, a field, a graduate degree and every post held, so the largest
 * signed term in that sum is a fact about this person and not a guess about
 * them.
 *
 * Posts of one archetype are summed rather than listed: two spells in the civil
 * service twenty years apart are one civil service career to anybody reading
 * the file, and printing the shorter of them would name the smaller truth.
 * Terms that move this attribute not at all are left out entirely.
 */
export function backgroundDrivers(education, career, tier, attribute) {
    const drivers = [];
    // A person record carries the school's id rather than its tier, so a reader
    // recovering the tier from the catalogue can come up empty. The school then
    // goes unnamed rather than being guessed at.
    const schoolWeight = tier === undefined ? 0 : (TIER_EFFECTS[tier][attribute] ?? 0);
    if (schoolWeight !== 0 && tier !== undefined)
        drivers.push({ kind: "school", tier, weight: schoolWeight });
    const fieldWeight = FIELD_EFFECTS[education.field][attribute] ?? 0;
    if (fieldWeight !== 0)
        drivers.push({ kind: "field", field: education.field, weight: fieldWeight });
    const postgraduateWeight = education.postgraduate ? (POSTGRADUATE_EFFECT[attribute] ?? 0) : 0;
    if (postgraduateWeight !== 0)
        drivers.push({ kind: "postgraduate", weight: postgraduateWeight });
    const byArchetype = new Map();
    for (const post of career) {
        const weight = (CAREER_EFFECTS[post.archetype][attribute] ?? 0) * tenureWeight(post.years);
        const running = byArchetype.get(post.archetype);
        byArchetype.set(post.archetype, {
            years: (running?.years ?? 0) + post.years,
            weight: (running?.weight ?? 0) + weight,
        });
    }
    for (const [archetype, { years, weight }] of byArchetype) {
        if (weight !== 0)
            drivers.push({ kind: "career", archetype, years, weight });
    }
    return drivers.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}
