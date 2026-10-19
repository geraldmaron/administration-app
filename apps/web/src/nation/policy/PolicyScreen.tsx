import { useMemo, useState } from "react";
import { CARETAKER_QUALITY, POLICY_QUALITY_RANGE, enactPolicy, type Campaign, type PolicyDomain } from "@admin/engine";
import { charterOf, domainShareWords, executionFigure, executionWords, formatDate, formatRatio, orderPipeline, place, policyPortfolio, stanceComparison, stanceReview, stateIndustryShares, weeksWords, type PortfolioDomain } from "@admin/player-core";
import { stateById } from "@admin/world";
import { Bar, Button, Collection, Field, Gauge, Icon, isIconName, NativeSelect, Portrait, Sheet, Tabs } from "@admin/ui-web";
import { faceOf } from "../../media/faces";
import { Door } from "../../shell/Door";
import type { Valence } from "../../shell/valence";
import { Screen } from "../../shell/Screen";
import { ActDone } from "./ActDone";
import { ChoiceCompare } from "./ChoiceCompare";
import { OrderPipeline, type OrderCollectionSearch } from "./OrderPipeline";
import { useAct, type ActHandle } from "./use-act";
import "./policy.css";
import { StateName } from "../../media/StateName";

export const POLICY_VIEWS = ["proposals", "orders", "implementation"] as const;
export type PolicyView = (typeof POLICY_VIEWS)[number];

export function isPolicyView(value: unknown): value is PolicyView {
  return typeof value === "string" && (POLICY_VIEWS as readonly string[]).includes(value);
}

function DomainGlyph({ icon }: { readonly icon: string }) {
  return isIconName(icon) ? <Icon name={icon} size={20} className="portfolio__glyph" /> : null;
}

const domainHref = (domain: PolicyDomain, view: PolicyView): string => `${place.policyDomain(domain)}${view === "proposals" ? "" : `&view=${view}`}`;

/** How well a chair lands the written program as a position on the execution scale, with the line where it delivers the whole of it. */
function executionReading(row: PortfolioDomain): { readonly value: number; readonly full: number; readonly valence: Valence } {
  return {
    value: (row.quality - CARETAKER_QUALITY) / POLICY_QUALITY_RANGE,
    full: (1 - CARETAKER_QUALITY) / POLICY_QUALITY_RANGE,
    valence: !row.minister ? "watch" : row.quality >= 1 ? "good" : row.quality >= 0.7 ? "watch" : "bad",
  };
}

