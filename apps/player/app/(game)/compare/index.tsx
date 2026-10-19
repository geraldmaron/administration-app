import { router, useLocalSearchParams } from "expo-router";
import { CompareWorkspace } from "../../../src/compare/CompareWorkspace";
import { compareHref, parseAddress } from "../../../src/compare/subjects";
import { paramOf } from "../../../src/nation/params";
import { InTerm } from "../../../src/shell/InTerm";

export default function CompareRoute() {
  const params = useLocalSearchParams<{ metric?: string; with?: string; window?: string }>();
  const address = parseAddress({ metric: paramOf(params.metric), with: paramOf(params.with), window: paramOf(params.window) });
  return <InTerm>{(campaign) => <CompareWorkspace campaign={campaign} address={address} onAddress={(next) => router.replace(compareHref(next) as never)} />}</InTerm>;
}
