import { useCallback, useEffect, useRef, useState } from "react";
import { View, useMedia } from "@tamagui/core";
import { pageGutter } from "./gutter";
import { sectionTitleId } from "./Section";
import { ScrollStrip } from "../primitives/ScrollStrip";
import { ChipRow, chipId, type SectionNavProps } from "./section-nav-parts";

export type { SectionNavItem, SectionNavProps } from "./section-nav-parts";

const NAV_ID = "section-nav";
/** How far below the bar a section's top must pass before it counts as the one being read. */
const READ_LINE = 32;

const reducedMotion = (): boolean => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** The nearest ancestor that scrolls vertically: the page's scroll view, or the document. */
function scrollerOf(node: HTMLElement | null): HTMLElement {
  for (let at = node?.parentElement ?? null; at; at = at.parentElement) {
    const overflow = getComputedStyle(at).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && at.scrollHeight > at.clientHeight) return at;
  }
  return document.scrollingElement as HTMLElement;
}

const barHeight = (): number => document.getElementById(NAV_ID)?.getBoundingClientRect().height ?? 0;

/** Scroll the page so an element sits just under the bar, then put focus on its heading for a screen reader. */
function land(targetId: string): boolean {
  const target = document.getElementById(targetId);
  if (!target) return false;
  const scroller = scrollerOf(target);
  const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - barHeight() - 8;
  // React Native Web replaces scrollTo on its scroll views with its own ({ x, y, animated }) signature, which reads this call as a jump to the top, so the element's own method is called.
  (Element.prototype.scrollTo as (this: Element, options: ScrollToOptions) => void).call(scroller, { top: Math.max(0, top), behavior: reducedMotion() ? "auto" : "smooth" });
  const heading = document.getElementById(sectionTitleId(targetId)) ?? target;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
  return true;
}

/** Brings any element on the page under the bar, for a control that hands the reader to another part of the page. */
export function scrollToSection(id: string): void {
  land(id);
}

/** The section being read: the last one whose top has passed under the bar, or the last of all at the foot of the page. */
function currentSection(ids: readonly string[], scroller: HTMLElement | null): string | undefined {
  const line = (document.getElementById(NAV_ID)?.getBoundingClientRect().bottom ?? 0) + READ_LINE;
  let active = ids[0];
  for (const id of ids) {
    const top = document.getElementById(id)?.getBoundingClientRect().top;
    if (top !== undefined && top <= line) active = id;
  }
  if (scroller && scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) return ids[ids.length - 1];
  return active;
}

/** Follows the scroll: whichever scroller moves, the bar re-reads its sections on the next frame. */
function useScrollSpy(ids: readonly string[]): readonly [string | undefined, (id: string) => void] {
  const [current, setCurrent] = useState(ids[0]);
  const key = ids.join("|");
  useEffect(() => {
    let frame = 0;
    let scroller: HTMLElement | null = null;
    const measure = () => {
      frame = 0;
      setCurrent(currentSection(ids, scroller));
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof HTMLElement) scroller = event.target;
      if (!frame) frame = requestAnimationFrame(measure);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", measure);
    };
    // The ids are read through their joined key, so a new array with the same sections does not re-subscribe.
  }, [key]);
  return [current, setCurrent];
}

/** Opens the page on a named place: the address's hash when it names one, else the `initial` the screen asks for. */
function useInitialLanding(initial: string | undefined): void {
  const landed = useRef(false);
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    // The page itself lands on a hash (useHashLanding); the bar only lands on the place the screen asks for.
    if (hash) return;
    const target = initial;
    if (!target || landed.current) return;
    // Lazy parts above the target (the map stage) settle after first paint, so the landing is retried once they have.
    const timers = [150, 900].map((delay) => window.setTimeout(() => (landed.current = land(target) || landed.current), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [initial]);
}

/** Keeps the lit chip in view when the bar scrolls sideways on a narrow screen. */
function useChipInView(current: string | undefined): void {
  useEffect(() => {
    const chip = current ? document.getElementById(chipId(current)) : null;
    const row = document.getElementById(`${NAV_ID}-row`);
    if (!chip || !row || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: Math.max(0, chip.offsetLeft - 16), behavior: reducedMotion() ? "auto" : "smooth" });
  }, [current]);
}

/** Publishes the bar's height as --section-nav-height, so a row pinned below it (a list's column heads) sits under it, not behind it. */
function usePublishedHeight(): void {
  useEffect(() => {
    const nav = document.getElementById(NAV_ID);
    const root = document.documentElement;
    if (!nav) return;
    const publish = () => root.style.setProperty("--section-nav-height", `${nav.offsetHeight}px`);
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    publish();
    return () => {
      observer.disconnect();
      root.style.removeProperty("--section-nav-height");
    };
  }, []);
}

/**
 * The sections of a long page as chips pinned to the top of its scroll: the
 * section being read is lit as the page moves, a chip jumps to its section and
 * hands focus to the heading, and on a narrow screen the row scrolls sideways
 * rather than wrapping.
 */
export function SectionNav({ items, label = "On this page", initial }: SectionNavProps) {
  const media = useMedia();
  const gutter = pageGutter(media);
  const ids = items.map((item) => item.id);
  const [current, setCurrent] = useScrollSpy(ids);
  useInitialLanding(initial);
  useChipInView(current);
  usePublishedHeight();
  const jump = useCallback(
    (id: string) => {
      setCurrent(id);
      land(id);
    },
    [setCurrent],
  );
  return (
    <View
      id={NAV_ID}
      role="navigation"
      aria-label={label}
      marginHorizontal={-gutter}
      paddingHorizontal={gutter}
      backgroundColor="background"
      borderBottomWidth={1}
      borderBottomColor="borderColorStrong"
      style={{ position: "sticky", top: 0, zIndex: 20 }}
    >
      <ScrollStrip id={`${NAV_ID}-row`}>
        <ChipRow items={items} current={current} onJump={jump} />
      </ScrollStrip>
    </View>
  );
}
