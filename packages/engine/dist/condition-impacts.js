// What every kind of condition costs a country, and what each is called.
//
// Split out of conditions.ts, which owns the weekly rule: the tables are the
// balance surface a designer reads and argues with, and the rule is the code
// that applies them. Keeping them in one file put a designer's whole working
// set behind eight hundred lines of mechanism.
// How much of the country is inside it, and therefore how much of the country
// it costs. A city-scoped outbreak is a story; a nation-scoped one is a crisis.
export const SCOPE_WEIGHT = { city: 0.3, region: 0.6, nation: 1 };
export const NO_IMPACT = {
    regimeStability: 0,
    protestPressure: 0,
    insurgencyPressure: 0,
    reserveDrain: 0,
    macroPressure: { growth: 0, inflation: 0, unemployment: 0 },
};
// Each kind hurts a country in its own shape: a drought is an economic and
// political slow burn, an earthquake is a fiscal shock, unrest is a direct
// challenge to whoever is governing.
export const IMPACTS = {
    // Acute. Unchanged in everything but where the growth term is delivered.
    pandemic: { ...NO_IMPACT, regimeStability: 0.05, protestPressure: 0.04, reserveDrain: 0.05, macroPressure: { growth: 0.04, inflation: 0, unemployment: 0.02 } },
    earthquake: { ...NO_IMPACT, regimeStability: 0.04, protestPressure: 0.02, reserveDrain: 0.06, macroPressure: { growth: 0.03, inflation: 0, unemployment: 0.01 } },
    flood: { ...NO_IMPACT, regimeStability: 0.03, protestPressure: 0.02, reserveDrain: 0.04, macroPressure: { growth: 0.02, inflation: 0, unemployment: 0.008 } },
    cyclone: { ...NO_IMPACT, regimeStability: 0.03, protestPressure: 0.02, reserveDrain: 0.05, macroPressure: { growth: 0.02, inflation: 0, unemployment: 0.008 } },
    wildfire: { ...NO_IMPACT, regimeStability: 0.02, protestPressure: 0.02, reserveDrain: 0.03, macroPressure: { growth: 0.015, inflation: 0, unemployment: 0.005 } },
    // A drought is a price story as much as an output one: it reaches the table.
    drought: { ...NO_IMPACT, regimeStability: 0.03, protestPressure: 0.05, reserveDrain: 0.02, macroPressure: { growth: 0.03, inflation: 0.01, unemployment: 0.006 } },
    // A tornado is a county and one afternoon, and it bills once rather than weekly
    // (`INCIDENT_KINDS`), so the row is what the whole event costs and not a rate.
    // Light on order, because nobody blames a government for the weather itself,
    // and real on the reserves and the public's read of the response, which is the
    // only part of a tornado a president owns.
    tornado: { ...NO_IMPACT, regimeStability: 0.015, protestPressure: 0.01, reserveDrain: 0.025, macroPressure: { growth: 0.008, inflation: 0, unemployment: 0.003 } },
    // A region stopped for a week: the largest output term of the three, because
    // the cost of a winter storm is the week nothing moved, and the one with a
    // price term, because heating and freight both spike while it runs.
    "winter-storm": { ...NO_IMPACT, regimeStability: 0.02, protestPressure: 0.015, reserveDrain: 0.03, macroPressure: { growth: 0.025, inflation: 0.004, unemployment: 0.006 } },
    // A grid and a death toll, billed once. Heaviest of the three on the street and
    // on the public's reading, because the failure a heat wave exposes is the
    // state's own — power that went out, cooling nobody opened, a toll counted
    // afterwards — and lightest on output, because the economy does not stop.
    "heat-wave": { ...NO_IMPACT, regimeStability: 0.025, protestPressure: 0.03, reserveDrain: 0.02, macroPressure: { growth: 0.01, inflation: 0.006, unemployment: 0.003 } },
    // Standing. Each bills the channels DOWNSTREAM of what its onset reads, and
    // never the reading itself — see ImpactProfile.macroPressure and Law 8.
    //
    // The five economic kinds carry a positive growth term for the same reason
    // the acute kinds do: it is a drag. Authored negative, they RAISED the
    // resting point of the economies they were supposedly hurting — a world
    // under a standing economic condition sat further above its own baseline
    // growth than a clean one did, and `recession`, which opens on a reading of
    // growth, became a kind that could barely open at all.
    // No protestPressure term, and its absence is the point.
    //
    // This row raised `protestPressure` by 0.06 a week, and `unrestChance` opens
    // unrest on `protestPressure` — so unrest made itself likelier for as long as
    // it ran, and the stat it fed only ever moved up. That is a shipped instance
    // of exactly the loop Law 8 exists to forbid; it was survivable only because
    // unrest closed on a timer rather than on its cause, which hid the ratchet in
    // the stat rather than in the condition. Reclassifying unrest as standing
    // would have made it terminal, and the honest fix is to break the loop rather
    // than to exempt the one kind that had it.
    //
    // What unrest costs is unchanged in every other channel. It is now slightly
    // cheaper in total, which is correct: the removed term was never a cost the
    // government paid, it was the condition paying itself.
    //
    // Other kinds may still raise `protestPressure` — a drought putting people on
    // the street is real interplay, and it feeds a *different* condition's onset.
    // The law is about a kind feeding itself.
    unrest: {
        ...NO_IMPACT,
        regimeStability: 0.06,
        insurgencyPressure: 0.03,
        reserveDrain: 0.02,
        macroPressure: { growth: 0.02, inflation: 0, unemployment: 0 },
    },
    // The three rate kinds are labels. Each names what the rates themselves are
    // already doing, and what that costs the public already reaches approval
    // through the rates (prosperity reads growth, prices and jobs). A recession
    // that also pushed unemployment up and billed approval directly charged the
    // same slump two and three times, and its own push on jobs deepened the
    // readings that held it open. What stays is what only the named state costs:
    // order, the street and the reserves.
    recession: { ...NO_IMPACT, regimeStability: 0.02, protestPressure: 0.03, reserveDrain: 0.03 },
    "inflation-shock": { ...NO_IMPACT, regimeStability: 0.03, protestPressure: 0.05, reserveDrain: 0.02 },
    "unemployment-shock": { ...NO_IMPACT, regimeStability: 0.04, protestPressure: 0.05, insurgencyPressure: 0.01, reserveDrain: 0.03 },
    // Onset reads debt and the sovereign rating; it bills the reserves hardest,
    // which is the channel a distressed sovereign actually feels, and prices a
    // little, because a sovereign in distress is a currency in distress.
    "fiscal-crisis": { ...NO_IMPACT, regimeStability: 0.04, protestPressure: 0.04, reserveDrain: 0.09, macroPressure: { growth: 0.02, inflation: 0.006, unemployment: 0.015 } },
    // Onset reads the energy balance; it reaches the country as a price shock,
    // which is why this is the one standing kind with a positive inflation term.
    "energy-shortage": { ...NO_IMPACT, regimeStability: 0.03, protestPressure: 0.045, reserveDrain: 0.03, macroPressure: { growth: 0.018, inflation: 0.012, unemployment: 0.012 } },
    // Onset reads shelter cost against the class axis; it bills mood and the
    // street far more than output.
    // No inflation term: this kind opens on a reading of inflation, so writing it
    // would be the same self-exciting loop unrest carried. What a housing crisis
    // costs a government is the street and its standing, not the price level —
    // shelter cost is upstream of this condition, never downstream of it.
    "housing-crunch": { ...NO_IMPACT, regimeStability: 0.02, protestPressure: 0.05, reserveDrain: 0.01, macroPressure: { growth: 0.006, inflation: 0, unemployment: 0.004 } },
    // Home events. Each bills the President's layer of the event only; where an
    // impact record carries the physical loss (an intrusion's outage), the output
    // term stays there and is not charged twice here.
    //
    // An intrusion's lost output is its impact record's; this is the public's
    // read of a government whose systems were broken into.
    cyberattack: { ...NO_IMPACT, regimeStability: 0.015, protestPressure: 0.005, reserveDrain: 0.01 },
    // Onset reads prices and jobs (condition-home-events.ts), so the row writes
    // neither: a stoppage is lost output and a public that blames whoever could
    // have settled it.
    "work-stoppage": { ...NO_IMPACT, regimeStability: 0.01, protestPressure: 0.02, reserveDrain: 0.005, macroPressure: { growth: 0.02, inflation: 0, unemployment: 0 } },
    // Onset reads the rate rise and the cycle, neither of which this writes. A
    // run on a large bank is credit pulled from the economy and a deposit
    // guarantee the reserves stand behind.
    "bank-failure": { ...NO_IMPACT, regimeStability: 0.02, protestPressure: 0.02, reserveDrain: 0.04, macroPressure: { growth: 0.03, inflation: 0, unemployment: 0.01 } },
    // One afternoon, billed once (`INCIDENT_KINDS`): the country's order and its
    // street, nothing in output.
    "mass-casualty-attack": { ...NO_IMPACT, regimeStability: 0.02, protestPressure: 0.03, reserveDrain: 0.002 },
    // A diplomatic file the country watches. Small, because one American held
    // abroad is a test of the President rather than a cost to the country.
    "wrongful-detention": { ...NO_IMPACT, regimeStability: 0.005 },
};
const HAZARD_WORDS = {
    pandemic: { noun: "an epidemic", label: "Outbreak" },
    earthquake: { noun: "an earthquake", label: "Earthquake" },
    flood: { noun: "flooding", label: "Flooding" },
    // The generic entry is the one basin nobody's weather service calls a cyclone;
    // `CYCLONE_BASIN_WORDS` is what a reader outside the Atlantic gets.
    cyclone: { noun: "a hurricane", label: "Hurricane" },
    wildfire: { noun: "wildfires", label: "Wildfire" },
    drought: { noun: "drought", label: "Drought" },
    tornado: { noun: "a tornado", label: "Tornado" },
    "winter-storm": { noun: "a winter storm", label: "Winter storm" },
    "heat-wave": { noun: "a heat wave", label: "Heat wave" },
    unrest: { noun: "civil unrest", label: "Civil unrest" },
    recession: { noun: "a recession", label: "Recession" },
    "inflation-shock": { noun: "runaway prices", label: "Runaway prices" },
    "unemployment-shock": { noun: "mass unemployment", label: "Mass unemployment" },
    "fiscal-crisis": { noun: "a debt crisis", label: "Debt crisis" },
    "energy-shortage": { noun: "an energy shortage", label: "Energy shortage" },
    "housing-crunch": { noun: "a housing crisis", label: "Housing crisis" },
    cyberattack: { noun: "a cyberattack", label: "Cyberattack" },
    "work-stoppage": { noun: "a national strike", label: "National strike" },
    "bank-failure": { noun: "a bank failure", label: "Bank failure" },
    "mass-casualty-attack": { noun: "a mass shooting", label: "Mass shooting" },
    "wrongful-detention": { noun: "a wrongful detention", label: "American detained abroad" },
};
const CYCLONE_BASIN_WORDS = {
    atlantic: { noun: "a hurricane", label: "Hurricane" },
    "northwest-pacific": { noun: "a typhoon", label: "Typhoon" },
    indian: { noun: "a cyclone", label: "Cyclone" },
};
/** Where a coastline sits, for the purpose of naming its storms. */
export function cycloneBasinOf(geo) {
    // The western Pacific: east of the Malay peninsula, west of the dateline, and
    // north of the equator — Japan, the Philippines, Taiwan, the Chinese coast.
    if (geo.lat >= 0 && geo.lon >= 100 && geo.lon <= 180)
        return "northwest-pacific";
    // The Indian Ocean and the south Pacific, which share the word.
    if (geo.lon >= 20 && geo.lon <= 180 && (geo.lat < 0 || geo.lon < 100))
        return "indian";
    return "atlantic";
}
/**
 * The words for a hazard, in the basin it happened in.
 *
 * `geo` absent reads as the Atlantic, which is the United States: every home
 * sentence in the game is about American ground, and a caller with no country
 * in hand is on it.
 */