/** The six domains as a table of doors: the stance in force, who carries it and what rides on it, the open one marked current. */
function DomainList({ campaign, portfolio, selected, view, onNavigate }: { readonly campaign: Campaign; readonly portfolio: readonly PortfolioDomain[]; readonly selected: PolicyDomain; readonly view: PolicyView; readonly onNavigate?: () => void }) {
  return (
    <nav className="portfolio" aria-label="Policy domains">
      <ul className="portfolio__list">
        {portfolio.map((row) => (
          <li key={row.domain}>
            <Door href={domainHref(row.domain, view)} className="portfolio__door" onClick={onNavigate} aria-current={row.domain === selected ? "page" : undefined}>
              <DomainGlyph icon={row.icon} />
              <span className="portfolio__name">{row.name}</span>
              <span className="portfolio__stance">{row.stance.name}</span>
              <span className={row.minister ? "portfolio__chair" : "portfolio__chair ui-valence-ink"} data-valence={row.minister ? undefined : "watch"}>
                {row.ministerId && row.minister ? <MinisterFace campaign={campaign} id={row.ministerId} name={row.minister} /> : null}
                {row.minister ? `${row.chair}: ${row.minister}` : "Responsible seat vacant"}
              </span>
              <ExecutionBar row={row} />
              {row.pledges.length > 0 ? <span className="portfolio__pledge">{row.pledges.length === 1 ? "A promise rides on it" : `${row.pledges.length} promises ride on it`}</span> : null}
            </Door>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MinisterFace({ campaign, id, name }: { readonly campaign: Campaign; readonly id: string; readonly name: string }) {
  const face = faceOf(campaign, id, name);
  return <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="sm" decorative />;
}

function ExecutionBar({ row }: { readonly row: PortfolioDomain }) {
  const reading = executionReading(row);
  return (
    <span className="portfolio__landing">
      <Bar label={`${row.name}: ${executionWords(row.quality)}`} value={reading.value} tone={reading.valence} marks={[{ at: reading.full, label: "The program as written" }]} />
      <span className="portfolio__landing-figure ui-valence-ink" data-valence={reading.valence}>
        {executionFigure(row.quality)}
      </span>
    </span>
  );
}

/** The portfolio's condition in one line: what is unstaffed, what is promised, what waits on a signature or a court. */
function portfolioLede(portfolio: readonly PortfolioDomain[], campaign: Campaign): string {
  const empty = portfolio.filter((row) => !row.minister).length;
  const promises = portfolio.reduce((sum, row) => sum + row.pledges.length, 0);
  const stages = orderPipeline(campaign);
  const count = (stage: string): number => stages.find((entry) => entry.stage === stage)?.rows.length ?? 0;
  const parts = [
    empty === 0 ? "Every domain has a chair." : `${empty} of ${portfolio.length} domains run on caretaker effort.`,
    promises === 0 ? "No promise rides on the program." : `${promises} ${promises === 1 ? "promise rides" : "promises ride"} on it.`,
    `${count("desk")} orders ready to sign, ${count("rulemaking")} rules being written, ${count("court")} before the courts.`,
  ];
  return parts.join(" ");
}

function DomainHead({ row }: { readonly row: PortfolioDomain }) {
  return (
    <header className="domain-head">
      <h2 className="domain-head__title">
        <DomainGlyph icon={row.icon} />
        {row.name}
      </h2>
      <p className="domain-head__question">{row.question}</p>
      <p className="domain-head__stance">
        In force: <strong>{row.stance.name}</strong>
        {row.stance.inherited ? " (inherited)" : ""}. {row.stance.summary}
      </p>
    </header>
  );
}

/** What can be proposed here, set apart from what is already enacted: every other position as its change from the one in force, then the one verb. */
function Proposals({ campaign, row, acts }: { readonly campaign: Campaign; readonly row: PortfolioDomain; readonly acts: ActHandle }) {
  const charter = charterOf(campaign);
  const table = useMemo(() => stanceComparison(campaign, charter, row.domain), [campaign, charter, row.domain]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  if (acts.done) return <ActDone done={acts.done} onBack={acts.dismiss} backLabel="Back to the positions" mapNote={null} />;
  const name = table.columns.find((column) => column.id === selected)?.label ?? "";
  const enact = () =>
    selected && void acts.run(() => {
      const result = enactPolicy(campaign, selected);
      if (!result.ok) throw new Error(result.reason);
      return { packet: result.packet, title: `Enacted: ${name}`, camera: "us", lines: [{ label: "Program", value: name }] };
    }, { tier: "full", title: `Enact ${name}`, verb: "Confirm and enact" });
  return (
    <div id="policy-proposals" className="policy-view">
      <p className="policy-view__lead">
        You can propose {row.alternatives} other {row.alternatives === 1 ? "position" : "positions"} here.
        {row.byStatute ? " Some are written in statute and need a bill before they can change." : ""} Nothing below is enacted until you authorize it.
      </p>
      <ChoiceCompare
        title="Compare the positions"
        table={table}
        selected={selected}
        onSelect={setSelected}
        verb="Enact this stance"
        onAuthorize={enact}
        review={selected === undefined ? undefined : stanceReview(campaign, charter, row.domain, selected)}
        busy={acts.busy}
      />
      {acts.problem ? (
        <p className="act-problem" role="alert">
          {acts.problem}
        </p>
      ) : null}
    </div>
  );
}

/** The states ranked by how much of their economy sits in the parts this program lands on hardest. */
function FeltMost({ row }: { readonly row: PortfolioDomain }) {
  const ranked = useMemo(
    () =>
      [...stateIndustryShares(row.domain)]
        .map(([id, share]) => ({ id, name: stateById.get(id)?.name ?? (id as string), share }))
        .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name)),
    [row.domain],
  );
  return (
    <section aria-labelledby="policy-felt">
      <h3 id="policy-felt" className="order-rail__title">
        Where it is felt most
      </h3>
      <p className="policy-view__lead">States ranked by the share of their economy in {domainShareWords(row.domain)}. This is exposure, not a forecast of effects.</p>
      <Collection
        items={ranked}
        initial={6}
        noun="states"
        className="felt-list"
        render={(entry) => (
          <li key={entry.id} className="felt-list__row ui-row-target">
            <Door href={place.state(entry.id)} className="ui-row-link"><StateName id={entry.id} name={entry.name} /></Door>
            <span className="felt-list__figure">{formatRatio(entry.share)}</span>
          </li>
        )}
      />
    </section>
  );
}

/** What is enacted and how it is being carried: the authority, the chair's execution, the stand-up clock and the promises tied to it. */
function Implementation({ row }: { readonly row: PortfolioDomain }) {
  return (
    <div className="policy-view">
      <dl className="order-terms">
        <div className="order-terms__row">
          <dt>Enacted position</dt>
          <dd>
            {row.stance.name}
            {row.stance.inherited ? ", inherited from the last administration" : ""}
          </dd>
        </div>
        <div className="order-terms__row">
          <dt>Authority</dt>
          <dd>The President acts here through {row.authority}.</dd>
        </div>
        <div className="order-terms__row">
          <dt>Responsible chair</dt>
          <dd>{row.minister ? `${row.chair}, ${row.minister}` : `${row.chair ?? "No chair"}: the seat is empty, so it runs on caretaker effort`}</dd>
        </div>
        <div className="order-terms__row">
          <dt>Effective timing</dt>
          <dd>{row.standUpWeeks > 0 ? `The program in force starts to bite in ${weeksWords(row.standUpWeeks)}.` : "The program in force is fully standing."}</dd>
        </div>
      </dl>
      <Gauge
        shape="meter"
        label="Execution, as assessed"
        value={(row.quality - CARETAKER_QUALITY) / POLICY_QUALITY_RANGE}
        valueText={`${executionFigure(row.quality)}: ${executionWords(row.quality)}`}
        tone={!row.minister ? "watch" : row.quality >= 1 ? "good" : row.quality >= 0.7 ? "watch" : "bad"}
        caption={row.minister ? `${row.minister} carries it.` : "Caretaker effort."}
      />
      {row.pledges.length > 0 ? (
        <section aria-labelledby="policy-pledges">
          <h3 id="policy-pledges" className="order-rail__title">
            Promises riding on it
          </h3>
          <ul className="domain-head__pledges">
            {row.pledges.map((pledge) => (
              <li key={pledge.id}>
                “{pledge.title}”, due {formatDate(pledge.dueDate)}: {pledge.kind === "hold" ? "kept by holding the program" : "kept by adopting it"}.
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="policy-view__lead">No promise rides on this program.</p>
      )}
      <FeltMost row={row} />
    </div>
  );
}

export type PolicyScreenProps = {
  readonly campaign: Campaign;
  readonly domain: PolicyDomain;
  readonly view: PolicyView;
  readonly onView: (view: PolicyView) => void;
  readonly orderSearch: OrderCollectionSearch;
  readonly onOrderSearch: (next: OrderCollectionSearch) => void;
  readonly onDomain: (next: PolicyDomain) => void;
};

/** The standing program: the portfolio's condition, the six domains, and each domain's proposals, orders and implementation. */
export function PolicyScreen({ campaign, domain, view, onView, orderSearch, onOrderSearch, onDomain }: PolicyScreenProps) {
  const [compareDomains, setCompareDomains] = useState(false);
  const portfolio = policyPortfolio(campaign);
  const row = portfolio.find((entry) => entry.domain === domain)!;
  const acts = useAct(campaign);
  return (
    <Screen title="Policy" icon="order" eyebrow="Nation · the standing program" lede={portfolioLede(portfolio, campaign)} screenClass="workspace" measure="data" camera="us">
      <Tabs
        label={`Views of ${row.name.toLowerCase()} policy`}
        tabs={[
          { id: "proposals", label: "Proposals", count: row.alternatives },
          { id: "orders", label: "Orders" },
          { id: "implementation", label: "Implementation" },
        ]}
        selected={view}
        onSelect={(next) => onView(next as PolicyView)}
      >
        {view === "orders" ? <OrderPipeline campaign={campaign} search={orderSearch} onSearch={onOrderSearch} /> : (
          <div className="policy-split">
            <div className="policy-domain-sidebar"><DomainList campaign={campaign} portfolio={portfolio} selected={domain} view={view} /></div>
            <div className="policy-domain-picker">
              <Field label="Policy domain">{(control) => <NativeSelect {...control} value={domain} onChange={(event) => onDomain(event.target.value as PolicyDomain)}>{portfolio.map((entry) => <option key={entry.domain} value={entry.domain}>{entry.name}</option>)}</NativeSelect>}</Field>
              <Button kind="secondary" size="sm" onClick={() => setCompareDomains(true)}>Compare portfolios</Button>
              <Sheet open={compareDomains} onClose={() => setCompareDomains(false)} title="Policy portfolio comparison" placement="side" lead="The stance, responsible official and assessed delivery in each policy domain.">
                <DomainList campaign={campaign} portfolio={portfolio} selected={domain} view={view} onNavigate={() => setCompareDomains(false)} />
              </Sheet>
            </div>
            <div className="policy-detail">
              <DomainHead row={row} />
              {view === "implementation" ? <Implementation row={row} /> : <Proposals campaign={campaign} row={row} acts={acts} />}
            </div>
          </div>
        )}
      </Tabs>
    </Screen>
  );
}
