import { describe, expect, it } from "vitest";
import { color } from "./color.js";
import { AA_NON_TEXT, contrastRatio, parseHex, relativeLuminance } from "./contrast.js";
import { ramp } from "./ramps.js";
import { semantic } from "./semantic.js";
const MAP_GROUND = color.map.sphere;
const CHART_GROUND = color.vis.background;
const MIDPOINT = 3;
function hueAndSaturation(hex) {
    const { r, g, b } = parseHex(hex);
    const [red, green, blue] = [r / 255, g / 255, b / 255];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    if (delta === 0)
        return { hue: 0, saturation: 0 };
    const lightness = (max + min) / 2;
    const raw = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
    return { hue: (raw * 60 + 360) % 360, saturation: delta / (1 - Math.abs(2 * lightness - 1)) };
}
function hueDistance(a, b) {
    const apart = Math.abs(a - b) % 360;
    return apart > 180 ? 360 - apart : apart;
}
function step(values, index) {
    const value = values[index];
    if (value === undefined)
        throw new Error(`The ramp has no step ${index}.`);
    return value;
}
describe("map and chart ramps", () => {
    it("keeps every data color at non-text contrast against the ground it is drawn on", () => {
        const faint = [
            ...[...ramp.mapSequential, ...ramp.mapDiverging, ...ramp.categorical].map((hex) => [hex, MAP_GROUND]),
            ...ramp.chartSeries.map((hex) => [hex, CHART_GROUND]),
        ]
            .filter(([hex, ground]) => contrastRatio(hex, ground) < AA_NON_TEXT)
            .map(([hex, ground]) => `${hex} on ${ground}: ${contrastRatio(hex, ground).toFixed(2)}:1`);
        expect(faint).toEqual([]);
    });
    it("orders the sequential ramp by lightness alone, with a step the eye can find", () => {
        for (let index = 1; index < ramp.mapSequential.length; index += 1) {
            const lower = step(ramp.mapSequential, index - 1);
            const upper = step(ramp.mapSequential, index);
            expect(relativeLuminance(upper), `${upper} is not lighter than ${lower}`).toBeGreaterThan(relativeLuminance(lower));
            expect(contrastRatio(upper, lower), `${lower} to ${upper}`).toBeGreaterThanOrEqual(1.15);
        }
    });
    it("gets lighter away from the diverging midpoint, cool on one arm and warm on the other", () => {
        for (let distance = 1; distance <= MIDPOINT; distance += 1) {
            const cool = step(ramp.mapDiverging, MIDPOINT - distance);
            const warm = step(ramp.mapDiverging, MIDPOINT + distance);
            const coolInside = step(ramp.mapDiverging, MIDPOINT - distance + 1);
            const warmInside = step(ramp.mapDiverging, MIDPOINT + distance - 1);
            expect(relativeLuminance(cool), cool).toBeGreaterThan(relativeLuminance(coolInside));
            expect(relativeLuminance(warm), warm).toBeGreaterThan(relativeLuminance(warmInside));
            expect(parseHex(cool).b, `${cool} is not cool`).toBeGreaterThan(parseHex(cool).r);
            expect(parseHex(warm).r, `${warm} is not warm`).toBeGreaterThan(parseHex(warm).b);
        }
    });
    // A lens of trust or alignment must not make one pole look like the place to
    // be. Matched lightness is what stops the brighter arm reading as "better".
    it("keeps the diverging arms level with each other, step for step", () => {
        for (let distance = 1; distance <= MIDPOINT; distance += 1) {
            const cool = step(ramp.mapDiverging, MIDPOINT - distance);
            const warm = step(ramp.mapDiverging, MIDPOINT + distance);
            expect(contrastRatio(cool, warm), `${cool} against ${warm}`).toBeLessThanOrEqual(1.15);
        }
    });
    it("draws the diverging midpoint as its least saturated step", () => {
        const midpoint = hueAndSaturation(step(ramp.mapDiverging, MIDPOINT)).saturation;
        ramp.mapDiverging.forEach((hex, index) => {
            if (index !== MIDPOINT)
                expect(hueAndSaturation(hex).saturation, hex).toBeGreaterThan(midpoint);
        });
    });
    it("keeps every categorical hue at least 30 degrees from every other", () => {
        const hues = ramp.categorical.map((hex) => hueAndSaturation(hex).hue);
        const crowded = hues.flatMap((hue, index) => hues
            .slice(index + 1)
            .filter((other) => hueDistance(hue, other) < 30)
            .map((other) => `${hue.toFixed(0)} vs ${other.toFixed(0)}`));
        expect(crowded).toEqual([]);
    });
    it("never lets a data color stand in for a stance, a party or a role", () => {
        const meaningful = new Set([...Object.values(color.stance), ...Object.values(color.party), ...Object.values(semantic)].map((value) => value.toLowerCase()));
        const borrowed = [...ramp.mapSequential, ...ramp.mapDiverging, ...ramp.categorical].filter((hex) => meaningful.has(hex.toLowerCase()));
        expect(borrowed).toEqual([]);
    });
    it("draws six chart series, all distinct, all from the categorical ramp", () => {
        expect(ramp.chartSeries).toHaveLength(6);
        expect(new Set(ramp.chartSeries).size).toBe(6);
        for (const hex of ramp.chartSeries)
            expect(ramp.categorical).toContain(hex);
    });
});
