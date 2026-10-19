import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Choice } from "./Field";
let root;
let host;
let fits;
const observers = new Set();
const options = [{ value: "one", label: "First option" }, { value: "two", label: "Second option" }];
beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("ResizeObserver", class {
        callback;
        constructor(callback) {
            this.callback = callback;
            observers.add(callback);
        }
        observe() { }
        disconnect() { observers.delete(this.callback); }
    });
    fits = false;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function () { return this.classList.contains("ui-choice__options") && !fits ? 300 : 100; });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
});
afterEach(() => {
    act(() => root.unmount());
    host.remove();
    observers.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});
function mount(value) {
    act(() => root.render(_jsxs(_Fragment, { children: [_jsx("button", { type: "button", children: "Outside the choice" }), _jsx(Choice, { legend: "View", options: options, value: value, onChange: () => undefined })] })));
}
function resize(wide) {
    act(() => { fits = wide; for (const callback of observers)
        callback(); });
}
describe("adaptive choice keyboard continuity", () => {
    it("focuses the first radio when an unchosen native selector expands", () => {
        mount();
        host.querySelector("select").focus();
        resize(true);
        expect(host.querySelector("select")).toBeNull();
        expect(document.activeElement).toBe(host.querySelector('input[type="radio"]'));
    });
    it("returns focus to the selected radio after text reflow", () => {
        mount("two");
        host.querySelector("select").focus();
        resize(true);
        expect(document.activeElement).toBe(host.querySelector('input[value="two"]'));
    });
    it("moves focused radio work to the native selector when the labels stop fitting", () => {
        mount("two");
        resize(true);
        host.querySelector('input[value="two"]').focus();
        resize(false);
        expect(document.activeElement).toBe(host.querySelector("select"));
        expect(host.querySelector("select").value).toBe("two");
    });
    it("does not steal focus from another control during reflow", () => {
        mount();
        host.querySelector("button").focus();
        resize(true);
        expect(document.activeElement).toBe(host.querySelector("button"));
    });
});
