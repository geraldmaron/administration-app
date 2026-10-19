import { useMemo } from "react";
import { seatKindOf, type Campaign, type OfficeId } from "@admin/engine";
import { inquiryPipeline, inspectorsBoard, noticesOwed, place, vacancyBoard } from "@admin/player-core";
import { Card, HelpTip, Icon, Tabs, Tag } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { AuthorityHelp } from "../../help/AuthorityHelp";
import { Screen } from "../../shell/Screen";
import type { Valence } from "../../shell/valence";
import { DirectiveComposer } from "./DirectiveComposer";
import { Inquiries } from "./Inquiries";
import { Inspectors } from "./Inspectors";
import { NoticesOwed } from "./NoticesOwed";
import { Officers } from "./Officers";
import { AppointmentDesk } from "../appointments/AppointmentDesk";
import "../../nation/economy/economy.css";
import "../courts/courts.css";
import "./oversight.css";
import "./oversight-workspace.css";

export const OVERSIGHT_VIEWS = ["inquiries", "directives", "inspectors", "appointments"] as const;
export type OversightView = (typeof OVERSIGHT_VIEWS)[number];

type Direction = { readonly tag: string; readonly basis: string };

const OF_YOU: Direction = { tag: "Oversight of the executive", basis: "Congress's committees and the inspectors general look into your government. You can answer what the law makes you owe; you cannot stop an inquiry." };
const BY_YOU: Direction = { tag: "Oversight by the executive", basis: "What you direct your own government to do, and the officers you appoint or remove to do it. Each act is compared before you authorize it." };

function Basis({ direction }: { readonly direction: Direction }) {
  return (
    <p className="oversight__basis">
      <Tag tone="neutral" icon="review">
        {direction.tag}
      </Tag>
      {direction.basis}
    </p>
  );
}

type Props = { readonly campaign: Campaign; readonly view: OversightView; readonly onView: (view: OversightView) => void; readonly seat?: OfficeId };

/** The matters waiting on the President, each opening the view that holds its act. */
type Priority = { readonly view: OversightView; readonly count: number; readonly label: string; readonly detail: string; readonly valence: Valence };

function Priorities({ items, onView }: { readonly items: readonly Priority[]; readonly onView: (view: OversightView) => void }) {
  if (items.length === 0) return <p className="nation-note">No notice or appointment requires action. Independent inquiries may still be in progress.</p>;
  return <section className="oversight__priorities attention-worklist" aria-labelledby="oversight-priorities">
    <h2 id="oversight-priorities"><Icon name="caution" size={16} /> Action required</h2>
    <ul>{items.map((item) => <li key={item.label} className="oversight__priority" data-valence={item.valence}>
      <button type="button" className="oversight__priority-link attention-action" onClick={() => onView(item.view)}>
        <strong className="oversight__priority-count ui-valence-ink" data-valence={item.valence}>{item.count}</strong>
        <span className="oversight__priority-subject"><span><Icon name={item.view === "appointments" ? "appoint" : "review"} size={16} /> {item.label}</span><small>{item.detail}</small></span>
        <span className="oversight__priority-go">Review {item.view === "appointments" ? "appointments" : "inquiries"} →</span>
      </button>
    </li>)}</ul>
  </section>;
}

/**
 * Oversight: what is looking at the government, and what the President directs
 * it to do. The two directions are separate views of one subject, held in the
 * address so Back and reload keep the view.
 */