export function hazardWords(kind, geo) {
    if (kind === "cyclone" && geo)
        return CYCLONE_BASIN_WORDS[cycloneBasinOf(geo)];
    return HAZARD_WORDS[kind];
}
/** The noun, article included, for a sentence. */
export function hazardNoun(kind, geo) {
    return hazardWords(kind, geo).noun;
}
/** Every spelling the condition headline writer can emit, for reading archived headlines. */
export function hazardNouns(kind) {
    return kind === "cyclone" ? Object.values(CYCLONE_BASIN_WORDS).map((words) => words.noun) : [HAZARD_WORDS[kind].noun];
}
/** The bare name, for a heading over a figure. */
export function hazardLabel(kind, geo) {
    return hazardWords(kind, geo).label;
}
/**
 * The resting point a kind's own cause sits on, and which direction of a
 * program's shift on it answers the condition.
 *
 * Without this, having *chosen* a program in the answering department was the
 * whole of the reading, so austerity sped a recession's recovery exactly as fast
 * as stimulus did, and borrowing harder "answered" a debt crisis. A stance is
 * attention to a file; a stance pushing the wrong way is not.
 *
 * Only the kinds whose cause is one of the five resting points, which is the
 * five standing conditions the economy produces plus unrest. A hurricane has no
 * axis — no program makes the storm smaller — so a weather kind keeps the plain
 * reading of whether the department is being run at all.
 */
