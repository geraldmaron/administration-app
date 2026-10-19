import type { IconName } from "@admin/ui-web";
import type { CountryView } from "./country-search";

export const COUNTRY_VIEW_LABELS: Readonly<Record<CountryView, string>> = {
  overview: "Overview",
  diplomacy: "Diplomacy",
  economy: "Economy",
  security: "Security",
  intelligence: "Intel",
  activity: "Activity",
};

export const COUNTRY_VIEW_GLYPH: Readonly<Record<CountryView, IconName>> = {
  overview: "dossier",
  diplomacy: "summit",
  economy: "economyGrowth",
  security: "shield",
  intelligence: "intel",
  activity: "dispatch",
};
