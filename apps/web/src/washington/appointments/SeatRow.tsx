import { useId } from "react";
import type { Campaign } from "@admin/engine";
import { place, type DeskCandidate, type DeskSeat } from "@admin/player-core";
import { ChoiceList, Icon, Portrait, type ChoiceItem, type MovementValence } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { Door } from "../../shell/Door";
import { BandMeter } from "../executive/BandMeter";
import { CostCell, LinesCell } from "../courts/cells";
import { SenateProjection } from "./SenateProjection";

// One open seat, the same row wherever a vacancy is noticed: the appointments
// desk, an office's own page, the Courts screen. Closed, it reads the seat and
// the name it would send; picked, it opens in place to the people the
// President could send, each with the reasons they were ranked on, against
// leaving the seat open.

export const LEAVE_OPEN = "leave-open";

const FIT_WORDS = { strong: "Strong fit with you", good: "Good fit with you", fair: "Fair fit with you", poor: "Poor fit with you" } as const;
const FIT_VALENCE: Readonly<Record<DeskCandidate["fit"], MovementValence>> = { strong: "good", good: "good", fair: "neutral", poor: "watch" };

function Face({ campaign, candidate, size = "sm" }: { readonly campaign: Campaign; readonly candidate: DeskCandidate; readonly size?: "sm" | "md" }) {
  const face = faceOf(campaign, candidate.personId, candidate.name);
  return <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size={size} decorative />;
}

function openFor(seat: DeskSeat): string {
  const days = seat.days > 0 ? `Open ${seat.days} ${seat.days === 1 ? "day" : "days"}.` : "Open since this week.";
  const acting = seat.acting ? `${seat.acting} is acting.` : seat.kind === "justice" || seat.kind === "circuit" ? "The bench sits one judge short." : "Nobody is acting.";
  return `${seat.body}. ${days} ${acting}`;
}

/** The name a closed row would send, or why it sends none. */
function Pick({ campaign, seat, candidate }: { readonly campaign: Campaign; readonly seat: DeskSeat; readonly candidate: DeskCandidate | undefined }) {
  if (!candidate) {
    const none = seat.kind === "justice" ? "No nominee picked. A Supreme Court seat is never filled by default." : "Left open. No name goes up for this seat.";
    return <p className="appt-seat__none">{none}</p>;
  }
  return (
    <div className="appt-seat__pick">
      <a className="appt-seat__face" href={place.person(candidate.personId)} aria-label={`Open ${candidate.name}'s file`}>
        <Face campaign={campaign} candidate={candidate} />
      </a>
      <span className="appt-seat__who">
        <strong>{candidate.name}</strong>
        <span className="appt-seat__why">{candidate.why}</span>
      </span>
      <span className="ui-valence-chip" data-valence={FIT_VALENCE[candidate.fit]}>
        {FIT_WORDS[candidate.fit]}
      </span>
      <SenateProjection vote={candidate.vote} />
    </div>
  );
}

