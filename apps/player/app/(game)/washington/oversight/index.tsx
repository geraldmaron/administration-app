import { router, useLocalSearchParams } from "expo-router";
import type { OfficeId } from "@admin/engine";
import { OversightScreen } from "../../../../src/oversight/OversightScreen";
import { oversightView, type OversightView } from "../../../../src/oversight/model";
import { InTerm } from "../../../../src/shell/InTerm";

const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

/** `seat` opens the appointments desk on one seat: the door a Brief vacancy row and an office page use. */
export default function OversightRoute() {
  const params = useLocalSearchParams<{ view?: string; seat?: string }>();
  const seat = one(params.seat);
  const onView = (next: OversightView) => router.setParams({ view: next, seat: "" });
  return <InTerm>{(campaign) => <OversightScreen campaign={campaign} view={oversightView(one(params.view))} onView={onView} {...(seat ? { seat: seat as OfficeId } : {})} />}</InTerm>;
}
