import { PLACES, explainer, type Explainer, type HandbookChapter } from "@admin/player-core";
import { Icon, isIconName } from "@admin/ui-web";
import { ExplainerView, GlossaryCard } from "../help";
import { Door } from "../shell/Door";
import { chapterNeighbors, chapterTerms } from "./selectors";
import "./handbook.css";

function ExplainerSection({ item, onOpen }: { readonly item: Explainer; readonly onOpen: (id: string) => void }) {
  return (
    <section id={item.id} className="hb-section" aria-labelledby={`${item.id}-title`}>
      <h2 id={`${item.id}-title`} className="hb-section__title">{item.title}</h2>
      <ExplainerView explainer={item} onOpen={onOpen} />
    </section>
  );
}

function Terms({ chapter }: { readonly chapter: HandbookChapter }) {
  const terms = chapterTerms(chapter);
  if (!terms.length) return null;
  return (
    <section className="hb-section" aria-labelledby="chapter-terms">
      <h2 id="chapter-terms" className="hb-section__title">Terms in this chapter</h2>
      <div className="hb-cards">
        {terms.map((entry) => <GlossaryCard key={entry.id} entry={entry} />)}
      </div>
    </section>
  );
}

function Places({ chapter }: { readonly chapter: HandbookChapter }) {
  return (
    <section className="hb-section" aria-labelledby="chapter-places">
      <h2 id="chapter-places" className="hb-section__title">Where you use this</h2>
      <ul className="hb-places">
        {chapter.places.map((key) => (
          <li key={key}>
            <Door href={PLACES[key].href} className="hb-place">
              {isIconName(PLACES[key].icon) ? <Icon name={PLACES[key].icon} size={20} /> : null}
              <span>{PLACES[key].title}</span>
            </Door>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pager({ id }: { readonly id: string }) {
  const { previous, next } = chapterNeighbors(id);
  return (
    <nav className="hb-pager" aria-label="Chapter order">
      {previous ? <Door href={`/handbook/${previous.id}`} className="hb-pager__link" rel="prev"><span>Previous chapter</span><strong>{previous.title}</strong></Door> : <span />}
      {next ? <Door href={`/handbook/${next.id}`} className="hb-pager__link hb-pager__link--next" rel="next"><span>Next chapter</span><strong>{next.title}</strong></Door> : null}
    </nav>
  );
}

/** One chapter's body: its explainers in order, the terms they use, the screens where it applies, and the way on. */
export function ChapterView({ chapter, onOpen }: { readonly chapter: HandbookChapter; readonly onOpen: (id: string) => void }) {
  const items = chapter.explainers.flatMap((id) => explainer(id) ?? []);
  return (
    <article className="hb-chapter">
      {items.map((item) => <ExplainerSection key={item.id} item={item} onOpen={onOpen} />)}
      <Terms chapter={chapter} />
      <Places chapter={chapter} />
      <Pager id={chapter.id} />
    </article>
  );
}
