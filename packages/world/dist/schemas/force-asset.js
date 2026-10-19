import { z } from "zod";
// The closed vocabulary of things a service can count.
//
// An order of battle used to name its holdings in free prose — `"Brigade
// combat teams"`, `"Surface combatants"` — and every rule that read one matched
// the string. A force package that wanted eight brigades wanted the eight
// characters `Brigade c…` to appear on the nation's record, a commitment drew
// its bench down by string equality, and a dataset that spelled the same
// formation two ways carried two benches nobody could add together. A holding
// the engine can only find by its spelling is a holding the engine cannot
// reason about.
//
// So the name is an id from this catalog, and the catalog carries what the
// engine needs to treat a holding as a quantity rather than a label: which
// service owns it, which domain of a contest it fights in, what scale of thing
// one of it is, what one of it counts as, and roughly how many people crew one
// — so a bench of hulls and a bench of brigades can both be read as people
// under arms, and a decomposition that claims more people in its units than
// the service has can be refused.
export const MILITARY_BRANCHES = ["army", "navy", "air", "marines", "space", "cyber"];
/**
 * Which branch-strength reading each service answers for. `land` covers the
 * army and the marines together: branch strength is a reading about ground
 * combat power, and a marine corps is ground combat power that arrives by sea.
 */
export const BRANCH_STRENGTH_OF = {
    army: "land",
    marines: "land",
    navy: "naval",
    air: "air",
    space: "space",
    cyber: "cyber",
};
/** The arena a holding fights in. The contest is decided one domain at a time. */
export const FORCE_DOMAINS = ["ground", "sea", "air", "space", "cyber"];
/**
 * The scale of one of the thing.
 *
 * `platform` is a hull, an airframe or a satellite — a machine with a crew.
 * `unit` is the battalion, squadron and team scale a deployment order names.
 * `formation` is the scale that owns units — a division, a strike group, a
 * corps — and is what a service *is* rather than what it can send this week.
 */
export const FORCE_ECHELONS = ["platform", "unit", "formation"];
/** What one of the thing is counted as, for the noun a screen puts beside a figure. */
export const FORCE_COUNT_NOUNS = ["formations", "hulls", "airframes", "satellites", "teams", "batteries"];
const spec = (branch, domain, echelon, label, singular, counts, nominalPersonnel, description) => ({ branch, domain, echelon, label, singular, counts, nominalPersonnel, description });
/**
 * Every countable thing a service in this dataset holds. Ids are
 * `<branch>.<kind>`, so an id says which service owns it before the catalog is
 * consulted, and the validator holds each holding to the branch it sits under.
 */
