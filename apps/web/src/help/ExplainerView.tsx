import { useEffect, useRef, useState, type ReactNode } from "react";
import { explainer, glossaryEntry, type Explainer, type GlossaryEntry } from "@admin/player-core";
import { GlossaryCard } from "./GlossaryCard";
import { Cast, Examples, Links, Steps, Thresholds } from "./parts";
import "./help.css";

type ViewProps = {
  readonly explainer: Explainer;
  /** Swaps the view to another explainer. Without it, "read next" shows as plain names. */
  readonly onOpen?: ((id: string) => void) | undefined;
};

function Part({ title, id, children }: { readonly title: string; readonly id: string; readonly children: ReactNode }) {
  return (
    <section className="help-part" aria-labelledby={id}>
      <h3 id={id} className="help-part__title">{title}</h3>
      {children}
    </section>
  );
}

function TermChips({ terms }: { readonly terms: readonly string[] }) {
  const [open, setOpen] = useState<string | undefined>();
  const entries = terms.map((id) => glossaryEntry(id)).filter((entry): entry is GlossaryEntry => entry !== undefined);
  const shown = entries.find((entry) => entry.id === open);
  if (!entries.length) return null;
  return (
    <>
      <ul className="help-chips">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button type="button" className="help-chip help-chip--action" aria-expanded={entry.id === open} onClick={() => setOpen(entry.id === open ? undefined : entry.id)}>{entry.term}</button>
          </li>
        ))}
      </ul>
      {shown ? <GlossaryCard entry={shown} onOpen={setOpen} /> : null}
    </>
  );
}

function ReadNext({ ids, onOpen }: { readonly ids: readonly string[]; readonly onOpen?: ((id: string) => void) | undefined }) {
  const next = ids.map((id) => explainer(id)).filter((item): item is Explainer => item !== undefined);
  if (!next.length) return null;
  return (
    <ul className="help-next">
      {next.map((item) => <li key={item.id}>{onOpen ? <button type="button" className="help-next__link" onClick={() => onOpen(item.id)}>{item.title}</button> : item.title}</li>)}
    </ul>
  );
}

/**
 * A full explainer as a drawn explanation: who is involved, the steps on a
 * track, the counts that decide it, and what moves what. Each part appears
 * only when the explainer has it, and every drawn figure is also in text.
 */
export function ExplainerView({ explainer: reading, onOpen }: ViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const shownId = useRef(reading.id);
  useEffect(() => {
    // A swap to another explainer starts at its top with focus on it, so a keyboard reader isn't left on a button that is gone.
    // Compared by id rather than a first-run flag, because a development build runs every effect twice on mount.
    if (shownId.current === reading.id) return;
    shownId.current = reading.id;
    root.current?.focus({ preventScroll: true });
    root.current?.scrollIntoView?.({ block: "start" });
  }, [reading.id]);
  const key = (part: string) => `help-${reading.id}-${part}`;
  const history = reading.examples?.filter((example) => example.kind === "history") ?? [];
  const illustrations = reading.examples?.filter((example) => example.kind === "illustration") ?? [];
  return (
    <div className="help-view" ref={root} tabIndex={-1}>
      <p className="help-view__summary">{reading.summary}</p>
      {reading.cast?.length ? <Part id={key("cast")} title="Who's involved"><Cast cast={reading.cast} /></Part> : null}
      {reading.steps?.length ? <Part id={key("steps")} title="How it works"><Steps steps={reading.steps} /></Part> : null}
      {reading.thresholds?.length ? <Part id={key("numbers")} title="The numbers that decide it"><Thresholds thresholds={reading.thresholds} /></Part> : null}
      {reading.links?.length ? <Part id={key("links")} title="What moves what"><Links links={reading.links} /></Part> : null}
      {illustrations.length ? <Part id={key("example")} title="Worked example"><Examples examples={illustrations} /></Part> : null}
      {history.length ? <Part id={key("history")} title="From history"><Examples examples={history} /></Part> : null}
      {reading.youCan?.length ? <Part id={key("acts")} title="What you can do"><ul className="help-acts">{reading.youCan.map((act) => <li key={act}>{act}</li>)}</ul></Part> : null}
      {reading.terms?.length ? <Part id={key("terms")} title="Terms in this explanation"><TermChips terms={reading.terms} /></Part> : null}
      {reading.next?.length ? <Part id={key("next")} title="Read next"><ReadNext ids={reading.next} onOpen={onOpen} /></Part> : null}
    </div>
  );
}
