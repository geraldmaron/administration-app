import { router, useLocalSearchParams } from "expo-router";
import { STATE_IDS } from "@admin/world";
import { CongressScreen } from "../../../../src/congress/CongressScreen";
import { congressCaucus, congressView, type Caucus, type CongressSelection, type CongressView } from "../../../../src/congress/model";
import { InTerm } from "../../../../src/shell/InTerm";

const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

/** The view and the chosen state live in the address, so Back and a reload return to them; unknown values fall away. */
export default function CongressRoute() {
  const params = useLocalSearchParams<{ view?: string; state?: string; seat?: string; caucus?: string }>();
  const view = congressView(one(params.view));
  const caucus = congressCaucus(one(params.caucus));
  const state = one(params.state);
  const seat = one(params.seat);
  const selection: CongressSelection = {
    ...(state && (STATE_IDS as readonly string[]).includes(state) ? { state } : {}),
    ...(seat && /^[a-zA-Z0-9:_-]{1,48}$/.test(seat) ? { seat } : {}),
  };
  const onView = (next: CongressView) => router.setParams({ view: next, caucus: "" });
  const onCaucus = (next: Caucus | undefined) => router.setParams({ caucus: next ?? "" });
  const onSelect = (next: CongressSelection) => router.setParams({ state: next.state ?? "", seat: next.seat ?? "" });
  return <InTerm>{(campaign) => <CongressScreen campaign={campaign} view={view} onView={onView} selection={selection} onSelect={onSelect} caucus={caucus} onCaucus={onCaucus} />}</InTerm>;
}
