import type { CSSProperties } from "react";
import { formatRatio, LOST_LABELS, type ExecutiveOverview } from "@admin/player-core";
import { Bar, Icon } from "@admin/ui-web";

type Part = { readonly key: string; readonly count: number; readonly label: string };
function Distribution({ parts, label }: { readonly parts: readonly Part[]; readonly label: string }) {
  return <div className="command-distribution"><span className="command-distribution__track" role="img" aria-label={`${label}: ${parts.map((p) => `${p.count} ${p.label}`).join(", ")}`}>
    {parts.filter((p) => p.count > 0).map((p) => <span key={p.key} data-part={p.key} style={{ flexGrow: p.count } as CSSProperties} />)}
  </span><ul>{parts.map((p) => <li key={p.key} data-part={p.key}><i aria-hidden="true" /><strong>{p.count}</strong>{p.label}</li>)}</ul></div>;
}

export function ExecutivePulse({ overview }: { readonly overview: ExecutiveOverview }) {
  const { delivery, chairs, serviceTally } = overview;
  const assessed = serviceTally.good + serviceTally.watch + serviceTally.bad;
  return <section className="command-pulse" aria-label="Executive operating picture">
    <div className="command-pulse__delivery"><span className="command-eyebrow">Executive delivery</span><div className="command-measure"><strong>{formatRatio(delivery.quality)}</strong><span>of requested work</span></div><Bar value={delivery.quality} label={`Executive delivery ${formatRatio(delivery.quality)} on a zero to one hundred percent scale`} tone={delivery.quality >= .6 ? "good" : delivery.quality >= .4 ? "watch" : "bad"} />
      <ul className="command-losses">{delivery.lost.map((part) => <li key={part.key}><Icon name="adverse" size={12} /><strong>−{(part.value * 100).toFixed(1)}</strong> pts · {LOST_LABELS[part.key]}</li>)}</ul>
    </div>
    <div><span className="command-eyebrow">Staffing · {chairs.total} chairs</span><div className="command-measure"><strong>{chairs.confirmed}</strong><span>confirmed · {overview.nominations.length} nominees in review</span></div><Distribution label="Staffing" parts={[{ key: "good", count: chairs.confirmed, label: "confirmed" }, { key: "watch", count: chairs.acting, label: "acting" }, { key: "bad", count: chairs.vacant, label: "vacant" }]} /></div>
    <div><span className="command-eyebrow">Service coverage</span><div className="command-measure"><strong>{assessed}<small>/{serviceTally.total}</small></strong><span>services assessed</span></div><Distribution label="Public services" parts={[{ key: "good", count: serviceTally.good, label: "keeping up" }, { key: "watch", count: serviceTally.watch, label: "behind / delayed" }, { key: "bad", count: serviceTally.bad, label: "critical" }, { key: "neutral", count: serviceTally.neutral, label: "untracked" }]} /></div>
  </section>;
}
