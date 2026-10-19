import type { MetricSet } from "@admin/engine";
import type { DigestKpi } from "@admin/player-core";
import { Icon, type IconName } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { moveGlyph, moveValence } from "../../shell/valence";

const KPI_ICONS: Readonly<Record<keyof MetricSet, IconName>> = {
  approval: "ballot",
  treasury: "budget",
  stability: "flag",
  militaryReadiness: "shield",
  standing: "world",
};

const SIGN = { up: 1, down: -1, flat: 0 } as const;

/** Where each reading closed in its own range, with a tick where it opened. */
function Range({ kpi }: { readonly kpi: DigestKpi }) {
  if (kpi.afterFraction === undefined || kpi.beforeFraction === undefined) return <span className="dg-range" aria-hidden="true" data-unknown="true" />;
  return (
    <span className="dg-range" aria-hidden="true">
      <span className="dg-range__fill" style={{ inlineSize: `${kpi.afterFraction * 100}%` }} />
      <span className="dg-range__before" style={{ insetInlineStart: `${kpi.beforeFraction * 100}%` }} />
    </span>
  );
}

/** The five Brief readings at the week's close: level in its range, then the move as a marked chip. */
export function KpiStrip({ kpis }: { readonly kpis: readonly DigestKpi[] }) {
  return (
    <ul className="dg-kpis">
      {kpis.map((kpi) => {
        const sign = SIGN[kpi.direction];
        return (
          <li key={kpi.key}>
            <Door href={kpi.href} className="dg-kpi" aria-label={`${kpi.label}: ${kpi.afterText ?? "not kept"}, ${kpi.text}. Open ${kpi.label}.`}>
              <span className="dg-kpi__name"><Icon name={KPI_ICONS[kpi.key]} size={18} /> {kpi.label}</span>
              <span className="dg-kpi__figure">{kpi.afterText ?? "—"}</span>
              <Range kpi={kpi} />
              <span className="ui-valence-ink dg-kpi__delta" data-valence={moveValence(sign)}>
                {moveGlyph(sign)}&nbsp;{kpi.text}
              </span>
            </Door>
          </li>
        );
      })}
    </ul>
  );
}
