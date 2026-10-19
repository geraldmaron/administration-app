import { useState } from "react";
import type { ActGoal, ActWorkspace, ComparedView, OptionView } from "@admin/player-core";
import { Column, Pressable, Row, Text, type IconName } from "@admin/ui";
import { ResultRow, ResultsList, moneyScale, type ResultHeads, type ResultSort, type ResultSortKey } from "@admin/ui/review";
import { Detail, FAMILY_ICON, FILTER_WORDS, Impact, LockedPath, passes, readingsOf, sortValue, verdictOf, type OptionFilter } from "./readings";

// Every option toward one government in one list. The goal chips are a lens
// over that list, never a gate: an option checked under one goal stays
// checked under another, so a phone call, a tariff and a deployment can be
// set side by side. The Checked view folds the list down to those rows, on
// one money scale. A sort orders each list by one reading, best first, and
// the filters narrow every list at once; options that can't be taken always
// sit after the ones that can.

const HEADS: ResultHeads = { name: "Option", odds: "Chance", money: "Cost", time: "Takes effect", move: "Biggest change" };

const NOT_OPEN: Readonly<Record<Exclude<OptionView["preview"]["state"], "open">, { readonly word: string; readonly icon: IconName }>> = {
  held: { word: "Locked", icon: "locked" },
  underway: { word: "Under way", icon: "pending" },
  done: { word: "Done", icon: "approve" },
};

export type OptionHandlers = {
  readonly chosen: string | undefined;
  readonly checked: ReadonlySet<string>;
  readonly onPick: (option: string) => void;
  readonly onCheck: (option: string) => void;
  /** Plans the act that builds toward a locked option, which its receipt then leads back to. */
  readonly onFirst: (builder: string, locked: string) => void;
};

const SORT_WORDS: Readonly<Record<ResultSortKey, string>> = { odds: "Best chance", money: "Cheapest", time: "Soonest", move: "Biggest gain" };

