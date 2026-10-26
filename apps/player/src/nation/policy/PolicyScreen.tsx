import { useMemo, useState } from "react";
import { CARETAKER_QUALITY, POLICY_QUALITY_RANGE, enactPolicy, type Campaign, type PolicyDomain } from "@admin/engine";
import { charterOf, domainShareWords, executionFigure, executionWords, formatDate, formatRatio, isPolicyDomain, orderPipeline, place, policyPortfolio, sealFor, stanceComparison, stanceReview, stateIndustryShares, weeksWords, type PortfolioDomain } from "@admin/player-core";
import { stateById } from "@admin/world";
import { Pane, Button, CardLink, Column, Icon, Page, Pressable, ReadingFrame, Row, Seal, Select, Sheet, Text, isIconName, useMedia } from "@admin/ui";
import { Collection, CompareChoices, Facts, Track, TrackRow, ViewTabs } from "@admin/ui/nation";
import { go } from "../../shell/navigate";
import { ActDone, ActProblem } from "../ActDone";
import { markEntry, toneKey } from "../keys";
import { useNationAct } from "../act";
import { choiceView } from "../choice";
import { LawTopicHelp } from "../Law";
import { OrderPipeline, type OrderSearch } from "./OrderPipeline";

export const POLICY_VIEWS = ["proposals", "orders", "implementation"] as const;
export type PolicyView = (typeof POLICY_VIEWS)[number];
export const isPolicyView = (value: unknown): value is PolicyView => typeof value === "string" && (POLICY_VIEWS as readonly string[]).includes(value);
export { isPolicyDomain };

/** How well a chair lands the written program, on the execution scale, with the line where it delivers the whole of it. */
function execution(row: PortfolioDomain) {
  return {
    value: (row.quality - CARETAKER_QUALITY) / POLICY_QUALITY_RANGE,
    full: (1 - CARETAKER_QUALITY) / POLICY_QUALITY_RANGE,
    tone: !row.minister ? ("watch" as const) : row.quality >= 1 ? ("good" as const) : row.quality >= 0.7 ? ("watch" as const) : ("bad" as const),
  };
}

/** The six domains as doors: the stance in force, who carries it and what rides on it, the open one marked current. */
function DomainList({ portfolio, selected, onDomain }: { readonly portfolio: readonly PortfolioDomain[]; readonly selected: PolicyDomain; readonly onDomain: (domain: PolicyDomain) => void }) {
  return (
    <ReadingFrame title="How well each area is carried out" unit="% more or less effect than the policy as written" legend={[markEntry("written", "As written: full effect"), ...toneKey({ good: "Carried out in full", watch: "Falling short, or nobody in charge", bad: "Falling well short" })]} pressHint="Press an area to open it." help={{ meaning: "A policy only does what it says if the person in charge carries it out. The bar shows how much effect the policy has compared with what is written: the line is the full written effect, and +33% would mean a third more. The policy named under each area is the one in force now. Continuity means the policy stays as the last president left it." }}>
    <Column gap="xs" role="navigation" aria-label="Policy areas">
      {portfolio.map((row) => {
        const reading = execution(row);
        const current = row.domain === selected;
        return (
          <Pressable href={`${place.policy()}?domain=${row.domain}`} key={row.domain} role="link" aria-current={current ? "page" : undefined} aria-label={`${row.name}: ${row.stance.name}`} onPress={() => onDomain(row.domain)} padding="sm" gap="2xs" borderRadius="card" borderWidth={current ? 2 : 1} borderColor={current ? "accent" : "borderColor"} backgroundColor={{ default: current ? "infoFill" : "surface", hover: "surfaceHover" }}>
            <Row gap="xs">
              {isIconName(row.icon) ? <Icon name={row.icon} size={18} tone="gold" /> : null}
              <Text variant="label" flex={1}>
                {row.name}
              </Text>
            </Row>
            <Text variant="caption">{`In force: ${row.stance.name}`}</Text>
            <Text variant="caption" tone={row.minister ? "secondary" : "warning"}>
              {row.minister ? `${row.chair}: ${row.minister}` : "Nobody is in charge"}
            </Text>
            <Row gap="xs">
              <Track value={reading.value} tone={reading.tone} slim marks={[{ at: reading.full, label: "Everything as planned" }]} label={`${row.name}: ${executionWords(row.quality)}`} />
              <Text variant="caption" weight="strong">
                {`Effect ${executionFigure(row.quality)}`}
              </Text>
            </Row>
            {row.pledges.length > 0 ? <Text variant="caption" tone="gold">{row.pledges.length === 1 ? "1 promise tied to it" : `${row.pledges.length} promises tied to it`}</Text> : null}
          </Pressable>
        );
      })}
    </Column>
    </ReadingFrame>
  );
}

