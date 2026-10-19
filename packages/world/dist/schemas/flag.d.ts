import { z } from "zod";
/**
 * How the field is divided. Each entry is a construction that real flags
 * actually use, which is what keeps a generated banner reading as a country's
 * rather than as a pattern swatch.
 */
export declare const FlagLayout: z.ZodEnum<{
    "horizontal-bicolor": "horizontal-bicolor";
    "horizontal-triband": "horizontal-triband";
    "vertical-bicolor": "vertical-bicolor";
    "vertical-triband": "vertical-triband";
    "nordic-cross": "nordic-cross";
    saltire: "saltire";
    canton: "canton";
    "hoist-triangle": "hoist-triangle";
    bordered: "bordered";
    quartered: "quartered";
}>;
export type FlagLayout = z.infer<typeof FlagLayout>;
/**
 * The charge at the center — or `none`, which is a real and common answer. The
 * set is drawn from the charges that recur across actual national flags rather
 * than from an icon library, for the same reason the icon set is drawn by hand:
 * a borrowed set brings its own metaphors with it.
 */
export declare const FlagEmblem: z.ZodEnum<{
    none: "none";
    star: "star";
    crescent: "crescent";
    sun: "sun";
    wing: "wing";
    wheat: "wheat";
    tower: "tower";
    anchor: "anchor";
    flame: "flame";
    laurel: "laurel";
    mountain: "mountain";
    key: "key";
    trident: "trident";
    book: "book";
}>;
export type FlagEmblem = z.infer<typeof FlagEmblem>;
export declare const FlagTincture: z.ZodEnum<{
    crimson: "crimson";
    vermilion: "vermilion";
    ochre: "ochre";
    gold: "gold";
    bone: "bone";
    ash: "ash";
    slate: "slate";
    ink: "ink";
    sea: "sea";
    pine: "pine";
    verdant: "verdant";
    plum: "plum";
    sand: "sand";
    copper: "copper";
}>;
export type FlagTincture = z.infer<typeof FlagTincture>;
/**
 * Three tinctures are always carried even where the layout consumes two, so
 * switching construction never silently drops a color the player chose and
 * then cannot get back. `FLAG_LAYOUTS[layout].bands` says how many are actually
 * drawn.
 */
export declare const FlagDesign: z.ZodObject<{
    layout: z.ZodEnum<{
        "horizontal-bicolor": "horizontal-bicolor";
        "horizontal-triband": "horizontal-triband";
        "vertical-bicolor": "vertical-bicolor";
        "vertical-triband": "vertical-triband";
        "nordic-cross": "nordic-cross";
        saltire: "saltire";
        canton: "canton";
        "hoist-triangle": "hoist-triangle";
        bordered: "bordered";
        quartered: "quartered";
    }>;
    tinctures: z.ZodTuple<[z.ZodEnum<{
        crimson: "crimson";
        vermilion: "vermilion";
        ochre: "ochre";
        gold: "gold";
        bone: "bone";
        ash: "ash";
        slate: "slate";
        ink: "ink";
        sea: "sea";
        pine: "pine";
        verdant: "verdant";
        plum: "plum";
        sand: "sand";
        copper: "copper";
    }>, z.ZodEnum<{
        crimson: "crimson";
        vermilion: "vermilion";
        ochre: "ochre";
        gold: "gold";
        bone: "bone";
        ash: "ash";
        slate: "slate";
        ink: "ink";
        sea: "sea";
        pine: "pine";
        verdant: "verdant";
        plum: "plum";
        sand: "sand";
        copper: "copper";
    }>, z.ZodEnum<{
        crimson: "crimson";
        vermilion: "vermilion";
        ochre: "ochre";
        gold: "gold";
        bone: "bone";
        ash: "ash";
        slate: "slate";
        ink: "ink";
        sea: "sea";
        pine: "pine";
        verdant: "verdant";
        plum: "plum";
        sand: "sand";
        copper: "copper";
    }>], null>;
    emblem: z.ZodEnum<{
        none: "none";
        star: "star";
        crescent: "crescent";
        sun: "sun";
        wing: "wing";
        wheat: "wheat";
        tower: "tower";
        anchor: "anchor";
        flame: "flame";
        laurel: "laurel";
        mountain: "mountain";
        key: "key";
        trident: "trident";
        book: "book";
    }>;
    emblemTincture: z.ZodEnum<{
        crimson: "crimson";
        vermilion: "vermilion";
        ochre: "ochre";
        gold: "gold";
        bone: "bone";
        ash: "ash";
        slate: "slate";
        ink: "ink";
        sea: "sea";
        pine: "pine";
        verdant: "verdant";
        plum: "plum";
        sand: "sand";
        copper: "copper";
    }>;
}, z.core.$strip>;
export type FlagDesign = z.infer<typeof FlagDesign>;
