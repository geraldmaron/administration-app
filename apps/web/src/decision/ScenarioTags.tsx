import type { CastScenario } from "@admin/content";
import { classLabel, severityWord } from "@admin/player-core";
import { Tag, type IconName, type TagTone } from "@admin/ui-web";

type Severity = CastScenario["def"]["severity"];
type ScenarioClass = CastScenario["def"]["class"];

const SEVERITY: Readonly<Record<Severity, { readonly tone: TagTone; readonly icon: IconName; readonly solid: boolean }>> = {
  critical: { tone: "risk", icon: "adverse", solid: true },
  serious: { tone: "caution", icon: "caution", solid: false },
  routine: { tone: "neutral", icon: "neutral", solid: false },
};

/** Each kind of matter by the glyph a reader would expect for it; force and harm read red, the rest neutral. */
const KIND: Readonly<Record<ScenarioClass, { readonly icon: IconName; readonly tone: TagTone }>> = {
  tragedy: { icon: "adverse", tone: "neutral" },
  terror: { icon: "escalate", tone: "risk" },
  unrest: { icon: "eventUnrest", tone: "neutral" },
  disaster: { icon: "eventEmergency", tone: "neutral" },
  "public-health": { icon: "eventPandemic", tone: "neutral" },
  migration: { icon: "mapPin", tone: "neutral" },
  "foreign-crisis": { icon: "world", tone: "neutral" },
  war: { icon: "instrumentMilitary", tone: "risk" },
  espionage: { icon: "intel", tone: "neutral" },
  hostage: { icon: "locked", tone: "risk" },
  technology: { icon: "sectorTelecomCyber", tone: "neutral" },
  economy: { icon: "graph", tone: "neutral" },
  scandal: { icon: "press", tone: "neutral" },
  justice: { icon: "gavel", tone: "neutral" },
  institution: { icon: "building", tone: "neutral" },
  culture: { icon: "microphone", tone: "neutral" },
  death: { icon: "archive", tone: "neutral" },
  triumph: { icon: "favorable", tone: "neutral" },
};

/** A matter's severity and kind as tags: CRITICAL solid red, the kind with its glyph. */
export function ScenarioTags({ cast }: { readonly cast: CastScenario }) {
  const severity = SEVERITY[cast.def.severity];
  const kind = KIND[cast.def.class];
  return (
    <>
      <Tag tone={severity.tone} icon={severity.icon} solid={severity.solid}>
        {severityWord(cast.def.severity)}
      </Tag>
      <Tag tone={kind.tone} icon={kind.icon}>
        {classLabel(cast.def.class)}
      </Tag>
    </>
  );
}
