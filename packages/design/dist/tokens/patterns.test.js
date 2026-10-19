import { describe, expect, it } from "vitest";
import { color } from "./color.js";
import { AA_NORMAL_TEXT, contrastRatio, parseHex } from "./contrast.js";
import { pattern } from "./patterns.js";
// A pattern is only allowed where it costs the words on top of it nothing.
// The worst case is text set straight over a fully drawn stroke, which is the
// ink composited at its full alpha over the ground, so that is what every
// check below measures.
/** An ink over an opaque ground, rounded to the 8-bit color the screen shows. */
function composite(ink, ground) {
    const over = parseHex(ink.hex);
    const under = parseHex(ground);
    const mix = (top, bottom) => Math.round(top * ink.alpha + bottom * (1 - ink.alpha));
    const channels = [mix(over.r, under.r), mix(over.g, under.g), mix(over.b, under.b)];
    return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
const DARK_INKS = [pattern.ink.gold, pattern.ink.cool];
const DARK_READERS = [color.text.primary, color.text.secondary, color.text.tertiary];
const PAPER_READERS = [color.text.onLight, color.text.onLightMuted];
// A print louder than this starts competing with the readings over it; one
// fainter than this is a token nobody can see, which is noise in the palette.
const LOUDEST = 1.35;
const FAINTEST = 1.03;
describe("pattern inks", () => {
    it("keeps every reading text at AA over the darkest stroke, on every dark ground a pattern may use", () => {
        const failures = DARK_INKS.flatMap((ink) => Object.entries(pattern.darkGrounds).flatMap(([groundName, ground]) => {
            const surface = composite(ink, ground);
            return DARK_READERS.filter((reader) => contrastRatio(reader, surface) < AA_NORMAL_TEXT).map((reader) => `${reader} over ${ink.cssVar} on ${groundName}: ${contrastRatio(reader, surface).toFixed(2)}:1`);
        }));
        expect(failures).toEqual([]);
    });
    it("keeps paper text at AA over the paper ink", () => {
        const surface = composite(pattern.ink.paper, pattern.paperGround);
        for (const reader of PAPER_READERS) {
            expect(contrastRatio(reader, surface), reader).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
        }
    });
    it("stays a texture: visible against its ground, never loud", () => {
        const pairs = [
            ...DARK_INKS.flatMap((ink) => Object.values(pattern.darkGrounds).map((ground) => [ink, ground])),
            [pattern.ink.paper, pattern.paperGround],
        ];
        for (const [ink, ground] of pairs) {
            const ratio = contrastRatio(composite(ink, ground), ground);
            expect(ratio, `${ink.cssVar} at ${ink.alpha} on ${ground}`).toBeGreaterThanOrEqual(FAINTEST);
            expect(ratio, `${ink.cssVar} at ${ink.alpha} on ${ground}`).toBeLessThanOrEqual(LOUDEST);
        }
    });
    // The overlay step is chrome floating over the room (a menu, a popover, a
    // selected thumb), and a print belongs to the room under it. With the
    // presidential palette tertiary text still clears AA even on a print;
    // the exclusion remains a hierarchy rule rather than a contrast workaround.
    it("keeps patterns off the overlay step, the chrome that floats over a room", () => {
        expect(Object.values(pattern.darkGrounds)).not.toContain(color.ground.overlay);
        const surface = composite(pattern.ink.gold, color.ground.overlay);
        expect(contrastRatio(color.text.tertiary, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
});
