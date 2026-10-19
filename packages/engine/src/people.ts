import {
  AGE_BAND_GRAYING,
  HERITAGE_SKIN_TONES,
  US_ID,
  Person,
  ageBandFor,
  attireOptionsFor,
  backgroundPosition,
  backgroundRuleFor,
  careerPoolFor,
  schoolsFor,
  eyewearWeightsFor,
  facialHairWeightsFor,
  genderWeightsFor,
  hairColorWeightsFor,
  hairStyleWeightsFor,
  headCoveringRateFor,
  NATION_LEADER_CONSTRAINTS,
  leaderConstraintFor,
  leadNameGroup,
  nameCultureFor,
  nameGroupForHeritage,
  nationCabinetRoles,
  nationLeadRole,
  royalHouseFor,
  portraitRef,
  seatHeritageMixFor,
  US_GOVERNOR_BENCH_PER_PARTY,
  usPartyQuotaFor,
  usPartyWeightsFor,
  roleProfileByRole,
  SECOND_TRAIT_CHANCE,
  worldCities,
  worldStates,
  type BenchParty,
  type CareerPost,
  type City,
  type PortraitHeritage,
  type Education,
  type Charter,
  type Nation,
  type IdeologyVector,
  type LeaderAgeBand,
  type LeaderConstraint,
  type Party,
  type PersonPoolSpec,
  type PersonTrait,
  type PortraitFacets,
  type PortraitGenderPresentation,
  type RoleProfile,
  type SchoolTier,
} from "@admin/world";
import {
  CAREER_OFFSET_SPAN,
  assignCareerLines,
  careerGateFor,
  composeBio,
  composeBioFromCareerLine,
  hasMilitaryCareer,
} from "./bio.js";
import { pickLeadTraits } from "./foreign-leader.js";
import { personIdFor } from "./person-id.js";
import { drawName, newNameLedger, type NameLedger } from "./naming.js";
import type { RngStream, RngStreams } from "./rng.js";

// Builds the campaign's cast. Who exists is seeded rather than fixed: two
// campaigns in the same world are staffed by different people, which is one of
// the things that stops a second playthrough feeling like a re-run of the
// first. Every draw is keyed by (nation, role, index), so adding a nation or a
// seat never shifts anyone else's cast for an existing seed.

// `+ 0` normalizes negative zero: JSON.stringify writes -0 as 0, so leaving it
// in state would make a saved campaign reload as a different object than the one
// that was written.
const round2 = (v: number) => Math.round(v * 100) / 100 + 0;


/**
 * A reading at a given position inside the seat's window.
 *
 * The counterpart to `inRange`: same window, but the point inside it comes from
 * the person's background rather than from a fresh draw. Position is clamped
 * because a derivation table edit should never be able to place someone outside
 * the range their seat is defined by.
 */
function atPosition(range: { min: number; max: number }, position: number): number {
  const clamped = Math.max(0, Math.min(1, position));
  return round2(range.min + clamped * (range.max - range.min));
}

function pickTraits(stream: RngStream, profile: RoleProfile): PersonTrait[] {
  // One trait always comes from the seat's own tendencies so the person reads
  // as belonging in it; the second is a free draw so the seat is not a mould.
  const anchor = stream.pick(profile.likelyTraits);
  const others = profile.likelyTraits.filter((t) => t !== anchor);
  // The coin flip always draws, even when `others` is empty (a one-entry
  // `likelyTraits` bank) — short-circuiting it on `others.length > 0` used to
  // mean a role profile with exactly one likely trait consumed one fewer draw
  // than a role with two or more, so editing a profile's trait list (nothing
  // to do with any one person) shifted every draw after this one for that
  // seat's cast: party, ideology, portrait facets. Drawing unconditionally
  // keeps that count stable; only the *optional third* draw for the second
  // trait still depends on the roll and on there being another trait to pick.
  const wantsSecond = stream.next() < SECOND_TRAIT_CHANCE;
  return others.length > 0 && wantsSecond ? [anchor, stream.pick(others)] : [anchor];
}

