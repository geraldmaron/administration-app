import type { AttentionSource } from "@admin/engine";
import { ATTENTION_SOURCES, LAST_CALL_DAYS, defaultAttentionSetting, logEligible, type AttentionSetting } from "@admin/player-core";
import { Field, Gauge, NativeSelect } from "@admin/ui-web";
import { usePreferences } from "../app/hooks";

/** What each source is, in the words a player sets a habit against rather than the engine's own name for it. */
const SOURCE_LABEL: Readonly<Record<AttentionSource, string>> = {
  "constitutional-deadline": "Constitutional dates",
  "appropriations-deadline": "Government funding deadlines",
  "bill-signature": "Bills on your desk",
  nomination: "Nominations",
  "court-ruling": "Court rulings",
  "intelligence-warning": "Intelligence warnings",
  "military-escalation": "Military escalation",
  "treaty-deadline": "Treaty deadlines",
  "agency-request": "Requests from federal agencies",
  "governor-request": "Governors' requests",
  "market-threshold": "Big market moves",
  "standing-threshold": "Swings in approval and press coverage",
  disaster: "Disasters at home",
  "diplomatic-request": "Requests from other countries",
  "consequence-return": "Results of earlier decisions",
  investigation: "Pressure to remove you from office",
  pledge: "Promises coming due",
  scandal: "Scandals",
  incident: "Incidents at home",
  "resignation-offer": "Offers to resign",
  "market-shock": "Market crashes and spikes",
  coup: "Coups in other countries",
  scenario: "Decisions",
};

// "wait" stops the clock only when the item is LAST_CALL_DAYS from its own
// deadline; one with no deadline never stops.
const SETTING_LABEL: Readonly<Record<AttentionSetting, string>> = {
  pause: "Pause time right away",
  wait: `Pause ${LAST_CALL_DAYS} days before it's due`,
  log: "Never pause time",
};

const GROUPS: readonly { readonly title: string; readonly sources: readonly AttentionSource[] }[] = [
  { title: "Presidential decisions", sources: ["consequence-return", "pledge", "resignation-offer"] },
  { title: "Government and constitutional duties", sources: ["constitutional-deadline", "appropriations-deadline", "bill-signature", "nomination", "court-ruling", "agency-request", "investigation"] },
  { title: "Foreign affairs and security", sources: ["intelligence-warning", "military-escalation", "treaty-deadline", "diplomatic-request", "coup"] },
  { title: "Domestic affairs and public confidence", sources: ["governor-request", "market-threshold", "standing-threshold", "disaster", "scandal", "incident", "market-shock"] },
];

function Row({ source, value, onChange }: { readonly source: AttentionSource; readonly value: AttentionSetting; readonly onChange: (setting: AttentionSetting) => void }) {
  return (
    <Field label={SOURCE_LABEL[source]}>
      {(props) => (
        <NativeSelect {...props} value={value} data-source={source} onChange={(event) => onChange(event.target.value as AttentionSetting)}>
          <option value="pause">{SETTING_LABEL.pause}</option>
          <option value="wait">{SETTING_LABEL.wait}</option>
          {logEligible(source) ? <option value="log">{SETTING_LABEL.log}</option> : null}
        </NativeSelect>
      )}
    </Field>
  );
}

/** Which kinds of matter stop the world, and how; the tally is drawn from the rows themselves. */
export function AttentionSettings() {
  const { preferences, update } = usePreferences();
  const settings = preferences.attentionByKind;
  const ungrouped = ATTENTION_SOURCES.filter((source) => source !== "scenario" && !GROUPS.some((group) => group.sources.includes(source)));
  const groups = ungrouped.length > 0 ? [...GROUPS, { title: "Other matters", sources: ungrouped }] : GROUPS;
  const valueOf = (source: AttentionSource): AttentionSetting => (source === "scenario" ? "pause" : settings?.[source] ?? defaultAttentionSetting(source));
  const values = ATTENTION_SOURCES.map(valueOf);
  const count = (setting: AttentionSetting) => values.filter((value) => value === setting).length;
  return (
    <div className="attention">
      <div className="attention__tally" role="group" aria-label="How your choices add up">
        {(["pause", "wait", "log"] as const).map((setting) => (
          <Gauge key={setting} shape="meter" label={SETTING_LABEL[setting]} value={count(setting) / values.length} valueText={`${count(setting)} of ${values.length} kinds`} />
        ))}
      </div>
      <p className="stage-note">Decisions always pause time when they arrive. Urgent items always pause it too, whatever you pick here: a deadline set by law, or a bill that becomes law if you don't act.</p>
      {groups.map((group) => (
        <section key={group.title} className="attention__group" aria-label={group.title}>
          <h3 className="attention__title">
            {group.title} <span className="attention__count">{group.sources.length} kinds</span>
          </h3>
          <div className="attention__rows">
            {group.sources.map((source) => (
              <Row key={source} source={source} value={valueOf(source)} onChange={(setting) => update({ attentionByKind: { ...settings, [source]: setting } })} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