export function OversightScreen({ campaign, view, onView, seat }: Props) {
  const pipeline = useMemo(() => inquiryPipeline(campaign), [campaign]);
  const owed = useMemo(() => noticesOwed(campaign), [campaign]);
  const inspectors = useMemo(() => inspectorsBoard(campaign), [campaign]);
  // Only the seats the appointments desk can fill: an office the President fills alone has no nomination to send.
  const vacancies = useMemo(() => vacancyBoard(campaign).open.filter((row) => seatKindOf(row.office) !== undefined), [campaign]);
  const openMatters = pipeline.stages.flatMap((stage) => stage.matters);
  const into = openMatters.filter((row) => row.received);
  const directed = openMatters.filter((row) => !row.received);
  const audits = inspectors.filter((row) => row.openMatters > 0 || row.posture !== "in-post").length;
  const obstructed = into.filter((row) => row.obstructed).length;
  const publicInquiries = into.filter((row) => row.public).length;
  const priorities: readonly Priority[] = [
    ...(owed.length > 0 ? [{ view: "inquiries" as const, count: owed.length, label: "Notices owed", detail: "Intelligence committees require notification", valence: "watch" as const }] : []),
    ...(obstructed > 0 ? [{ view: "inquiries" as const, count: obstructed, label: "Inspector interference", detail: "Inquiries note action against their inspector", valence: "bad" as const }] : []),
    ...(publicInquiries > 0 ? [{ view: "inquiries" as const, count: publicInquiries, label: "Public inquiries", detail: "Into your administration", valence: "watch" as const }] : []),
    ...(vacancies.length > 0 ? [{ view: "appointments" as const, count: vacancies.length, label: "Vacant seats", detail: "No nominee before the Senate", valence: "bad" as const }] : []),
  ];
  return (
    <Screen icon="review" title="Oversight" eyebrow="Washington" lede="Who is looking at your government, and the instructions you give it." screenClass="workspace" measure="data" compactAttention camera="keep">
      <div className="nation-room oversight">
        <Card className="oversight-command" aria-label="Accountability operating picture"><div className="oversight-command__head"><Icon name="review" size={32} /><div><span className="oversight-kicker">Executive accountability</span><strong>Know the obligation. Follow the evidence.</strong></div><HelpTip label="Oversight and presidential control">Congress and inspectors general conduct independent oversight. Directives, appointments and removal notices use separate legal and simulation rules. Every consequential act is reviewed before authorization.</HelpTip></div><div className="oversight-command__signals">{[{ label: "Inquiries into the executive", count: into.length, icon: "review" as const, view: "inquiries" as const }, { label: "Your directed reviews", count: directed.length, icon: "order" as const, view: "directives" as const }, { label: "Inspectors with activity", count: audits, icon: "departmentInvestigation" as const, view: "inspectors" as const }, { label: "Vacant confirmed seats", count: vacancies.length, icon: "appoint" as const, view: "appointments" as const }].map((signal) => <button key={signal.view} type="button" onClick={() => onView(signal.view)} aria-pressed={view === signal.view}><Icon name={signal.icon} size={20} /><strong>{signal.count}</strong><span>{signal.label}</span></button>)}</div></Card>
        <AuthorityHelp topic={view === "directives" ? "executive-direction" : view === "appointments" ? "appointments" : view === "inquiries" && owed.length > 0 ? "intelligence-findings" : "inspectors-general"} compact />
        <Priorities items={priorities} onView={onView} />
        <Tabs
          label="Views of oversight"
          selected={view}
          onSelect={(id) => onView(OVERSIGHT_VIEWS.find((entry) => entry === id) ?? "inquiries")}
          tabs={[
            { id: "inquiries", label: "Inquiries", count: into.length + owed.length },
            { id: "directives", label: "Directives", count: directed.length },
            { id: "inspectors", label: "Inspectors", count: audits },
            { id: "appointments", label: "Appointments", count: vacancies.length },
          ]}
        >
          {view === "inquiries" ? (
            <>
              <Basis direction={OF_YOU} />
              <NoticesOwed campaign={campaign} />
              <Inquiries pipeline={pipeline} direction="received" />
            </>
          ) : null}
          {view === "directives" ? (
            <>
              <Basis direction={BY_YOU} />
              <section className="nation-section" aria-labelledby="oversight-directive">
                <h2 id="oversight-directive" className="nation-section__title">
                  <Icon name="order" size={20} /> Issue a directive
                </h2>
                <p className="nation-note">Select a body, instruction and predefined subject. The preview shows its actual modeled response before you authorize.</p><DirectiveComposer campaign={campaign} />
              </section>
              <Inquiries pipeline={pipeline} direction="directed" />
            </>
          ) : null}
          {view === "inspectors" ? (
            <>
              <Basis direction={BY_YOU} />
              <Inspectors campaign={campaign} />
            </>
          ) : null}
          {view === "appointments" ? (
            <>
              <Basis direction={BY_YOU} />
              <section className="nation-section" aria-labelledby="oversight-appointments">
                <h2 id="oversight-appointments" className="nation-section__title">
                  <Icon name="appoint" size={20} /> Appointments
                </h2>
                {seat ? (
                  <p className="nation-note">
                    Showing one seat. <Door href={place.appointments()}>See every open seat</Door>
                  </p>
                ) : null}
                <AppointmentDesk
                  key={seat ?? "all"}
                  campaign={campaign}
                  headingId="oversight-appointments"
                  pipeline={!seat}
                  {...(seat ? { scope: { office: seat }, focus: seat } : {})}
                  empty={seat ? "That seat is filled or already has a name before the Senate." : "Every seat the Senate confirms is filled or has a name before it. A seat opens when its officer leaves."}
                />
              </section>
              <Officers campaign={campaign} />
            </>
          ) : null}
        </Tabs>
      </div>
    </Screen>
  );
}
