import { useLocalSearchParams } from "expo-router";
import { EmergencyScreen } from "../../../src/nation/emergency/EmergencyScreen";
import { paramOf, setSearchParams } from "../../../src/nation/params";
import { InNation } from "../../../src/nation/NationTrail";
import { InTerm } from "../../../src/shell/InTerm";

export default function EmergencyRoute() {
  const params = useLocalSearchParams<{ incident?: string; declaration?: string }>();
  const incident = paramOf(params.incident) || undefined;
  const declaration = paramOf(params.declaration) || undefined;
  return <InTerm>{(campaign) => <InNation room="emergency"><EmergencyScreen campaign={campaign} selected={incident} declaration={declaration} onSelect={(next) => setSearchParams({ incident: next, declaration: undefined })} /></InNation>}</InTerm>;
}
