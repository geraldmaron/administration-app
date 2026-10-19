import { NATION_LENSES, NATION_LENS_NAMES, type NationLensId } from "@admin/player-core";
import { Choice } from "@admin/ui-web";

// The lenses the two Nation screens offer and the map lens each one draws.
// One default and at most four in all, per the brief; the choice lives in the
// address, so back and a shared link keep it.

export const NATION_MAP_LENS: Readonly<Record<NationLensId, string>> = {
  approval: "approval",
  call: "call",
  lean: "lean",
  population: "state-population",
};

export const STATE_LENSES = ["approval", "lean", "call", "house"] as const;
export type StateLensId = (typeof STATE_LENSES)[number];

export const STATE_LENS_NAMES: Readonly<Record<StateLensId, string>> = {
  approval: "Approval",
  lean: "Lean",
  call: "Call",
  house: "House seats",
};

export function isStateLens(value: unknown): value is StateLensId {
  return typeof value === "string" && (STATE_LENSES as readonly string[]).includes(value);
}

/** The lens row over a Nation screen: a short row of words that recolors the map. */
/** What each Nation lens shows, in one sentence, said under the switch so the color is never a guess. */
export const NATION_LENS_ABOUT: Readonly<Record<NationLensId, string>> = {
  approval: "The share of each state that approves of how you are doing, slate where it is thin, gold where it is broad.",
  call: "Who would carry each state if the election were held this week, and by how much.",
  lean: "How far each state leans to one party in an ordinary election, before anything you do: blue Democratic, red Republican.",
  population: "How many people live in each state.",
};

/** The lens row over a Nation screen: a short row of words that recolors the map, and a sentence saying what the chosen one shows. */
export function LensSwitch<T extends string>({ lenses, names, value, onChange, about }: { readonly lenses: readonly T[]; readonly names: Readonly<Record<T, string>>; readonly value: T; readonly onChange: (lens: T) => void; readonly about?: Readonly<Record<T, string>> }) {
  return (
    <div className="lens-switch__wrap">
      <Choice legend="Color the map by" layout="segments" className="lens-switch" options={lenses.map((lens) => ({ value: lens, label: names[lens] }))} value={value} onChange={onChange} />
      {about ? (
        <p className="lens-switch__about" aria-live="polite">
          {about[value]}
        </p>
      ) : null}
    </div>
  );
}

export { NATION_LENSES, NATION_LENS_NAMES };