function weightedPick<T>(stream: RngStream, weights: ReadonlyArray<{ value: T; weight: number }>): T {
  return pickByRoll(stream.next(), weights);
}

/** The same weighted pick, from a roll already taken. */
function pickByRoll<T>(roll: number, weights: ReadonlyArray<{ value: T; weight: number }>): T {
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let target = roll * total;
  for (const entry of weights) {
    target -= entry.weight;
    if (target <= 0) return entry.value;
  }
  return weights[weights.length - 1]!.value;
}

// A person's appearance is drawn independently of their seat, except for
// attire: nothing about competence, loyalty, or which ministry someone runs
// biases who they look like.
export function rollPortraitFacets(
  stream: RngStream,
  nation: string,
  role: string,
  age: number,
  gender: PortraitGenderPresentation,
  party?: BenchParty,
): PortraitFacets {
  const heritage = weightedPick(
    stream,
    seatHeritageMixFor(nation, role, party).map((m) => ({ value: m.heritage, weight: m.weight })),
  );
  const ageBand = ageBandFor(age);

  // Covering is decided before style rather than competing with it: whether a
  // head is covered is a fact about the nation, and only the uncovered heads
  // draw from the style table at all.
  const covered = gender !== "masculine" && stream.next() < headCoveringRateFor(nation);
  const hairStyle = covered ? "covered" : weightedPick(stream, hairStyleWeightsFor(gender, ageBand));

  return {
    heritage,
    gender,
    ageBand,
    skinTone: stream.pick(HERITAGE_SKIN_TONES[heritage]),
    attire: weightedPick(stream, attireOptionsFor(role)),
    hairStyle,
    hairColor: rollHairColor(stream, heritage, ageBand),
    facialHair: weightedPick(stream, facialHairWeightsFor(gender)),
    eyewear: weightedPick(stream, eyewearWeightsFor(ageBand)),
    variant: stream.nextInt(1, 9),
  };
}

// Age overrides heritage rather than being one more option beside it: hair
// grays wherever it started, so the heritage draw only decides what color it
// is *before* age takes it.
function rollHairColor(
  stream: RngStream,
  heritage: PortraitFacets["heritage"],
  ageBand: PortraitFacets["ageBand"],
): PortraitFacets["hairColor"] {
  const { graying, white } = AGE_BAND_GRAYING[ageBand];
  const roll = stream.next();
  if (roll < white) return "white";
  if (roll < white + graying) return "graying";
  return weightedPick(stream, hairColorWeightsFor(heritage));
}

// The schema's own ceiling on a single post. Held here rather than inferred so
// the generator fails at the table rather than at `Person.parse`.
const MAX_POST_YEARS = 40;

/**
 * The life that produces the numbers.
 *
 * Rolled before the attributes because the attributes are derived from it. The
 * order is the whole point of the feature: a Secretary is competent *because*
 * they read law at a flagship university and spent eleven years in the civil
 * service, rather than being competent first and having a sentence written
 * afterward to agree.
 *
 * Uses its own stream so that adding or reweighting a career table cannot
 * disturb the name, face, or age a person already rolled.
 */
