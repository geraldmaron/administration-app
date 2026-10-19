import type { Campaign, Chamber, ChamberComposition, ExecutiveOrder, UsMajorParty } from "@admin/engine";
import { chamberMajorityLine, formatRatio } from "@admin/player-core";
import { Column, Icon, Meter, ReadingFrame, Row, Text, View, type IconName } from "@admin/ui";
import { StackedBar, segmentKeyEntries } from "@admin/ui/news";
import { CheckCard } from "@admin/ui/forms";
import { PARTY_INK } from "../glyphs";
import { Reading } from "../parts";

type Share = { readonly party: "democrat" | "independent" | "republican"; readonly seats: number; readonly label: string };

function shares(composition: ChamberComposition, anchor: UsMajorParty): readonly Share[] {
  const of = (party: UsMajorParty) => (party === anchor ? composition.administration : composition.opposition);
  return [
    { party: "democrat", seats: of("democrat"), label: "Democrats" },
    { party: "independent", seats: composition.independent, label: "Independents" },
    { party: "republican", seats: of("republican"), label: "Republicans" },
  ];
}

/** A chamber as one bar of its seats by party, with the majority line drawn across it and keyed. */
function ChamberBar({ label, composition, anchor, verdict }: { readonly label: string; readonly composition: ChamberComposition; readonly anchor: UsMajorParty; readonly verdict: string }) {
  const parts = shares(composition, anchor).map((part) => ({ key: part.party, count: part.seats, label: part.label, ink: PARTY_INK[part.party] }));
  const total = composition.seats;
  const majority = Math.floor(total / 2) + 1;
  return (
    <ReadingFrame
      title={label}
      unit="Seats"
      period="On the day you take office"
      legend={[...segmentKeyEntries(parts), { id: "majority", kind: "tick", label: `Line: ${majority} of ${total} seats make a majority`, ink: "color", weight: 2 }]}
      help={{ meaning: "The bar is every seat in the chamber, split by party. The line across it is the number of seats that makes a majority." }}
    >
      <StackedBar label={label} height={18} segments={parts} mark={{ at: majority / total, label: `${majority} of ${total} seats make a majority` }} />
      <Text variant="caption" tone="secondary">
        {verdict}
      </Text>
    </ReadingFrame>
  );
}

/** The Congress and public the President arrives to, read from the sealed preview. */
export function Arrival({ campaign }: { readonly campaign: Campaign }) {
  const anchor = campaign.congress.caucusAnchor;
  const { house, senate } = campaign.congress.chambers;
  const approval = campaign.player.metrics.approval;
  const line = (chamber: Chamber) => chamberMajorityLine(campaign, chamber);
  const halfMarks = [{ id: "half", label: "Half the country", at: 0.5, kind: "historical" as const }];
  return (
    <Reading icon="subjectCapitol" title="What you start with">
      <ReadingFrame title="Approval on day one" unit="% of adults who approve" period="On the day you take office" legend={[{ id: "approval", kind: "swatch", label: "Approval", ink: "accent", figure: formatRatio(approval) }, { id: "half", kind: "tick", label: "Line: half the country", ink: "gold", weight: 2 }]} help={{ meaning: "The filled part of the bar is the share of adults who approve of you when you take office. The line at the middle is half the country." }}>
        <Meter label="Approval" value={approval} figure={formatRatio(approval)} marks={halfMarks} />
      </ReadingFrame>
      <ChamberBar label="The Senate" composition={senate} anchor={anchor} verdict={line("senate")} />
      <ChamberBar label="The House" composition={house} anchor={anchor} verdict={line("house")} />
    </Reading>
  );
}

const ORDER_GLYPH: Readonly<Record<ExecutiveOrder["domain"], IconName>> = {
  security: "shield",
  economy: "economyGrowth",
  civil: "law",
  emergency: "eventEmergency",
};

/** How far an order reaches past the office's own writ, which is what invites a challenge, in quarters. */
function reachSteps(overreach: number): number {
  return Math.min(4, Math.max(1, Math.ceil(overreach * 4)));
}

const REACH_WORD = ["Well within your powers", "Near the limit of your powers", "Past the limit of your powers", "Far past your powers"] as const;

function Reach({ order }: { readonly order: ExecutiveOrder }) {
  const steps = reachSteps(order.overreach);
  return (
    <Row gap="md" wrap marginTop="2xs">
      <Row gap="xs" role="img" aria-label={`How far it stretches your powers: ${REACH_WORD[steps - 1]}`}>
        <Row gap="2xs" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <View key={step} width={14} height={8} borderRadius="chip" backgroundColor={step <= steps ? "warningInk" : "borderColor"} />
          ))}
        </Row>
        <Text variant="caption" tone="secondary">
          {REACH_WORD[steps - 1]}
        </Text>
      </Row>
      <Row gap="xs">
        <Icon name={order.viaRulemaking ? "schedule" : "sign"} size={16} tone="colorSecondary" />
        <Text variant="caption" tone="secondary">
          {order.viaRulemaking ? "Takes effect after a public comment period" : "Takes effect when you sign"}
        </Text>
      </Row>
    </Row>
  );
}

/** The orders the President may sign the moment the oath is taken; none is a choice too. */
export function Orders({ orders, picks, toggle }: { readonly orders: readonly ExecutiveOrder[]; readonly picks: readonly string[]; readonly toggle: (id: string) => void }) {
  if (orders.length === 0) return <Text variant="body" tone="secondary">With this setup, there are no orders to sign on your first morning.</Text>;
  return (
    <Column gap="sm" role="group" aria-label="Orders you can sign on day one">
      <Text variant="title" role="heading" aria-level={3}>
        Orders you can sign on day one
      </Text>
      <Text variant="caption" tone="secondary">
        An executive order is an instruction you give the government on your own, without a vote in Congress. Any you pick here are signed the moment you take the oath, and they become the first entries in your Record. You don't have to pick any.
      </Text>
      {orders.map((order) => (
        <CheckCard key={order.id} label={order.name} detail={order.summary} icon={ORDER_GLYPH[order.domain]} checked={picks.includes(order.id)} onChange={() => toggle(order.id)}>
          <Reach order={order} />
        </CheckCard>
      ))}
    </Column>
  );
}
