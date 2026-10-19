import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { GLOSSARY } from "@admin/player-core";
import { CommandPalette, isIconName, type PaletteItem } from "@admin/ui-web";
import { chapterEntries, placeEntries, search, termEntries, type SearchEntry } from "./search-index";

function TermBody({ entry }: { readonly entry: Extract<SearchEntry, { kind: "term" }>["entry"] }) {
  return (
    <>
      <p>{entry.definition}</p>
      {entry.inGame ? (
        <p>
          <strong>In the game: </strong>
          {entry.inGame}
        </p>
      ) : null}
    </>
  );
}

function paletteItem(entry: SearchEntry, go: (href: string) => void): PaletteItem {
  const icon = isIconName(entry.icon) ? entry.icon : undefined;
  if (entry.kind !== "term") {
    return { id: entry.id, group: "Places", title: entry.title, detail: entry.detail, ...(icon ? { icon } : {}), onSelect: () => go(entry.href) };
  }
  return { id: entry.id, group: "Glossary", title: entry.title, detail: entry.detail, ...(icon ? { icon } : {}), body: <TermBody entry={entry.entry} /> };
}

/** Search over the places a player can stand and the glossary's terms. */
export function Search({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const entries = useMemo(() => {
    const paths = new Set<string>(Object.keys(router.routesByPath));
    const exists = (href: string) => paths.has(href);
    return [...placeEntries(exists), ...chapterEntries(exists), ...termEntries(GLOSSARY)];
  }, [router]);
  const items = useMemo(() => search(entries, query).map((entry) => paletteItem(entry, (href) => void navigate({ href }))), [entries, query, navigate]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  return <CommandPalette open={open} onClose={onClose} query={query} onQueryChange={setQuery} items={items} />;
}
