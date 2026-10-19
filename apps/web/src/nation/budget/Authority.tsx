import type { Campaign } from "@admin/engine";
import { authorityFlow, formatMoney } from "@admin/player-core";
import { Bar, type BarTone } from "@admin/ui-web";
import { MetricActs, MetricReading } from "../../shell/MetricReading";
import "./budget.css";

type FlowRow = { readonly label: string; readonly note: string; readonly amount: number; readonly tone: BarTone };

/** What the week adds to the authority and what it takes out, on one scale, so the net is the visible gap. */
function Weekly({ campaign }: { readonly campaign: Campaign }) {
  const flow = authorityFlow(campaign);
  const rows: readonly FlowRow[] = [
    { label: "Released this week", note: flow.lapsed ? "Nothing is released while appropriations have lapsed." : flow.atCeiling ? "Held at the ceiling, so only what is spent comes back." : "Congress's appropriation, a week at a time.", amount: flow.release, tone: "good" },
    { label: "Drawn by the five accounts", note: "Above their upkeep.", amount: flow.accountsDraw, tone: "bad" },
    { label: "Drawn by standing commitments", note: "Orders and promises already made.", amount: flow.commitmentsDraw, tone: "bad" },
  ];
  const scale = Math.max(1, ...rows.map((row) => Math.abs(row.amount)));
  return (
    <div className="budget-flow">
      <h3 className="budget-section__subtitle">Where the authority goes each week</h3>
      <ul className="budget-flow__rows">
        {rows.map((row) => (
          <li key={row.label} className="budget-flow__row">
            <span className="budget-flow__name">
              <strong>{row.label}</strong>
              <span className="budget-cap">{row.note}</span>
            </span>
            <Bar label={`${row.label}: ${formatMoney(row.amount)}`} value={Math.abs(row.amount) / scale} tone={row.tone} />
            <span className="budget-flow__figure">{formatMoney(row.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="budget-note">{flow.net >= 0 ? `The week leaves ${formatMoney(flow.net)} of its release unused.` : `The week draws ${formatMoney(-flow.net)} more than it releases.`}</p>
      <div className="budget-flow__row">
        <span className="budget-flow__name">
          <strong>Held now</strong>
          <span className="budget-cap">Against the {formatMoney(flow.ceiling)} an administration may hold at once.</span>
        </span>
        <Bar label={`Held ${formatMoney(flow.held)} of the ${formatMoney(flow.ceiling)} ceiling`} value={flow.ceiling > 0 ? flow.held / flow.ceiling : 0} tone={flow.underfunded ? "bad" : "reading"} />
        <span className="budget-flow__figure">{formatMoney(flow.held)}</span>
      </div>
    </div>
  );
}

/** Budget authority where it is spent: the reading and its course, the weekly flow behind it, and the acts that drew on it. */
export function Authority({ campaign }: { readonly campaign: Campaign }) {
  return (
    <div className="budget-proposal">
      <MetricReading campaign={campaign} metric="treasury" titleId="budget-authority">
        <Weekly campaign={campaign} />
      </MetricReading>
      <MetricActs campaign={campaign} metric="treasury" actor="player" titleId="budget-authority-acts" title="What your acts did to it" empty="None of your acts has moved the authority yet. The weekly release and the accounts' draw move it anyway." />
    </div>
  );
}
