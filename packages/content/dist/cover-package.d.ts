import { z } from "zod";
export declare const COVER_RECIPES: readonly ["object-as-metaphor", "scene", "character", "doodle-diagram"];
export type CoverRecipe = (typeof COVER_RECIPES)[number];
/** The only lock a plate may cite. The lock is this scan, not a prompt. */
export declare const HOUSE_LOCK_CITE = "content/cover-locks/v1/scan.jpg";
export declare const COVER_BRIEF_HELPERS: {
    readonly situation: "who is this for, and what are they stuck in? A person, not a topic.";
    readonly metaphor: "the picture that asks the question. If you can google it, start over.";
    readonly refuse: "name the stock photo so we don't ship it.";
};
export declare const COVER_HOUSE_LAW: {
    readonly hand: "one hand: dry felt-tip, slightly wobbly, one weight";
    readonly paper: "paper cream, blue-black ink, one burnt-ochre sliver (never more than a sliver of the frame)";
    readonly fills: "fills are hatch only; no vector smoothness, watercolor, drop shadows";
    readonly crop: "same pen, same paper crop, same four recipes";
};
export declare const CoverRecipeSchema: z.ZodEnum<{
    character: "character";
    scene: "scene";
    "object-as-metaphor": "object-as-metaphor";
    "doodle-diagram": "doodle-diagram";
}>;
export type CoverRecipeSchema = z.infer<typeof CoverRecipeSchema>;
export declare const CoverPackageSchema: z.ZodObject<{
    brief: z.ZodObject<{
        situation: z.ZodString;
        metaphor: z.ZodString;
        refuse: z.ZodString;
    }, z.core.$strict>;
    recipe: z.ZodEnum<{
        character: "character";
        scene: "scene";
        "object-as-metaphor": "object-as-metaphor";
        "doodle-diagram": "doodle-diagram";
    }>;
    plate: z.ZodObject<{
        assetPath: z.ZodString;
        lockCite: z.ZodString;
    }, z.core.$strict>;
    kicker: z.ZodString;
    headline: z.ZodString;
}, z.core.$strict>;
export type CoverPackage = z.infer<typeof CoverPackageSchema>;
export type CoverLock = {
    readonly id: string;
    readonly version: number;
    readonly scanFile: string;
    readonly scanPresent: boolean;
};
export type CoverLockCatalog = {
    readonly locks: readonly CoverLock[];
};
export type CoverPackageFindingCode = "missing-brief-situation" | "missing-brief-metaphor" | "missing-brief-refuse" | "missing-recipe" | "unknown-recipe" | "missing-plate" | "missing-lock-cite" | "unknown-lock" | "lock-scan-absent" | "refuse-match" | "missing-kicker" | "missing-headline";
export type CoverPackageFinding = {
    readonly code: CoverPackageFindingCode;
    readonly field: string;
    readonly message: string;
};
export type CoverPackageJudgment = {
    readonly ok: true;
    readonly package: CoverPackage;
} | {
    readonly ok: false;
    readonly findings: readonly CoverPackageFinding[];
};
export type CoverPackageInput = {
    readonly brief?: {
        readonly situation?: string;
        readonly metaphor?: string;
        readonly refuse?: string;
    };
    readonly recipe?: string;
    readonly plate?: {
        readonly assetPath?: string;
        readonly lockCite?: string;
    };
    readonly kicker?: string;
    readonly headline?: string;
};
/** True when the picture is the stock photo the editor named so we would not ship it. */
export declare function plateLooksLikeRefusedStock(metaphor: string, situation: string, refuse: string): boolean;
/**
 * Fail-closed publish judgment. Missing any required field, an uncited plate,
 * a lock with no scan, or a plate that is the named stock photo refuses.
 */
export declare function judgeCoverPackage(input: CoverPackageInput, catalog: CoverLockCatalog): CoverPackageJudgment;
/** Publish entry: never returns a package when the judgment failed. */
export declare function publishCoverPackage(input: CoverPackageInput, catalog: CoverLockCatalog): CoverPackageJudgment;
