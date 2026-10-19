import { useEffect, useMemo, useRef, useState } from "react";
import { legislativeAct, type Campaign } from "@admin/engine";
import { transmitComparison, transmitPacket, type ActColumn } from "@admin/player-core";
import { NativeSelect, Button, Collection, Field, Icon, type IconName } from "@admin/ui-web";
import { valenceOf } from "../../shell/valence";
import { HillAct, type HillCommit } from "./HillAct";
import "./agenda.css";

const TOPIC_ICONS: Readonly<Record<string, IconName>> = {
  Healthcare: "departmentHealthHumanServices", "Civil rights": "departmentJustice",
  "Voting rights": "subjectChamber", Justice: "law", Housing: "departmentHousingUrban",
  Education: "departmentEducation", "Labor and families": "departmentLabor",
  "Business and jobs": "departmentCommerce", Energy: "departmentEnergy", Privacy: "departmentInvestigation",
  "Government ethics": "law", "Emergency response": "departmentHomelandSecurity",
  Veterans: "departmentVeteransAffairs", Immigration: "departmentState",
};
const topicOf = (column: ActColumn) => legislativeAct(column.id)?.topic ?? "National priorities";

/** Browse an agenda, then compare one proposal with leaving current law alone. */
export function Transmit({ campaign, acts }: { readonly campaign: Campaign; readonly acts: HillCommit }) {
  const comparison = useMemo(() => transmitComparison(campaign), [campaign]);
  const proposals = comparison.columns;
  const [topic, setTopic] = useState("all");
  const [picked, setPicked] = useState<ActColumn>();
  const heading = useRef<HTMLHeadingElement>(null);
  const browse = useRef<HTMLHeadingElement>(null);
  const topics = [...new Set(proposals.map(topicOf))].sort();
  const currentTopic = topics.includes(topic) ? topic : "all";
  const filtered = proposals.filter((column) => currentTopic === "all" || topicOf(column) === currentTopic);
  const selected = proposals.find((column) => column.id === picked?.id) ?? (picked ? { ...picked, refusal: "This proposal is no longer on the current agenda." } : undefined);
  useEffect(() => { if (picked) heading.current?.focus(); }, [picked]);
  return (
    <section className="hill-section" aria-labelledby="congress-transmit">
      <h2 ref={browse} tabIndex={-1} id="congress-transmit" className="hill-section__title"><Icon name="dispatch" size={20} /> Legislative agenda</h2>
      <p className="hill-note">Choose a proposal to review its funding, trade-offs and prospects. Sending it to Congress starts committee work. It does not make it law.</p>
      {selected ? <div className="agenda-review">
        <Button disabled={acts.busy} onClick={() => { setPicked(undefined); acts.dismiss(); browse.current?.focus(); }}>Back to the agenda</Button>
        <h3 ref={heading} tabIndex={-1} className="agenda-review__title">{selected.label}</h3>
        <HillAct tier="full" key={selected.id} id="transmit" title="Review this proposal" comparison={{ rows: comparison.rows, columns: [selected] }} acts={acts} packet={(id) => transmitPacket(campaign, id)} projectAs={{ campaign, act: (id) => ({ act: "transmit", id }) }} again="Back to the agenda" onAgain={() => { setPicked(undefined); browse.current?.focus(); }} />
      </div> : <>
        {proposals.length ? <div className="agenda-toolbar">
          <Field label="Policy area">{(control) => <NativeSelect {...control} className="ui-input" value={currentTopic} onChange={(event) => { setTopic(event.target.value); }}>
            <option value="all">All policy areas</option>
            {topics.map((entry) => <option key={entry}>{entry}</option>)}
          </NativeSelect>}</Field>
          <p className="hill-note" aria-live="polite">{filtered.length} {filtered.length === 1 ? "proposal" : "proposals"} for consideration</p>
        </div> : <p className="hill-note">No new proposals are ready for this administration. Follow measures already in Congress under Floor business. The agenda changes as the presidency develops.</p>}
        <Collection
          items={filtered}
          initial={4}
          noun="proposals"
          className="agenda-list"
          render={(column) => <li key={column.id}>
            <Button kind="secondary" className="agenda-proposal" onClick={() => setPicked(column)}>
              <span className="agenda-proposal__symbol"><Icon name={TOPIC_ICONS[topicOf(column)] ?? "subjectCapitol"} size={24} /></span>
              <span className="agenda-proposal__body">
                <span className="agenda-proposal__topic">{topicOf(column)}</span>
                <span className="agenda-proposal__title">{column.label}</span>
                <span className="agenda-proposal__summary">{column.cells.does?.lines.join(" ")}</span>
                <span className="agenda-proposal__votes ui-valence-ink" data-valence={column.cells.count?.stance ? valenceOf(column.cells.count.stance) : "neutral"}><Icon name="subjectChamber" size={16} /> Staff projection: {column.cells.count?.lines.join(" · ")}</span>
                <span className="agenda-proposal__action">{column.refusal ? "Calendar occupied · review proposal" : "Review proposal"}<Icon name="chevron" size={16} /></span>
              </span>
            </Button>
          </li>}
        />
      </>}
    </section>
  );
}
