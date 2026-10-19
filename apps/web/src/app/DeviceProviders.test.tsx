// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DeviceProviders } from "./DeviceProviders";

const probe = vi.hoisted(() => ({ pathname: "/", painted: false, load: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useLocation: ({ select }: { select: (location: { pathname: string }) => boolean }) => select({ pathname: probe.pathname }) }));
vi.mock("../map/lazy-module", () => ({ useLazyModule: (_load: unknown, needed: boolean) => { probe.load(needed); return null; } }));
vi.mock("./device-storage", () => ({ createDeviceStorage: () => ({}) }));
vi.mock("./device-settings", () => ({ usePreferencesHandle: () => ({ preferences: {} }), useEntitlementHandle: () => ({}) }));

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  probe.pathname = "/";
  probe.painted = false;
  probe.load.mockClear();
  vi.stubGlobal("performance", { getEntriesByName: () => probe.painted ? [{}] : [] });
  vi.stubGlobal("PerformanceObserver", undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function render() {
  act(() => root.render(<DeviceProviders><p>Workspace</p></DeviceProviders>));
}

it("opens deep-link stores immediately without waiting for a title map that is not mounted", () => {
  probe.pathname = "/washington";
  render();
  expect(probe.load).toHaveBeenLastCalledWith(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("retains the bounded title first-paint wait when the map has not painted", () => {
  render();
  expect(probe.load).toHaveBeenLastCalledWith(false);
  act(() => vi.advanceTimersByTime(1500));
  expect(probe.load).toHaveBeenLastCalledWith(true);
});

it("releases a pending title wait as soon as navigation needs a workspace", () => {
  render();
  expect(probe.load).toHaveBeenLastCalledWith(false);
  probe.pathname = "/brief";
  render();
  expect(probe.load).toHaveBeenLastCalledWith(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("does not delay a title whose map already painted", () => {
  probe.painted = true;
  render();
  expect(probe.load).toHaveBeenLastCalledWith(true);
  expect(vi.getTimerCount()).toBe(0);
});