function Chip({ label, on, onPress, role = "radio" }: { readonly label: string; readonly on: boolean; readonly onPress: () => void; readonly role?: "radio" | "checkbox" }) {
  return (
    <Pressable role={role} aria-checked={on} onPress={onPress} minHeight={36} justifyContent="center" paddingHorizontal="md" borderRadius="pill" borderWidth={1} borderColor={on ? "accent" : "borderColorStrong"} backgroundColor={on ? { default: "accentFill", hover: "accentFillHover" } : { default: "surface", hover: "surfaceHover" }}>
      <Text variant="label" color={on ? "accentInk" : "color"} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export type ListLens = { readonly goal: ActGoal | undefined; readonly checkedOnly: boolean };

/** The lens: every goal or one, and every option or only the checked ones. */
function OptionLens({ view, lens, onGoal, onCheckedOnly }: { readonly view: ActWorkspace; readonly lens: ListLens; readonly onGoal: (goal: ActGoal | undefined) => void; readonly onCheckedOnly: (on: boolean) => void }) {
  const open = view.goals.reduce((sum, goal) => sum + goal.open, 0);
  return (
    <Column gap="sm">
      <Row gap="xs" wrap role="radiogroup" aria-label="Show options for">
        <Chip label={`All goals · ${open}`} on={!lens.goal && !lens.checkedOnly} onPress={() => onGoal(undefined)} />
        {view.goals.map((goal) => (
          <Chip key={goal.goal} label={`${goal.name} · ${goal.open}`} on={lens.goal === goal.goal && !lens.checkedOnly} onPress={() => onGoal(goal.goal)} />
        ))}
        <Chip label={`Checked · ${view.compared.length}`} on={lens.checkedOnly} onPress={() => onCheckedOnly(!lens.checkedOnly)} />
      </Row>
      <Text variant="caption" tone="secondary">
        Each reading is the change from today. Press an option to plan it, or check two or more, from any goal, to compare them.
      </Text>
    </Column>
  );
}

function Option({ entry, handlers, scale, note }: { readonly entry: OptionView; readonly handlers: OptionHandlers; readonly scale: number; readonly note?: string }) {
  const id = entry.option.id;
  const state = entry.preview.state;
  const check = { on: handlers.checked.has(id), onToggle: () => handlers.onCheck(id), label: `Compare ${entry.option.name}` };
  if (state !== "open") {
    return (
      <ResultRow label={entry.option.name} {...(note ? { note } : {})} locked={NOT_OPEN[state]} check={check} below={<LockedPath {...(entry.prerequisite ? { prerequisite: entry.prerequisite } : {})} {...(entry.preview.reason ? { reason: entry.preview.reason } : {})} onFirst={(builder) => handlers.onFirst(builder, id)} />} />
    );
  }
  return (
    <ResultRow
      label={entry.option.name}
      icon={FAMILY_ICON[entry.option.family]}
      {...(note ? { note } : {})}
      readings={readingsOf(entry, scale)}
      verdict={verdictOf(entry)}
      impact={<Impact view={entry} />}
      detail={<Detail view={entry} />}
      selected={handlers.chosen === id}
      onPress={() => handlers.onPick(id)}
      pressLabel={handlers.chosen === id ? `${entry.option.name}, being planned` : `Plan ${entry.option.name}`}
      check={check}
    />
  );
}

const scaleOf = (entries: readonly OptionView[]) => moneyScale(entries.filter((entry) => entry.preview.state === "open").map((entry) => entry.preview.money ?? { now: 0, weekly: 0 }));

export type OptionOrder = { readonly sort: ResultSort; readonly filters: ReadonlySet<OptionFilter> };

/** The rows a list shows under the order: filtered, then the open ones by the sort, best first, then the rest in their usual order. */
function ordered<T>(rows: readonly T[], view: (row: T) => OptionView, order: OptionOrder): readonly T[] {
  const kept = rows.filter((row) => [...order.filters].every((filter) => passes(view(row), filter)));
  const key = order.sort.key;
  if (!key) return kept;
  const open = kept.filter((row) => view(row).preview.state === "open");
  const rest = kept.filter((row) => view(row).preview.state !== "open");
  return [...[...open].sort((a, b) => sortValue(view(b), key) - sortValue(view(a), key)), ...rest];
}

/** The options in the lens, one goal at a time, each goal's money drawn on its own scale. */
function OptionGroups({ view, handlers, order }: { readonly view: ActWorkspace; readonly handlers: OptionHandlers; readonly order: OptionOrder }) {
  const empty = view.sections.every((section) => ordered(section.families.flatMap((family) => family.options), (entry) => entry, order).length === 0);
  if (empty) return <NoneLeft />;
  return (
    <Column gap="xl">
      {view.sections.map((section) => {
        const all = section.families.flatMap((family) => family.options.map((entry) => ({ entry, family: family.name })));
        const entries = ordered(all, (row) => row.entry, order);
        if (entries.length === 0) return null;
        const scale = scaleOf(entries.map(({ entry }) => entry));
        return (
          <Column key={section.goal} gap="sm" role="group" aria-label={section.name}>
            <Row gap="sm" wrap>
              <Text variant="title" role="heading" aria-level={3}>
                {section.name}
              </Text>
              <Text variant="caption" tone="secondary">{`${section.open} of ${all.length} open${entries.length < all.length ? ` · ${entries.length} shown` : ""} · ${section.line}`}</Text>
            </Row>
            <ResultsList label={`${section.name} options`} heads={HEADS} sort={order.sort}>
              {entries.map(({ entry, family }) => (
                <Option key={entry.option.id} entry={entry} handlers={handlers} scale={scale} note={family} />
              ))}
            </ResultsList>
          </Column>
        );
      })}
    </Column>
  );
}

/** The checked options from every goal, side by side on one scale, with every change each makes. */
function CheckedOptions({ view, handlers, order }: { readonly view: ActWorkspace; readonly handlers: OptionHandlers; readonly order: OptionOrder }) {
  if (view.compared.length === 0) {
    return (
      <Text variant="body" tone="secondary">
        Nothing is checked yet. Check Compare on two or more options, from any goal, to see them side by side.
      </Text>
    );
  }
  const goalName = (entry: ComparedView) => view.goals.find((goal) => goal.goal === entry.option.goal)?.name ?? "";
  const scale = scaleOf(view.compared);
  const rows = ordered(view.compared, (entry) => entry, order);
  if (rows.length === 0) return <NoneLeft />;
  return (
    <Column gap="sm">
      <ResultsList label="Options you're comparing" heads={HEADS} sort={order.sort}>
        {rows.map((entry) => {
          return <Option key={entry.option.id} entry={entry} handlers={handlers} scale={scale} note={goalName(entry)} />;
        })}
      </ResultsList>
      <Text variant="caption" tone="tertiary">
        The money bars share one scale here. The outlined part is four weeks of a weekly bill.
      </Text>
    </Column>
  );
}

function NoneLeft() {
  return (
    <Text variant="body" tone="secondary">
      No option fits every filter you've set. Turn one off to see more.
    </Text>
  );
}

/** How the lists are ordered and narrowed, said as chips so a phone, with no column heads, can set them too. */
function OrderChips({ order, onFilter }: { readonly order: OptionOrder; readonly onFilter: (filter: OptionFilter) => void }) {
  return (
    <Column gap="xs">
      <Row gap="xs" wrap role="group" aria-label="Sort options">
        <Text variant="caption" tone="secondary" minWidth={56}>
          Sort
        </Text>
        {(Object.keys(SORT_WORDS) as ResultSortKey[]).map((key) => (
          <Chip key={key} role="checkbox" label={SORT_WORDS[key]} on={order.sort.key === key} onPress={() => order.sort.onSort(key)} />
        ))}
      </Row>
      <Row gap="xs" wrap role="group" aria-label="Show only">
        <Text variant="caption" tone="secondary" minWidth={56}>
          Only
        </Text>
        {(Object.keys(FILTER_WORDS) as OptionFilter[]).map((filter) => (
          <Chip key={filter} role="checkbox" label={FILTER_WORDS[filter]} on={order.filters.has(filter)} onPress={() => onFilter(filter)} />
        ))}
      </Row>
    </Column>
  );
}

/** The lens, the order and the lists together, so the order survives a change of goal. */
export function OptionBrowser({ view, handlers, lens, onGoal, onCheckedOnly }: { readonly view: ActWorkspace; readonly handlers: OptionHandlers; readonly lens: ListLens; readonly onGoal: (goal: ActGoal | undefined) => void; readonly onCheckedOnly: (on: boolean) => void }) {
  const [key, setKey] = useState<ResultSortKey | undefined>(undefined);
  const [filters, setFilters] = useState<ReadonlySet<OptionFilter>>(new Set());
  const order: OptionOrder = { sort: { key, onSort: (next) => setKey(next === key ? undefined : next) }, filters };
  const toggle = (filter: OptionFilter) => setFilters((now) => (now.has(filter) ? new Set([...now].filter((entry) => entry !== filter)) : new Set([...now, filter])));
  return (
    <>
      <OptionLens view={view} lens={lens} onGoal={onGoal} onCheckedOnly={onCheckedOnly} />
      <OrderChips order={order} onFilter={toggle} />
      {lens.checkedOnly ? <CheckedOptions view={view} handlers={handlers} order={order} /> : <OptionGroups view={view} handlers={handlers} order={order} />}
    </>
  );
}