function rollBackground(
  stream: RngStream,
  nation: string,
  role: string,
  age: number,
): { readonly education: Education; readonly career: CareerPost[]; readonly tier: SchoolTier } {
  const options = schoolsFor(nation);
  // A service academy is where a soldier is made, not where a foreign ministry
  // recruits its diplomats. Drawing uniformly produced a Secretary of State who
  // read engineering at West Point and then spent his life on multilateral
  // desks — each fact plausible, the sequence not. The academies stay in the
  // pool only for the seats that actually draw on them.
  const pool = careerPoolFor(role);
  const militaryRoute = pool.includes("military-command") || pool.includes("intelligence-service");
  const eligible = militaryRoute ? options : options.filter((s) => s.tier !== "service-academy");
  // A vacancy bench's floor (a judge read law) narrows the schools; every
  // pooled seat has no rule and draws exactly as it always did.
  const rule = backgroundRuleFor(role);
  const teaching = rule?.field ? eligible.filter((s) => s.fields.includes(rule.field!)) : [];
  const school = stream.pick(teaching.length > 0 ? teaching : eligible.length > 0 ? eligible : options);
  const field = rule?.field ?? stream.pick(school.fields);

  // A service academy is entered younger and leads straight into a career; a
  // university graduate starts a few years later.
  const graduatedAt = school.tier === "service-academy" ? 22 : 23;
  const postgraduate = school.tier !== "service-academy" && stream.next() < 0.4;

  const career: CareerPost[] = [];
  let cursor = postgraduate ? graduatedAt + 2 : graduatedAt;

  // Posts scale with the working span rather than being a fixed two or three.
  // A committee chair of eighty has nearly sixty years to account for, and
  // three posts across that leaves one of them running longer than any job
  // anybody holds — which the schema's forty-year ceiling rejected outright.
  const span = Math.max(1, age - cursor);
  const postCount = Math.max(2, Math.min(5, Math.round(span / 11)));

  for (let i = 0; i < postCount && cursor < age; i += 1) {
    const remaining = age - cursor;
    const isLast = i === postCount - 1;
    // The last post runs to the present, so a career ends where the person is
    // now rather than trailing off with an unexplained gap before the seat.
    const years = isLast ? Math.min(remaining, MAX_POST_YEARS) : Math.max(1, Math.min(remaining - 1, stream.nextInt(3, 12)));
    if (years < 1) break;
    // Never the same archetype twice running: two consecutive academic posts
    // are one academic career, and printing them as separate lines reads as a
    // generator repeating itself rather than as a life with stages.
    const previous = career.at(-1)?.archetype;
    const choices = pool.filter((archetype) => archetype !== previous && (isLast || archetype !== rule?.finalPost || i < postCount - 2));
    const archetype = isLast && rule?.finalPost ? rule.finalPost : stream.pick(choices.length > 0 ? choices : pool);
    career.push({ archetype, years, startAge: cursor });
    cursor += years;
  }

  // Someone appointed unusually young may not have cleared the loop at all.
  if (career.length === 0) {
    career.push({
      archetype: stream.pick(pool),
      years: Math.max(1, Math.min(age - graduatedAt, MAX_POST_YEARS)),
      startAge: graduatedAt,
    });
  }

  const last = career.at(-1)!;
  const ended = rule?.finalPost && last.archetype !== rule.finalPost ? [...career.slice(0, -1), { ...last, archetype: rule.finalPost }] : career;
  return {
    education: { school: school.id, field, postgraduate },
    career: ended,
    tier: school.tier,
  };
}

const STATE_NAMES: ReadonlyMap<string, string> = new Map(worldStates.map((state) => [state.id as string, state.name]));

/**
 * A place said the way somebody from there would say it.
 *
 * A US metro takes its state, because three Springfields and two Portlands are
 * three and two different hometowns, and because naming the state is how an
 * American answers the question at all. Everywhere else the city stands alone:
 * the dataset holds no second tier of place outside the United States, and
 * inventing one would be the fabrication this field exists to avoid.
 */
export function birthplaceLabel(city: City): string {
  const stateId = city.state as string | undefined;
  const stateName = stateId === undefined ? undefined : STATE_NAMES.get(stateId);
  if (stateId === undefined || stateName === undefined) return city.name;
  // The baked table already disambiguates a repeated metro with its postal
  // code — "Springfield, MA". A person says the state out loud, so the code
  // comes off before the name goes on rather than both being printed.
  const abbreviated = `, ${stateId}`;
  const bare = city.name.endsWith(abbreviated) ? city.name.slice(0, -abbreviated.length) : city.name;
  // A name still carrying its own jurisdiction — "Washington, D.C." — is
  // already the whole answer and does not take a second one.
  return bare.includes(",") ? bare : `${bare}, ${stateName}`;
}

/**
 * How many distinct places a nation has to name before a birthplace is worth
 * asserting about anyone from it.
 *
 * A nation the dataset gives one city would put all eighty-four of the people
 * it fields in that city. That is a fact about the country — already on the
 * country's own panel — wearing a person's clothes, and a dossier line that
 * every colleague also carries tells a player nothing they can use. Two places
 * is a coin flip dressed the same way. Three is the smallest bank on which
 * "where are they from" is a question with an answer, and below it the honest
 * dossier says nothing rather than something.
 */
