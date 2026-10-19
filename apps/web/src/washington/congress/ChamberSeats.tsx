import type { MouseEvent } from "react";
import type { CongressChamber, CongressSeat, RecordedRoll } from "@admin/player-core";
import { HelpTip, PartyMark, hemicycleSeats } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { useNavigate } from "@tanstack/react-router";
import { rememberDeparture } from "../../shell/return-context";

export type SeatMode = "party" | "vote";

/** The source selection survives opening the member’s file and returning. */
export type CongressSelection = { readonly state?: string; readonly seat?: string };

type SeatProps = {
  readonly chamber: CongressChamber;
  readonly mode: SeatMode;
  readonly selection: CongressSelection;
  readonly onSelect: (selection: CongressSelection) => Promise<void> | void;
};

/** A member's recorded vote on the chamber's newest roll call, or none. */
export function voteOf(roll: RecordedRoll | undefined, seat: string): "yea" | "nay" | "none" {
  const vote = roll?.votes.get(seat);
  return vote === undefined ? "none" : vote ? "yea" : "nay";
}

const VOTE_WORD = { yea: "voted yea", nay: "voted nay", none: "no recorded vote" } as const;

export function seatTitle(member: CongressSeat, roll?: RecordedRoll): string {
  const post = member.post ? `, ${member.post}` : "";
  const vote = roll ? `; ${VOTE_WORD[voteOf(roll, member.seat)]} on ${roll.title}` : "";
  return `${member.name}${post}. ${member.stateName}, ${member.seat}${member.vacant ? ", seat awaits replacement" : ""}${vote}.`;
}

/**
 * The chamber as its members sit: each mark a recorded member in seating order,
 * hued by party, and each opens that member's file. In vote mode the newest
 * roll call fills a yea, rings a nay and leaves a seat with no recorded vote
 * faint; the party hue stays, so a member who crossed the aisle stands out.
 * The marks are left out of the tab order; the state picker and the member
 * lists reach the same files by keyboard.
 */
export function MemberRing({ chamber, mode, selection, onSelect }: SeatProps) {
  const total = chamber.members.length + chamber.unrecorded;
  const places = hemicycleSeats(total);
  const radius = Math.max(0.6, Math.min(2.2, 46 / Math.sqrt(total * 3.2)));
  const roll = mode === "vote" ? chamber.lastRoll : undefined;
  const summary = chamber.parties.map((party) => `${party.label} ${party.seats}`).join(", ");
  const navigate = useNavigate();
  const open = async (event: MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest("a[href]");
    const seat = anchor?.getAttribute("data-member-seat");
    const member = chamber.members.find((candidate) => candidate.seat === seat);
    if (!member?.href) return;
    event.preventDefault();
    await onSelect({ state: member.state, seat: member.seat });
    if (anchor instanceof SVGElement) rememberDeparture(anchor);
    await navigate({ href: member.href });
  };
  return (
    <svg className="hill-ring" viewBox="0 0 100 54" role="group" aria-label={`${chamber.name}: ${summary} of ${chamber.seats}.`} onClick={open}>
      {places.map((place, i) => {
        const member = chamber.members[i];
        if (!member) return <circle key={`open-${i}`} className="hill-ring__seat" data-open="true" cx={place.x.toFixed(2)} cy={place.y.toFixed(2)} r={radius * 0.8} />;
        const dimmed = selection.state !== undefined && member.state !== selection.state;
        const mark = (
          <circle className="hill-ring__seat" data-seat={member.seat} data-party={member.party} data-vote={roll ? voteOf(roll, member.seat) : undefined}
            data-selected={selection.seat === member.seat ? "true" : undefined} data-vacant={member.vacant ? "true" : undefined} data-leader={member.post ? "true" : undefined} data-dimmed={dimmed ? "true" : undefined}
            cx={place.x.toFixed(2)} cy={place.y.toFixed(2)} r={radius}>
            <title>{seatTitle(member, roll)}</title>
          </circle>
        );
        return member.href ? <a key={member.seat} href={member.href} data-member-seat={member.seat} tabIndex={-1}>{mark}</a> : <g key={member.seat}>{mark}</g>;
      })}
    </svg>
  );
}

/**
 * The caucus nearest the President against every line the chamber counts by:
 * its seats fill from the left, the opposing caucus from the right, and each
 * line is a tick at the vote it takes.
 */