function detailOf(seat: DeskSeat, candidate: DeskCandidate): ChoiceItem["detail"] {
  return [
    { label: "Why this name", icon: "appoint", value: <ul className="appt-reasons">{candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> },
    { label: "Readings", icon: "graph", value: <div className="appt-readings">{candidate.readings.map((reading) => <BandMeter key={reading.attribute} judgment={reading} />)}</div> },
    { label: "The Senate", icon: "subjectChamber", value: <SenateProjection vote={candidate.vote} note /> },
    { label: "Who objects", icon: "caution", value: <LinesCell lines={candidate.objections} none="Nobody is expected to vote no." /> },
    { label: "Goes to", icon: "pending", value: `${seat.committee ?? "The Senate"}, then the floor. ${candidate.vetting.length > 0 ? "Vetting will be slower for what it raises." : "Vetting should raise nothing."}` },
    { label: "File", icon: "dossier", value: <Door href={place.person(candidate.personId)}>Open {candidate.name}&rsquo;s file</Door> },
  ];
}

function itemsFor(campaign: Campaign, seat: DeskSeat, takenBy: Readonly<Record<string, string>>): readonly ChoiceItem[] {
  const priced = seat.candidates.some((candidate) => Object.keys(candidate.cost).length > 0);
  const baseline: ChoiceItem = {
    id: LEAVE_OPEN,
    label: "Leave it open",
    baseline: true,
    lead: seat.acting ? `${seat.acting} keeps acting, without the office's mandate.` : "The seat stays empty until you send a name.",
    ...(priced ? { cost: <CostCell cost={{}} /> } : {}),
  };
  return [
    baseline,
    ...seat.candidates.map((candidate): ChoiceItem => {
      const taken = takenBy[candidate.personId];
      const unavailable = candidate.unavailable ?? (taken ? `Your pick for ${taken}.` : undefined);
      return {
        id: candidate.personId,
        label: candidate.name,
        mark: <Face campaign={campaign} candidate={candidate} />,
        ...(candidate.personId === seat.recommended ? { recommended: true } : {}),
        lead: candidate.why,
        odds: <SenateProjection vote={candidate.vote} />,
        oddsLabel: "Senate today",
        verdict: [
          { text: FIT_WORDS[candidate.fit], valence: FIT_VALENCE[candidate.fit] },
          ...(candidate.crossesAisle ? [{ text: "Other party", valence: "watch" as const }] : []),
          ...(candidate.vetting.length > 0 ? [{ text: "Vetting will raise questions", valence: "bad" as const, icon: "caution" as const }] : []),
        ],
        ...(priced ? { cost: <CostCell cost={candidate.cost} /> } : {}),
        ...(unavailable ? { unavailable } : {}),
        detail: detailOf(seat, candidate),
      };
    }),
  ];
}

export type SeatRowProps = {
  readonly campaign: Campaign;
  readonly seat: DeskSeat;
  /** The person this seat would send, or none to leave it open. */
  readonly pick: string | undefined;
  /** People picked for another seat on the same desk, with that seat's title. */
  readonly takenBy: Readonly<Record<string, string>>;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onPick: (person: string | undefined) => void;
};

/** One open seat: closed, the name it would send; opened in place, every name it could send against leaving it open. */
export function SeatRow({ campaign, seat, pick, takenBy, open, onToggle, onPick }: SeatRowProps) {
  const id = useId();
  const picked = seat.candidates.find((candidate) => candidate.personId === pick);
  return (
    <li className="appt-seat" id={`seat-${seat.office}`} data-open={open ? "true" : undefined} data-picked={picked ? "true" : undefined}>
      <div className="appt-seat__summary ui-row-target">
        <h4 className="appt-seat__title">
          <button type="button" className="ui-row-link appt-seat__toggle" aria-expanded={open} {...(open ? { "aria-controls": `${id}-candidates` } : {})} onClick={onToggle}>
            <Icon name="chevron" size={16} className="appt-seat__chevron" />
            {seat.title}
          </button>
        </h4>
        <p className="appt-seat__meta">{openFor(seat)}</p>
        <Pick campaign={campaign} seat={seat} candidate={picked} />
      </div>
      {open ? (
        <div className="appt-seat__candidates" id={`${id}-candidates`}>
          <h5 id={`${id}-title`} className="appt-seat__list-title">
            Who could be sent for {seat.title}
          </h5>
          <p className="appt-seat__count">
            The {seat.candidates.length} best fits for the seat, of {seat.eligible} people its rules allow.
          </p>
          <ChoiceList labeledBy={`${id}-title`} name={`${id}-pick`} items={itemsFor(campaign, seat, takenBy)} selected={pick ?? LEAVE_OPEN} onSelect={(next) => onPick(next === LEAVE_OPEN ? undefined : next)} />
        </div>
      ) : null}
    </li>
  );
}
