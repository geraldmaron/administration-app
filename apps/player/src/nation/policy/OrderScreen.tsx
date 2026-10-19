import { useMemo, useState } from "react";
import { createRngStreams, likelihoodFromUnitInterval, signOrder, type Campaign, type OrderSubject } from "@admin/engine";
import { ORDER_SIGN, charterOf, formatDate, formatRatio, orderDesk, orderReview, orderSignatures, place, type OrderDesk, type PipelineRow } from "@admin/player-core";
import { Badge, CardLink, Column, Icon, Page, ReadingFrame, Row, Text, useMedia } from "@admin/ui";
import { Collection, CompareChoices, Facts, TrackRow } from "@admin/ui/nation";
import { Panel } from "@admin/ui/world";
import { BackButton } from "../../shell/BackButton";
import { ActDone, ActProblem } from "../ActDone";
import { useNationAct, type NationAct } from "../act";
import { choiceView } from "../choice";
import { toneKey } from "../keys";
import { OrderAuthorityCite, OrderDocument } from "./OrderDocument";
import { BlockedAssets, CleanPower, Declarations, DefenseContract, OffshoreSales, Rescind, ReviewFindings } from "./OrderFollowups";
import { OrderRecord, ReachBars } from "./OrderRecord";
import { SubjectPicker, useOrderSubject } from "./order-subjects";
import { orderTerms, riskTable, type OrderTerms } from "./order-terms";

function TermsList({ terms }: { readonly terms: OrderTerms }) {
  return (
    <Column gap="sm">
      <Facts
        items={[
          { icon: "mapPin", label: "Covers", value: terms.scope },
          { icon: "budget", label: "Cost now", value: terms.costNow },
          { icon: "domesticLedger", label: "Ongoing cost", value: terms.recurring },
          { icon: "building", label: "Department in charge", value: terms.department },
          { icon: "schedule", label: "When it starts", value: terms.timing },
          ...(terms.changes.length > 0 ? [{ icon: "graph" as const, label: "What it changes", value: <Column gap="2xs">{terms.changes.map((line) => <Text key={line.label} variant="body">{line.label} <Text tone={line.tone === "favorable" ? "success" : line.tone === "adverse" ? "danger" : "primary"}>{line.text}</Text></Text>)}</Column> }] : []),
        ]}
      />
      <Text variant="label" tone="secondary">Where your power comes from</Text>
      <OrderAuthorityCite terms={terms} plain />
    </Column>
  );
}

function PriorSignatures({ rows, onOpen }: { readonly rows: readonly PipelineRow[]; readonly onOpen: (id: string) => void }) {
  if (rows.length === 0) return null;
  return (
    <Panel title="Times you signed it before" icon="record">
      <Collection items={rows} initial={3} noun="signings" render={(row) => (
        <CardLink key={row.id} role="button" pad="sm" radius="chip" label={`Open the order you signed${row.signed ? ` on ${formatDate(row.signed)}` : ""}`} onPress={() => onOpen(row.id)}>
          <Row gap="sm" top>
            <Icon name="dossier" size={18} tone="colorSecondary" />
            <Column flex={1} gap="2xs">
              <Text variant="label">{row.signed ? `Signed ${formatDate(row.signed)}` : "Signed"}</Text>
              <Text variant="caption" tone="secondary">{row.line}</Text>
            </Column>
            <Icon name="chevron" size={14} tone="colorTertiary" />
          </Row>
        </CardLink>
      )} />
    </Panel>
  );
}

function Authorization({ campaign, desk, subject, act, onSign }: { readonly campaign: Campaign; readonly desk: OrderDesk; readonly subject: OrderSubject | undefined; readonly act: NationAct; readonly onSign: () => void }) {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const view = choiceView(riskTable(desk));
  const sign = () => {
    onSign();
    void act.run(() => {
      const result = signOrder(campaign, charterOf(campaign), desk.order.id, createRngStreams(campaign.seed), subject);
      if (!result.ok) throw new Error(result.reason);
      const ruling = result.record.review ? result.record.review.dueTurn - campaign.turn : 0;
      return { packet: result.packet, title: `Signed: ${desk.order.name}`, lines: [{ label: "Challenged in court", value: result.contested ? `Yes. A court review starts in ${ruling} weeks` : "No" }] };
    }, { tier: "full", title: `Sign ${desk.order.name}`, verb: "Confirm and sign", lines: [{ label: "Order", value: desk.order.name }, { label: "Your power comes from", value: desk.authority ? `${desk.authority.name}, ${desk.authority.cite}` : "None" }, { label: "What it commits you to", value: orderReview(desk) }] });
  };
  return (
    <Column gap="sm">
      <CompareChoices title="Your decision" options={view.options} rows={view.rows} selected={selected} onSelect={setSelected} verb="Sign the order" onAuthorize={sign} {...(selected === ORDER_SIGN ? { review: orderReview(desk) } : {})} busy={act.busy} />
      <ActProblem problem={act.problem} />
    </Column>
  );
}

