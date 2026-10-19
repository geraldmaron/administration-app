// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Choice } from "./Field";

let root: Root;
let host: HTMLDivElement;
let fits: boolean;
const observers = new Set<() => void>();
const options = [{ value: "one", label: "First option" }, { value: "two", label: "Second option" }];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class {
    constructor(private readonly callback: () => void) { observers.add(callback); }
    observe() { /* Geometry changes are delivered explicitly below. */ }
    disconnect() { observers.delete(this.callback); }
  });
  fits = false;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) { return this.classList.contains("ui-choice__options") && !fits ? 300 : 100; });
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

function mount(value?: string) {
  act(() => root.render(<><button type="button">Outside the choice</button><Choice legend="View" options={options} value={value} onChange={() => undefined} /></>));
}
function resize(wide: boolean) {
  act(() => { fits = wide; for (const callback of observers) callback(); });
}

describe("adaptive choice keyboard continuity", () => {
  it("focuses the first radio when an unchosen native selector expands", () => {
    mount();
    host.querySelector("select")!.focus();
    resize(true);
    expect(host.querySelector("select")).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('input[type="radio"]'));
  });

  it("returns focus to the selected radio after text reflow", () => {
    mount("two");
    host.querySelector("select")!.focus();
    resize(true);
    expect(document.activeElement).toBe(host.querySelector('input[value="two"]'));
  });

  it("moves focused radio work to the native selector when the labels stop fitting", () => {
    mount("two");
    resize(true);
    host.querySelector<HTMLInputElement>('input[value="two"]')!.focus();
    resize(false);
    expect(document.activeElement).toBe(host.querySelector("select"));
    expect(host.querySelector("select")!.value).toBe("two");
  });

  it("does not steal focus from another control during reflow", () => {
    mount();
    host.querySelector("button")!.focus();
    resize(true);
    expect(document.activeElement).toBe(host.querySelector("button"));
  });
});
