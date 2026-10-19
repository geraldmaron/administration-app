import { useState } from "react";
import { GLOSSARY } from "@admin/player-core";
import { Field, Input } from "@admin/ui-web";
import { GlossaryCard } from "../help";
import { filterTerms, groupByLetter } from "./selectors";
import "./handbook.css";

/** Every glossary entry A to Z, narrowed as the reader types. */
export function TermsView() {
  const [query, setQuery] = useState("");
  const shown = filterTerms(GLOSSARY, query);
  const groups = groupByLetter(shown);
  return (
    <div className="hb-terms">
      <Field label="Find a term" hint="Type a word from a term or its meaning.">
        {(control) => <Input {...control} type="search" value={query} onChange={(event) => setQuery(event.target.value)} />}
      </Field>
      <p className="hb-terms__count" role="status">{shown.length === GLOSSARY.length ? `${shown.length} terms` : `${shown.length} of ${GLOSSARY.length} terms`}</p>
      {groups.length === 0 ? <p>No term matches "{query.trim()}". Try a shorter word.</p> : null}
      {groups.length > 1 ? (
        <nav className="hb-letters" aria-label="Jump to a letter">
          {groups.map((group) => <a key={group.letter} href={`#letter-${group.letter}`}>{group.letter}</a>)}
        </nav>
      ) : null}
      {groups.map((group) => (
        <section key={group.letter} className="hb-section" aria-labelledby={`letter-${group.letter}`}>
          <h2 id={`letter-${group.letter}`} className="hb-section__title">{group.letter}</h2>
          <div className="hb-cards">
            {group.entries.map((entry) => <div key={entry.id} id={entry.id} className="hb-term"><GlossaryCard entry={entry} /></div>)}
          </div>
        </section>
      ))}
    </div>
  );
}