const MIN_BIRTHPLACES = 3;

const BIRTHPLACES_BY_NATION: ReadonlyMap<string, readonly string[]> = (() => {
  const byNation = new Map<string, string[]>();
  for (const city of worldCities) {
    const nation = city.nation as string;
    const places = byNation.get(nation);
    if (places) places.push(birthplaceLabel(city));
    else byNation.set(nation, [birthplaceLabel(city)]);
  }
  return new Map([...byNation].map(([nation, places]) => [nation, [...new Set(places)]] as const));
})();

/**
 * The places a person from this nation may be said to be born in — empty where
 * the dataset does not name enough of them to clear `MIN_BIRTHPLACES`.
 *
 * Exported because the player's own person is composed rather than drawn and
 * has to answer the same question off the same list (leader.ts).
 */
export function birthplacePool(nation: string): readonly string[] {
  const places = BIRTHPLACES_BY_NATION.get(nation) ?? [];
  return places.length >= MIN_BIRTHPLACES ? places : [];
}

/**
 * Where this person was born.
 *
 * Drawn from its own stream. Inserting the draw into the stream the age,
 * traits, face and politics come out of would have re-dealt all four for every
 * seed anybody has ever played, to add one field — a stream is a pure function
 * of its key, so a new key shifts nothing at all.
 *
 * Uniform across the pool rather than weighted by population: the table is
 * already that country's largest metros in rank order, so the population
 * weighting is in which places made the list. Weighting the draw on top of that
 * would put most of a three-city nation's cast in its capital and undo the
 * floor above.
 */
function rollBirthplace(stream: RngStream, nation: string): string | undefined {
  const pool = birthplacePool(nation);
  return pool.length > 0 ? stream.pick(pool) : undefined;
}

/**
 * The years an age band spans. The table's oldest band is open, and ninety-two
 * is where it stops here: the oldest sitting head of state it records is in
 * his early nineties.
 */
const AGE_BAND_YEARS: Readonly<Record<LeaderAgeBand, { min: number; max: number }>> = {
  "30-39": { min: 30, max: 39 },
  "40-49": { min: 40, max: 49 },
  "50-59": { min: 50, max: 59 },
  "60-69": { min: 60, max: 69 },
  "70-79": { min: 70, max: 79 },
  "80+": { min: 80, max: 92 },
};

/**
 * One draw either way: the incumbent of a foreign lead chair reads the table's
 * age band, which wins over the seat's own range (the table has leaders in
 * their thirties and past eighty that no role profile allows), and everyone
 * else reads the range. The successors share the seat's range: only the person
 * the table describes is the table's age.
 */
function rollAge(stream: RngStream, range: { min: number; max: number }, constraint: LeaderConstraint | undefined, index: number): number {
  const years = constraint && index === 0 ? AGE_BAND_YEARS[constraint.ageBand] : range;
  return years.min + stream.nextInt(0, years.max - years.min + 1);
}

