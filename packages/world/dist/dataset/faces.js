import { FaceGenome } from "../schemas/face.js";
import { isFaceRef, parseFaceRef } from "../schemas/face-code.js";
import { parsePortraitRef } from "../schemas/portrait.js";
import { ASIAN_LID, BLAZER_CLOTH, BLOUSE_CLOTH, CAP_CLOTH, DASTAR_CLOTH, DEFAULT_EYE_COLOR_ODDS, DEFAULT_EYE_SHAPE_ODDS, DUPATTA_CLOTH, EYE_COLOR_ODDS, EYE_SHAPE_ODDS, GELE_CLOTH, GULF_DRESS, HAIR_TEXTURE_ODDS, HERITAGE_SHIFT_CAP, JUDICIAL_ROLES, NATURAL_HAIR_ODDS, PECI_DRESS, SCARF_CLOTH, SHIRT_CLOTH, SOUTH_ASIAN_DRESS, SUIT_CLOTH, TIE_CLOTH, TRAIT_EXPRESSION, UNIFORM_CLOTH, WEST_AFRICAN_DRESS, isAfricanHeritage, } from "./face-priors.js";
import { nameTraditionOf } from "./name-traditions.js";
function hash(text) {
    let a = 0xdeadbeef;
    let b = 0x41c6ce57;
    for (let i = 0; i < text.length; i += 1) {
        const c = text.charCodeAt(i);
        a = Math.imul(a ^ c, 2654435761);
        b = Math.imul(b ^ c, 1597334677);
    }
    return (Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909)) >>> 0;
}
/** A private stream per face, so drawing one never disturbs another. */
export function faceDraw(seed) {
    let state = hash(seed);
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function pick(r, options) {
    const total = options.reduce((sum, [, w]) => sum + w, 0);
    let x = r() * total;
    for (const [value, w] of options) {
        x -= w;
        if (x <= 0)
            return value;
    }
    return options[options.length - 1][0];
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/**
 * A structure gene, spread across the range: heads that differ by a few
 * percent read as one face, so structure is drawn wide while fine features
 * stay near their mean.
 */
function wide(r, mean = 0.5) {
    return clamp01(mean + ((r() + r()) / 2 - 0.5) * 1.6);
}
/** A gene near a mean and rarely at a rail: faces live in the middle of the range. */
function near(r, mean = 0.5, spread = 0.5) {
    return clamp01(mean + ((r() + r() + r()) / 3 - 0.5) * 2 * spread);
}
const shifted = (mean, by) => mean + Math.max(-HERITAGE_SHIFT_CAP, Math.min(HERITAGE_SHIFT_CAP, by));
function undertoneFor(tone, r) {
    if (tone <= 2)
        return pick(r, [["pink", 0.35], ["neutral", 0.35], ["warm", 0.3]]);
    if (tone === 3)
        return pick(r, [["olive", 0.35], ["warm", 0.35], ["neutral", 0.3]]);
    if (tone === 4)
        return pick(r, [["warm", 0.45], ["olive", 0.3], ["neutral", 0.25]]);
    return pick(r, [["warm", 0.5], ["neutral", 0.5]]);
}
function cutFor(f, texture, r) {
    const masc = f.gender === "masculine";
    const coily = texture === "coily";
    const curly = texture === "curly";
    switch (f.hairStyle) {
        case "bald":
            return masc ? pick(r, [["bald", 0.4], ["balding", 0.45], ["comb-over", 0.15]]) : "buzz";
        case "cropped":
            if (coily)
                return pick(r, [["close-coils", 0.5], ["buzz", 0.3], ["high-top", masc ? 0.2 : 0]]);
            return masc ? pick(r, [["crew", 0.55], ["buzz", 0.45]]) : pick(r, [["pixie", 0.6], ["crew", 0.2], ["buzz", 0.2]]);
        case "short":
            if (coily)
                return pick(r, [["close-coils", 0.75], ["crew", 0.15], ["curly-top", 0.1]]);
            if (masc)
                return pick(r, [["side-part", 0.34], ["crew", 0.16], ["swept-back", 0.16], ["slick-back", 0.12], ["quiff", 0.06], ["curly-top", curly ? 0.3 : 0.04], ["fringe", 0.03]]);
            return pick(r, [["pixie", 0.45], ["bob", 0.3], ["slick-back", 0.08], ["curly-top", curly ? 0.3 : 0.05]]);
        case "long":
            if (masc)
                return pick(r, [["tied-back", 0.5], ["long", 0.2], ["locs", coily ? 0.4 : 0]]);
            if (coily)
                return pick(r, [["afro", 0.24], ["locs", 0.2], ["braids", 0.22], ["curls-long", 0.18], ["bun", 0.16]]);
            if (curly)
                return pick(r, [["curls-long", 0.5], ["lob", 0.2], ["bob", 0.1], ["long", 0.2]]);
            return pick(r, [["long", 0.4], ["lob", 0.25], ["bob", 0.25], ["fringe", 0.1]]);
        case "tied-back":
            return masc ? "tied-back" : pick(r, [["bun", 0.45], ["low-bun", 0.55]]);
        case "covered":
            return "low-bun";
    }
}
function naturalColor(f, r) {
    if (f.hairColor !== "graying" && f.hairColor !== "white")
        return pick(r, NATURAL_HAIR_ODDS[f.hairColor]);
    if (f.heritage.startsWith("europe"))
        return pick(r, [["brown", 0.45], ["dark-brown", 0.35], ["light-brown", 0.2]]);
    return pick(r, [["black", 0.7], ["dark-brown", 0.3]]);
}
/**
 * When graying starts, solved so the face shows what the facet says at the age
 * the facet was drawn, and keeps aging from there. Mirrors the renderer's
 * curve: onset 0 starts at twenty, 1 at sixty-two, gray over twenty-six years.
 */
function grayOnsetFor(f, age, r) {
    const toOnset = (start) => clamp01((start - 20) / 42);
    if (f.hairColor === "white")
        return toOnset(age - 24 - r() * 12);
    if (f.hairColor === "graying")
        return toOnset(age - 9 - r() * 9);
    return toOnset(age + 3 + r() * 14);
}
function facialHairFor(f, r) {
    switch (f.facialHair) {
        case "none":
            return "none";
        case "stubble":
            return "stubble";
        case "mustache":
            return pick(r, [["mustache", 0.6], ["pencil", 0.15], ["walrus", 0.25]]);
        case "trimmed-beard":
            return pick(r, [["short-beard", 0.45], ["circle-beard", 0.35], ["goatee", 0.2]]);
        case "full-beard":
            return pick(r, [["full-beard", 0.75], ["long-beard", 0.25]]);
    }
}
function eyewearFor(f, r) {
    if (f.eyewear === "none")
        return { style: "none", frame: "black", tinted: false };
    const fem = f.gender === "feminine";
    const uniformed = f.attire === "military" || f.attire === "field";
    const style = pick(r, [
        ["rect", 0.3],
        ["round", 0.13],
        ["browline", fem ? 0.04 : 0.14],
        ["thick", 0.18],
        ["rimless", 0.15],
        ["aviator", uniformed ? 0.3 : 0.03],
        ["cat-eye", fem ? 0.12 : 0],
    ]);
    const frame = pick(r, [["black", 0.32], ["slate", 0.18], ["gold", 0.18], ["silver", 0.1], ["tortoise", 0.16], ["burgundy", fem ? 0.06 : 0.01]]);
    return { style, frame, tinted: style === "aviator" && uniformed && r() < 0.5 };
}
/**
 * Makeup as an official sitting shows it: most feminine officeholders wear
 * some, subtly; less in uniform and clerical dress, and a little less with age.
 */
function makeupFor(f, age, r) {
    const share = f.gender === "feminine" ? 1 : f.gender === "androgynous" ? 0.3 : 0;
    const sober = f.attire === "military" || f.attire === "religious" ? 0.5 : 1;
    if (r() >= share * sober * (age > 70 ? 0.7 : 0.9))
        return { lips: "none", eyes: "none", blush: 0 };
    return {
        lips: pick(r, [["nude", 0.28], ["rose", 0.26], ["berry", 0.12], ["red", 0.12], ["plum", 0.08], ["coral", 0.08], ["none", 0.06]]),
        eyes: pick(r, [["liner", 0.4], ["none", 0.3], ["wing", 0.14], ["smoky", age < 45 ? 0.16 : 0.08]]),
        blush: r() * 0.8,
    };
}
/** How a covered head is covered follows the name before the region. */
function coveringFor(f, tradition, r) {
    if (tradition === "south-asian-hindu" || tradition === "south-asian-sikh")
        return "dupatta";
    if (tradition === "south-asian-muslim")
        return pick(r, [["hijab", 0.7], ["dupatta", 0.3]]);
    if (isAfricanHeritage(f.heritage))
        return pick(r, [["hijab", 0.55], ["gele", 0.3], ["headwrap", 0.15]]);
    return pick(r, [["hijab", 0.88], ["headwrap", 0.12]]);
}
function conventionFor(f, nation, r) {
    if (GULF_DRESS.has(nation))
        return { garment: "thobe", headwear: pick(r, [["ghutra", 0.6], ["shemagh", nation === "SAU" ? 0.4 : 0.15]]) };
    if (f.attire === "ceremonial")
        return { garment: "ceremonial", headwear: "none" };
    if (WEST_AFRICAN_DRESS.has(nation) && r() < 0.4)
        return { garment: "kaftan", headwear: r() < 0.7 ? "kufi" : "none" };
    if (SOUTH_ASIAN_DRESS.has(nation) && r() < 0.35)
        return { garment: "nehru", headwear: "none" };
    if (PECI_DRESS.has(nation) && r() < 0.45)
        return { garment: "suit", headwear: "peci" };
    if (nation === "ISR" && r() < 0.2)
        return { garment: "suit", headwear: "kippah" };
    return undefined;
}
function dressFor(f, ctx, r) {
    const masc = f.gender === "masculine";
    const judicial = (ctx.roles ?? []).some((role) => JUDICIAL_ROLES.has(role));
    if (f.hairStyle === "covered") {
        const garment = judicial ? "judicial" : f.attire === "military" ? "military" : pick(r, [["blazer", 0.75], ["dress", 0.25]]);
        return { garment, headwear: coveringFor(f, ctx.tradition, r) };
    }
    if (judicial)
        return { garment: "judicial", headwear: "none" };
    if (masc && ctx.tradition === "south-asian-sikh" && r() < (f.facialHair === "full-beard" ? 0.9 : 0.35)) {
        return { garment: f.attire === "military" ? "military" : pick(r, [["suit", 0.6], ["nehru", 0.4]]), headwear: "turban" };
    }
    if (f.attire === "religious") {
        if (masc && ["mena", "central-asia", "south-asia"].includes(f.heritage))
            return { garment: "robe", headwear: "amamah" };
        return { garment: masc ? "clerical" : "blazer", headwear: "none" };
    }
    if (f.attire === "military")
        return { garment: pick(r, [["military", 0.6], ["military-open", 0.4]]), headwear: "none" };
    if (f.attire === "academic")
        return { garment: "academic", headwear: "none" };
    if (f.attire === "field")
        return { garment: "field", headwear: "none" };
    const convention = masc ? conventionFor(f, ctx.nation ?? "", r) : f.attire === "ceremonial" ? { garment: "ceremonial", headwear: "none" } : undefined;
    if (convention)
        return convention;
    if (!masc)
        return { garment: pick(r, [["blazer", 0.72], ["dress", 0.28]]), headwear: "none" };
    return { garment: pick(r, [["suit", 0.84], ["suit-open", 0.16]]), headwear: "none" };
}
function headClothFor(d, r) {
    const accent = pick(r, [["black", 0.3], ["navy", 0.2], ["ivory", 0.2], ["gold", 0.3]]);
    switch (d.headwear) {
        case "hijab":
        case "headwrap":
            return { color: pick(r, SCARF_CLOTH), accent };
        case "dupatta":
            return { color: pick(r, DUPATTA_CLOTH), accent: "gold" };
        case "gele":
            return { color: pick(r, GELE_CLOTH), accent };
        case "turban":
            return { color: pick(r, DASTAR_CLOTH), accent };
        case "amamah":
            return { color: pick(r, [["black", 0.5], ["white", 0.5]]), accent };
        case "kufi":
            return { color: pick(r, CAP_CLOTH), accent };
        case "kippah":
            return { color: pick(r, [["navy", 0.4], ["black", 0.4], ["white", 0.2]]), accent };
        default:
            return { color: "white", accent };
    }
}
function clothFor(d, f, r) {
    switch (d.garment) {
        case "blazer":
        case "dress":
            return { primary: pick(r, BLAZER_CLOTH), secondary: pick(r, BLOUSE_CLOTH), accent: pick(r, TIE_CLOTH) };
        case "judicial":
            return { primary: "black", secondary: "white", accent: pick(r, [["navy", 0.4], ["burgundy", 0.3], ["silver", 0.3]]) };
        case "military":
        case "military-open":
            return { primary: pick(r, UNIFORM_CLOTH), secondary: pick(r, [["khaki", 0.4], ["light-blue", 0.3], ["white", 0.3]]), accent: pick(r, [["black", 0.5], ["olive", 0.25], ["navy", 0.25]]) };
        case "ceremonial":
            return { primary: pick(r, [["black", 0.5], ["midnight", 0.3], ["navy", 0.2]]), secondary: "white", accent: pick(r, [["crimson", 0.3], ["green", 0.2], ["royal", 0.2], ["gold", 0.15], ["blue", 0.15]]) };
        case "clerical":
            return { primary: pick(r, [["black", 0.7], ["charcoal", 0.3]]), secondary: "black", accent: "black" };
        case "robe":
            return { primary: pick(r, [["black", 0.4], ["brown", 0.3], ["camel", 0.2], ["charcoal", 0.1]]), secondary: pick(r, [["ivory", 0.6], ["cream", 0.4]]), accent: pick(r, [["gold", 0.3], ["black", 0.7]]) };
        case "academic":
            return { primary: pick(r, [["tweed", 0.3], ["brown", 0.2], ["olive", 0.15], ["charcoal", 0.2], ["camel", 0.15]]), secondary: pick(r, [["black", 0.3], ["charcoal", 0.25], ["cream", 0.2], ["burgundy", 0.1], ["navy", 0.15]]), accent: "black" };
        case "field":
            return { primary: pick(r, [["khaki", 0.3], ["olive", 0.25], ["sand", 0.2], ["light-blue", 0.15], ["white", 0.1]]), secondary: "white", accent: "black" };
        case "thobe":
            return { primary: pick(r, [["ivory", 0.6], ["cream", 0.25], ["white", 0.15]]), secondary: "white", accent: f.attire === "ceremonial" ? pick(r, [["black", 0.5], ["brown", 0.3], ["camel", 0.2]]) : "white" };
        case "kaftan":
            return { primary: pick(r, [["white", 0.2], ["cream", 0.15], ["navy", 0.15], ["gold", 0.1], ["green", 0.1], ["burgundy", 0.1], ["royal", 0.1], ["sand", 0.1]]), secondary: "white", accent: pick(r, [["gold", 0.4], ["silver", 0.2], ["ivory", 0.2], ["black", 0.2]]) };
        case "nehru":
            return { primary: pick(r, [["black", 0.2], ["navy", 0.2], ["maroon", 0.15], ["camel", 0.15], ["charcoal", 0.15], ["cream", 0.15]]), secondary: pick(r, [["white", 0.6], ["ivory", 0.4]]), accent: "gold" };
        default:
            return { primary: pick(r, SUIT_CLOTH), secondary: pick(r, SHIRT_CLOTH), accent: pick(r, TIE_CLOTH) };
    }
}
function jewelryFor(f, d, r) {
    if (f.gender !== "feminine")
        return { earrings: "none", necklace: "none", brooch: "none" };
    const open = d.headwear === "none" && d.garment !== "judicial" && d.garment !== "military";
    return {
        earrings: pick(r, [["studs", 0.36], ["pearls", 0.26], ["hoops", 0.08], ["drops", 0.1], ["none", 0.2]]),
        necklace: open ? pick(r, [["pearls", 0.28], ["chain", 0.2], ["pendant", 0.12], ["none", 0.4]]) : "none",
        brooch: d.garment === "blazer" || d.garment === "dress" ? pick(r, [["none", 0.72], ["gold", 0.12], ["pearl", 0.08], ["enamel", 0.08]]) : "none",
    };
}
function pinFor(d, nation, r) {
    if (d.garment !== "suit" && d.garment !== "suit-open" && d.garment !== "blazer")
        return "none";
    if (nation === "USA")
        return pick(r, [["flag", 0.65], ["none", 0.35]]);
    return pick(r, [["none", 0.8], ["gold", 0.1], ["enamel", 0.1]]);
}
function expressionBias(traits) {
    return (traits ?? []).reduce((sum, trait) => ({ mouth: sum.mouth + (TRAIT_EXPRESSION[trait]?.mouth ?? 0), brow: sum.brow + (TRAIT_EXPRESSION[trait]?.brow ?? 0) }), { mouth: 0, brow: 0 });
}
function featuresFor(f, ctx, r) {
    const african = isAfricanHeritage(f.heritage);
    const asianLid = ASIAN_LID.has(f.heritage);
    const masc = f.gender === "masculine";
    const fem = f.gender === "feminine";
    const bias = expressionBias(ctx.traits);
    const browStyle = fem
        ? pick(r, [["soft", 0.4], ["arched", 0.4], ["straight", 0.2]])
        : pick(r, [["straight", 0.35], ["soft", 0.3], ["angled", 0.2], ["bushy", 0.15]]);
    return {
        head: {
            shape: pick(r, [["oval", 0.22], ["round", 0.14], ["square", masc ? 0.16 : 0.1], ["oblong", 0.1], ["heart", masc ? 0.08 : 0.14], ["diamond", 0.1], ["triangle", 0.06], ["rectangle", masc ? 0.12 : 0.08]]),
            width: wide(r),
            jaw: wide(r, masc ? 0.56 : 0.44),
            chin: wide(r),
            length: wide(r),
            cheekbones: wide(r),
            forehead: wide(r),
            build: wide(r, 0.42),
        },
        eyes: {
            shape: pick(r, EYE_SHAPE_ODDS[f.heritage] ?? DEFAULT_EYE_SHAPE_ODDS),
            color: pick(r, EYE_COLOR_ODDS[f.heritage] ?? DEFAULT_EYE_COLOR_ODDS),
            size: wide(r),
            spacing: wide(r),
            tilt: near(r, shifted(0.5, asianLid ? 0.08 : 0)),
            openness: wide(r),
        },
        brows: { style: browStyle, thickness: near(r, fem ? 0.4 : 0.55, 0.4), arch: near(r), tilt: clamp01(near(r, 0.45, 0.35) + bias.brow), height: near(r) },
        nose: { length: wide(r), width: wide(r, shifted(0.46, african ? 0.16 : 0)), bridge: wide(r, shifted(0.52, asianLid ? -0.12 : 0)), tip: wide(r) },
        mouth: {
            width: wide(r),
            upper: wide(r, shifted(0.45, african ? 0.16 : 0)),
            lower: wide(r, shifted(0.48, african ? 0.16 : 0)),
            bow: wide(r),
            expression: clamp01(near(r, 0.46, 0.25) + bias.mouth),
        },
        ears: { size: wide(r), set: wide(r, 0.4) },
    };
}
/** Mirrors the renderer's graying curve, so the generator can see what a face will show. */
const grayShown = (onset, age) => clamp01((age - (20 + onset * 42)) / 26);
function hairFor(f, ctx, r) {
    const texture = pick(r, HAIR_TEXTURE_ODDS[f.heritage] ?? HAIR_TEXTURE_ODDS.mixed);
    const masc = f.gender === "masculine";
    const grayOnset = grayOnsetFor(f, ctx.age, r);
    const natural = f.hairColor !== "graying" && f.hairColor !== "white";
    // A natural color the years would already have grayed can only be kept one
    // way, and past a certain age a record that says "brown" is saying "dyed".
    const dyed = natural && (grayShown(grayOnset, ctx.age) >= 0.15 || (ctx.age >= 58 && r() < 0.35));
    return {
        cut: cutFor(f, texture, r),
        texture,
        color: naturalColor(f, r),
        grayOnset,
        recession: masc ? near(r, 0.5, 0.5) : near(r, 0.1, 0.1),
        part: r(),
        volume: near(r),
        dyed,
    };
}
/** A whole face from a person's facets. Deterministic in the seed. */
export function generateFace(f, seed, ctx) {
    const r = faceDraw(seed);
    const tone = Number(f.skinTone.replace("tone-", ""));
    const features = featuresFor(f, ctx, r);
    const hair = hairFor(f, ctx, r);
    const dress = dressFor(f, ctx, r);
    const head = headClothFor(dress, r);
    const cloth = clothFor(dress, f, r);
    return FaceGenome.parse({
        presentation: f.gender,
        heritage: f.heritage,
        skin: { tone, shade: r(), undertone: undertoneFor(tone, r) },
        ...features,
        hair,
        facialHair: facialHairFor(f, r),
        eyewear: eyewearFor(f, r),
        makeup: makeupFor(f, ctx.age, r),
        headwear: { style: dress.headwear, ...head },
        attire: { garment: dress.garment, ...cloth, pin: pinFor(dress, ctx.nation, r) },
        jewelry: jewelryFor(f, dress, r),
        marks: { freckles: tone <= 2 ? r() : r() * 0.5, mole: r(), lines: r() },
    });
}
/**
 * The face a person's record describes: the authored genome where the
 * portraitRef carries one, otherwise the one their facets, name, seats and
 * traits generate. Undefined for a ref that is neither, which is the President
 * before a face is chosen; the portrait draws their monogram.
 */
export function faceForPerson(person) {
    if (isFaceRef(person.portraitRef))
        return parseFaceRef(person.portraitRef);
    const facets = facetsOf(person.portraitRef);
    if (facets === undefined)
        return undefined;
    return generateFace(facets, person.id, {
        age: person.age,
        nation: person.nationality,
        tradition: nameTraditionOf(person.name, person.nationality),
        roles: person.eligibleRoles,
        traits: person.traits,
    });
}
function facetsOf(ref) {
    try {
        return parsePortraitRef(ref);
    }
    catch (error) {
        // Only a malformed ref means "no face"; anything else is a real fault.
        if (error instanceof Error && error.message.startsWith("malformed portrait ref"))
            return undefined;
        throw error;
    }
}
