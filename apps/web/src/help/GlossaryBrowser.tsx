import { useState } from "react";
import { glossaryEntry } from "@admin/player-core";
import { GlossaryCard } from "./GlossaryCard";

/** A card that follows its own related chips, for a place that opens one term and lets the reader wander. */
export function GlossaryBrowser({ id }: { readonly id: string }) {
  const [current, setCurrent] = useState(id);
  const entry = glossaryEntry(current) ?? glossaryEntry(id);
  if (!entry) return null;
  return (
    <>
      {current !== id ? <button type="button" className="help-chip help-chip--action help-back" onClick={() => setCurrent(id)}>Back to {glossaryEntry(id)?.term.toLowerCase() ?? "the term"}</button> : null}
      <GlossaryCard entry={entry} onOpen={setCurrent} hideTerm={current === id} />
    </>
  );
}