/** The portfolio's condition in one line: what is unstaffed, what is promised, what waits on a signature or a court. */
function portfolioLede(portfolio: readonly PortfolioDomain[], campaign: Campaign): string {
  const empty = portfolio.filter((row) => !row.minister).length;
  const promises = portfolio.reduce((sum, row) => sum + row.pledges.length, 0);
  const stages = orderPipeline(campaign);
  const count = (stage: string): number => stages.find((entry) => entry.stage === stage)?.rows.length ?? 0;
  return [
    empty === 0 ? "Every policy area has someone in charge." : `${empty} of ${portfolio.length} policy areas have nobody in charge, so staff keep them going at a basic level.`,
    promises === 0 ? "No promises are tied to your policies." : `${promises} ${promises === 1 ? "promise is" : "promises are"} tied to your policies.`,
    `${count("desk")} orders ready to sign, ${count("rulemaking")} rules being written, ${count("court")} in court.`,
  ].join(" ");
}

/** What can be proposed here, set apart from what is enacted: every other position as its change from the one in force, then the one verb. */
function Proposals({ campaign, row }: { readonly campaign: Campaign; readonly row: PortfolioDomain }) {
  const charter = charterOf(campaign);
  const table = useMemo(() => stanceComparison(campaign, charter, row.domain), [campaign, charter, row.domain]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const acts = useNationAct(campaign);
  if (acts.done) return <ActDone done={acts.done} onBack={acts.dismiss} backLabel="Back to the options" />;
  const view = choiceView(table);
  const name = table.columns.find((column) => column.id === selected)?.label ?? "";
  const enact = () =>
    selected && void acts.run(() => {
      const result = enactPolicy(campaign, selected);
      if (!result.ok) throw new Error(result.reason);
      return { packet: result.packet, title: `Adopted: ${name}`, lines: [{ label: "Policy", value: name }] };
    }, { tier: "full", title: `Adopt ${name}`, verb: "Confirm and adopt" });
  return (
    <Column id="policy-proposals" gap="sm">
      {acts.layer}
      <Text variant="body" tone="secondary">
        You can choose from {row.alternatives} other {row.alternatives === 1 ? "option" : "options"} here.
        {row.byStatute ? " Some are set by law, so Congress has to pass a bill before they can change." : ""} Nothing below happens until you approve it.
      </Text>
      <CompareChoices title="Compare the options" options={view.options} rows={view.rows} selected={selected} onSelect={setSelected} verb="Adopt this policy" onAuthorize={enact} {...(selected ? { review: stanceReview(campaign, charter, row.domain, selected) } : {})} busy={acts.busy} />
      <ActProblem problem={acts.problem} />
    </Column>
  );
}

/** The states ranked by how much of their economy sits in the parts this program lands on hardest. */
function FeltMost({ row }: { readonly row: PortfolioDomain }) {
  const ranked = useMemo(() => [...stateIndustryShares(row.domain)].map(([id, share]) => ({ id, name: stateById.get(id)?.name ?? (id as string), share })).sort((a, b) => b.share - a.share || a.name.localeCompare(b.name)), [row.domain]);
  const top = Math.max(Number.EPSILON, ...ranked.map((entry) => entry.share));
  return (
    <Pane title="Where it matters most" icon="mapPin" line={`States ranked by how much of their economy is in ${domainShareWords(row.domain)}. This shows who has the most at stake, not what will happen.`}>
      <ReadingFrame title="Share of each state's economy" unit="% of the state's economy" legend={[{ id: "scale", kind: "swatch", label: `Longest bar is ${ranked[0]?.name ?? "the leading state"}`, figure: formatRatio(top), ink: "accent" }]} pressHint="Press a state to open it." help={{ meaning: "Bars are scaled so the longest one is the state with the biggest share. The figure beside each bar is its real share." }}>
      <Collection items={ranked} initial={6} noun="states" render={(entry) => (
        <CardLink key={entry.id} pad="sm" radius="chip" minHeight={44} justifyContent="center" label={`Open ${entry.name}. ${formatRatio(entry.share)} of its economy`} href={place.state(entry.id)} onPress={() => go(place.state(entry.id))}>
          <Row gap="sm">
            <Text variant="label" flexBasis={150} flexShrink={1} minWidth={90}>
              {entry.name}
            </Text>
            <Track value={entry.share / top} slim />
            <Text variant="label" minWidth={56} textAlign="right">
              {formatRatio(entry.share)}
            </Text>
            <Icon name="chevron" size={14} tone="colorTertiary" />
          </Row>
        </CardLink>
      )} />
      </ReadingFrame>
    </Pane>
  );
}

/** What is enacted and how it is carried: the authority, the chair's execution, the stand-up clock and the promises tied to it. */
function Implementation({ row }: { readonly row: PortfolioDomain }) {
  const reading = execution(row);
  return (
    <Column gap="lg">
      <Facts
        items={[
          { label: "Current policy", value: `${row.stance.name}${row.stance.inherited ? ", left by the last president" : ""}` },
          { label: "How you act here", value: `You act here through ${row.authority}.` },
          { label: "Person in charge", value: row.minister ? `${row.chair}, ${row.minister}` : `${row.chair ?? "No one"} (nobody holds this job, so staff keep it going at a basic level)` },
          { label: "Full effect", value: row.standUpWeeks > 0 ? `The current policy takes full effect in ${weeksWords(row.standUpWeeks)}.` : "The current policy is in full effect." },
        ]}
      />
      <ReadingFrame title="How well it's carried out" unit="% more or less effect than the policy as written" legend={[markEntry("written", "As written: full effect"), ...toneKey({ good: "Carried out in full", watch: "Falling short", bad: "Falling well short" })]} help={{ meaning: "The bar shows how much effect the policy has compared with what is written. The line is the full written effect." }}>
        <TrackRow name="Effect" figure={`${executionFigure(row.quality)}: ${executionWords(row.quality)}`} value={reading.value} tone={reading.tone} marks={[{ at: reading.full, label: "As written", strong: true }]} />
      </ReadingFrame>
      <Text variant="caption" tone="secondary">
        {row.minister ? `${row.minister} is in charge of it.` : "Nobody is in charge, so staff keep it going at a basic level."}
      </Text>
      <Pane title="Promises tied to it" icon="flag">
        {row.pledges.length > 0 ? row.pledges.map((pledge) => <Text key={pledge.id} variant="body">&ldquo;{pledge.title}&rdquo;, due {formatDate(pledge.dueDate)}: {pledge.kind === "hold" ? "kept by keeping this policy" : "kept by adopting it"}.</Text>) : <Text variant="body" tone="secondary">No promises are tied to this policy.</Text>}
      </Pane>
      <FeltMost row={row} />
    </Column>
  );
}

export type PolicyScreenProps = {
  readonly campaign: Campaign;
  readonly domain: PolicyDomain;
  readonly view: PolicyView;
  readonly onView: (view: PolicyView) => void;
  readonly onDomain: (domain: PolicyDomain) => void;
  readonly orderSearch: OrderSearch;
  readonly onOrderSearch: (next: OrderSearch) => void;
};

/** The standing program: the portfolio's condition, the six domains, and each domain's proposals, orders and implementation. */
export function PolicyScreen({ campaign, domain, view, onView, onDomain, orderSearch, onOrderSearch }: PolicyScreenProps) {
  const media = useMedia();
  const [compare, setCompare] = useState(false);
  const portfolio = policyPortfolio(campaign);
  const row = portfolio.find((entry) => entry.domain === domain) ?? portfolio[0]!;
  return (
    <Page eyebrow="Domestic Policy Council" icon="order" title="Policy" lede={portfolioLede(portfolio, campaign)} emblem={<Seal spec={sealFor("INST-PRESIDENCY")} size={72} />}>
      <ViewTabs<PolicyView> label={`${row.name} policy sections`} tabs={[{ id: "proposals", label: "Options", count: row.alternatives }, { id: "orders", label: "Orders" }, { id: "implementation", label: "How it's going" }]} selected={view} onSelect={onView} />
      {view === "orders" ? (
        <OrderPipeline campaign={campaign} search={orderSearch} onSearch={onOrderSearch} />
      ) : (
        <Row gap="lg" top wrap={!media.desktop}>
          {media.desktop ? (
            <Column width={300}>
              <DomainList portfolio={portfolio} selected={row.domain} onDomain={onDomain} />
            </Column>
          ) : (
            <Column gap="sm" width="100%">
              <Select label="Policy area" options={portfolio.map((entry) => ({ value: entry.domain, label: entry.name }))} value={row.domain} onChange={(next) => onDomain(next as PolicyDomain)} />
              <Button kind="secondary" size="compact" icon="graph" onPress={() => setCompare(true)}>
                Compare policy areas
              </Button>
              <Sheet open={compare} onClose={() => setCompare(false)} title="All policy areas" eyebrow="The current policy, who's in charge, and how well it's going in each area">
                <DomainList portfolio={portfolio} selected={row.domain} onDomain={(next) => { setCompare(false); onDomain(next); }} />
              </Sheet>
            </Column>
          )}
          <Column flex={1} minWidth={0} gap="lg">
            <Pane title={row.name} {...(isIconName(row.icon) ? { icon: row.icon } : {})} line={row.question}>
              <Text variant="body">
                Current policy: <Text weight="strong">{row.stance.name}</Text>
                {row.stance.inherited ? " (left by the last president)" : ""}. {row.stance.summary}
              </Text>
              <LawTopicHelp topic="executive-direction" compact />
            </Pane>
            {view === "implementation" ? <Implementation row={row} /> : <Proposals key={row.domain} campaign={campaign} row={row} />}
          </Column>
        </Row>
      )}
    </Page>
  );
}
