import { HANDBOOK, HANDBOOK_INTRO, GLOSSARY } from "@admin/player-core";
import { Door } from "../shell/Door";
import "./handbook.css";

/** The Handbook's front page: what it is, then the chapters in order with what each opens up. */
export function ContentsView() {
  return (
    <div className="hb-contents">
      <p className="hb-intro">{HANDBOOK_INTRO}</p>
      <ol className="hb-toc" aria-label="Chapters">
        {HANDBOOK.map((chapter, index) => (
          <li key={chapter.id}>
            <Door href={`/handbook/${chapter.id}`} className="hb-toc__link">
              <span className="hb-toc__number" aria-hidden="true">{index + 1}</span>
              <span className="hb-toc__text">
                <strong>{chapter.title}</strong>
                <span>{chapter.opens}</span>
                <span className="hb-toc__count">{chapter.explainers.length === 1 ? "1 explainer" : `${chapter.explainers.length} explainers`}</span>
              </span>
            </Door>
          </li>
        ))}
      </ol>
      <Door href="/handbook/terms" className="hb-toc__link hb-toc__link--terms">
        <span className="hb-toc__number" aria-hidden="true">A</span>
        <span className="hb-toc__text">
          <strong>All terms, A to Z</strong>
          <span>Look up any word the game uses.</span>
          <span className="hb-toc__count">{GLOSSARY.length} terms</span>
        </span>
      </Door>
    </div>
  );
}
