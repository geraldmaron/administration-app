import { router, useLocalSearchParams } from "expo-router";
import { DigestScreen } from "../../../src/brief/digest/DigestScreen";
import { InTerm } from "../../../src/shell/InTerm";

export default function DigestPage() {
  const { week } = useLocalSearchParams<{ week?: string }>();
  const parsed = week === undefined ? undefined : Number.parseInt(week, 10);
  const shown = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
  return <InTerm>{(campaign) => <DigestScreen campaign={campaign} week={shown} onWeek={(next) => router.setParams({ week: String(next) })} />}</InTerm>;
}
