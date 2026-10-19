import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Campaign, OfficeId, PipelineReading } from "@admin/engine";
import { appointmentDesk, costLines, deskPicks, deskPlan, type DeskPick, type DeskPlan, type DeskSeat, type SeatGroup } from "@admin/player-core";
import { CompareAuthorize, type CompareRow } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type NationCommit } from "../../nation/economy/commit";
import { CostCell, NoneCell } from "../courts/cells";
import { SeatRow } from "./SeatRow";
import "./appointments.css";

// The appointments desk: every open seat the Senate confirms, each a row that
// opens to the people the President could send for it, and one review that
// sends every chosen name together. The office page, the Courts screen and the
// Brief's vacancy doors open this same desk narrowed to their seats.

const SEND = "send";

const GROUP_TITLES: Readonly<Record<SeatGroup, string>> = { cabinet: "Cabinet", agencies: "Agencies and boards", courts: "Courts" };

/** Which seats a desk shows: all of them, one group, or one office. */
export type DeskScope = { readonly group?: SeatGroup; readonly office?: OfficeId };

/** The appointments pipeline as its stages in order, each drawn with its share of everything moving. */
function Pipeline({ open, pipeline }: { readonly open: number; readonly pipeline: PipelineReading }) {
  const stages = [
    { key: "open", label: "Empty, nobody sent", count: open },
    { key: "white-house", label: "At the White House", count: pipeline.inExecutive },
    { key: "committee", label: "Before a committee", count: pipeline.inCommittee },
    { key: "floor", label: "Waiting on the floor", count: pipeline.onFloor },
    { key: "confirmed", label: "Confirmed", count: pipeline.confirmed },
  ];
  const most = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <div className="stage-strip">
      <ol aria-label="The appointments pipeline">
        {stages.map((stage) => (
          <li key={stage.key} data-stage={stage.key} {...(stage.count > 0 ? { "data-valence": stage.key === "open" ? "bad" : stage.key === "confirmed" ? "good" : "watch" } : {})}>
            <span className="stage-strip__label">{stage.label}</span>
            <strong className="stage-strip__count">{stage.count}</strong>
            <span className="stage-strip__bar" aria-hidden="true">
              <span style={{ inlineSize: `${(stage.count / most) * 100}%` }} />
            </span>
          </li>
        ))}
      </ol>
      <p className="nation-note">
        {pipeline.medianDays > 0 ? `A confirmation has taken ${pipeline.medianDays} days at the median. ` : ""}
        {pipeline.failed > 0 ? `${pipeline.failed} ended without a seat.` : ""}
      </p>
    </div>
  );
}

