import type { Campaign } from "@admin/engine";
import { dispatchReading, place, type DispatchReading } from "@admin/player-core";
import { Button, Card, Collection, Document, EmptyState, Flag, Icon } from "@admin/ui-web";
import { worldNations } from "@admin/world";
import { nationFlagUrl } from "../media/flags";
import { Door } from "../shell/Door";
import { Screen } from "../shell/Screen";
import { GenreTag } from "./GenreTag";
import "./record.css";

const NATION_IDS = new Map(worldNations.map((nation) => [nation.identity.name, nation.id as string]));

function Body({ paragraphs }: { readonly paragraphs: readonly string[] }) {
  return (
    <div className="dispatch__body">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

/** Reporting by a masthead: its name, the byline and the date it was filed, set as a newspaper reads. */
function Journalism({ reading }: { readonly reading: DispatchReading }) {
  const { article } = reading;
  return (
    <article className="dispatch dispatch--journalism" aria-label={`News report: ${article.headline}`}>
      <p className="dispatch__masthead">{reading.source}</p>
      <p className="dispatch__standfirst">{article.standfirst}</p>
      <p className="dispatch__byline">{article.byline}</p>
      <Body paragraphs={article.paragraphs} />
      {article.also ? (
        <p className="dispatch__byline">
          {article.also.outlet} filed the same story. {article.also.byline}
        </p>
      ) : null}
      {article.relevance ? <p className="dispatch__relevance">{article.relevance}</p> : null}
    </article>
  );
}

/** An item the administration itself issued, set as paper: issuer, kind, date, status and numbered sections. */
function Official({ reading }: { readonly reading: DispatchReading }) {
  const { article } = reading;
  return (
    <Document
      issuer="Office of the President"
      kind={reading.genreLabel}
      title={article.headline}
      dated={`Recorded ${reading.when}`}
      state="issued"
      stateLabel="On the record"
      sections={[
        { heading: "Summary", body: <p>{article.standfirst}</p> },
        { heading: "What the record holds", body: <Body paragraphs={article.paragraphs} /> },
        ...(article.relevance ? [{ heading: "Why it matters to the administration", body: <p>{article.relevance}</p> }] : []),
      ]}
    />
  );
}

/** An intelligence summary: restricted, addressed and dated like a briefing note, with no masthead and no byline of a reporter. */
function Intelligence({ reading }: { readonly reading: DispatchReading }) {
  const { article } = reading;
  return (
    <article className="dispatch dispatch--intelligence" aria-label={`Intelligence summary: ${article.headline}`}>
      <p className="dispatch__banner">Restricted distribution: for the President and cleared staff</p>
      <dl className="dispatch__memo">
        <div>
          <dt>From</dt>
          <dd>{reading.source}</dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>The President</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{reading.when}</dd>
        </div>
        <div>
          <dt>Subject</dt>
          <dd>{article.headline}</dd>
        </div>
      </dl>
      <p className="dispatch__standfirst">{article.standfirst}</p>
      <Body paragraphs={article.paragraphs} />
      {article.relevance ? <p className="dispatch__relevance">{article.relevance}</p> : null}
    </article>
  );
}

function flagFor(label: string): string | undefined {
  const id = NATION_IDS.get(label);
  return id ? nationFlagUrl(id) : undefined;
}

function Related({ reading }: { readonly reading: DispatchReading }) {
  return (
    <Card role="complementary" className="dispatch__related" aria-label="Related">
      <h2 className="rec-section__title">Related</h2>
      {reading.related.length > 0 ? (
        <>
          <h3 className="rec-subhead">Governments in the story</h3>
          <ul className="rec-items">
            {reading.related.map((link) => (
              <li key={link.href} className="ui-row-target dispatch__gov">
                <Flag name={link.label} {...(flagFor(link.label) ? { src: flagFor(link.label)! } : {})} height={16} decorative />
                <Door href={link.href} className="ui-row-link">{link.label}</Door>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {reading.genre === "journalism" ? (
        <Button asChild kind="secondary"><Door href={`${place.pressOffice()}#press-respond`}><Icon name="press" size={18} />Respond to the press</Door></Button>
      ) : null}
      <h3 className="rec-subhead">Earlier coverage of the same governments</h3>
      <Collection
        items={reading.earlier}
        initial={5}
        noun="earlier stories"
        className="rec-items"
        empty="No earlier story names these governments."
        render={(story) => (
          <li key={story.index} className="ui-row-target">
            <Door href={place.dispatch(String(story.index))} className="ui-row-link">{story.headline}</Door> <time className="rec-when">{story.when}</time>
          </li>
        )}
      />
    </Card>
  );
}

/** One story opened whole, in the form of its kind: a news report, an official notice or an intelligence summary. */
export function Dispatch({ campaign, index }: { readonly campaign: Campaign; readonly index: number }) {
  const reading = dispatchReading(campaign, index);
  if (!reading) {
    return (
      <Screen title="No such story" eyebrow="Press" screenClass="workspace" camera="us">
        <EmptyState icon="emptyRecord" title="The files hold no such story">
          The address may be out of date, or belong to another administration. <Door href={place.press()}>Back to the press</Door>
        </EmptyState>
      </Screen>
    );
  }
  const { article } = reading;
  return (
    <Screen
      title={article.headline}
      eyebrow={`${reading.genreLabel} · ${reading.source} · ${reading.when}`}
      screenClass="workspace"
      camera="us"
      {...(reading.stanceWord ? { lede: `${reading.stanceWord} toward the administration` } : {})}
    >
      <div className="dispatch-page" data-genre={reading.genre}>
        <nav className="dispatch-page__kind" aria-label="Report context"><Button asChild kind="ghost" size="sm"><Door href={place.press()}>Back to the press</Door></Button><GenreTag genre={reading.genre} /></nav>
        {reading.genre === "official" ? <Official reading={reading} /> : reading.genre === "intelligence" ? <Intelligence reading={reading} /> : <Journalism reading={reading} />}
        <Related reading={reading} />
      </div>
    </Screen>
  );
}
