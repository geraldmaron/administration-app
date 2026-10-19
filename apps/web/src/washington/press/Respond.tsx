import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { podiumReading, pressCoverageTrend, pressHistory } from "@admin/player-core";
import { Choice, Collection, Portrait, Series, Tag } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { useHillCommit } from "../congress/HillAct";
import { Framing, PressPlays, TakeTheHit } from "./PressActs";
import "../congress/congress.css";

type Issue = "week" | "order" | "hit";

function Podium({ campaign }: { readonly campaign: Campaign }) {
  const podium = podiumReading(campaign);
  const face = podium.secretary ? faceOf(campaign, podium.secretary.id, podium.secretary.name) : undefined;
  return (
    <div className="pr-podium">
      <Portrait name={podium.secretary?.name ?? "No press secretary"} {...(face?.src ? { src: face.src } : {})} monogram={face?.monogram ?? "?"} size="lg" decorative />
      <div>
        <p className="pr-podium__who">{podium.secretary ? `${podium.secretary.name}, Press Secretary` : "No press secretary is seated"}</p>
        <p className="pr-note">{podium.subject}</p>
        <p className="pr-note">{podium.silence}</p>
      </div>
    </div>
  );
}

/** Every time the administration went in front of the press, with which way those outings have been running. */
function Outings({ campaign }: { readonly campaign: Campaign }) {
  const trend = pressCoverageTrend(campaign);
  const history = pressHistory(campaign);
  const span = trend ? Math.max(1, ...trend.values.map((value) => Math.abs(value))) : 1;
  return (
    <div className="pr-outings">
      <h3 className="pr-subheading">Your outings</h3>
      {trend ? <Series label="Outings that went well, less those that did not" values={trend.values} domain={[-span, span]} format={(value) => (value > 0 ? `+${value}` : String(value))} reference={{ value: 0, label: "Even" }} /> : null}
      <p className="pr-note">{trend ? trend.summary : "Two outings make a trend. Until then there is only the record."}</p>
      <Collection
        items={history}
        initial={5}
        noun="outings"
        className="pr-list"
        empty="Nobody from this White House has gone in front of the press yet."
        render={(row) => (
          <li key={row.id} data-went={row.wentWell ? "well" : "badly"}>
            <Tag tone={row.wentWell ? "good" : "risk"} icon={row.wentWell ? "favorable" : "adverse"}>
              {row.wentWell ? "Went well" : "Went badly"}
            </Tag>
            <div>
              <p className="pr-list__title">
                {row.play}
                {row.desk ? ` with ${row.desk}` : ""} <span className="pr-note">{row.when}</span>
              </p>
              <p className="pr-note">{row.summary}</p>
            </div>
          </li>
        )}
      />
    </div>
  );
}

/**
 * The one place the President acts on the press. The issue picked decides
 * which options are compared against saying nothing, and only that comparison
 * is on the page to authorize, through the same presidential review as every
 * other act.
 */
export function Respond({ campaign }: { readonly campaign: Campaign }) {
  const acts = useHillCommit(campaign);
  const [issue, setIssue] = useState<Issue>("week");
  return (
    <section id="press-respond" aria-labelledby="press-respond-title" tabIndex={-1} className="pr-panel">
      <div className="pr-panel__head">
        <h2 id="press-respond-title" className="pr-heading">
          Respond to the press
        </h2>
      </div>
      <Podium campaign={campaign} />
      <Choice
        legend="What is the response about?"
        value={issue}
        onChange={setIssue}
        options={[
          { value: "week", label: "Go in front of the press" },
          { value: "order", label: "Explain a recent order" },
          { value: "hit", label: "Take a bad answer" },
        ]}
      />
      {issue === "week" ? <PressPlays campaign={campaign} acts={acts} /> : null}
      {issue === "order" ? <Framing campaign={campaign} acts={acts} /> : null}
      {issue === "hit" ? <TakeTheHit campaign={campaign} acts={acts} /> : null}
      <Outings campaign={campaign} />
    </section>
  );
}
