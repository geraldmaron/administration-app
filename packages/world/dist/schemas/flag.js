import { z } from "zod";
// A nation's flag, as data rather than as an asset.
//
// Every nation on the board but the player's own is a real sovereign state and
// flies its real flag (a Unicode regional-indicator glyph — no pipeline, no
// licensing, correct everywhere). The player's nation is fictional, and until
// now flew a hardcoded two-band placeholder that said nothing about them. A
// founding that fixes a charter, a cradle, a slate of compacts and a cabinet
// ought to fix the banner those things are done under too.
//
// The design is a small set of ids, not an image: it survives a JSON save
// round-trip byte-identically, it is diffable like the rest of campaign state,
// and it renders at any size on any surface because it is drawn rather than
// loaded. What is authored here is the *vocabulary* — the constructions and
// tinctures this world's flags are made of — and it is deliberately a real
// vexillological one, because a flag builder that offers arbitrary gradients
// produces logos rather than flags.
/**
 * How the field is divided. Each entry is a construction that real flags
 * actually use, which is what keeps a generated banner reading as a country's
 * rather than as a pattern swatch.
 */
export const FlagLayout = z.enum([
    "horizontal-bicolor",
    "horizontal-triband",
    "vertical-bicolor",
    "vertical-triband",
    "nordic-cross",
    "saltire",
    "canton",
    "hoist-triangle",
    "bordered",
    "quartered",
]);
/**
 * The charge at the center — or `none`, which is a real and common answer. The
 * set is drawn from the charges that recur across actual national flags rather
 * than from an icon library, for the same reason the icon set is drawn by hand:
 * a borrowed set brings its own metaphors with it.
 */
export const FlagEmblem = z.enum([
    "none",
    "star",
    "crescent",
    "sun",
    // A wing rather than a whole bird: a charge is read at the size of a roster
    // row, and an eagle at that size is a smudge with a beak.
    "wing",
    "wheat",
    "tower",
    "anchor",
    "flame",
    "laurel",
    "mountain",
    "key",
    "trident",
    "book",
]);
export const FlagTincture = z.enum([
    "crimson",
    "vermilion",
    "ochre",
    "gold",
    "bone",
    "ash",
    "slate",
    "ink",
    "sea",
    "pine",
    "verdant",
    "plum",
    "sand",
    "copper",
]);
/**
 * Three tinctures are always carried even where the layout consumes two, so
 * switching construction never silently drops a color the player chose and
 * then cannot get back. `FLAG_LAYOUTS[layout].bands` says how many are actually
 * drawn.
 */
export const FlagDesign = z.object({
    layout: FlagLayout,
    tinctures: z.tuple([FlagTincture, FlagTincture, FlagTincture]),
    emblem: FlagEmblem,
    emblemTincture: FlagTincture,
});