export const CONDITION_AXIS = {
    recession: { path: "economy.growth", answers: 1 },
    "inflation-shock": { path: "economy.inflation", answers: -1 },
    "unemployment-shock": { path: "economy.unemployment", answers: -1 },
    // A shortage is felt as a price, and a program that pushes prices further up
    // is not working the file whatever department it sits in.
    "energy-shortage": { path: "economy.inflation", answers: -1 },
    "housing-crunch": { path: "economy.inflation", answers: -1 },
    unrest: { path: "politics.protestPressure", answers: -1 },
    // The one kind whose cause is the books rather than a rate, read on the
    // channel the books show up in: a program that buys growth buys it by
    // borrowing, and borrowing harder is not an answer to a market that has
    // stopped lending. So the answering sign here is the opposite of a
    // recession's, on the same axis, which is the whole of the distinction.
    "fiscal-crisis": { path: "economy.growth", answers: -1 },
};
// How far a condition reaches, in words that fit the country it reaches in.
// "Across a region" read as a region of the world, and a country of a few
// hundred thousand people has no regions a wire would name and no second city
// to set against the one: Barbados struck "across a region" was the result.
// The scope is the model's footprint; only the words for it change with size.
export const SMALL_STATE_POPULATION = 1_000_000;
const SCOPE_WORDS = {
    large: { city: "in one city", region: "in one region", nation: "nationwide" },
    small: { city: "in one town", region: "in part of the country", nation: "across the whole country" },
};
/** The extent phrase for a scope, sized to the country; a country of unknown size reads as a large one. */
export function scopePhrase(scope, population) {
    const size = population !== undefined && population < SMALL_STATE_POPULATION ? "small" : "large";
    return SCOPE_WORDS[size][scope];
}
