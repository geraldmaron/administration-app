import { useMemo, useState } from "react";
import type { Campaign, OfficeId, PipelineReading } from "@admin/engine";
import { appointmentDesk, costLines, deskPicks, deskPlan, place, sealFor, type ActComparison, type DeskPick, type DeskSeat, type SeatGroup } from "@admin/player-core";
import { Tag, Button, ChoiceList, Column, Icon, Meter, Pressable, ReadingFrame, Row, Seal, Surface, Text } from "@admin/ui";
import { PersonName } from "../dossier/PersonPeek";
import { termDoor } from "../handbook/term-door";
import { ActChooser } from "../congress/ActChooser";
import type { ActCommit } from "../congress/commit";
import { Note, RowLink } from "../congress/parts";
import { LAW } from "./model";

const GROUP_TITLES: Readonly<Record<SeatGroup, string>> = { cabinet: "Cabinet", agencies: "Agencies and boards", courts: "Courts" };
const FIT_WORDS = { strong: "Strong fit with you", good: "Good fit with you", fair: "Fair fit with you", poor: "Poor fit with you" } as const;

export type DeskScope = { readonly group?: SeatGroup; readonly office?: OfficeId };

/** The pipeline as its stages in order, each drawn as its share of everything moving. */
function Pipeline({ open, pipeline }: { readonly open: number; readonly pipeline: PipelineReading }) {
  const stages = [
    { key: "open", label: "Empty, no nominee", count: open, tone: "danger" as const },
    { key: "white-house", label: "At the White House", count: pipeline.inExecutive, tone: "warningInk" as const },
    { key: "committee", label: "With a Senate committee", count: pipeline.inCommittee, tone: "warningInk" as const },
    { key: "floor", label: "Waiting for a Senate vote", count: pipeline.onFloor, tone: "warningInk" as const },
    { key: "confirmed", label: "Confirmed", count: pipeline.confirmed, tone: "successInk" as const },
  ];
  const most = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <Column gap="xs">
      <ReadingFrame title="Where the nominations stand" unit="Jobs at each step, each bar against the busiest step" period="Now" legend={[{ id: "empty", kind: "swatch", label: "Empty, no nominee", ink: "danger" }, { id: "moving", kind: "swatch", label: "Moving through the process", ink: "warningInk" }, { id: "confirmed", kind: "swatch", label: "Confirmed", ink: "successInk" }]} help={{ meaning: "Each bar is a step a nomination passes through, from an empty job to a confirmed one. The bar is how many jobs are at that step compared with the busiest step, and the number is the count.", term: termDoor("nomination-to-oath", "from nomination to oath") }}>
        <Row wrap gap="md">
          {stages.map((stage) => <Column key={stage.key} flex={1} minWidth={130}><Meter label={stage.label} value={stage.count / most} figure={String(stage.count)} tone={stage.tone} /></Column>)}
        </Row>
      </ReadingFrame>
      <Note>{pipeline.medianDays > 0 ? `A typical confirmation has taken ${pipeline.medianDays} days. ` : ""}{pipeline.failed > 0 ? `${pipeline.failed} ${pipeline.failed === 1 ? "nominee didn't" : "nominees didn't"} get the job.` : ""}</Note>
    </Column>
  );
}

function SeatRow({ campaign, seat, pick, taken, open, onToggle, onPick }: { readonly campaign: Campaign; readonly seat: DeskSeat; readonly pick: string | undefined; readonly taken: Readonly<Record<string, string>>; readonly open: boolean; readonly onToggle: () => void; readonly onPick: (person: string | undefined) => void }) {
  const picked = seat.candidates.find((candidate) => candidate.personId === pick);
  const acting = seat.acting ? `${seat.acting} is filling in.` : seat.kind === "justice" || seat.kind === "circuit" ? "The court is one judge short." : "No one is filling in.";
  return (
    <Surface level="raised" pad="md" accentEdge={picked ? "accent" : "warning"}>
      <Column gap="sm">
        {/* The whole heading row opens and closes the candidates, so the seat is one press target, not a small button beside its name. */}
        <Pressable role="button" aria-expanded={open} aria-label={`${open ? "Close" : picked ? "Change" : "Choose"} the nominee for ${seat.title}`} onPress={onToggle} flexDirection="row" alignItems="center" gap="sm" flexWrap="wrap" minHeight={44}>
          <Seal spec={sealFor(seat.institution, seat.body)} size={40} />
          <Column flex={1} minWidth={200} gap="2xs">
            <Text variant="label">{seat.title}</Text>
            <Text variant="caption" tone="secondary">{seat.body}. {seat.days > 0 ? `Empty for ${seat.days} ${seat.days === 1 ? "day" : "days"}.` : "Empty since this week."} {acting}</Text>
          </Column>
          <Row gap="2xs">
            <Text variant="label" tone="accent">{open ? "Close" : picked ? "Change" : "Choose"}</Text>
            <Icon name="chevron" size={16} tone="accent" />
          </Row>
        </Pressable>
        {picked ? (
          <RowLink label={`Open ${picked.name}'s file`} href={place.person(picked.personId)}>
            <Row gap="sm" wrap>
              <PersonName campaign={campaign} id={picked.personId} name={picked.name} role={`Your pick for ${seat.title}`} />
              <Tag tone={picked.fit === "poor" ? "warning" : "success"}>{FIT_WORDS[picked.fit]}</Tag>
              <Text variant="caption" tone="secondary" flexGrow={1} flexBasis={220}>Your staff's estimate: {picked.vote.passed ? "would be confirmed" : "would fall short"}, {picked.vote.yeas} to {picked.vote.nays}, with {picked.vote.required} needed</Text>
            </Row>
          </RowLink>
        ) : <Note>{seat.kind === "justice" ? "No nominee picked yet. A Supreme Court seat stays empty until you pick someone." : "Left empty. No one will be sent for this job."}</Note>}
        {open ? (
          <Column gap="sm">
            <ChoiceList label={`Who you could send for ${seat.title} (the ${seat.candidates.length} best fits out of ${seat.eligible} people who qualify)`} value={pick} onChange={onPick} minCardWidth={260}
              options={seat.candidates.map((candidate) => {
                const unavailable = candidate.unavailable ?? (taken[candidate.personId] ? `Your pick for ${taken[candidate.personId]}.` : undefined);
                return { value: candidate.personId, label: `${candidate.name}${candidate.personId === seat.recommended ? " · recommended" : ""}`, detail: [candidate.why, FIT_WORDS[candidate.fit], candidate.crossesAisle ? "Other party" : "", candidate.vetting.length ? "The background check will raise questions" : "", `Senate today: ${candidate.vote.yeas}–${candidate.vote.nays}, ${candidate.vote.required} needed`, candidate.objections.length ? `Objections: ${candidate.objections.join(", ")}` : "", unavailable ?? ""].filter(Boolean).join(". "), icon: "subjectPerson" as const, disabled: unavailable !== undefined };
              })} />
            {picked ? (
              <Row>
                <Button kind="quiet" size="compact" icon="reject" onPress={() => onPick(undefined)}>{`Take ${picked.name} off this seat`}</Button>
              </Row>
            ) : null}
          </Column>
        ) : null}
      </Column>
    </Surface>
  );
}

