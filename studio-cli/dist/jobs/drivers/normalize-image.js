import { execFile } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
const run = promisify(execFile);
// Searched high to low; the first that fits wins, so an easy image keeps its
// quality instead of being flattened to whatever the hardest one needed.
const QUALITY_LADDER = [92, 88, 84, 80, 76, 72, 68, 64, 58, 52];
async function dimensions(file) {
    const { stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
    const width = Number(/pixelWidth:\s*(\d+)/.exec(stdout)?.[1]);
    const height = Number(/pixelHeight:\s*(\d+)/.exec(stdout)?.[1]);
    if (!Number.isFinite(width) || !Number.isFinite(height))
        throw new Error(`could not read dimensions of ${file}`);
    return { width, height };
}
/**
 * Square-crop, downscale and re-encode `source` to a WebP under `maxBytes`,
 * written beside it as `<name>.webp`. Returns undefined if no quality in the
 * ladder gets under the ceiling — an image that cannot meet the standard is a
 * defect in the image, not a reason to move the standard.
 *
 * Crop happens at the source's own resolution and scaling after it. The other
 * order takes a 512-pixel window out of a 1024-pixel image, which is a
 * close-up of the subject's face rather than the portrait that was generated.
 */
export async function normalizeToStandard(source, options) {
    const work = await mkdtemp(path.join(tmpdir(), "normalize-image-"));
    const staged = path.join(work, "staged.png");
    const target = source.replace(/\.[^.]+$/, ".webp");
    try {
        await run("sips", ["-s", "format", "png", source, "--out", staged]);
        const { width, height } = await dimensions(staged);
        // The largest box of the requested shape that fits inside the source,
        // centered. sips takes crop dimensions as height then width.
        const ratio = options.aspect ? options.aspect.width / options.aspect.height : 1;
        const cropWidth = Math.min(width, Math.round(height * ratio));
        const cropHeight = Math.min(height, Math.round(width / ratio));
        await run("sips", ["-c", String(cropHeight), String(cropWidth), staged]);
        await run("sips", ["-Z", String(options.edge), staged]);
        for (const quality of QUALITY_LADDER) {
            await run("cwebp", ["-quiet", "-q", String(quality), staged, "-o", target]);
            const { size } = await stat(target);
            if (size <= options.maxBytes)
                return { filePath: target, bytes: size, mimeType: "image/webp" };
        }
        return undefined;
    }
    finally {
        await rm(work, { recursive: true, force: true });
    }
}