export function generateRolePerson(
  spec: PersonPoolSpec,
  nationName: string,
  role: string,
  index: number,
  streams: RngStreams,
  taken: NameLedger = newNameLedger(),
  parties: readonly Party[] = [],
  forcedParty?: Party,
): Person {
  const profile = roleProfileByRole.get(role);
  if (!profile) throw new Error(`no role profile authored for ${role}`);
  const nation = spec.nation as string;
  const stream = streams.stream("people", spec.nation, role, index);
  const constraint = leaderConstraintFor(nation, role);

  // The presentation roll is taken first, where it always was, and read once
  // the party is known: an American's odds of being a woman depend on the
  // party they carry as much as the seat, and moving the roll would re-deal
  // everyone's age, career and face to add that one dependency.
  const presentationRoll = stream.next();
  const spread = profile.ideologySpread;
  const axis = () => round2((stream.next() * 2 - 1) * spread);
  const age = rollAge(stream, profile.ageRange, constraint, index);

  // Where they studied and what they have done since, rolled first — the
  // attributes below are read off it.
  const background = rollBackground(streams.stream("background", spec.nation, role, index), nation, role, age);
  const position = backgroundPosition(background.education, background.career, background.tier);

  // The seat still owns the range: an opposition leader is never loyal and an
  // intelligence director is selected for competence, and those windows are
  // untouched. What the background decides is where inside the window this
  // particular candidate lands, which is what makes two people up for the same
  // chair differ for a reason a player can read.
  const attributes = {
    competence: atPosition(profile.attributes.competence, position.competence),
    loyalty: atPosition(profile.attributes.loyalty, position.loyalty),
    ambition: atPosition(profile.attributes.ambition, position.ambition),
    integrity: atPosition(profile.attributes.integrity, position.integrity),
    charisma: atPosition(profile.attributes.charisma, position.charisma),
  };
  // A foreign head of government's disposition is read from the government
  // they lead, in the same draws, so nobody else in the stream moves.
  const traits =
    (nationLeadRole(nation) === role ? pickLeadTraits(stream, profile.likelyTraits, nation) : undefined) ??
    pickTraits(stream, profile);
  const seat = seatTickets(nation, role, parties, constraint, forcedParty);
  const { party, ideology } = rollPolitics(seat.pool, stream, axis, spread, seatPartyWeights(nation, role), seat.forced);
  const benchParty = benchPartyOf(party);
  const gender = pickByRoll(presentationRoll, genderWeightsFor(nation, role, benchParty));
  const birthplace = rollBirthplace(streams.stream("birthplace", spec.nation, role, index), nation);
  const facets = rollPortraitFacets(stream, nation, role, age, gender, benchParty);
  // Names draw from their own stream so that redrawing a collision cannot
  // disturb the attributes, age or face this person already rolled — a
  // government whose ministers change competence because someone else was
  // called Yeva would be a strange thing to debug. Drawn after the face, so a
  // bank split by heritage can name the person the face depicts.
  // A nation of several traditions names its lead chair from the one that
  // holds it, and a monarchy names it for its house.
  const culture = nameCultureFor(nation);
  const lead = nationLeadRole(nation) === role;
  const heritageGroup = nameGroupForHeritage(culture, facets.heritage as PortraitHeritage) ?? (lead ? leadNameGroup(nation) : undefined);
  const royalHouse = royalHouseFor(nation, role);
  const name = drawName(
    streams.stream("names", spec.nation, role, index),
    { nation, culture, gender, ...(heritageGroup ? { heritageGroup } : {}), ...(royalHouse ? { royalHouse } : {}) },
    taken,
  );

  const id = personIdFor(nation, role, index);

  return Person.parse({
    id,
    name,
    nationality: spec.nation,
    portraitRef: portraitRef(facets),
    age,
    bio: composeBio({
      id,
      role,
      nationName,
      traits,
      index,
      // Keyed on the seat rather than the candidate, so all three candidates
      // for one chair share an offset and therefore walk the bank together.
      careerOffset: streams.stream("bios", spec.nation, role).nextInt(0, CAREER_OFFSET_SPAN),
      hasMilitaryBackground: hasMilitaryCareer(background.career),
      government: careerGateFor(nation, role),
      ...attributes,
    }),
    education: background.education,
    career: background.career,
    ideology,
    ...attributes,
    traits,
    eligibleRoles: [role],
    ...(party ? { party: party.id as string } : {}),
    ...(birthplace ? { birthplace } : {}),
  });
}

/** A ticket as the American bench table reads it. */
function benchPartyOf(party: Party | undefined): BenchParty {
  const id = party?.id as string | undefined;
  if (id === "party-usa-democrat") return "democrat";
  if (id === "party-usa-republican") return "republican";
  return id === "party-usa-independent" ? "independent" : undefined;
}

const OPPOSITION_ROLE = "role-opposition-leader";
const GOVERNOR_ROLE = "role-governor";

/** Each government's parties as the table records them, read once rather than per person drawn. */
const GOVERNING_BY_NATION: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.values(NATION_LEADER_CONSTRAINTS).map((row) => [row.nation as string, new Set(row.governing as readonly string[])] as const),
);

