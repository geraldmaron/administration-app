import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Series } from "./Series";
const format = (value) => `${value}%`;
describe("recorded series semantics", () => {
    it("holds a decision until the next dated observation without interpolating through gaps", () => {
        const html = renderToStaticMarkup(_jsx(Series, { label: "Rate", values: [10, 20, null, 30], positions: [0, 1, 2, 4], variant: "step", format: format }));
        const line = html.match(/class="ui-series__line" d="M([0-9.]+) [0-9.]+ H([0-9.]+) V[0-9.]+  M([0-9.]+)/);
        expect(line).not.toBeNull();
        const [, start, decision, last] = line;
        expect((Number(decision) - Number(start)) / (Number(last) - Number(start))).toBeCloseTo(.25);
        expect(html).not.toContain("NaN");
    });
    it("leaves unknown observations as gaps and provides readable values", () => {
        const html = renderToStaticMarkup(_jsx(Series, { label: "History", values: [10, null, 30], domain: [0, 40], format: format, showDomain: true }));
        expect(html).toContain("1 unknown observations shown as gaps");
        expect(html).toContain("Observation 2: Unknown");
        expect(html).toMatch(/d="M[^"]+ M/);
        expect(html).not.toContain("NaN");
    });
    it("does not fill an area across unknown observations", () => {
        const markup = renderToStaticMarkup(_jsx(Series, { label: "History", values: [10, 20, null, 30, 40], domain: [0, 50], format: format, variant: "area", showDomain: true }));
        const filled = markup.match(/class="ui-series__area"[^>]*d="([^"]*)"/);
        expect(filled?.[1]?.match(/Z/g)).toHaveLength(2);
        expect(markup).toContain("Observation 3: Unknown");
    });
    it("states absent history and a one-point history honestly", () => {
        expect(renderToStaticMarkup(_jsx(Series, { label: "None", values: [], format: format, showDomain: true }))).toContain("No known readings yet");
        expect(renderToStaticMarkup(_jsx(Series, { label: "One", values: [.5], format: format, showDomain: true }))).toContain("1 reading");
    });
    it("exposes recorded labels and an explicit replay rather than autoplay", () => {
        const html = renderToStaticMarkup(_jsx(Series, { label: "Price", values: [1, 2], labels: ["Oath", "Week 1"], format: format, interactive: true, selectedIndex: 0 }));
        expect(html).toContain("Oath: 1%");
        expect(html).toContain("Replay history");
        expect(html).toContain("Inspect 2 observations");
        expect(html).not.toContain("<details");
        expect(html).not.toContain("Pause replay");
    });
});