/** Every open seat in scope, each opening to its candidates, and one review that sends every chosen name together. */
export function AppointmentDesk({ campaign, acts, scope, focus, empty, pipeline = false }: { readonly campaign: Campaign; readonly acts: ActCommit; readonly scope?: DeskScope; readonly focus?: OfficeId; readonly empty: string; readonly pipeline?: boolean }) {
  const group = scope?.group;
  const only = scope?.office;
  const desk = useMemo(() => appointmentDesk(campaign, group || only ? (seat) => (!group || seat.group === group) && (!only || seat.office === only) : undefined), [campaign, group, only]);
  const [overrides, setOverrides] = useState<Readonly<Record<string, string | null>>>({});
  const [open, setOpen] = useState<OfficeId | undefined>(focus ?? (desk.seats.length === 1 ? desk.seats[0]!.office : undefined));
  const picks = useMemo(() => deskPicks(desk, overrides), [desk, overrides]);
  const plan = useMemo(() => deskPlan(campaign, picks), [campaign, picks]);
  const count = plan.lines.length;
  const verb = count === 0 ? "Send nominations" : count === 1 ? "Send the nomination" : `Send ${count} nominations`;
  const takenFor = (office: OfficeId) => Object.fromEntries(picks.filter((entry: DeskPick) => entry.office !== office).map((entry) => [entry.person, desk.seats.find((seat) => seat.office === entry.office)?.title ?? "another seat"]));
  const comparison: ActComparison = {
    rows: [{ key: "names", label: "The nominations" }, { key: "cost", label: "Cost" }, ...(plan.refused.length ? [{ key: "refused", label: "Not sent" }] : []), { key: "follows", label: "What happens next" }],
    waiting: "While a job is empty, the agency delivers less each week, and an empty court seat leaves fewer judges to hear a case. People filling in can keep going where the law allows.",
    columns: [
      { id: "send", label: verb, verb, ...(count === 0 ? { refusal: "No one is named for any job yet." } : {}), review: "Each person's background check starts today. No one takes the job until the Senate votes.", cells: { names: { lines: plan.lines.map((line) => `${line.name} for ${line.title}`) }, cost: { lines: costLines(plan.cost).length ? costLines(plan.cost) : ["Nothing"], stance: "caution" }, refused: { lines: plan.refused.map((row) => `${row.title}: ${row.reason}`) }, follows: { lines: ["The Senate moves at its own pace. Sending more names at once slows down every Senate vote."] } } },
    ],
  };
  return (
    <Column gap="md">
      {pipeline ? <Pipeline open={desk.seats.length} pipeline={desk.pipeline} /> : null}
      {desk.seats.length === 0 ? <Note>{empty}</Note> : null}
      {(["cabinet", "agencies", "courts"] as const).map((key) => {
        const seats = desk.seats.filter((seat) => seat.group === key);
        if (seats.length === 0) return null;
        return (
          <Column key={key} gap="sm">
            <Text variant="label">{GROUP_TITLES[key]} ({seats.length})</Text>
            {seats.map((seat) => <SeatRow key={seat.office} campaign={campaign} seat={seat} pick={picks.find((entry) => entry.office === seat.office)?.person} taken={takenFor(seat.office)} open={open === seat.office} onToggle={() => setOpen((current) => (current === seat.office ? undefined : seat.office))} onPick={(person) => setOverrides((current) => ({ ...current, [seat.office]: person ?? null }))} />)}
          </Column>
        );
      })}
      {desk.seats.length > 0 ? (
        <ActChooser id="appointments" title={`Send nominees for ${desk.seats.length} empty ${desk.seats.length === 1 ? "job" : "jobs"}`} comparison={comparison} acts={acts} authority={LAW.appointments} again="Back to appointments" onAgain={() => setOverrides({})}
          receiptTitle={() => (count === 1 ? `${plan.lines[0]!.name} nominated` : `${count} nominations sent`)}
          packet={() => deskPlan(campaign, picks).packets} />
      ) : null}
    </Column>
  );
}
