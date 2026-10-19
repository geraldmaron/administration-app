import type { Campaign } from "@admin/engine";
import { formatMoney, formatDate, impactReports, place, type RecordEntryReading, type RecordLink } from "@admin/player-core";
import { Collection, Flag, Icon, Stages, Tag, buttonClass } from "@admin/ui-web";
import { stateById, worldNations } from "@admin/world";
import { Door } from "../shell/Door";
import { nationFlagUrl, stateFlagUrl } from "../media/flags";
import { Moves } from "../shell/Moves";
import { ImpactReportList } from "./Investigations";
import { recordHref, type RecordSearch } from "./search";

const NATION_NAMES = new Map(worldNations.map((nation) => [nation.id as string, nation.identity.name]));

function Links({ links, none, noun, search }: { readonly links: readonly RecordLink[]; readonly none: string; readonly noun: string; readonly search: RecordSearch }) {
  return (
    <Collection
      items={links}
      initial={5}
      noun={noun}
      className="rec-links"
      empty={none}
      render={(link) => (
        <li key={link.id} className="ui-row-target">
          <Door href={recordHref({ ...search, entry: link.id })} className="ui-row-link">{link.description}</Door> <time className="rec-when">{formatDate(link.date)}</time>
        </li>
      )}
    />
  );
}

