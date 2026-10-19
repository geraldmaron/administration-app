import { useEffect, useState } from "react";
import { View } from "@tamagui/core";
import { anchorTop, landOn, usePage } from "./anchors";
import { ScrollStrip } from "../primitives/ScrollStrip";
import { ChipRow, type SectionNavProps } from "./section-nav-parts";

export type { SectionNavItem, SectionNavProps } from "./section-nav-parts";

/** How far below the top of the page's scroll a section's top must pass before it counts as the one being read. */
const READ_LINE = 48;

/** Brings a section of the page in view, for a control that hands the reader to another part of the page. */
export function scrollToSection(id: string): void {
  landOn(id);
}

/** The section being read: the last one whose top has passed the read line. */
function currentOf(ids: readonly string[], tops: readonly (number | null)[], y: number): string | undefined {
  return ids.reduce<string | undefined>((active, id, i) => {
    const top = tops[i];
    return top !== null && top !== undefined && top <= y + READ_LINE ? id : active;
  }, ids[0]);
}

/** Lights the section under the read line as the page scrolls, re-measuring once more when a scroll lands mid-measure. */
function useScrollSpy(ids: readonly string[]): readonly [string | undefined, (id: string) => void] {
  const page = usePage();
  const [current, setCurrent] = useState(ids[0]);
  const key = ids.join("|");
  useEffect(() => {
    if (!page) return;
    let measuring = false;
    let again = false;
    let live = true;
    const read = () => {
      if (measuring) {
        again = true;
        return;
      }
      measuring = true;
      void Promise.all(ids.map(anchorTop)).then((tops) => {
        measuring = false;
        if (!live) return;
        setCurrent(currentOf(ids, tops, page.y));
        if (again) {
          again = false;
          read();
        }
      });
    };
    page.listeners.add(read);
    return () => {
      live = false;
      page.listeners.delete(read);
    };
    // The ids are read through their joined key, so a new array with the same sections does not re-subscribe.
  }, [page, key]);
  return [current, setCurrent];
}

/**
 * The sections of a long page as a row of chips. A chip scrolls the page to
 * its section and the row lights the section being read; the web file also
 * pins the row to the top of the scroll.
 */
export function SectionNav({ items, label = "On this page", initial }: SectionNavProps) {
  const [current, setCurrent] = useScrollSpy(items.map((item) => item.id));
  useEffect(() => {
    if (!initial) return;
    // The sections lay out after the first frame, so the landing waits for them.
    const timer = setTimeout(() => landOn(initial), 300);
    return () => clearTimeout(timer);
  }, [initial]);
  const jump = (id: string) => {
    setCurrent(id);
    landOn(id);
  };
  return (
    <View role="navigation" aria-label={label} borderBottomWidth={1} borderBottomColor="borderColor">
      <ScrollStrip>
        <ChipRow items={items} current={current} onJump={jump} />
      </ScrollStrip>
    </View>
  );
}