/**
 * Which tickets a seat draws from, and whether its ticket is set.
 *
 * A foreign lead chair carries the party the leader table says governs, or
 * none where the table says the government runs without one; a ministry is
 * held by one of the governing parties the country's slate carries, and the
 * opposition leader by one that does not govern. Everywhere else, and wherever
 * the table is silent, the whole slate. Every path takes the same one draw, so
 * setting a ticket moves nothing else this person rolls.
 */
function seatTickets(
  nation: string,
  role: string,
  parties: readonly Party[],
  lead: LeaderConstraint | undefined,
  forced: Party | undefined,
): { readonly pool: readonly Party[]; readonly forced?: Party | null } {
  if (forced) return { pool: parties, forced };
  if (lead) {
    if (lead.partyless) return { pool: parties, forced: null };
    const own = parties.find((party) => (party.id as string) === (lead.governing[0] as string | undefined));
    return own ? { pool: parties, forced: own } : { pool: parties };
  }
  const governing = GOVERNING_BY_NATION.get(nation);
  if (!governing || governing.size === 0) return { pool: parties };
  const within = parties.filter((party) => governing.has(party.id as string) === (role !== OPPOSITION_ROLE));
  const narrowed = role === OPPOSITION_ROLE || nationCabinetRoles(nation).includes(role);
  return { pool: narrowed && within.length > 0 ? within : parties };
}

/** Only the seat nation's bench carries per-seat party weights; everywhere else the charter's draw stands. */
function seatPartyWeights(nation: string, role: string): SeatPartyWeights | undefined {
  return nation === (US_ID as string) ? usPartyWeightsFor(role) : undefined;
}

type SeatPartyWeights = NonNullable<ReturnType<typeof usPartyWeightsFor>>;

/**
 * Which ticket a person carries, in one draw either way.
 *
 * The generic draw weighs a major ticket twice and a minor one once. A seat
 * with its own weights reads them instead, keyed by the ticket's US party, and
 * a forced party (the quota pass) still takes its draw so everything after it
 * in the stream lands where it would have.
 */
function pickParty(
  parties: readonly Party[],
  stream: RngStream,
  weights: SeatPartyWeights | undefined,
  forced: Party | undefined,
): Party {
  if (forced) {
    stream.next();
    return forced;
  }
  if (weights) {
    const weighted = parties.flatMap((entry) => {
      const key = benchPartyOf(entry);
      return key === undefined ? [] : [{ value: entry, weight: weights[key] }];
    });
    if (weighted.some((entry) => entry.weight > 0)) return weightedPick(stream, weighted);
  }
  const doubled = parties.flatMap((entry) => (entry.kind === "major" ? [entry, entry] : [entry]));
  return doubled[stream.nextInt(0, doubled.length)]!;
}

/**
 * The ticket first, then the politics that go with carrying it.
 *
 * Ideology used to be three independent uniform draws inside the role's
 * spread, and the party was whichever ticket sat nearest on the economic axis
 * afterwards. That produced people whose pieces did not fit: two ministers of
 * the same government were as far apart as a Swede and an Ethiopian, a
 * politician could carry a green ticket while reading authoritarian and
 * nationalist, and the `beliefs` every party in the dataset is authored with
 * moved nothing at all.
 *
 * So the ticket is drawn first and the person is drawn around it. A national
 * politician is not a random point who later finds a party — they came up
 * through one, and what they believe is mostly what it believes, plus the
 * distance they have traveled from it.
 *
 * `cohesion` is what sets that distance, which is the reading it was authored
 * for: a whipped ruling party's members cluster tightly on its platform, and a
 * bloc that is only "everyone who joined neither" scatters across the whole
 * spread. A country with no slate at all keeps the old independent draw —
 * without a ticket there is nothing to be near, and that is the honest result
 * rather than a default one.
 */
