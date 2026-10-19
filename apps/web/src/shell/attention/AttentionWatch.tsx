import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isFresh, marksOnPage, withSeen, type AttentionMark, type SeenLedger } from "./marks";
import "./attention.css";

/** How long a section must stay in view before it counts as seen: long enough to read a line, short enough not to feel slow. */
const DWELL_MS = 800;
/** How long an arrival highlight stays on the section a badge led to. */
const ARRIVAL_MS = 2400;
/** How long to wait for a linked section to be drawn before giving up on the jump. */
const ARRIVAL_WAIT_MS = 2000;

type WatchProps = {
  readonly marks: readonly AttentionMark[];
  readonly ledger: SeenLedger;
  readonly onSeen: (next: SeenLedger) => void;
};

/** A section counts as in view when half of it shows, or when it fills most of the screen and cannot show half. */
function inView(entry: IntersectionObserverEntry): boolean {
  if (!entry.isIntersecting) return false;
  const screen = entry.rootBounds?.height ?? window.innerHeight;
  return entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= screen * 0.4;
}

/** Every element on the page that shows a mark: its row on a list, or the section its link names. */
function targets(here: readonly AttentionMark[]): Map<Element, readonly AttentionMark[]> {
  const found = new Map<Element, AttentionMark[]>();
  const add = (element: Element | null, mark: AttentionMark) => {
    if (element) found.set(element, [...(found.get(element) ?? []), mark]);
  };
  for (const mark of here) if (mark.anchor) add(document.getElementById(mark.anchor), mark);
  return found;
}

function rowTargets(marks: readonly AttentionMark[]): Map<Element, readonly AttentionMark[]> {
  const found = new Map<Element, readonly AttentionMark[]>();
  for (const row of document.querySelectorAll("[data-attention-id]")) {
    const id = row.getAttribute("data-attention-id");
    const matching = marks.filter((mark) => mark.id === id);
    if (matching.length > 0) found.set(row, matching);
  }
  return found;
}

/** Marks the sections that show something new, so a badge's count has a visible home on the page. */
function flag(watched: Map<Element, readonly AttentionMark[]>, ledger: SeenLedger): void {
  for (const element of document.querySelectorAll("[data-attention]")) {
    if (!watched.has(element)) element.removeAttribute("data-attention");
  }
  for (const [element, marks] of watched) {
    if (marks.some((mark) => isFresh(mark, ledger))) element.setAttribute("data-attention", "new");
    else element.removeAttribute("data-attention");
  }
}

function useSeenWatch({ marks, ledger, onSeen }: WatchProps, pathname: string): void {
  const latest = useRef({ marks, ledger, onSeen });
  latest.current = { marks, ledger, onSeen };
  // Rebuilt only when what is shown or what is new changes, so a dwell already counting is not reset by an unrelated render.
  const signature = marks.map((mark) => `${mark.id}@${mark.version}:${isFresh(mark, ledger) ? 1 : 0}`).join(" ");
  useEffect(() => {
    const timers = new Map<Element, number>();
    let watched = new Map<Element, readonly AttentionMark[]>();
    const seen = (element: Element) => {
      const { marks: live, ledger: now, onSeen: save } = latest.current;
      const shown = (watched.get(element) ?? []).filter((mark) => isFresh(mark, now));
      if (shown.length > 0) save(withSeen(now, shown, live));
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pending = timers.get(entry.target);
          if (inView(entry) && pending === undefined) timers.set(entry.target, window.setTimeout(() => seen(entry.target), DWELL_MS));
          if (!inView(entry) && pending !== undefined) {
            window.clearTimeout(pending);
            timers.delete(entry.target);
          }
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    const scan = () => {
      const { marks: live, ledger: now } = latest.current;
      const next = new Map([...targets(marksOnPage(live, pathname)), ...rowTargets(live)]);
      for (const element of watched.keys()) if (!next.has(element)) observer.unobserve(element);
      for (const element of next.keys()) if (!watched.has(element)) observer.observe(element);
      watched = next;
      flag(watched, now);
    };
    let pendingScan = 0;
    const mutations = new MutationObserver(() => {
      window.clearTimeout(pendingScan);
      pendingScan = window.setTimeout(scan, 200);
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => {
      mutations.disconnect();
      observer.disconnect();
      window.clearTimeout(pendingScan);
      for (const timer of timers.values()) window.clearTimeout(timer);
    };
  }, [pathname, signature]);
}

/**
 * The section a link names, brought into view and lit for a moment, so a badge
 * visibly lands somewhere. The surface body scrolls, not the window, so the
 * browser's own jump to a fragment never happens. The Handbook does its own.
 */
function useArrival(pathname: string, hash: string): void {
  useEffect(() => {
    if (!hash || pathname.startsWith("/handbook")) return;
    let keep = 0;
    let landed = false;
    const started = performance.now();
    // A route can draw a section twice while it settles, so the light is kept on whichever element holds the id until it fades.
    const hold = () => {
      const target = document.getElementById(hash);
      const elapsed = performance.now() - started;
      if (target && !landed) {
        landed = true;
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
      }
      if (target && elapsed < ARRIVAL_MS) target.setAttribute("data-attention-arrived", "true");
      if (elapsed >= ARRIVAL_MS || (!landed && elapsed >= ARRIVAL_WAIT_MS)) {
        target?.removeAttribute("data-attention-arrived");
        return;
      }
      // Timers, not animation frames: a frame never comes while the tab is hidden, and the highlight must still be cleared.
      keep = window.setTimeout(hold, 100);
    };
    hold();
    return () => {
      window.clearTimeout(keep);
      document.getElementById(hash)?.removeAttribute("data-attention-arrived");
    };
  }, [pathname, hash]);
}

/** Watches the page for the things the nav badges count, and records each as seen once it has been on screen. */
export function AttentionWatch(props: WatchProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hash = useRouterState({ select: (state) => state.location.hash });
  useSeenWatch(props, pathname);
  useArrival(pathname, hash);
  return null;
}
