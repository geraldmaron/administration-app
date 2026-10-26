import { router } from "expo-router";
import type { Campaign } from "@admin/engine";
import { recordTimeline, sealFor } from "@admin/player-core";
import { Column, Page, Seal, useMedia } from "@admin/ui";
import { ViewTabs } from "@admin/ui/nation";
import { go } from "../shell/navigate";
import { patched, recordHref, routerParams, type RecordParams, type RecordPatch, type RecordView } from "./record-params";
import { Arcs, Assessments, Promises, Standing } from "./RecordSections";
import { RecordWorkspace } from "./RecordWorkspace";

const SHORT: Readonly<Record<RecordView, string>> = { acts: "Actions", promises: "Promises", arcs: "Stories", standing: "Progress", assessments: "Reports" };

const VIEWS: readonly { readonly value: RecordView; readonly label: string }[] = [
  { value: "acts", label: "Actions and results" },
  { value: "promises", label: "Promises" },
  { value: "arcs", label: "Storylines" },
  { value: "standing", label: "How you're doing" },
  { value: "assessments", label: "Damage reports" },
];

/**
 * The Record: every act and outcome of the term to search, filter and open,
 * and the promises, story arcs, standing and assessments read from the same
 * ledger. It never authorizes anything. The view, the filters and the open
 * entry live in the address.
 */
export function RecordScreen({ campaign, params, standalone }: { readonly campaign: Campaign; readonly params: RecordParams; readonly standalone?: boolean }) {
  const media = useMedia();
  const view = params.view ?? "acts";
  const tabs = VIEWS.map((option) => ({ id: option.value, label: media.desktop ? option.label : SHORT[option.value] }));
  const pick = (next: RecordView) => onPatch({ view: next === "acts" ? undefined : next, entry: undefined });
  const total = recordTimeline(campaign).total;
  const onPatch = (patch: RecordPatch) => {
    const next = patched(params, patch);
    // Opening an entry is a step Back can retrace; a filter or a closed entry only changes the list in place.
    if (patch.entry !== undefined) go(recordHref(next));
    else if (standalone) router.replace(recordHref(next) as never);
    else router.setParams(routerParams(next));
  };
  return (
    <Page eyebrow="Executive Office of the President" icon="record" title="The Record" lede={`${total.toLocaleString("en-US")} ${total === 1 ? "entry" : "entries"} this term.`} emblem={<Seal spec={sealFor("INST-PRESIDENCY")} size={64} label="Executive Office of the President" />} wide>
      <ViewTabs<RecordView> label="Record sections" tabs={tabs} selected={view} onSelect={pick} />
      <Column gap="lg">
        {view === "acts" ? <RecordWorkspace campaign={campaign} params={params} standalone={standalone === true} onPatch={onPatch} /> : null}
        {view === "promises" ? <Promises campaign={campaign} /> : null}
        {view === "arcs" ? <Arcs campaign={campaign} /> : null}
        {view === "standing" ? <Standing campaign={campaign} /> : null}
        {view === "assessments" ? <Assessments campaign={campaign} /> : null}
      </Column>
    </Page>
  );
}