function Terms({ entry }: { readonly entry: RecordEntryReading }) {
  return (
    <section aria-labelledby="rec-terms" className="rec-section">
      <h3 id="rec-terms" className="rec-section__title">Terms as recorded</h3>
      <dl className="rec-facts">
        <div>
          <dt>Recorded</dt>
          <dd>{formatDate(entry.date)}</dd>
        </div>
        <div>
          <dt>Came from</dt>
          <dd>{entry.origin ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{entry.status}</dd>
        </div>
        <div>
          <dt>Takes effect</dt>
          <dd>{entry.effectiveDate ? formatDate(entry.effectiveDate) : "On the day it was recorded"}</dd>
        </div>
      </dl>
      <Stages
        label="Where the entry stands"
        stages={entry.stages.map((stage) => ({ id: stage.key, label: stage.label, state: stage.current ? "now" : stage.reached ? "done" : "ahead", note: stage.date ? formatDate(stage.date) : "Date not set" }))}
      />
    </section>
  );
}

function Result({ entry }: { readonly entry: RecordEntryReading }) {
  return (
    <section aria-labelledby="rec-result" className="rec-section">
      <h3 id="rec-result" className="rec-section__title">Readings before and after</h3>
      <Moves moves={entry.moves} none="No reading moved at once. Its effects arrive through what it caused." />
      {entry.judgments.length > 0 ? (
        <p className="rec-note">Through the public's view of {entry.judgments.slice(0, 2).map((judgment) => `${judgment.label.toLowerCase()} (${judgment.text})`).join(" and ")}.</p>
      ) : null}
    </section>
  );
}

function Assessments({ campaign, entry }: { readonly campaign: Campaign; readonly entry: RecordEntryReading }) {
  const reports = impactReports(campaign, { causedBy: entry.id });
  return (
    <section aria-labelledby="rec-assess" className="rec-section">
      <h3 id="rec-assess" className="rec-section__title">Agency assessments it caused</h3>
      <ImpactReportList campaign={campaign} reports={reports} initial={3} />
    </section>
  );
}

function entityLinks(entry: RecordEntryReading): readonly { readonly label: string; readonly href: string; readonly flag: string | undefined }[] {
  const stateId = entry.selection?.startsWith("state:") ? entry.selection.slice(6) : undefined;
  const subject = stateId ? [{ label: stateById.get(stateId as never)?.name ?? stateId, href: place.state(stateId), flag: stateFlagUrl(stateId) }] : [];
  const nations = entry.nations.map((id) => ({ label: NATION_NAMES.get(id) ?? id, href: place.country(id), flag: nationFlagUrl(id) }));
  return [...subject, ...nations];
}

function Related({ entry, search }: { readonly entry: RecordEntryReading; readonly search: RecordSearch }) {
  const entities = entityLinks(entry);
  return (
    <section aria-labelledby="rec-related" className="rec-section">
      <h3 id="rec-related" className="rec-section__title">Related records</h3>
      {entities.length > 0 ? (
        <ul className="rec-entities" aria-label="Places and governments">
          {entities.map((entity) => (
            <li key={entity.href} className="ui-row-target">
              <Flag name={entity.label} {...(entity.flag ? { src: entity.flag } : {})} height={16} decorative />
              <Door href={entity.href} className="ui-row-link">{entity.label}</Door>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="rec-chain" aria-label="Recorded causal connections">
        <section className="rec-chain__branch"><h4 className="rec-subhead"><Icon name="record" size={18} />What it answered to <Tag tone="neutral">{entry.causes.length}</Tag></h4>
          <Links links={entry.causes} none="No earlier cause is recorded." noun="earlier records" search={search} />
        </section>
        <div className="rec-chain__current"><Icon name="record" size={24} /><strong>{entry.headline}</strong><span className="rec-when">Selected entry · {formatDate(entry.date)}</span></div>
        <section className="rec-chain__branch"><h4 className="rec-subhead"><Icon name="chevron" size={18} />What followed <Tag tone="neutral">{entry.consequences.length}</Tag></h4>
          <Links links={entry.consequences} none="Nothing yet. Effects that take time appear here when they happen." noun="later records" search={search} />
        </section>
      </div>
      {entry.roots.length > 0 && entry.roots.some((root) => !entry.causes.some((cause) => cause.id === root.id)) ? (
        <>
          <h4 className="rec-subhead">Where the chain began</h4>
          <Links links={entry.roots} none="" noun="origin records" search={search} />
        </>
      ) : null}
      {entry.downstreamCount > entry.consequences.length ? <p className="rec-note">{entry.downstreamCount} later records trace back to this one, counting every step.</p> : null}
    </section>
  );
}

/** One entry read whole: its terms as recorded, the result observed since, the assessments it caused and the records around it. */
export function RecordDetail({ campaign, entry, search, listHref }: { readonly campaign: Campaign; readonly entry: RecordEntryReading; readonly search: RecordSearch; readonly listHref: string }) {
  const lede = entry.headline === entry.description ? undefined : entry.description.slice(entry.headline.length).trim();
  return (
    <article className="rec-detail" aria-labelledby="rec-detail-title">
      <Door href={listHref} className={buttonClass("ghost", "sm", "rec-detail__back")}>
        All entries
      </Door>
      <header className="rec-detail__head">
        <div className="rec-detail__tags">
          <Tag tone={entry.actor === "player" ? "identity" : "neutral"}>{entry.actorWord}</Tag>
          <Tag tone={entry.status.startsWith("Under way") ? "caution" : "neutral"}>{entry.status}</Tag>
        </div>
        <h2 id="rec-detail-title" className="rec-detail__title" tabIndex={-1}>{entry.headline}</h2>
        {lede ? <p className="rec-detail__lede">{lede}</p> : null}
      </header>
      <Terms entry={entry} />
      <Result entry={entry} />
      <Assessments campaign={campaign} entry={entry} />
      {entry.accounting.length > 0 ? <section className="rec-section" aria-label="Financial accounting">
        <h3 className="rec-section__title">Estimate and booked cost</h3>
        {entry.accounting.map((cost, index) => <div key={index}>
          <dl className="rec-facts"><div><dt>Estimate at decision</dt><dd>{formatMoney(cost.estimated)}</dd></div>
            <div><dt>Booked borrowing</dt><dd>{formatMoney(cost.booked)}</dd></div>
            <div><dt>{cost.variance >= 0 ? "Over estimate" : "Under estimate"}</dt><dd>{formatMoney(Math.abs(cost.variance))}</dd></div></dl>
          <p className="rec-note">{cost.source}. {cost.method === "band" ? "Broad proxy; specific cost components are unknown." : "Priced from stated arithmetic."} Cost variation uses planning assumptions.</p>
        </div>)}
      </section> : null}
      {entry.subjects.length > 0 ? <section className="rec-section" aria-label="Persistent subjects"><h3 className="rec-section__title">Subjects in this record</h3>
        <ul className="rec-subjects">{entry.subjects.map((subject) => <li key={subject.key}><Door href={recordHref({ subject: subject.id })}><Icon name="dossier" size={20} /><strong>{subject.name}</strong><span>{subject.description}</span><small>Introduced in week {subject.originTurn}</small><Icon name="chevron" size={16} /></Door></li>)}</ul>
      </section> : null}
      <Related entry={entry} search={search} />
    </article>
  );
}
