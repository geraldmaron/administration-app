import { jsx as _jsx } from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChoiceList, choiceAxis } from "./ChoiceList";
const move = (metric, value, extra = {}) => ({ metric, label: metric, value, text: `${value} pts`, tone: value >= 0 ? "favorable" : "adverse", unit: "pts", ...extra });
const items = [
    { id: "speak", label: "Hold a press conference", outcome: { cost: { text: "Free" }, odds: { share: 0.4, word: "roughly even", confidence: "low" }, effects: [move("corps", 1, { ifWell: 12, ifBadly: -10 }), move("standing", -0.4, { ifWell: 1, ifBadly: -1 })], worstCase: "corps −10, standing −1", details: [{ label: "What it is", text: "The full corps" }] } },
    { id: "silent", label: "Say nothing", baseline: true, outcome: { cost: { text: "Free" }, effects: [], worstCase: "The silence becomes the story", baseline: true, details: [] } },
    { id: "leak", label: "Leak it", outcome: { cost: { text: "$2.00B", figure: { value: -2000 } }, odds: { share: 0.2, word: "unlikely" }, effects: [move("corps", -3, { ifWell: 8, ifBadly: -14 })], details: [] } },
];
const html = (selected) => renderToStaticMarkup(_jsx(ChoiceList, { labeledBy: "t", name: "plays", items: items, selected: selected, onSelect: () => undefined }));
describe("the shared effect axis", () => {
    it("is sized to the likely moves, even about zero, with rounded ends", () => {
        const axis = choiceAxis(items.flatMap((item) => item.outcome?.effects ?? []), "pts");
        expect(axis.lo).toBe(-5);
        expect(axis.hi).toBe(5);
        expect(axis.ticks.map((tick) => tick.label)).toEqual(["−5", "0", "+5 pts"]);
    });
    it("marks a good or bad case that runs past the scale instead of stretching the scale to it", () => {
        const out = html("silent");
        expect(out).toContain('data-clip-start="true"');
        expect(out).toContain('data-clip-end="true"');
    });
    it("keeps a one-sided axis one-sided", () => {
        const axis = choiceAxis([move("a", 3), move("b", 7)], "pts");
        expect([axis.lo, axis.hi]).toEqual([0, 10]);
    });
    it("draws bands on the fixed magnitude scale", () => {
        const axis = choiceAxis([{ ...move("a", -2), unit: "band", text: "Moderate fall" }], "band");
        expect(axis.ticks.map((tick) => tick.label)).toEqual(["Major fall", "None", "Major rise"]);
    });
});
describe("the results list", () => {
    it("leads with doing nothing, and labels the axis once", () => {
        const out = html("silent");
        expect(out.indexOf("Say nothing")).toBeLessThan(out.indexOf("Hold a press conference"));
        expect(out.match(/\+5 pts/g)).toHaveLength(1);
        expect(out).toContain("Chance it goes well");
    });
    it("keeps cost, odds, moves and the worst case on every row, picked or not", () => {
        const out = html("silent");
        expect(out).toContain("$2.00B");
        expect(out).toContain("40%");
        expect(out).toContain("20%");
        expect(out.match(/class="ui-choice__effect"/g)).toHaveLength(5);
        expect(out).toContain("corps −10, standing −1");
        expect(out).toContain("The silence becomes the story");
    });
    it("says certain where an option has no odds, and opens only the picked row", () => {
        const out = html("speak");
        expect(out).toMatch(/data-baseline="true".*Certain/);
        expect(out.match(/class="ui-choice__detail"/g)).toHaveLength(1);
        expect(out).toContain("<dt>What it is</dt><dd>The full corps</dd>");
        expect(html("silent")).not.toContain("ui-choice__detail");
    });
    it("checks the picked radio and no other", () => {
        const out = html("leak");
        expect(out.match(/checked=""/g)).toHaveLength(1);
        expect(out).toMatch(/<span id="plays-leak-name">Leak it<\/span><input type="radio" name="plays-pick" checked=""/);
    });
    it("names the outcome for odds announced without the visual column heading", () => {
        expect(html("leak")).toContain('<span class="ui-visually-hidden">Chance it goes well: </span>');
    });
    it("says a cost every option shares once, above the list, instead of on every row", () => {
        const free = items.map((item) => (item.outcome ? { ...item, outcome: { ...item.outcome, cost: { text: "Free" } } } : item));
        const out = renderToStaticMarkup(_jsx(ChoiceList, { labeledBy: "t", name: "plays", items: free, selected: "silent", onSelect: () => undefined }));
        expect(out).toContain("No monetary cost for any option");
        expect(out).not.toContain("ui-choice__cost");
    });
    it("drops a column no option has", () => {
        const bare = renderToStaticMarkup(_jsx(ChoiceList, { labeledBy: "t", name: "x", items: [{ id: "a", label: "A", baseline: true }, { id: "b", label: "B" }], selected: "a", onSelect: () => undefined }));
        expect(bare).not.toContain("Cost now");
        expect(bare).not.toContain("Likely effect");
    });
});
describe("a projection laid into the list", () => {
    const projection = { control: _jsx("button", { type: "button", children: "Project forward" }), perItem: { speak: _jsx("i", { children: "speak-cell" }), leak: _jsx("i", { children: "leak-cell" }) }, detail: _jsx("b", { children: "picked-detail" }) };
    const projected = (selected) => renderToStaticMarkup(_jsx(ChoiceList, { labeledBy: "t", name: "plays", items: items, selected: selected, onSelect: () => undefined, projection: projection }));
    it("puts its control above the list, outside the radio group", () => {
        const out = projected("silent");
        expect(out.indexOf("Project forward")).toBeLessThan(out.indexOf('role="radiogroup"'));
    });
    it("draws each option's cell in that option's row, and the detail only under the picked one", () => {
        const out = projected("leak");
        expect(out.indexOf("speak-cell")).toBeGreaterThan(out.indexOf("Hold a press conference"));
        expect(out.indexOf("leak-cell")).toBeGreaterThan(out.indexOf("Leak it"));
        expect(out.match(/picked-detail/g)).toHaveLength(1);
        expect(out.indexOf("picked-detail")).toBeGreaterThan(out.indexOf("Leak it"));
    });
    it("draws nothing extra when no projection is given", () => {
        expect(html("leak")).not.toContain("ui-choice__projected");
    });
});
it("keeps authorization before expanded evidence and names baseline consequences accurately", () => {
    const out = renderToStaticMarkup(_jsx(ChoiceList, { labeledBy: "t", name: "x", items: items, selected: "speak", onSelect: () => undefined, footer: _jsx("button", { children: "Authorize now" }) }));
    expect(out.indexOf("Authorize now")).toBeLessThan(out.indexOf("The full corps"));
    expect(out).toContain("Baseline outcome");
    expect(out).toContain("Downside scenario");
});
it("encodes qualitative effects as discrete steps without percentages", () => {
    const bandItems = [{ id: "x", label: "Act", outcome: { cost: { text: "Free" }, effects: [move("standing", -2, { unit: "band", text: "Moderate fall" })], details: [] } }];
    const out = renderToStaticMarkup(_jsx(ChoiceList, { labeledBy: "t", name: "x", items: bandItems, selected: "x", onSelect: () => undefined }));
    expect(out.match(/data-active="true"/g)).toHaveLength(2);
    expect(out).toContain("Qualitative magnitude");
});
it("never labels borrowed programs free when all immediate authority costs are zero", () => {
    const priced = [{ ...items[0], outcome: { ...items[0].outcome, cost: { text: "Free", borrowing: { text: "About +$100M broad estimate; actual cost may differ", amount: -100 } } } }, items[1]];
    const output = renderToStaticMarkup(_jsx(ChoiceList, { labeledBy: "t", name: "programs", items: priced, selected: "silent", onSelect: () => undefined }));
    expect(output).toContain("About +$100M");
    expect(output).toContain("No authority spent");
    expect(output).not.toContain("No monetary cost for any option");
    expect(output).toContain("Authority / borrowing");
});