function Status({ desk, done, latest }: { readonly desk: OrderDesk; readonly done: boolean; readonly latest: PipelineRow | undefined }) {
  const chance = desk.projection.challengeChance;
  return (
    <Panel id="order-status" title="Status" icon="pending">
      <Row gap="sm" wrap>
        <Badge status={done ? "success" : "warning"}>{done ? "Signed" : "Draft"}</Badge>
        <Text variant="body" flex={1}>
          {done ? (latest ? latest.line : "It's in your Record.") : desk.available ? "Ready for your signature." : `Can't be signed yet. It needs ${desk.missing ?? "a legal power it doesn't have yet"}.`}
        </Text>
      </Row>
      {done ? null : (
        <Column gap="2xs">
          <ReadingFrame title="Chance someone challenges it in court" unit="% chance" legend={toneKey({ good: "Under 25%", watch: "25% to 49%", bad: "50% or more" })} help={{ meaning: "How likely it is that someone takes this order to court if you sign it. A fuller bar is a likelier challenge." }}>
            <TrackRow name="Chance" figure={formatRatio(chance)} value={chance} tone={chance < 0.25 ? "good" : chance < 0.5 ? "watch" : "bad"} />
          </ReadingFrame>
          <Text variant="caption" tone="secondary">
            Our estimate: {likelihoodFromUnitInterval(chance).toLowerCase()}. {desk.projection.reasoning}
          </Text>
        </Column>
      )}
    </Panel>
  );
}

/**
 * One executive order: the paper under the President's seal with the
 * decision beneath it, where the comparison has the width to read, and beside
 * it the status and the critical terms with the law they rest on. After the
 * signature the page keeps the terms that were signed.
 */
export function OrderScreen({ campaign, id, recordId, onRecord }: { readonly campaign: Campaign; readonly id: string; readonly recordId: string | undefined; readonly onRecord: (id: string | undefined) => void }) {
  const media = useMedia();
  const { subject, picker, choose, key } = useOrderSubject(campaign, id);
  const desk = useMemo(() => orderDesk(campaign, charterOf(campaign), id, subject), [campaign, id, subject]);
  const act = useNationAct(campaign);
  const [committed, setCommitted] = useState<OrderTerms | undefined>();
  const terms = useMemo(() => (desk ? orderTerms(campaign, desk) : undefined), [campaign, desk]);
  if (!desk || !terms) {
    return (
      <Page eyebrow="Domestic Policy Council" title="Order not found" lede="We couldn't find this order.">
        <BackButton parent={place.policy()} parentLabel="Policy" />
      </Page>
    );
  }
  const signatures = orderSignatures(campaign, id);
  const done = act.done;
  const shown = done && committed ? committed : terms;
  const latest = signatures[0];
  const rail = (
    <Column gap="lg" flex={2} minWidth={300} {...(media.desktop ? {} : { flexBasis: "100%" as const })}>
      <Status desk={desk} done={done !== undefined} latest={latest} />
      <Panel title={done ? "What you signed" : "Key terms"} icon="law">
        <TermsList terms={shown} />
      </Panel>
      <Rescind campaign={campaign} id={id} />
      <ReviewFindings campaign={campaign} id={id} />
      <OffshoreSales campaign={campaign} id={id} />
      <BlockedAssets campaign={campaign} id={id} />
      <DefenseContract campaign={campaign} id={id} />
      <CleanPower campaign={campaign} id={id} />
      {id === "order-border-controls" && !done ? <Panel title="Where it applies" icon="mapPin" lede="It covers the checks on who may enter the country at federal border crossings, airports, and seaports. It doesn't allow enforcement against people already inside the country, and it doesn't promise the same staffing at every crossing." /> : null}
      {desk.reachLines.length > 0 ? (
        <Panel title="Who it affects" icon="layerBlocs">
          <ReachBars lines={desk.reachLines} />
        </Panel>
      ) : null}
    </Column>
  );
  return (
    <Page eyebrow="Domestic Policy Council" icon="order" title={desk.order.name} lede={desk.order.summary}>
      {act.layer}
      <OrderRecord campaign={campaign} order={id} recordId={recordId} onClose={() => onRecord(undefined)} />
      <Row gap="lg" top wrap={!media.desktop}>
        <Column flex={3} minWidth={300} gap="md" {...(media.desktop ? {} : { flexBasis: "100%" as const })}>
          <OrderDocument campaign={campaign} terms={shown} {...(done ? { signedOn: done.date, ...(latest ? { recordId: latest.id } : {}) } : {})} {...(desk.available || done ? {} : { blocked: desk.missing ?? "a legal power it doesn't have yet" })} />
          {done ? (
            <ActDone done={done} />
          ) : (
            <>
              {picker ? <SubjectPicker picker={picker} value={key} onChange={choose} /> : null}
              <Declarations campaign={campaign} id={id} subject={subject} />
              <Authorization campaign={campaign} desk={desk} subject={subject} act={act} onSign={() => setCommitted(terms)} />
              <PriorSignatures rows={signatures} onOpen={onRecord} />
            </>
          )}
          <BackButton parent={place.policy()} parentLabel="Policy" />
        </Column>
        {rail}
      </Row>
    </Page>
  );
}
