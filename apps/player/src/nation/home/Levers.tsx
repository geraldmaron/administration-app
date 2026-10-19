import type { Campaign } from "@admin/engine";
import { appropriationStatus, economyReading, orderPipeline, place } from "@admin/player-core";
import { CardGrid, Column, Icon, Pressable, Row, Text, View, type IconName } from "@admin/ui";
import { go } from "../../shell/navigate";
import { VALENCE_TEXT, valenceOf, type Valence } from "../format";

/** Funding this close to its end needs the President this week. */
const FUNDING_ALARM_WEEKS = 8;

type Lever = { readonly href: string; readonly icon: IconName; readonly label: string; readonly does: string; readonly reading: string; readonly note: string; readonly valence: Valence };

/** Each place you run the country from, what you can do there, and the one live reading that says whether it needs you. */
function levers(campaign: Campaign, declared: number): readonly Lever[] {
  const jobs = economyReading(campaign, "unemployment");
  const funding = appropriationStatus(campaign);
  const ready = orderPipeline(campaign).find((stage) => stage.stage === "desk")?.rows.length ?? 0;
  const left = Math.max(0, funding.weeksLeft);
  return [
    { href: place.policy(), icon: "order", label: "Policy", does: "Set your stance on each issue and sign executive orders.", reading: String(ready), note: ready === 1 ? "order ready to sign" : "orders ready to sign", valence: "neutral" },
    { href: place.budget(), icon: "budget", label: "Budget", does: "Decide where federal money goes and ask Congress to fund it.", reading: funding.shutdown ? "Closed" : `${left} ${left === 1 ? "week" : "weeks"}`, note: funding.shutdown ? "The government is closed" : "of funding left", valence: funding.shutdown || left <= FUNDING_ALARM_WEEKS ? "bad" : left <= 16 ? "watch" : "good" },
    { href: place.economy(), icon: "economyGrowth", label: "Economy", does: "Watch jobs and prices, and use the few tools a President has.", reading: jobs?.tile.figure ?? "Not available", note: "Unemployment", valence: valenceOf(jobs?.tile.stance) },
    { href: place.emergency(), icon: "caution", label: "Emergencies", does: "Declare, renew or end emergencies, and see every problem at once.", reading: String(declared), note: declared === 1 ? "declaration in force" : "declarations in force", valence: declared > 0 ? "watch" : "good" },
  ];
}

/** The four places a President runs the country from, each a door the size of its card. */
export function Levers({ campaign, declared }: { readonly campaign: Campaign; readonly declared: number }) {
  return (
    <CardGrid columns={{ phone: 1, tablet: 2, desktop: 4, wide: 4 }} gap="md" role="list" aria-label="Where you run the country">
      {levers(campaign, declared).map((lever) => (
        <Pressable key={lever.href} role="link" aria-label={`${lever.label}. ${lever.does} ${lever.reading} ${lever.note}`} href={lever.href} onPress={() => go(lever.href)} flexGrow={1} padding="lg" borderWidth={1} borderColor="borderColor" borderRadius="card" backgroundColor={{ default: "surfaceRaised", hover: "surfaceHover", press: "backgroundPress" }}>
          <Column gap="sm" flexGrow={1}>
            <Row gap="sm">
              <Icon name={lever.icon} size={22} tone="gold" weight="fill" />
              <Text variant="body" weight="medium" flex={1}>
                {lever.label}
              </Text>
            </Row>
            <Text variant="label" weight="regular" tone="secondary">
              {lever.does}
            </Text>
            <View flexGrow={1} />
            <Row gap="xs" alignItems="baseline" wrap>
              <Text variant="heading" tone={VALENCE_TEXT[lever.valence]} tabular>
                {lever.reading}
              </Text>
              <Text variant="caption" tone="secondary">
                {lever.note}
              </Text>
            </Row>
            <Row gap="2xs" alignSelf="flex-end">
              <Text variant="caption" tone="secondary">{`Open ${lever.label}`}</Text>
              <Icon name="chevron" size={14} tone="colorTertiary" />
            </Row>
          </Column>
        </Pressable>
      ))}
    </CardGrid>
  );
}