/** For each picked person, the seat title they are picked for, so another seat can say so. */
function takenFor(seats: readonly DeskSeat[], picks: readonly DeskPick[], office: OfficeId): Readonly<Record<string, string>> {
  return Object.fromEntries(picks.filter((pick) => pick.office !== office).map((pick) => [pick.person, seats.find((seat) => seat.office === pick.office)?.title ?? "another seat"]));
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

function PlanList({ plan }: { readonly plan: DeskPlan }) {
  if (plan.lines.length === 0) return <NoneCell>Nobody is picked yet</NoneCell>;
  return (
    <ul className="appt-plan">
      {plan.lines.map((line) => (
        <li key={line.office}>
          <strong>{line.name}</strong> for {line.title}
        </li>
      ))}
    </ul>
  );
}

function planRows(plan: DeskPlan): readonly CompareRow[] {
  return [
    { label: "The nominations", kind: "lead", cells: { [SEND]: <PlanList plan={plan} /> } },
    { label: "Cost now", icon: "budget", cells: { [SEND]: <CostCell cost={plan.cost} /> } },
    ...(plan.refused.length > 0
      ? [{ label: "Not sent", icon: "caution" as const, cells: { [SEND]: <ul className="appt-plan">{plan.refused.map((row) => <li key={row.office}>{row.title}: {row.reason}</li>)}</ul> } }]
      : []),
    {
      label: "What follows",
      icon: "pending",
      cells: {
        [SEND]: "Each name goes into vetting today. Committees and the floor move on the Senate's own clock, and more names at once slow every floor stage.",
      },
    },
  ];
}

type Groups = {
  readonly campaign: Campaign;
  readonly seats: readonly DeskSeat[];
  readonly picks: readonly DeskPick[];
  readonly headingId: string;
  readonly open: OfficeId | undefined;
  readonly onOpen: (office: OfficeId) => void;
  readonly onPick: (office: OfficeId, person: string | undefined) => void;
};

/** The open seats under their group headings, cabinet first. */
function SeatGroups({ campaign, seats, picks, headingId, open, onOpen, onPick }: Groups) {
  return (
    <>
      {(["cabinet", "agencies", "courts"] as const).map((key) => {
        const group = seats.filter((seat) => seat.group === key);
        if (group.length === 0) return null;
        return (
          <section key={key} className="appt-group" aria-labelledby={`${headingId}-${key}`}>
            <h3 id={`${headingId}-${key}`} className="nation-subtitle">
              {GROUP_TITLES[key]} ({group.length})
            </h3>
            <ul className="appt-seats">
              {group.map((seat) => (
                <SeatRow
                  key={seat.office}
                  campaign={campaign}
                  seat={seat}
                  pick={picks.find((pick) => pick.office === seat.office)?.person}
                  takenBy={takenFor(seats, picks, seat.office)}
                  open={open === seat.office}
                  onToggle={() => onOpen(seat.office)}
                  onPick={(person) => onPick(seat.office, person)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

type Review = { readonly campaign: Campaign; readonly seats: number; readonly picks: readonly DeskPick[]; readonly plan: DeskPlan; readonly acts: NationCommit };

/** The one verb: every chosen name, what an empty seat costs said beside it, then the President's review. */
function SendReview({ campaign, seats, picks, plan, acts }: Review) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const count = plan.lines.length;
  const verb = count === 0 ? "Send nominations" : count === 1 ? "Send the nomination" : `Send ${count} nominations`;
  const projection = useChoiceProjection(
    count > 0 ? campaign : undefined,
    actsChoice("Nominations", "leaving the seats open", "Leaving the seats open.", [
      { id: SEND, label: verb, act: { act: "nominate", picks } },
    ]),
    selected,
  );
  const lines = plan.lines.map((line) => ({ label: line.title, value: line.name }));
  const commit = () =>
    void acts.commit({
      review: { tier: "full", title: count === 1 ? `Nominate ${plan.lines[0]!.name}` : `Send ${count} nominations`, verb: "Confirm and nominate", lines },
      title: count === 1 ? `${plan.lines[0]!.name} nominated` : `${count} nominations sent`,
      lines: [...lines, { label: "Where it stands", value: "In vetting, then the committee and the floor" }, { label: "Charged", value: costLines(plan.cost).join(", ") || "Nothing" }],
      packet: () => deskPlan(campaign, picks).packets,
    });
  return (
    <CompareAuthorize
      title={`Send the nominations for ${seats} open ${plural(seats, "seat", "seats")}`}
      options={[
        { id: SEND, icon: "appoint", label: verb, ...(count === 0 ? { unavailable: "Pick a nominee for at least one seat." } : {}) },
      ]}
      rows={planRows(plan)}
      selected={selected}
      onSelect={setSelected}
      verb={verb}
      onAuthorize={commit}
      review="Each name goes into vetting today. Nobody is seated until the Senate votes."
      baselineReview="While a seat stays open, actings keep running where the law allows. An empty agency delivers less each week, and an empty court seat leaves fewer judges to hear a case."
      busy={acts.busy}
      docked
      {...(projection ? { projection } : {})}
    />
  );
}

export type AppointmentDeskProps = {
  readonly campaign: Campaign;
  readonly scope?: DeskScope;
  /** A seat to open on arrival, from a door that named it. */
  readonly focus?: OfficeId;
  /** What the desk says when the scope holds no open seat. */
  readonly empty: ReactNode;
  readonly headingId: string;
  readonly pipeline?: boolean;
};

/** Every open seat in scope, each opening to its candidates, and one review that sends the chosen names. */
export function AppointmentDesk({ campaign, scope, focus, empty, headingId, pipeline = false }: AppointmentDeskProps) {
  const group = scope?.group;
  const only = scope?.office;
  const desk = useMemo(() => appointmentDesk(campaign, group || only ? (seat) => (!group || seat.group === group) && (!only || seat.office === only) : undefined), [campaign, group, only]);
  const [overrides, setOverrides] = useState<Readonly<Record<string, string | null>>>({});
  const [open, setOpen] = useState<OfficeId | undefined>(focus ?? (desk.seats.length === 1 ? desk.seats[0]!.office : undefined));
  const acts = useNationCommit(campaign);
  const picks = useMemo(() => deskPicks(desk, overrides), [desk, overrides]);
  const plan = useMemo(() => deskPlan(campaign, picks), [campaign, picks]);
  useEffect(() => {
    if (focus) document.getElementById(`seat-${focus}`)?.scrollIntoView({ block: "start" });
  }, [focus]);
  if (acts.committed) {
    return <ActReceipt committed={acts.committed} again="Back to appointments" onAgain={() => { setOverrides({}); acts.dismiss(); }} mapNote={null} />;
  }
  return (
    <div className="appt-desk">
      {pipeline ? <Pipeline open={desk.seats.length} pipeline={desk.pipeline} /> : null}
      {acts.problem ? <p className="nation-problem" role="alert">{acts.problem}</p> : null}
      {desk.seats.length === 0 ? <p className="nation-note">{empty}</p> : null}
      <SeatGroups
        campaign={campaign}
        seats={desk.seats}
        picks={picks}
        headingId={headingId}
        open={open}
        onOpen={(office) => setOpen((current) => (current === office ? undefined : office))}
        onPick={(office, person) => setOverrides((current) => ({ ...current, [office]: person ?? null }))}
      />
      {desk.seats.length > 0 ? <SendReview campaign={campaign} seats={desk.seats.length} picks={picks} plan={plan} acts={acts} /> : null}
    </div>
  );
}
