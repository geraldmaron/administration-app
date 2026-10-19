import { z } from "zod";
// CoverPackage is the fail-closed contract for an article cover. No brief,
// no cover: publish may not stamp a package that is missing a human brief,
// a closed recipe, a plate drawn against a versioned house lock, or a
// kicker and headline. The lock is a scan of dry felt-tip on cream paper,
// not a prompt, and Design owns the first plate.
export const COVER_RECIPES = ["object-as-metaphor", "scene", "character", "doodle-diagram"];
/** The only lock a plate may cite. The lock is this scan, not a prompt. */
export const HOUSE_LOCK_CITE = "content/cover-locks/v1/scan.jpg";
export const COVER_BRIEF_HELPERS = {
    situation: "who is this for, and what are they stuck in? A person, not a topic.",
    metaphor: "the picture that asks the question. If you can google it, start over.",
    refuse: "name the stock photo so we don't ship it.",
};
export const COVER_HOUSE_LAW = {
    hand: "one hand: dry felt-tip, slightly wobbly, one weight",
    paper: "paper cream, blue-black ink, one burnt-ochre sliver (never more than a sliver of the frame)",
    fills: "fills are hatch only; no vector smoothness, watercolor, drop shadows",
    crop: "same pen, same paper crop, same four recipes",
};
export const CoverRecipeSchema = z.enum(COVER_RECIPES);
const requiredLine = z.string().trim().min(1);
export const CoverPackageSchema = z
    .object({
    brief: z
        .object({
        situation: requiredLine,
        metaphor: requiredLine,
        refuse: requiredLine,
    })
        .strict(),
    recipe: CoverRecipeSchema,
    plate: z
        .object({
        assetPath: requiredLine,
        lockCite: requiredLine,
    })
        .strict(),
    kicker: requiredLine,
    headline: requiredLine,
})
    .strict();
const STOP = new Set([
    "the",
    "a",
    "an",
    "of",
    "and",
    "or",
    "in",
    "on",
    "to",
    "for",
    "so",
    "we",
    "it",
    "that",
    "this",
    "photo",
    "stock",
    "picture",
    "image",
    "with",
    "from",
]);
function blank(value) {
    return value === undefined || value.trim().length === 0;
}
function finding(code, field, message) {
    return { code, field, message };
}
function normalize(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function tokens(value) {
    return normalize(value)
        .split(" ")
        .filter((token) => token.length > 2 && !STOP.has(token));
}
/** True when the picture is the stock photo the editor named so we would not ship it. */
export function plateLooksLikeRefusedStock(metaphor, situation, refuse) {
    return overlapsRefused(metaphor, refuse) || overlapsRefused(situation, refuse);
}
function overlapsRefused(picture, refuse) {
    const pictured = normalize(picture);
    const named = normalize(refuse);
    if (!pictured || !named)
        return false;
    if (pictured === named)
        return true;
    if (pictured.includes(named) || named.includes(pictured))
        return true;
    const picturedTokens = new Set(tokens(picture));
    const refusedTokens = tokens(refuse);
    if (refusedTokens.length === 0)
        return false;
    const hit = refusedTokens.filter((token) => picturedTokens.has(token)).length;
    return hit >= 2 && hit / refusedTokens.length >= 0.6;
}
function collectRequiredFindings(input) {
    const findings = [];
    if (blank(input.brief?.situation)) {
        findings.push(finding("missing-brief-situation", "brief.situation", "No brief, no cover: situation is required."));
    }
    if (blank(input.brief?.metaphor)) {
        findings.push(finding("missing-brief-metaphor", "brief.metaphor", "No brief, no cover: metaphor is required."));
    }
    if (blank(input.brief?.refuse)) {
        findings.push(finding("missing-brief-refuse", "brief.refuse", "No brief, no cover: refuse is required."));
    }
    if (blank(input.recipe)) {
        findings.push(finding("missing-recipe", "recipe", "Recipe must be one of the four closed covers."));
    }
    else if (!COVER_RECIPES.includes(input.recipe)) {
        findings.push(finding("unknown-recipe", "recipe", `"${input.recipe}" is not a house recipe.`));
    }
    if (blank(input.kicker)) {
        findings.push(finding("missing-kicker", "kicker", "Kicker is required under the plate."));
    }
    if (blank(input.headline)) {
        findings.push(finding("missing-headline", "headline", "Headline is required under the plate."));
    }
    return findings;
}
function collectPlateFindings(input, catalog) {
    const findings = [];
    if (blank(input.plate?.assetPath)) {
        findings.push(finding("missing-plate", "plate.assetPath", "A plate must be uploaded beside the brief."));
    }
    if (blank(input.plate?.lockCite)) {
        findings.push(finding("missing-lock-cite", "plate.lockCite", "A plate without a lock citation could be a stock photo."));
        return findings;
    }
    const cited = catalog.locks.find((lock) => lock.id === input.plate?.lockCite?.trim());
    if (!cited) {
        findings.push(finding("unknown-lock", "plate.lockCite", `No house lock is registered as "${input.plate?.lockCite}".`));
        return findings;
    }
    if (!cited.scanPresent) {
        findings.push(finding("lock-scan-absent", "plate.lockCite", `Lock ${cited.id} has no scan on disk — Design has not dropped the felt-tip lock, so this plate cannot be drawn against it.`));
    }
    return findings;
}
/**
 * Fail-closed publish judgment. Missing any required field, an uncited plate,
 * a lock with no scan, or a plate that is the named stock photo refuses.
 */
export function judgeCoverPackage(input, catalog) {
    const findings = [...collectRequiredFindings(input), ...collectPlateFindings(input, catalog)];
    const situation = input.brief?.situation?.trim() ?? "";
    const metaphor = input.brief?.metaphor?.trim() ?? "";
    const refuse = input.brief?.refuse?.trim() ?? "";
    if (situation && metaphor && refuse && plateLooksLikeRefusedStock(metaphor, situation, refuse)) {
        findings.push(finding("refuse-match", "brief.refuse", "The plate reads as the stock photo named in refuse. Start over."));
    }
    if (findings.length > 0)
        return { ok: false, findings };
    const parsed = CoverPackageSchema.safeParse({
        brief: { situation, metaphor, refuse },
        recipe: input.recipe,
        plate: {
            assetPath: input.plate?.assetPath?.trim(),
            lockCite: input.plate?.lockCite?.trim(),
        },
        kicker: input.kicker?.trim(),
        headline: input.headline?.trim(),
    });
    if (!parsed.success) {
        return {
            ok: false,
            findings: parsed.error.issues.map((issue) => finding("missing-plate", issue.path.join("."), issue.message)),
        };
    }
    return { ok: true, package: parsed.data };
}
/** Publish entry: never returns a package when the judgment failed. */
export function publishCoverPackage(input, catalog) {
    return judgeCoverPackage(input, catalog);
}
