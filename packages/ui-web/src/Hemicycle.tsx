import type { PartySeats } from "./PartyBar";

export type HemicycleProps = {
  readonly label: string;
  /** In the order they sit, left to right. */
  readonly parties: readonly PartySeats[];
  readonly majority?: number;
  readonly verdict?: string;
};

type Seat = { readonly x: number; readonly y: number; readonly angle: number };

/** How many rows a chamber of this size is drawn in. */
function rowCount(seats: number): number {
  return Math.max(2, Math.min(12, Math.round(Math.sqrt(seats / 4))));
}

/**
 * Every seat's place on a half ring, filled row by row in proportion to each
 * row's length, then ordered by angle so parties fill from left to right as a
 * chamber's seating does.
 */
export function hemicycleSeats(total: number): readonly Seat[] {
  if (total <= 0) return [];
  const rows = rowCount(total);
  const radii = Array.from({ length: rows }, (_, i) => 0.42 + (0.58 * i) / Math.max(1, rows - 1));
  const length = radii.reduce((sum, r) => sum + r, 0);
  const perRow = radii.map((r) => Math.floor((total * r) / length));
  let left = total - perRow.reduce((sum, n) => sum + n, 0);
  for (let i = rows - 1; left > 0; i = (i - 1 + rows) % rows, left -= 1) perRow[i] = perRow[i]! + 1;
  const seats = radii.flatMap((r, row) => {
    const n = perRow[row]!;
    return Array.from({ length: n }, (_, k) => {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * k) / (n - 1);
      return { x: 50 + 46 * r * Math.cos(angle), y: 50 - 46 * r * Math.sin(angle), angle };
    });
  });
  return [...seats].sort((a, b) => b.angle - a.angle);
}

/**
 * The majority line: a spoke through the half ring between the seat that
 * makes a majority, counted from the left, and the one after it.
 */
function majoritySpoke(seats: readonly Seat[], majority: number | undefined): { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number } | undefined {
  if (!majority || majority >= seats.length) return undefined;
  const angle = (seats[majority - 1]!.angle + seats[majority]!.angle) / 2;
  const at = (r: number) => ({ x: 50 + 46 * r * Math.cos(angle), y: 50 - 46 * r * Math.sin(angle) });
  const inner = at(0.32);
  const outer = at(1.08);
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
}

/** A chamber drawn as its seats, each party in its color, with the majority line and the counts printed beneath. */
export function Hemicycle({ label, parties, majority, verdict }: HemicycleProps) {
  const total = parties.reduce((sum, party) => sum + party.seats, 0);
  const seats = hemicycleSeats(total);
  const spoke = majoritySpoke(seats, majority);
  const owner = parties.flatMap((party) => Array.from({ length: party.seats }, () => party.party));
  const radius = Math.max(0.6, Math.min(2.2, 46 / Math.sqrt(total * 3.2)));
  const spoken = parties.map((party) => `${party.label} ${party.seats}`).join(", ");
  return (
    <figure className="ui-hemicycle">
      <figcaption className="ui-hemicycle__label">{label}</figcaption>
      <svg className="ui-hemicycle__plot" viewBox="0 0 100 54" role="img" aria-label={`${label}: ${spoken} of ${total}${majority ? `; ${majority} for a majority` : ""}.`}>
        {seats.map((seat, i) => (
          <circle key={i} className="ui-hemicycle__seat" data-party={owner[i]} cx={seat.x.toFixed(2)} cy={seat.y.toFixed(2)} r={radius} />
        ))}
        {spoke ? <line className="ui-hemicycle__majority" x1={spoke.x1.toFixed(2)} y1={spoke.y1.toFixed(2)} x2={spoke.x2.toFixed(2)} y2={spoke.y2.toFixed(2)} /> : null}
      </svg>
      <ul className="ui-party-bar__legend" aria-hidden="true">
        {parties.map((party) => (
          <li key={party.party} data-party={party.party}>
            <span className="ui-party-bar__swatch" />
            {party.label} <strong>{party.seats}</strong>
          </li>
        ))}
        {majority ? <li className="ui-party-bar__need">{majority} for a majority</li> : null}
      </ul>
      {verdict ? <p className="ui-party-bar__verdict">{verdict}</p> : null}
    </figure>
  );
}
