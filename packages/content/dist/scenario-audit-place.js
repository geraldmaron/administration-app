// The locus-and-place family: rules that hold what the prose says about where
// a week happens to the place the resolver and the gazetteer will actually put
// it. Beside the audit rather than inside it, for the reason the impact family
// is: the audit is one table of rules, and a family that reads the dataset's
// cities is easier to change on its own.
import { US_ID, worldCities, worldStates } from "@admin/world";
import { GENERIC_PLACE_PHRASES, phraseIn } from "./audit-lexicon.js";
import { passages } from "./scenario-audit-contract.js";
function make(kind, severity, scenario, message) {
    return { kind, severity, scenario, message };
}
/**
 * Authored prose asserting a geography the resolver decides.
 *
 * `locus.site` names a *kind* of place and `resolveLocus` picks the real one off
 * the board at run time. A chokepoint resolves to whichever chokepoint the
 * nation actually holds, and the dataset's chokepoints are canals as often as
 * straits — so a descriptor reading "midway across the strait" datelined itself
 * "Panama Canal — the gray water midway across the strait" the moment the player
 * was the United States, whose only chokepoint is a canal.
 *
 * An error rather than a warning: this is not a judgment about craft, it is
 * prose contradicting a fact printed beside it.
 */
const LANDFORM_BY_SITE = {
    chokepoint: /\b(strait|straits|canal|isthmus)\b/i,
    capital: /\b(village|hamlet)\b/i,
    border: /\b(coastline|shoreline|seafront)\b/i,
};
export function auditLocusLandform(def, findings) {
    const hit = LANDFORM_BY_SITE[def.locus.site]?.exec(def.locus.descriptor)?.[0];
    if (!hit)
        return;
    findings.push(make("locus-asserts-landform", "error", def.id, `the locus descriptor calls it a "${hit}", which the resolver may contradict: a ${def.locus.site} resolves to whichever real place the board holds. ` +
        "Describe the water and the people, not the landform — the place name is printed beside it"));
}
const MARITIME = /\b(harbor|port|ports|ship|ships|vessel|vessels|navy|navies|naval|fleet|coast|coastal|shipping|cargo|maritime|dockside|docks?|strait|sea lanes?|at anchor)\b/i;
const BOARD_BOUND = new Set(["tensest", "closest", "band", "warCounterpart", "belligerent", "stricken"]);
/**
 * A scenario whose place or prose needs the counterpart to have a coast, dealt
 * to a counterpart the board may pick landlocked. `geography` reads the
 * player's own country unless it says `of: "counterpart"`, so a week that sends
 * ships into "their harbor" was datelined in Zurich or Almaty.
 *
 * An error where the locus itself is a coast, border or chokepoint, a warning where only the prose
 * says maritime things.
 */
export function auditCoastalCounterpart(def, findings) {
    if (def.locus.ground !== "counterpart" || !BOARD_BOUND.has(def.cast.pick))
        return;
    const gated = (field) => def.conditions.some((c) => c.kind === "geography" && c.of === "counterpart" && c.field === field && c.is);
    const flag = (kind, field, severity, why) => findings.push(make("coastal-counterpart-ungated", severity, def.id, `${why} on the counterpart's ground, but nothing gates the cast government ${kind}, so a country without one can be dealt it. Add { "kind": "geography", "field": "${field}", "is": true, "of": "counterpart" }`));
    const prose = [def.subject, def.context?.standing ?? "", ...def.opening.map((beat) => beat.text), def.locus.descriptor].join(" ");
    const hit = MARITIME.exec(prose)?.[0];
    if (def.locus.site === "coast" && !gated("coastal"))
        flag("having a coast", "coastal", "error", "the locus is a coast");
    else if (def.locus.site !== "coast" && hit && !gated("coastal"))
        flag("having a coast", "coastal", "warning", `the prose says "${hit}"`);
    if (def.locus.site === "border" && !gated("bordered") && !def.conditions.some((c) => c.kind === "sharesBorder" && c.present))
        flag("having a land neighbor", "bordered", "error", "the locus is a border");
    if (def.locus.site === "chokepoint" && !gated("chokepoint"))
        flag("holding a chokepoint", "chokepoint", "error", "the locus is a chokepoint");
}
const US_CITY_NAMES = worldCities
    .filter((city) => city.nation === US_ID && !worldStates.some((state) => state.name === city.name))
    .map((city) => city.name);
const US_CITY_PATTERN = new RegExp(`\\b(${US_CITY_NAMES.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`);
/**
 * A real American city named in the prose of a week the map places somewhere
 * else. Real cities are welcome, but a week set in the field has to bind the
 * city it names (locus.city, written as {{city}}) or the map pins a different
 * one; a week set in the capital may name the cities it is about freely.
 */
export function auditUnplacedCity(def, findings) {
    if (def.locus.site === "capital" || def.locus.city || def.locus.settlementId)
        return;
    for (const passage of passages(def)) {
        const hit = US_CITY_PATTERN.exec(passage.text)?.[0];
        if (!hit)
            continue;
        findings.push(make("unplaced-city-name", "error", def.id, `${passage.label} names ${hit}, but the week is set in the field without binding a city, so the map will pin somewhere else. Bind locus.city to ${hit} and write {{city}}, or set the week in the capital`));
        return;
    }
}
/**
 * A cast scenario pinned onto the player's own capital while its prose stands
 * on somebody else's ground.
 *
 * The resolver is not the defect and never was. `locus.ground` defaults to
 * "counterpart" for a cast scenario and to the player's own nation for a
 * domestic one (a `none` cast binds the counterpart slot back to home), so an
 * unset ground is always right. What the rendered loop caught is an authored
 * override: a critical hostage week cast "tensest" declared `ground: "home"`
 * and described a detention facility "held under occupation", so a week-one
 * player was told that the tensest nation on the board held a district of
 * Washington, D.C.
 *
 * An error rather than a warning, for the same reason `locus-asserts-landform`
 * is one: this is not a judgment about craft, it is a sentence contradicting
 * the place name printed beside it.
 */
