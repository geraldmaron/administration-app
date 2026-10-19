// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { AttentionWatch } from "./AttentionWatch";
import type { AttentionMark, SeenLedger } from "./marks";

type Callback = (entries: IntersectionObserverEntry[]) => void;
const observers: { callback: Callback; targets: Set<Element> }[] = [];

class FakeObserver {
  readonly entry: { callback: Callback; targets: Set<Element> };
  constructor(callback: Callback) {
    this.entry = { callback, targets: new Set() };
    observers.push(this.entry);
  }
  observe(target: Element) {
    this.entry.targets.add(target);
  }
  unobserve(target: Element) {
    this.entry.targets.delete(target);
  }
  disconnect() {
    this.entry.targets.clear();
  }
}

/** Reports `target` as showing (or not) to every observer watching it, the way the browser does on scroll. */
function show(target: Element, visible: boolean) {
  const rect = { height: visible ? 200 : 0 } as DOMRectReadOnly;
  for (const observer of observers.filter((candidate) => candidate.targets.has(target))) {
    observer.callback([{ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0, intersectionRect: rect, rootBounds: { height: 800 } as DOMRectReadOnly } as IntersectionObserverEntry]);
  }
}

const BILL: AttentionMark = { id: "bill-1", place: "congress", title: "A bill waits", href: "/washington/congress/bill/b1#bill-desk", path: "/washington/congress/bill/b1", anchor: "bill-desk", version: "2029-5-3|hard" };

let root: Root | undefined;
let host: HTMLDivElement;

async function mount(ledger: SeenLedger, onSeen: (next: SeenLedger) => void) {
  const page = () => (
    <>
      <section id="bill-desk">Sign or veto</section>
      <AttentionWatch marks={[BILL]} ledger={ledger} onSeen={onSeen} />
    </>
  );
  const router = createRouter({ routeTree: createRootRoute({ component: page }), history: createMemoryHistory({ initialEntries: ["/washington/congress/bill/b1"] }) });
  await act(async () => {
    root = createRoot(host);
    root.render(<RouterProvider router={router} />);
  });
}

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

beforeEach(() => {
  observers.length = 0;
  host = document.createElement("div");
  document.body.appendChild(host);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  act(() => root?.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("AttentionWatch", () => {
  it("marks the section new, then records it seen once it has stayed on screen", async () => {
    const onSeen = vi.fn();
    await mount({}, onSeen);
    const section = document.getElementById("bill-desk")!;
    expect(section.getAttribute("data-attention")).toBe("new");
    act(() => show(section, true));
    act(() => void vi.advanceTimersByTime(900));
    expect(onSeen).toHaveBeenCalledWith({ "bill-1": BILL.version });
  });

  it("does not count a glance that leaves before the dwell", async () => {
    const onSeen = vi.fn();
    await mount({}, onSeen);
    const section = document.getElementById("bill-desk")!;
    act(() => show(section, true));
    act(() => void vi.advanceTimersByTime(300));
    act(() => show(section, false));
    act(() => void vi.advanceTimersByTime(1000));
    expect(onSeen).not.toHaveBeenCalled();
  });

  it("draws no new marker on what has been seen at this version", async () => {
    await mount({ "bill-1": BILL.version }, vi.fn());
    expect(document.getElementById("bill-desk")!.hasAttribute("data-attention")).toBe(false);
  });
});
