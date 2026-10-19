import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { place } from "@admin/player-core";
import { Loading } from "@admin/ui";
import { CourtsScreen } from "../../../../src/courts/CourtsScreen";
import { courtsView, type CourtsView } from "../../../../src/courts/model";
import { InTerm } from "../../../../src/shell/InTerm";

const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

/** A judge's file was once a view on this page; links to it kept in older Record entries put the Courts page back in place and open the person over it, so Back returns to the bench. */
function OpenJudge({ judge }: { readonly judge: string }) {
  useEffect(() => {
    router.replace(place.courts() as never);
    router.push(place.person(judge) as never);
  }, [judge]);
  return <Loading title="Opening the judge's file" />;
}

export default function CourtsRoute() {
  const params = useLocalSearchParams<{ view?: string; judge?: string }>();
  const judge = one(params.judge);
  if (judge) return <OpenJudge judge={judge} />;
  const onView = (next: CourtsView) => router.setParams({ view: next });
  return <InTerm>{(campaign) => <CourtsScreen campaign={campaign} view={courtsView(one(params.view))} onView={onView} />}</InTerm>;
}
