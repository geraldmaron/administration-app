import { glossaryEntry, type GlossaryEntry } from "@admin/player-core";
import { IconBadge, isIconName } from "@admin/ui-web";
import "./help.css";

/** Whether an entry has more to say than its one-line tip. */
export function hasMoreContext(entry: GlossaryEntry): boolean {
  return Boolean(entry.inGame || entry.example || entry.related?.length);
}

/**
 * One glossary entry in full: what it is, what the game does with it, a case,
 * and the entries next to it. `onOpen` makes the related chips act; without it
 * they are plain labels, so a card in a popover never promises a link it lacks.
 */
export function GlossaryCard({ entry, onOpen, hideTerm = false }: { readonly entry: GlossaryEntry; readonly onOpen?: ((id: string) => void) | undefined; /** True where a sheet's own title already names the term. */ readonly hideTerm?: boolean }) {
  const related = (entry.related ?? []).map((id) => glossaryEntry(id)).filter((item): item is GlossaryEntry => item !== undefined);
  return (
    <article className="help-card">
      {hideTerm ? null : (
        <header className="help-card__head">
          {isIconName(entry.icon) ? <IconBadge name={entry.icon} tone="gold" size={36} /> : null}
          <h3 className="help-card__term">{entry.term}</h3>
        </header>
      )}
      <p className="help-card__definition">{entry.definition}</p>
      {entry.inGame ? <section><h4>In this game</h4><p>{entry.inGame}</p></section> : null}
      {entry.example ? <section><h4>For example</h4><p>{entry.example}</p></section> : null}
      {related.length ? (
        <section>
          <h4>Related terms</h4>
          <ul className="help-chips">
            {related.map((item) => (
              <li key={item.id}>
                {onOpen ? <button type="button" className="help-chip help-chip--action" onClick={() => onOpen(item.id)}>{item.term}</button> : <span className="help-chip">{item.term}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