function rollPolitics(
  parties: readonly Party[],
  stream: RngStream,
  axis: () => number,
  spread: number,
  weights?: SeatPartyWeights,
  forced?: Party | null,
): { readonly party: Party | undefined; readonly ideology: IdeologyVector } {
  const free = { economicLeftRight: axis(), authLibertarian: axis(), nationalistGlobalist: axis() };
  if (parties.length === 0) return { party: undefined, ideology: free };
  // A leader the table seats without a party still takes the ticket draw, so
  // everything after it in the stream lands where it would have.
  if (forced === null) {
    stream.next();
    return { party: undefined, ideology: free };
  }
  const party = pickParty(parties, stream, weights, forced);

  // How far this person sits from their own platform. A cohesion of 1 would
  // put every member exactly on it, which is a party of clones; the floor
  // keeps a little daylight in even the most disciplined ticket.
  const drift = Math.max(MIN_PLATFORM_DRIFT, 1 - party.cohesion) * spread;
  const near = (platform: number, unanchored: number): number =>
    round2(clampAxis(platform + (unanchored / spread) * drift, spread));

  return {
    party,
    ideology: {
      economicLeftRight: near(party.beliefs.economicLeftRight, free.economicLeftRight),
      authLibertarian: near(party.beliefs.authLibertarian, free.authLibertarian),
      nationalistGlobalist: near(party.beliefs.nationalistGlobalist, free.nationalistGlobalist),
    },
  };
}

/** Even a party that whips perfectly is made of people, not of one person repeated. */
const MIN_PLATFORM_DRIFT = 0.15;

function clampAxis(value: number, spread: number): number {
  return Math.max(-spread, Math.min(spread, value));
}

export function generateNationPool(
  spec: PersonPoolSpec,
  nationName: string,
  streams: RngStreams,
  parties: readonly Party[] = [],
): Person[] {
  // One ledger for the whole nation: the pool is the unit a player sees several
  // members of at once, and it is the scope in which a repeated name reads as a
  // mistake. Two countries may share a name freely, as they do in life.
  const taken = newNameLedger();
  const depthOf = (role: string) => spec.roleDepth?.[role] ?? spec.depthPerRole;
  const drawn = spec.roles.map((role) => {
    const roleId = role as string;
    return {
      role: roleId,
      people: Array.from({ length: depthOf(roleId) }, (_, i) =>
        generateRolePerson(spec, nationName, roleId, i, streams, taken, parties),
      ),
    };
  });
  // The quota pass runs after every seat's own bench is drawn, so the people it
  // appends take their names after everyone else's and move nobody.
  return drawn.flatMap(({ role, people }) => {
    const quota = partyQuotaFill(spec, nationName, role, depthOf(role), people, streams, taken, parties);
    // Fifty governor-eligible members is exactly fifty chairs, so founding seats
    // every one and the bench is empty from week one — and a gubernatorial
    // election that cannot seat anybody cannot change a seat's party. The extra
    // per-party bench is appended past the depth and past the quota, so every
    // name, face and career line the fifty already hold is untouched.
    const bench =
      role === GOVERNOR_ROLE ? benchFloor(spec, US_GOVERNOR_BENCH_PER_PARTY, parties) : [];
    const topped = [
      ...people,
      ...quota,
      ...bench.map((party, index) =>
        generateRolePerson(spec, nationName, role, depthOf(role) + quota.length + index, streams, taken, parties, party),
      ),
    ];
    return reassignCareerLines(topped, role, nationName, streams, spec.nation as string);
  });
}

/** `perParty` places for each major party, for a bench appended past its own depth. */
function benchFloor(spec: PersonPoolSpec, perParty: number, parties: readonly Party[]): readonly Party[] {
  if ((spec.nation as string) !== (US_ID as string)) return [];
  return parties
    .filter((party) => benchPartyOf(party) === "democrat" || benchPartyOf(party) === "republican")
    .flatMap((party) => Array.from({ length: perParty }, () => party));
}

/**
 * Candidates appended so each major party has the floor of members the seat's
 * own seating needs (`usPartyQuotaFor`).
 *
 * Drawn on keys past the bench's own depth, so they are their own streams and
 * nobody the bench already held changes. The party is set rather than rolled:
 * the whole point of the pass is that the draw came up short of it.
 */