export function ThresholdRuler({ chamber }: { readonly chamber: CongressChamber }) {
  const pct = (votes: number) => `${(votes / chamber.seats) * 100}%`;
  return (
    <div className="hill-ruler">
      <div className="hill-ruler__track" aria-hidden="true">
        <span className="hill-ruler__ours" data-party={chamber.caucus.parties[0]} style={{ inlineSize: pct(chamber.caucus.seats) }} />
        <span className="hill-ruler__theirs" data-party={chamber.caucus.parties[0] === "democrat" ? "republican" : "democrat"} style={{ inlineSize: pct(chamber.caucus.opposing) }} />
        {chamber.thresholds.map((line) => (
          <span key={line.key} className="hill-ruler__tick" data-key={line.key} data-clear={line.short === 0 ? "true" : undefined} style={{ insetInlineStart: pct(line.votes) }}>
            <span className="hill-ruler__votes">{line.votes}</span>
          </span>
        ))}
      </div>
      <p className="hill-ruler__ends">
        <span><strong>{chamber.caucus.seats}</strong> {chamber.caucus.name}</span>
        {chamber.unrecorded > 0 ? <span>{chamber.unrecorded} unrecorded</span> : null}
        <span><strong>{chamber.caucus.opposing}</strong> other caucus</span>
      </p>
      <ul className="hill-ruler__lines" aria-label={`What the ${chamber.caucus.name} can carry on its own in the ${chamber.name}`}>
        {chamber.thresholds.map((line) => (
          <li key={line.key} data-clear={line.short === 0 ? "true" : undefined}>
            <span className="hill-ruler__mark" aria-hidden="true">{line.short === 0 ? "✓" : "–"}</span>
            <span>{line.label}</span>
            <strong>{line.votes}</strong>
            <span className="hill-ruler__gap">{line.tieBreak ? "With the Vice President's tie-break" : line.short === 0 ? "Caucus clears it alone" : `${line.short} short alone`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The newest roll call the chamber recorded, which is what vote mode draws. */
export function RollLine({ chamber }: { readonly chamber: CongressChamber }) {
  const roll = chamber.lastRoll;
  if (!roll) return <p className="hill-ring__roll" data-none="true">No roll call is recorded in the {chamber.name} yet.</p>;
  return (
    <p className="hill-ring__roll">
      {roll.question}, <Door href={roll.href}>{roll.title}</Door>, {roll.date}: <strong>{roll.yeas} yea, {roll.nays} nay</strong>; {roll.required} needed, {roll.passed ? "carried" : "failed"}.
    </p>
  );
}

/** The party that holds the chamber, by its caucus anchor. */
function holderOf(chamber: CongressChamber): "democrat" | "republican" {
  const ours = chamber.caucus.parties[0] === "republican" ? "republican" : "democrat";
  return chamber.holdsMajority ? ours : ours === "democrat" ? "republican" : "democrat";
}

/** One chamber: who holds it, its seats, and the lines its caucus can or cannot carry. */
export function ChamberPanel(props: SeatProps) {
  const { chamber, mode } = props;
  const holder = holderOf(chamber);
  const lead = Math.max(chamber.caucus.seats, chamber.caucus.opposing);
  const trail = Math.min(chamber.caucus.seats, chamber.caucus.opposing);
  return (
    <section className="hill-chamber" data-party={holder} aria-labelledby={`hill-${chamber.chamber}-title`}>
      <div className="hill-chamber__head">
        <PartyMark party={holder} size={34} />
        <div className="hill-chamber__who">
          <h3 id={`hill-${chamber.chamber}-title`}>{chamber.name.replace(/^the /, "The ")} <span className="hill-chamber__count">{lead}–{trail}</span></h3>
          <span className="hill-chamber__control">{chamber.majorityLine}</span>
        </div>
      </div>
      <MemberRing {...props} />
      {chamber.recordsDisagree ? <p className="hill-note" role="note">The seated members' parties do not match the chamber's count of {chamber.caucus.seats} to {chamber.caucus.opposing}. Votes run on the count; the seats show who is recorded in each one.</p> : null}
      {mode === "vote" ? (
        <>
          <RollLine chamber={chamber} />
          <ul className="hill-legend" aria-label="Vote marks">
            <li data-vote="yea"><span className="hill-legend__mark" />Yea</li>
            <li data-vote="nay"><span className="hill-legend__mark" />Nay</li>
            <li data-vote="none"><span className="hill-legend__mark" />No recorded vote</li>
          </ul>
        </>
      ) : (
        <ul className="hill-legend" aria-label="Seats by party">
          {chamber.parties.map((party) => (
            <li key={party.party} data-party={party.party}><PartyMark party={party.party} size={14} />{party.label} {party.seats}</li>
          ))}
          <li data-leader="true"><span className="hill-legend__mark" />Leadership</li>
        </ul>
      )}
      <div className="hill-chamber__lines-head">
        <h4>What the {chamber.caucus.name} carries alone</h4>
        <HelpTip label={`About the ${chamber.name} thresholds`}>
          Seats only, not a forecast. Members vote individually, so a caucus can lose its own members or pick up the other side&rsquo;s. The ticks mark the votes each kind of question takes when every seat is filled and voting.
        </HelpTip>
      </div>
      <ThresholdRuler chamber={chamber} />
    </section>
  );
}
