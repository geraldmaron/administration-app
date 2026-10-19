export type Party = "democrat" | "republican" | "independent";

export type PartySeats = { readonly party: Party; readonly seats: number; readonly label: string };

export type PartyBarProps = {
  readonly label: string;
  /** In the order they sit, left to right. */
  readonly parties: readonly PartySeats[];
  /** Seats needed for control; drawn as a line across the bar. */
  readonly majority?: number;
  /** One line under the bar: who holds it, and whether that is you. */
  readonly verdict?: string;
};

/**
 * A chamber's seats as one bar split by party, with the majority line drawn
 * on it. Each party's count is printed beside its name, so color is never the
 * only way to tell the parties apart.
 */
export function PartyBar({ label, parties, majority, verdict }: PartyBarProps) {
  const total = parties.reduce((sum, party) => sum + party.seats, 0) || 1;
  const spoken = parties.map((party) => `${party.label} ${party.seats}`).join(", ");
  return (
    <figure className="ui-party-bar">
      <figcaption className="ui-party-bar__label">{label}</figcaption>
      <div className="ui-party-bar__track" role="img" aria-label={`${label}: ${spoken} of ${total}${majority ? `; ${majority} for a majority` : ""}.`}>
        {parties.map((party) =>
          party.seats > 0 ? <span key={party.party} className="ui-party-bar__segment" data-party={party.party} style={{ flexGrow: party.seats }} /> : null,
        )}
        {majority ? <span className="ui-party-bar__majority" style={{ insetInlineStart: `${(majority / total) * 100}%` }} /> : null}
      </div>
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
