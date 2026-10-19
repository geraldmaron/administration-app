import { place, type ConditionReading, type EmergencyRow } from "@admin/player-core";
import { Collection, Gauge, Icon } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { CONDITION_GLYPH } from "../../shell/glyphs";
import { toneOf } from "../../shell/valence";

/** Each condition running at home, worst first, drawn on its severity, with a door to the state it is in. */
export function ConditionList({ conditions, none }: { readonly conditions: readonly ConditionReading[]; readonly none: string }) {
  if (conditions.length === 0) return <p className="brief-section__note">{none}</p>;
  return (
    <Collection
      items={conditions}
      initial={8}
      noun="conditions"
      className="condition-list"
      render={(condition) => (
        <li key={condition.id} className={condition.state ? "condition-line ui-card-door" : "condition-line"} data-stance={condition.severity.stance}>
          <p className="condition-line__title">
            <Icon name={CONDITION_GLYPH[condition.kind]} size={18} />{" "}
            {condition.state ? (
              <Door href={place.state(condition.state)} className="ui-card-door__link">
                {condition.headline}
              </Door>
            ) : (
              condition.headline
            )}
          </p>
          <p className="condition-line__where">{condition.standfirst}</p>
          <Gauge
            shape="meter"
            label={`${condition.headline}: ${condition.severity.label.toLowerCase()}`}
            labelHidden
            value={condition.severity.fraction}
            valueText={condition.severity.value}
            tone={toneOf(condition.severity.stance)}
            caption={condition.severity.note}
          />
        </li>
      )}
    />
  );
}

/** Declared emergencies in force, each with the weeks before it lapses unless renewed. */
export function EmergencyList({ emergencies }: { readonly emergencies: readonly EmergencyRow[] }) {
  if (emergencies.length === 0) return null;
  return (
    <ul className="condition-list">
      {emergencies.map((emergency) => (
        <li key={emergency.id} className={emergency.href ? "condition-line ui-card-door" : "condition-line"} data-stance="caution">
          <p className="condition-line__title">
            {emergency.href ? (
              <Door href={emergency.href} className="ui-card-door__link">
                {emergency.title}
              </Door>
            ) : (
              emergency.title
            )}
          </p>
          <p className="condition-line__where">
            Reaches {emergency.reach}. Lapses in {emergency.weeksLeft} {emergency.weeksLeft === 1 ? "week" : "weeks"} unless renewed.
          </p>
        </li>
      ))}
    </ul>
  );
}
