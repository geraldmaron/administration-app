import type { CastScenario } from "@admin/content";
import { classLabel, severityWord } from "@admin/player-core";
import { Badge, type IconName } from "@admin/ui";

type Severity = CastScenario["def"]["severity"];
type ScenarioClass = CastScenario["def"]["class"];
type BadgeStatus = "danger" | "warning" | "outline" | "pending";

const SEVERITY: Readonly<Record<Severity, { readonly status: BadgeStatus; readonly icon: IconName }>> = {
  critical: { status: "danger", icon: "adverse" },
  serious: { status: "warning", icon: "caution" },
  routine: { status: "outline", icon: "neutral" },
};

/** Each kind of matter by the glyph a reader would expect for it; force and harm read red, the rest plain. */
const KIND: Readonly<Record<ScenarioClass, { readonly icon: IconName; readonly risk: boolean }>> = {
  tragedy: { icon: "adverse", risk: false },
  terror: { icon: "escalate", risk: true },
  unrest: { icon: "eventUnrest", risk: false },
  disaster: { icon: "eventEmergency", risk: false },
  "public-health": { icon: "eventPandemic", risk: false },
  migration: { icon: "mapPin", risk: false },
  "foreign-crisis": { icon: "world", risk: false },
  war: { icon: "instrumentMilitary", risk: true },
  espionage: { icon: "intel", risk: false },
  hostage: { icon: "locked", risk: true },
  technology: { icon: "sectorTelecomCyber", risk: false },
  economy: { icon: "graph", risk: false },
  scandal: { icon: "press", risk: false },
  justice: { icon: "gavel", risk: false },
  institution: { icon: "building", risk: false },
  culture: { icon: "microphone", risk: false },
  death: { icon: "archive", risk: false },
  triumph: { icon: "favorable", risk: false },
};

/** The kind of matter's glyph, for the page header. */
export function kindIcon(cast: CastScenario): IconName {
  return KIND[cast.def.class].icon;
}

/** A matter's severity and kind as badges: critical solid red, the kind with its glyph. */
export function ScenarioTags({ cast }: { readonly cast: CastScenario }) {
  const severity = SEVERITY[cast.def.severity];
  const kind = KIND[cast.def.class];
  return (
    <>
      <Badge status={severity.status} icon={severity.icon}>
        {severityWord(cast.def.severity)}
      </Badge>
      <Badge status={kind.risk ? "danger" : "pending"} icon={kind.icon}>
        {classLabel(cast.def.class)}
      </Badge>
    </>
  );
}
