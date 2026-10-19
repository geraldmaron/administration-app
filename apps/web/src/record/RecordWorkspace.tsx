import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { Campaign } from "@admin/engine";
import { recordEntry, recordTimeline, type TimelineReading } from "@admin/player-core";
import { EmptyState } from "@admin/ui-web";
import { Door } from "../shell/Door";
import { RecordOrientation } from "./RecordOrientation";
import { RecordDetail } from "./RecordDetail";
import { RecordFilters } from "./RecordFilters";
import { RecordList } from "./RecordList";
import { filterOf, recordHref, withoutEntry, type RecordPatch, type RecordSearch } from "./search";

const PHONE = "(max-width: 63.99em)";

/**
 * On a phone the list and an open entry take turns on one page. The list's
 * place is kept when an entry opens and given back when it closes, and focus
 * follows the player so a screen reader hears where they are.
 */
function useListToDetail(selectedId: string | undefined) {
  const root = useRef<HTMLDivElement | null>(null);
  const saved = useRef(0);
  const previous = useRef<string | undefined>(selectedId);
  useLayoutEffect(() => {
    const body = root.current?.closest<HTMLElement>(".ui-surface__body");
    if (!body || !window.matchMedia(PHONE).matches) return;
    if (selectedId && !previous.current) saved.current = body.scrollTop;
    if (selectedId) body.scrollTop = 0;
    if (!selectedId && previous.current) body.scrollTop = saved.current;
  }, [selectedId]);
  useEffect(() => {
    if (previous.current === selectedId) return;
    if (window.matchMedia(PHONE).matches) {
      if (selectedId) document.getElementById("rec-detail-title")?.focus({ preventScroll: true });
      else root.current?.querySelector<HTMLElement>(`[data-entry="${CSS.escape(previous.current ?? "")}"]`)?.focus({ preventScroll: true });
    }
    previous.current = selectedId;
  }, [selectedId]);
  return root;
}

function Detail({ campaign, selectedId, search, reading }: { readonly campaign: Campaign; readonly selectedId: string | undefined; readonly search: RecordSearch; readonly reading: TimelineReading }) {
  const entry = useMemo(() => (selectedId ? recordEntry(campaign, selectedId) : undefined), [campaign, selectedId]);
  const listHref = recordHref(withoutEntry(search));
  if (!selectedId) {
    return <RecordOrientation reading={reading} search={search} />;
  }
  if (!entry) {
    return (
      <EmptyState icon="emptyRecord" title="This administration's Record holds no such entry">
        It may belong to another administration. <Door href={listHref}>All entries</Door>
      </EmptyState>
    );
  }
  return <RecordDetail campaign={campaign} entry={entry} search={search} listHref={listHref} />;
}

/** The acts view of the Record: search and filters, the entries in order, and the selected entry beside them (desktop) or in their place (phone). */
export function RecordWorkspace({ campaign, search, selectedId, onSearch }: { readonly campaign: Campaign; readonly search: RecordSearch; readonly selectedId: string | undefined; readonly onSearch: (patch: RecordPatch) => void }) {
  const query = useDeferredValue(search.q);
  const { actor, domain, subject, outcome } = search;
  const filter = useMemo(() => filterOf({ actor, domain, subject, outcome, q: query }), [actor, domain, subject, outcome, query]);
  const filterKey = JSON.stringify(filter);
  const reading = useMemo(() => recordTimeline(campaign, filter), [campaign, filter]);
  const root = useListToDetail(selectedId);
  return (
    <div ref={root} className="rec-work" data-detail={selectedId ? "open" : "closed"}>
      <div className="rec-pane rec-pane--list">
        <RecordFilters reading={reading} search={search} onSearch={onSearch} />
        <RecordList key={filterKey} rows={reading.rows} total={reading.total} selectedId={selectedId} search={search} />
      </div>
      <div className="rec-pane rec-pane--detail">
        <Detail campaign={campaign} selectedId={selectedId} search={search} reading={reading} />
      </div>
    </div>
  );
}
