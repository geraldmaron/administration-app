import { generateFoundingPool, sealFounding, validateFounding, } from "@admin/engine";
import { worldDataset } from "@admin/world";
/**
 * The campaign the oath would seal right now, or the reasons it would not.
 *
 * It is the seal itself rather than an estimate of it, which is the only way
 * a preview can promise to equal what the player gets: a second derivation of
 * the opening position is a second answer that can drift from the first.
 */
export function previewFounding(seed, choices) {
    const validation = validateFounding(worldDataset, choices, generateFoundingPool(seed, worldDataset));
    if (!validation.ok)
        return { ok: false, rejections: validation.rejections };
    return { ok: true, campaign: sealFounding(seed, worldDataset, choices) };
}
