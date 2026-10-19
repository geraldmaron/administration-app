import { FACE_BROOCHES, FACE_BROW_STYLES, FACE_EARRINGS, FACE_EYE_COLORS, FACE_EYE_MAKEUP, FACE_EYE_SHAPES, FACE_EYEWEAR, FACE_FABRICS, FACE_FACIAL_HAIR, FACE_FRAME_COLORS, FACE_GARMENTS, FACE_HAIR_COLORS, FACE_HAIR_CUTS, FACE_HAIR_TEXTURES, FACE_HEADWEAR, FACE_LIPSTICKS, FACE_NECKLACES, FACE_PINS, FACE_SHAPES, FACE_UNDERTONES, FaceGenome, } from "./face.js";
import { PortraitGenderPresentation, PortraitHeritage } from "./portrait.js";
// An authored face as a short string, so it fits in `Person.portraitRef`
// beside the facet references every generated person carries.
//
// The code is fixed-width: one base-36 character per gene, two for the
// registries that are expected to keep growing. Continuous genes are stored at
// 36 steps, finer than any difference the renderer can draw. A later version
// appends slots; it never reorders them.
export const FACE_REF_PREFIX = "face:";
const VERSION = "1";
const LEVELS = 35;
const choice = (path, options, width = 1) => ({ path, kind: "choice", options, width });
const genes = (group, keys) => keys.map((key) => ({ path: [group, key], kind: "gene" }));
const SLOTS = [
    choice(["presentation"], PortraitGenderPresentation.options),
    choice(["heritage"], PortraitHeritage.options),
    { path: ["skin", "tone"], kind: "tone" },
    ...genes("skin", ["shade"]),
    choice(["skin", "undertone"], FACE_UNDERTONES),
    choice(["head", "shape"], FACE_SHAPES),
    ...genes("head", ["width", "jaw", "chin", "length", "cheekbones", "forehead", "build"]),
    choice(["eyes", "shape"], FACE_EYE_SHAPES),
    choice(["eyes", "color"], FACE_EYE_COLORS),
    ...genes("eyes", ["size", "spacing", "tilt", "openness"]),
    choice(["brows", "style"], FACE_BROW_STYLES),
    ...genes("brows", ["thickness", "arch", "tilt", "height"]),
    ...genes("nose", ["length", "width", "bridge", "tip"]),
    ...genes("mouth", ["width", "upper", "lower", "bow", "expression"]),
    ...genes("ears", ["size", "set"]),
    choice(["hair", "cut"], FACE_HAIR_CUTS, 2),
    choice(["hair", "texture"], FACE_HAIR_TEXTURES),
    choice(["hair", "color"], FACE_HAIR_COLORS),
    ...genes("hair", ["grayOnset", "recession", "part", "volume"]),
    { path: ["hair", "dyed"], kind: "flag" },
    choice(["facialHair"], FACE_FACIAL_HAIR),
    choice(["eyewear", "style"], FACE_EYEWEAR),
    choice(["eyewear", "frame"], FACE_FRAME_COLORS),
    { path: ["eyewear", "tinted"], kind: "flag" },
    choice(["makeup", "lips"], FACE_LIPSTICKS),
    choice(["makeup", "eyes"], FACE_EYE_MAKEUP),
    ...genes("makeup", ["blush"]),
    choice(["headwear", "style"], FACE_HEADWEAR, 2),
    choice(["headwear", "color"], FACE_FABRICS, 2),
    choice(["headwear", "accent"], FACE_FABRICS, 2),
    choice(["attire", "garment"], FACE_GARMENTS, 2),
    choice(["attire", "primary"], FACE_FABRICS, 2),
    choice(["attire", "secondary"], FACE_FABRICS, 2),
    choice(["attire", "accent"], FACE_FABRICS, 2),
    choice(["attire", "pin"], FACE_PINS),
    choice(["jewelry", "earrings"], FACE_EARRINGS),
    choice(["jewelry", "necklace"], FACE_NECKLACES),
    choice(["jewelry", "brooch"], FACE_BROOCHES),
    ...genes("marks", ["freckles", "mole", "lines"]),
];
const widthOf = (slot) => (slot.kind === "choice" ? slot.width : 1);
function read(genome, path) {
    const group = genome[path[0]];
    return path.length === 1 ? group : group[path[1]];
}
function encodeSlot(slot, value) {
    const n = slot.kind === "choice"
        ? slot.options.indexOf(value)
        : slot.kind === "tone"
            ? value - 1
            : slot.kind === "flag"
                ? Number(value === true)
                : Math.round(value * LEVELS);
    if (n < 0)
        throw new Error(`face code: ${slot.path.join(".")} has no slot for ${String(value)}`);
    return n.toString(36).padStart(widthOf(slot), "0");
}
function decodeSlot(slot, text) {
    const n = Number.parseInt(text, 36);
    if (!Number.isInteger(n) || n < 0)
        throw new Error(`face code: unreadable ${slot.path.join(".")}`);
    if (slot.kind === "choice") {
        const value = slot.options[n];
        if (value === undefined)
            throw new Error(`face code: ${slot.path.join(".")} has no entry ${n}`);
        return value;
    }
    if (slot.kind === "tone")
        return n + 1;
    if (slot.kind === "flag")
        return n === 1;
    return Math.min(1, n / LEVELS);
}
export function encodeFace(genome) {
    const valid = FaceGenome.parse(genome);
    return VERSION + SLOTS.map((slot) => encodeSlot(slot, read(valid, slot.path))).join("");
}
export function decodeFace(code) {
    if (code[0] !== VERSION)
        throw new Error(`face code: unknown version ${code[0] ?? "(empty)"}`);
    const expected = 1 + SLOTS.reduce((sum, slot) => sum + widthOf(slot), 0);
    if (code.length !== expected)
        throw new Error(`face code: expected ${expected} characters, got ${code.length}`);
    const values = SLOTS.reduce((acc, slot) => ({
        at: acc.at + widthOf(slot),
        entries: [...acc.entries, [slot.path, decodeSlot(slot, code.slice(acc.at, acc.at + widthOf(slot)))]],
    }), { at: 1, entries: [] }).entries;
    const groups = [...new Set(values.map(([path]) => path[0]))];
    const shape = Object.fromEntries(groups.map((group) => {
        const own = values.filter(([path]) => path[0] === group);
        const flat = own.length === 1 && own[0][0].length === 1;
        return [group, flat ? own[0][1] : Object.fromEntries(own.map(([path, value]) => [path[1], value]))];
    }));
    return FaceGenome.parse(shape);
}
/** The `portraitRef` an authored face is stored as. */
export function faceRef(genome) {
    return FACE_REF_PREFIX + encodeFace(genome);
}
export function isFaceRef(ref) {
    return ref.startsWith(FACE_REF_PREFIX);
}
export function parseFaceRef(ref) {
    if (!isFaceRef(ref))
        throw new Error(`not a face ref: ${ref}`);
    return decodeFace(ref.slice(FACE_REF_PREFIX.length));
}