export const FORCE_ASSETS = {
    // --- Army ---------------------------------------------------------------
    "army.division": spec("army", "ground", "formation", "Divisions", "a division", "formations", 15_000, "The largest standing ground formation: three or four brigades under one headquarters, with its own artillery, aviation and logistics. What a war is planned in."),
    "army.airborne-division": spec("army", "ground", "formation", "Airborne and air assault divisions", "an airborne division", "formations", 14_000, "A division that arrives by parachute or helicopter rather than by road. The fastest large ground force a country can put somewhere, and the lightest once it lands."),
    "army.armored-brigade": spec("army", "ground", "formation", "Armored brigade combat teams", "an armored brigade", "formations", 4_500, "A brigade built around tanks and tracked infantry carriers. The heaviest thing on the ground and the slowest to ship."),
    "army.brigade-combat-team": spec("army", "ground", "formation", "Brigade combat teams", "a brigade combat team", "formations", 4_000, "The self-contained maneuver brigade a deployment order actually names: infantry or armor with its own artillery, engineers and supply. The unit of account for a ground commitment."),
    "army.mechanized-brigade": spec("army", "ground", "formation", "Mechanized brigades", "a mechanized brigade", "formations", 3_500, "Infantry carried in armored vehicles with a tank battalion attached. The standing heavy brigade of a mid-sized army."),
    "army.air-assault-brigade": spec("army", "ground", "formation", "Air assault brigades", "an air assault brigade", "formations", 3_000, "Light infantry that moves by helicopter. Quick to commit, quick to extract, and thin once it is in contact."),
    "army.combat-aviation-brigade": spec("army", "ground", "formation", "Combat aviation brigades", "a combat aviation brigade", "formations", 2_500, "The army's own helicopters: attack, lift and reconnaissance squadrons that move and cover the maneuver brigades."),
    "army.group-army": spec("army", "ground", "formation", "Group armies", "a group army", "formations", 45_000, "A corps-scale command of several combined-arms brigades with their supporting arms. The echelon a large continental army fights in."),
    "army.combined-arms-army": spec("army", "ground", "formation", "Combined-arms armies", "a combined-arms army", "formations", 40_000, "A field army of several divisions or brigades under one headquarters. The echelon that holds a front."),
    "army.maneuver-battalion": spec("army", "ground", "unit", "Maneuver battalions", "a maneuver battalion", "formations", 700, "An infantry or armor battalion: the smallest ground unit that fights as a whole and the building block of every brigade."),
    "army.air-defense-battalion": spec("army", "ground", "unit", "Air and missile defense battalions", "an air and missile defense battalion", "formations", 500, "A battalion of surface-to-air missile batteries. What shields a deployed force, a capital or an ally from aircraft and missiles."),
    "army.air-defense-battery": spec("army", "ground", "unit", "Ground-based air defense batteries", "an air defense battery", "batteries", 150, "One missile battery with its radar and launchers. The smallest air-defense unit that can be sent on its own."),
    // --- Navy ---------------------------------------------------------------
    "navy.carrier-strike-group": spec("navy", "sea", "formation", "Carrier strike groups", "a carrier strike group", "formations", 7_500, "An aircraft carrier with its air wing and the cruisers, destroyers and submarine that screen it. The fleet's unit of presence: where one is, the country is."),
    "navy.surface-action-group": spec("navy", "sea", "formation", "Surface action groups", "a surface action group", "formations", 1_200, "Three or four surface combatants operating together without a carrier. Enough to blockade a port or escort a convoy."),
    "navy.amphibious-ready-group": spec("navy", "sea", "formation", "Amphibious ready groups", "an amphibious ready group", "formations", 3_000, "The amphibious ships that carry a marine expeditionary unit, its aircraft and landing craft. How marines arrive from the sea."),
    "navy.fleet": spec("navy", "sea", "formation", "Fleets", "a fleet", "formations", 40_000, "A standing regional naval command with the ships, submarines and shore establishment assigned to one ocean."),
    "navy.aircraft-carrier": spec("navy", "sea", "platform", "Aircraft carriers", "an aircraft carrier", "hulls", 5_000, "A ship that carries an air wing. Counted with its crew and the air wing aboard; the group that screens it is counted separately."),
    "navy.attack-submarine": spec("navy", "sea", "platform", "Attack submarines", "an attack submarine", "hulls", 130, "A submarine built to hunt ships and other submarines and to strike ashore with cruise missiles. The quietest thing a navy can send."),
    "navy.ballistic-missile-submarine": spec("navy", "sea", "platform", "Ballistic-missile submarines", "a ballistic-missile submarine", "hulls", 155, "A submarine that carries nuclear missiles. The sea leg of a deterrent, and the one nobody is expected to find."),
    "navy.surface-combatant": spec("navy", "sea", "platform", "Surface combatants", "a surface combatant", "hulls", 300, "A cruiser, destroyer or large frigate: the armed ships that escort, blockade, and carry the fleet's missiles."),
    "navy.frigate": spec("navy", "sea", "platform", "Frigates", "a frigate", "hulls", 180, "A mid-sized escort built for air defense or submarine hunting. The workhorse of a navy that does not run carriers."),
    "navy.amphibious-ship": spec("navy", "sea", "platform", "Amphibious warfare ships", "an amphibious warfare ship", "hulls", 800, "A ship built to land troops, vehicles and helicopters on a shore. What makes a marine force a force that can arrive."),
    "navy.mine-countermeasures-vessel": spec("navy", "sea", "platform", "Mine countermeasures vessels", "a mine countermeasures vessel", "hulls", 40, "A small ship that finds and clears sea mines. Unglamorous until a strait is closed."),
    // --- Air ----------------------------------------------------------------
    "air.fighter-squadron": spec("air", "air", "unit", "Fighter squadrons", "a fighter squadron", "formations", 300, "Twelve to twenty-four fighters with their pilots and maintainers. The unit an air deployment is ordered in."),
    "air.bomber-squadron": spec("air", "air", "unit", "Bomber squadrons", "a bomber squadron", "formations", 400, "A squadron of long-range bombers. Reach measured in continents rather than in miles."),
    "air.refueling-squadron": spec("air", "air", "unit", "Air refueling squadrons", "an air refueling squadron", "formations", 250, "Tanker aircraft and their crews. What turns a fighter's radius into a theater."),
    "air.fighter-brigade": spec("air", "air", "formation", "Fighter brigades", "a fighter brigade", "formations", 1_500, "A brigade-scale air formation of several fighter groups, in an air force organized on the brigade model."),
    "air.fighter-regiment": spec("air", "air", "formation", "Fighter regiments", "a fighter regiment", "formations", 900, "Two or three fighter squadrons under one regimental headquarters, in an air force organized on the regiment model."),
    "air.fighter": spec("air", "air", "platform", "Fighter aircraft", "a fighter", "airframes", 20, "A combat aircraft built to win the air and strike from it. Counted with the pilots and the maintainers who keep one flying."),
    "air.strategic-bomber": spec("air", "air", "platform", "Strategic bombers", "a strategic bomber", "airframes", 60, "A long-range bomber able to strike across an ocean, conventional or nuclear. The air leg of a deterrent."),
    "air.tanker": spec("air", "air", "platform", "Tanker aircraft", "a tanker", "airframes", 25, "An aircraft that refuels others in flight. No tankers, no reach."),
    "air.strategic-airlifter": spec("air", "air", "platform", "Strategic airlift aircraft", "a strategic airlifter", "airframes", 40, "A heavy transport that can carry armored vehicles and a battalion across an ocean. What airlift capacity is made of."),
    "air.transport": spec("air", "air", "platform", "Transport and tanker aircraft", "a transport aircraft", "airframes", 30, "A mid-sized air force's transports and tankers, counted together because it flies them as one fleet."),
    // --- Marines ------------------------------------------------------------
    "marines.expeditionary-force": spec("marines", "ground", "formation", "Marine expeditionary forces", "a marine expeditionary force", "formations", 45_000, "A division of marines with its own air wing and logistics group. The largest force a country can land from the sea."),
    "marines.littoral-regiment": spec("marines", "ground", "formation", "Marine littoral regiments", "a marine littoral regiment", "formations", 2_000, "A regiment built to hold islands and straits with missiles and sensors rather than to storm beaches."),
    "marines.brigade": spec("marines", "ground", "formation", "Marine brigades", "a marine brigade", "formations", 4_000, "A brigade of naval infantry with its landing craft and armor. The unit a marine landing is planned in."),
    "marines.infantry-regiment": spec("marines", "ground", "unit", "Infantry regiments", "an infantry regiment", "formations", 3_000, "Three battalions of marine infantry. What goes ashore first."),
    "marines.infantry-battalion": spec("marines", "ground", "unit", "Marine infantry battalions", "a marine infantry battalion", "formations", 700, "One battalion of marines. The whole landing force of a small navy, and a company-sized crisis's answer for a large one."),
    "marines.expeditionary-unit": spec("marines", "ground", "unit", "Marine expeditionary units", "a marine expeditionary unit", "formations", 2_200, "A battalion of marines with aircraft and logistics embarked on an amphibious ready group. The force already at sea when a crisis starts."),
    // --- Space --------------------------------------------------------------
    "space.delta": spec("space", "space", "formation", "Space deltas", "a space delta", "formations", 600, "The space force's operational formation: the squadrons that fly one mission — warning, navigation, communications, tracking."),
    "space.missile-warning-constellation": spec("space", "space", "platform", "Missile-warning satellite constellations", "a missile-warning constellation", "satellites", 300, "The satellites that see a launch and the ground stations that read them. Counted as constellations, because one satellite warns of nothing."),
    "space.navigation-satellite": spec("space", "space", "platform", "Positioning and navigation satellites", "a navigation satellite", "satellites", 10, "A satellite in the constellation that tells every ship, aircraft and munition where it is. Counted with its share of the control segment."),
    // --- Cyber --------------------------------------------------------------
    "cyber.mission-force-team": spec("cyber", "cyber", "formation", "Cyber mission force teams", "a cyber mission force team", "teams", 50, "The whole roster of a cyber command's teams across national, combat and protection missions. What the command is, counted."),
    "cyber.national-mission-team": spec("cyber", "cyber", "unit", "National mission teams", "a national mission team", "teams", 50, "A team that defends the country against a state-level intrusion and, when ordered, reaches into the adversary's networks."),
    "cyber.network-defense-team": spec("cyber", "cyber", "unit", "Network defense teams", "a network defense team", "teams", 50, "A team that guards the country's own networks: the defensive half of a cyber force, and the half that is always on duty."),
    "cyber.combat-mission-team": spec("cyber", "cyber", "unit", "Combat mission teams", "a combat mission team", "teams", 50, "A team assigned to a combatant command to support its operations in the adversary's networks."),
};
const ids = Object.keys(FORCE_ASSETS);
if (ids.length === 0)
    throw new Error("the force-asset catalog is empty");
