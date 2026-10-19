import { worldCities } from "@admin/world";
import type { ScenarioBriefSpec } from "./brief.js";

const PITTSBURGH_CITY_ID = "CITY-USA-pittsburgh";

export function candidatesSection(spec: ScenarioBriefSpec): readonly string[] {
  if (spec.cast !== "none") return [];
  const us = worldCities.filter((city) => city.nation === "USA");
  const pittsburgh = us.find((city) => city.id === PITTSBURGH_CITY_ID);
  const preferIndustrial = spec.class === "economy";
  const rest = us
    .filter((city) => city.id !== PITTSBURGH_CITY_ID)
    .sort((a, b) => {
      if (preferIndustrial) {
        const ranked = (kind: string) => (kind === "industrial" ? 0 : 1);
        const byKind = ranked(a.kind) - ranked(b.kind);
        if (byKind !== 0) return byKind;
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, 4);
  const picked = (pittsburgh ? [pittsburgh, ...rest] : rest).slice(0, 5);
  return [
    "Candidates",
    "Domestic weeks bind locus.city to a dataset CityId so the board names the metro. Write {{city}} (and {{cityKind}} when the kind of place matters). Never free-text a city name except via the token.",
    ...picked.map((city) => `- ${city.id} — ${city.name}${city.state ? `, ${city.state}` : ""} (${city.kind})`),
    "",
  ];
}
