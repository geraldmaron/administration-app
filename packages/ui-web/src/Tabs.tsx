import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type TabSpec = {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
  /** A count beside the label: open matters, rows in the view. */
  readonly count?: number;
};

export type TabsProps = {
  /** Names the set for a screen reader: "Views of Canada". */
  readonly label: string;
  readonly tabs: readonly TabSpec[];
  readonly selected: string;
  /** The screen keeps the choice (in its URL, so Back and reload keep the view). */
  readonly onSelect: (id: string) => void;
  /** Tighter tabs for a screen that sits the strip inside a panel or a narrow column. */
  readonly compact?: boolean;
  readonly children: ReactNode;
};

/** Source-owned shadcn Tabs with controlled URL state and automatic keyboard activation. */
export function Tabs({ label, tabs, selected, onSelect, compact = false, children }: TabsProps) {
  const list = useRef<HTMLDivElement>(null);
  const current = tabs.some((tab) => tab.id === selected) ? selected : tabs[0]?.id;
  useEffect(() => {
    const tab = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const strip = list.current;
    if (tab && strip && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: "auto" });
  }, [current]);
  return <TabsPrimitive.Root value={current} onValueChange={onSelect} className="ui-tabs" data-density={compact ? "compact" : undefined}>
    <TabsPrimitive.List ref={list} className="ui-tabs__list" aria-label={label}>
      {tabs.map((tab) => <TabsPrimitive.Trigger key={tab.id} value={tab.id} data-tab={tab.id} className="ui-tabs__tab">
        {tab.icon ? <Icon name={tab.icon} size={20} /> : null}<span>{tab.label}</span>{tab.count !== undefined ? <span className="ui-tabs__count">{tab.count}</span> : null}
      </TabsPrimitive.Trigger>)}
    </TabsPrimitive.List>
    {tabs.map((tab) => <TabsPrimitive.Content key={tab.id} value={tab.id} className="ui-tabs__panel">{tab.id === current ? children : null}</TabsPrimitive.Content>)}
  </TabsPrimitive.Root>;
}