export const FORCE_ASSET_IDS = [ids[0], ...ids.slice(1)];
/** The catalog id, as a schema. A holding named outside the catalog does not parse. */
export const ForceAssetIdSchema = z.enum(FORCE_ASSET_IDS);
export function forceAssetFor(id) {
    return FORCE_ASSETS[id];
}
export function isForceAssetId(value) {
    return Object.prototype.hasOwnProperty.call(FORCE_ASSETS, value);
}
/** The plural roster label, or the id itself where the id is not in the catalog — never a blank. */
export function forceAssetLabel(id) {
    return isForceAssetId(id) ? FORCE_ASSETS[id].label : id;
}
/**
 * The noun a count is read in: "48 fighters", "1 aircraft carrier", "8 brigade
 * combat teams". Derived from the catalog's own singular, so a count and a
 * sentence about one of the thing never name a holding two ways. The id comes
 * back unchanged where it is not in the catalog, as `forceAssetLabel` does.
 */
export function forceAssetNoun(id, count) {
    if (!isForceAssetId(id))
        return id;
    const one = FORCE_ASSETS[id].singular.replace(/^an? /, "");
    if (count === 1 || one.endsWith("aircraft"))
        return one;
    return /[^aeiou]y$/.test(one) ? `${one.slice(0, -1)}ies` : `${one}s`;
}
export function forceAssetsOfBranch(branch) {
    return FORCE_ASSET_IDS.filter((id) => FORCE_ASSETS[id].branch === branch);
}
/** People needed to field `count` of the thing, at the catalog's nominal establishment. */
export function forceAssetPersonnel(id, count) {
    return FORCE_ASSETS[id].nominalPersonnel * count;
}
