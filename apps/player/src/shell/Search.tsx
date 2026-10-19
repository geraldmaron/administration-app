import { useEffect, useMemo, useRef, useState } from "react";
import type { Campaign } from "@admin/engine";
import { GLOSSARY, PLACES, chapterEntries, entityEntries, groupResults, placeEntries, search, termEntries, type PlaceKey, type SearchEntry } from "@admin/player-core";
import { Button, Column, Empty, Icon, PressRow, Row, Sheet, Text, TextInput, isIconName, useMedia } from "@admin/ui";
import { Monogram } from "@admin/ui/dossier";
import { FlagOf } from "../world/parts";
import { go } from "./navigate";
import { SHORTCUT_HINT, useSearchKeys } from "./search-keys";

/** The places a search can open: the working screens, not the title, the founding or an ending. */
const PLAYER_PLACES: readonly PlaceKey[] = ["brief", "washington", "pressOffice", "congress", "courts", "oversight", "nation", "economy", "budget", "policy", "emergency", "world", "security", "record", "administrations", "settings", "handbook"];

/** Screens the route tree has that the place table does not name, or names at a legacy address. */
const EXTRA_PLACES: readonly SearchEntry[] = [
  { kind: "place", id: "place:calendar", title: "Calendar", detail: "Opens the Calendar.", icon: "schedule", href: "/calendar", keywords: ["dates", "deadlines", "schedule", "elections", "agenda"] },
  { kind: "place", id: "place:digest", title: "Briefing history", detail: "Opens the weeks you've run, newest first.", icon: "notificationStack", href: "/brief/digest", keywords: ["digest", "last week", "weeks", "summary", "history"] },
  { kind: "place", id: "place:compare", title: "Compare", detail: "Opens the comparison workspace.", icon: "graph", href: "/compare", keywords: ["benchmark", "against", "trend"] },
];

const PLAYER_HREFS: ReadonlySet<string> = new Set(PLAYER_PLACES.map((key) => PLACES[key].href));
const routeExists = (href: string): boolean => PLAYER_HREFS.has(href);

function buildEntries(campaign: Campaign): readonly SearchEntry[] {
  return [...placeEntries(routeExists), ...EXTRA_PLACES, ...chapterEntries(routeExists), ...entityEntries(campaign), ...termEntries(GLOSSARY)];
}

function openEntry(entry: SearchEntry): void {
  go(entry.kind === "term" ? `/handbook/terms?at=${entry.entry.id}` : entry.href);
}

/** The head of a result: a government's flag, a person's initials, else the kind's glyph. */
function Lead({ entry }: { readonly entry: SearchEntry }) {
  if ("visual" in entry && entry.visual?.kind === "flag") return <FlagOf nation={entry.visual.nation} name={entry.title} height={22} />;
  if ("visual" in entry && entry.visual?.kind === "person") return <Monogram name={entry.visual.name} size={32} />;
  const icon = entry.icon ?? "glossary";
  return <Icon name={isIconName(icon) ? icon : "open"} size={24} tone="colorSecondary" />;
}

function SearchHit({ entry, active, onChoose }: { readonly entry: SearchEntry; readonly active: boolean; readonly onChoose: () => void }) {
  const node = useRef<unknown>(null);
  useEffect(() => {
    if (active) (node.current as { scrollIntoView?: (options: { block: string }) => void } | null)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  return (
    <PressRow ref={node as never} label={`${entry.title}. ${entry.detail}`} selected={active} onPress={onChoose} padding="sm" borderRadius="chip" minHeight={48} flexDirection="row" alignItems="center" gap="md" backgroundColor={active ? "surfaceHover" : "transparent"}>
      <Row width={36} justifyContent="center">
        <Lead entry={entry} />
      </Row>
      <Column flex={1} minWidth={0} gap="2xs">
        <Text variant="label" numberOfLines={1}>
          {entry.title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {entry.detail}
        </Text>
      </Column>
      <Icon name="chevron" size={16} tone="colorTertiary" />
    </PressRow>
  );
}

function Results({ results, active, onChoose }: { readonly results: readonly SearchEntry[]; readonly active: number; readonly onChoose: (entry: SearchEntry) => void }) {
  const groups = groupResults(results);
  return (
    <Column gap="md">
      {groups.map((group) => (
        <Column key={group.kind} gap="2xs" role="list" aria-label={group.label}>
          <Text variant="eyebrow" tone="secondary">
            {group.label}
          </Text>
          {group.entries.map((entry) => (
            <SearchHit key={entry.id} entry={entry} active={results[active]?.id === entry.id} onChoose={() => onChoose(entry)} />
          ))}
        </Column>
      ))}
    </Column>
  );
}

/**
 * Search from anywhere: people, offices, members, judges, states, countries,
 * bills, cases, wars, treaties, organizations, commands, screens and the
 * Handbook's words. Each result is a door. Cmd or Ctrl K and "/" open it, the
 * arrows move, Enter opens the chosen result and Escape closes it.
 */
export function SearchButton({ campaign }: { readonly campaign: Campaign }) {
  const media = useMedia();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const entries = useMemo(() => (open ? buildEntries(campaign) : []), [open, campaign]);
  const results = useMemo(() => (open ? search(entries, query) : []), [open, entries, query]);
  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const choose = (entry: SearchEntry | undefined) => {
    if (!entry) return;
    close();
    openEntry(entry);
  };
  useSearchKeys({ open, count: results.length, onOpen: () => setOpen(true), onClose: close, onMove: (by) => setActive((now) => Math.max(0, Math.min(results.length - 1, now + by))) });
  const hint = SHORTCUT_HINT;
  return (
    <>
      <Button kind="quiet" size="compact" icon="search" label={`Search${hint ? `. Shortcut ${hint}` : ""}`} onPress={() => setOpen(true)}>
        {media.phone ? undefined : hint ? `Search  ${hint}` : "Search"}
      </Button>
      <Sheet open={open} onClose={close} title="Search" eyebrow="Find anything in the game">
        <TextInput kind="search" icon="search" autoFocus label="Search people, places, laws and words" placeholder="A person, a state, a country, a bill, a word" value={query} onChangeText={(text) => { setQuery(text); setActive(0); }} onSubmit={() => choose(results[active])} />
        {results.length === 0 && query.trim() ? (
          <Empty title="Nothing matches that" detail="Try a person's name, a state, a country, an office, a bill or a word from the Handbook." />
        ) : (
          <>
            {query.trim() ? null : <Text variant="caption" tone="secondary">Places you can go. Type to search everything else.</Text>}
            <Results results={results} active={active} onChoose={choose} />
          </>
        )}
        {media.phone ? null : <Text variant="caption" tone="tertiary">Up and down arrows move, Enter opens, Escape closes.</Text>}
      </Sheet>
    </>
  );
}