function partyQuotaFill(
  spec: PersonPoolSpec,
  nationName: string,
  role: string,
  depth: number,
  people: readonly Person[],
  streams: RngStreams,
  taken: NameLedger,
  parties: readonly Party[],
): readonly Person[] {
  if ((spec.nation as string) !== (US_ID as string)) return [];
  const quota = usPartyQuotaFor(role);
  if (quota === 0) return [];
  const shortfalls = parties.flatMap((party) => {
    const key = benchPartyOf(party);
    if (key !== "democrat" && key !== "republican") return [];
    const held = people.filter((person) => (person.party as string | undefined) === (party.id as string)).length;
    return Array.from({ length: Math.max(0, quota - held) }, () => party);
  });
  return shortfalls.map((party, offset) =>
    generateRolePerson(spec, nationName, role, depth + offset, streams, taken, parties, party),
  );
}

/**
 * `generateRolePerson` picks a candidate's career line by that candidate's
 * own shortlist position alone, which is enough to keep the line from
 * contradicting that one person but not enough to keep two candidates on the
 * same shortlist from landing on the same line once a background gates some
 * of a bank's lines off for some of them — see `assignCareerLines` for why.
 * This walks the finished shortlist once more and swaps in the collision-safe
 * assignment, keeping every other field exactly as generated.
 */
function reassignCareerLines(
  candidates: readonly Person[],
  role: string,
  nationName: string,
  streams: RngStreams,
  nation: string,
): Person[] {
  // The exact same key `generateRolePerson` drew its own offset from — a
  // stream is a pure function of its key, so redrawing it here reproduces the
  // identical value rather than consuming a second, different one.
  const careerOffset = streams.stream("bios", nation, role).nextInt(0, CAREER_OFFSET_SPAN);
  const lines = assignCareerLines(
    role,
    careerOffset,
    candidates.map((person) => hasMilitaryCareer(person.career)),
    careerGateFor(nation, role),
  );
  return candidates.map((person, i) =>
    Person.parse({
      ...person,
      bio: composeBioFromCareerLine(
        {
          id: person.id as string,
          role,
          nationName,
          traits: person.traits,
          index: 0,
          careerOffset: 0,
          competence: person.competence,
          loyalty: person.loyalty,
          integrity: person.integrity,
          charisma: person.charisma,
          ambition: person.ambition,
        },
        lines[i]!,
      ),
    }),
  );
}

export function generateWorldPool(
  nations: readonly Nation[],
  specs: readonly PersonPoolSpec[],
  streams: RngStreams,
  charters: readonly Charter[] = [],
): Person[] {
  const nameByNation = new Map(nations.map((n) => [n.id as string, n.identity.name]));
  const charterById = new Map(charters.map((charter) => [charter.id as string, charter]));
  const governmentByNation = new Map(nations.map((n) => [n.id as string, n.identity.government as string]));
  const systemByNation = new Map(nations.map((n) => [n.id as string, n.partySystem]));
  return specs.flatMap((spec) => {
    // The country's own tickets first, the charter's only as the fallback.
    //
    // Reading the charter alone was why no politician abroad carried a party:
    // twenty-one nations share `charter-presidential-republic` and it fields
    // no slate, because a slate on a shared charter would have given China and
    // Brazil the same one. So every foreign national was generated ticketless,
    // and every surface that wanted a party for them fell through to the
    // United States' own — which is how a Kazakh president came to read
    // "Democrat".
    //
    // A country the dataset says runs no parties still generates none, and
    // that is the correct outcome rather than a gap: `contest: "none"` ships an
    // empty slate on purpose.
    const charter = charterById.get(governmentByNation.get(spec.nation as string) ?? "");
    const parties = systemByNation.get(spec.nation as string)?.parties ?? charter?.parties ?? [];
    return generateNationPool(spec, nameByNation.get(spec.nation as string) ?? "", streams, parties);
  });
}

// The cabinet draft: the candidates actually offered for one seat, best-first
// on competence so the shortlist reads as a shortlist rather than a raffle.
export function candidatesForRole(pool: readonly Person[], nation: string, role: string): Person[] {
  return pool
    .filter((p) => (p.nationality as string) === nation && p.eligibleRoles.some((r) => (r as string) === role))
    .sort((a, b) => b.competence - a.competence);
}