const COUNTERPART_GROUND_MARKS = /\b(?:occupation|occupied|occupying|their capital|their territory|their soil|their own ground|their side of|behind their lines|inside their country|the regime's|the junta's)\b/i;
export function auditLocusGround(def, findings) {
    if (def.locus.ground !== "home" || def.cast.pick === "none")
        return;
    const mark = COUNTERPART_GROUND_MARKS.exec(def.locus.descriptor)?.[0] ??
        (/\{\{\s*counterpart/i.test(def.locus.descriptor) ? "{{counterpart}}" : undefined);
    if (!mark)
        return;
    findings.push(make("locus-ground-mismatch", "error", def.id, `the locus declares ground "home" and then describes the counterpart's ground ("${mark}"), so the map datelines the player's own capital ` +
        "for an event on somebody else's soil. Drop the ground (a cast scenario defaults to the counterpart) or rewrite the descriptor for home"));
}
const PLACE_TRIGGERS = /\b(plants?\b|factor(?:y|ies)\b|industrial zone|midwest|tax holiday|depot strike|strike committee|on strike|the strike|a strike)\b/i;
const CITY_REQUIRED_TRIGGERS = /\b(plants?\b|factor(?:y|ies)\b|industrial zone|tax holiday)\b/i;
const PLACE_CLASSES = new Set(["economy", "disaster", "unrest", "institution", "tragedy"]);
const CITY_TOKEN = /\{\{\s*city\s*\}\}/;
const CITY_GAZETTEER_KEYS = ["cityEmployment", "taxBase", "adminLean", "taxHolidayYears"];
function isDomesticScenario(def) {
    return def.cast.pick === "none" || def.locus.ground === "home";
}
function isGazetteerPlaced(def) {
    return def.locus.city !== undefined || def.locus.state !== undefined || def.locus.sector !== undefined;
}
function joinedProse(def) {
    return passages(def)
        .map((passage) => passage.text)
        .join(" ");
}
export function auditUnplacedDomestic(def, findings) {
    if (!PLACE_CLASSES.has(def.class) || !isDomesticScenario(def))
        return;
    const text = joinedProse(def);
    if (CITY_REQUIRED_TRIGGERS.test(text) && def.locus.city === undefined) {
        findings.push(make("unplaced-domestic", "error", def.id, "domestic plant, factory, industrial-zone, or tax-holiday copy has no city on the locus. Bind a dataset city; do not leave the plant as flavor"));
        return;
    }
    if (isGazetteerPlaced(def) || !PLACE_TRIGGERS.test(text))
        return;
    findings.push(make("unplaced-domestic", "error", def.id, "domestic plant, strike, factory, industrial-zone, Midwest, or tax-holiday copy has no city, state, or sector on the locus. Bind a named place; do not leave the industrial zone as flavor"));
}
export function auditGenericPlace(def, findings) {
    if (!PLACE_CLASSES.has(def.class) || !isDomesticScenario(def))
        return;
    const hit = passages(def)
        .map((passage) => phraseIn(passage.text, GENERIC_PLACE_PHRASES))
        .find((phrase) => phrase !== undefined);
    if (!hit)
        return;
    findings.push(make("generic-place", "error", def.id, `domestic copy names the stand-in metro "${hit}" — bind a dataset city and write {{city}}; these phrases are unauthorable`));
}
export function auditCityEffectUnplaced(def, findings) {
    if (def.locus.city !== undefined)
        return;
    for (const reply of def.replies) {
        if (reply.commitment.kind !== "position" || !reply.commitment.gazetteer)
            continue;
        const recipe = reply.commitment.gazetteer;
        const field = CITY_GAZETTEER_KEYS.find((key) => recipe[key] !== undefined);
        if (!field)
            continue;
        findings.push(make("city-effect-unplaced", "error", def.id, `reply "${reply.id}" declares gazetteer.${field} but locus.city is missing, so the city effect cannot land`));
    }
}
export function auditMissingCityToken(def, findings) {
    if (def.class !== "economy" || !isDomesticScenario(def) || def.locus.city === undefined)
        return;
    const briefing = [def.subject, def.locus.descriptor, ...def.opening.map((beat) => beat.text)].join(" ");
    if (CITY_TOKEN.test(briefing))
        return;
    findings.push(make("missing-city-token", "error", def.id, "domestic economy binds locus.city but never writes {{city}} in the subject, locus descriptor, or opening"));
}
const CITY_BY_ID = new Map(worldCities.map((city) => [city.id, city]));
function locusGroundNation(def) {
    if (def.cast.pick === "none" || def.locus.ground === "home")
        return US_ID;
    if (def.cast.pick === "nation")
        return def.cast.nation;
    return undefined;
}
export function auditUnknownCity(def, findings) {
    const cityId = def.locus.city;
    if (cityId === undefined)
        return;
    const city = CITY_BY_ID.get(cityId);
    if (!city) {
        findings.push(make("unknown-city", "error", def.id, `locus.city "${cityId}" is not in the dataset. Pick a CityId from WorldDataset.cities so {{city}} can resolve and applyCity can land`));
        return;
    }
    const ground = locusGroundNation(def);
    if (ground === undefined || city.nation === ground)
        return;
    findings.push(make("unknown-city", "error", def.id, `locus.city "${cityId}" is in ${city.nation}, which is not this week's ground (${ground}). Pick a dataset city whose nation matches the locus ground`));
}
