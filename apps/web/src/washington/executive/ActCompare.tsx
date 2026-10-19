import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { pricedRows, type ModelingAct, type PricedOption } from "@admin/player-core";
import type { ButtonKind } from "@admin/ui-web";
import { actsChoice, useChoiceProjection } from "../../modeling/ChoiceProjection";
import { PricedCompare } from "./PricedCompare";

export type ActCompareProps = {
  readonly campaign: Campaign;
  readonly title: string;
  /** Each act, priced by the engine's own projection. */
  readonly options: readonly PricedOption[];
  /** The named verb for each act option, by id. */
  readonly verbs: Readonly<Record<string, string>>;
  readonly onAuthorize: (id: string) => void;
  /** What happens on its own while nothing is picked, where that has a clock. */
  readonly baselineReview?: string;
  readonly busy: boolean;
  readonly tone?: Extract<ButtonKind, "commit" | "danger">;
  /** Each act option's act as the projection builds it, the same call `onAuthorize` makes; absent, no projection. */
  readonly acts?: Readonly<Record<string, ModelingAct>>;
};

/** The priced options as a choice to project: each open act with the call it commits, each closed one with its reason. */
function pricedChoice(title: string, options: readonly PricedOption[], acts: Readonly<Record<string, ModelingAct>>) {
  return actsChoice(title, "doing nothing", "Doing nothing.", options.map((option) => {
    if (option.unavailable) return { id: option.id, label: option.label, refused: option.unavailable };
    const act = acts[option.id];
    return { id: option.id, label: option.label, ...(act ? { act } : {}) };
  }));
}

/**
 * One act read as its change from today, on the rows its projection prices: the
 * shared shape of every Washington act that is not a choice between people.
 */
export function ActCompare({ campaign, title, options, verbs, onAuthorize, baselineReview, busy, tone, acts }: ActCompareProps) {
  // A lone open option starts picked: a press that only picks it would be a step that decides nothing.
  const sole = options.length === 1 && !options[0]!.unavailable ? options[0]!.id : undefined;
  const [selected, setSelected] = useState<string | undefined>(sole);
  const projection = useChoiceProjection(acts ? campaign : undefined, acts ? pricedChoice(title, options, acts) : undefined, selected);
  return (
    <PricedCompare
      campaign={campaign}
      title={title}
      options={options}
      rows={pricedRows(campaign, options)}
      selected={selected}
      onSelect={setSelected}
      verb={(selected === undefined ? undefined : verbs[selected]) ?? Object.values(verbs)[0] ?? "Authorize"}
      onAuthorize={() => selected !== undefined && onAuthorize(selected)}
      review={() => "Review the terms before confirming. The action and its cost will be filed on your Record."}
      {...(baselineReview ? { baselineReview } : {})}
      busy={busy}
      {...(tone ? { tone } : {})}
      {...(projection ? { projection } : {})}
    />
  );
}
