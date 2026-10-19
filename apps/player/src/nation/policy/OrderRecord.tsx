import { selectDateOfTurn, type Campaign } from "@admin/engine";
import { formatDate, formatRatio, orderSignatures, place, type ReachLine } from "@admin/player-core";
import { Badge, Column, EntityLink, ReadingFrame, Row, Sheet, Text } from "@admin/ui";
import { Collection, Diverging, Facts, TrackRow } from "@admin/ui/nation";
import { go } from "../../shell/navigate";
import { toneKey } from "../keys";

/** Read the stored signature; never reconstruct signed terms from today's draft. */
export function OrderRecord({ campaign, order, recordId, onClose }: { readonly campaign: Campaign; readonly order: string; readonly recordId: string | undefined; readonly onClose: () => void }) {
  const record = campaign.orders.find((entry) => entry.id === recordId && entry.order === order);
  const row = record ? orderSignatures(campaign, order).find((entry) => entry.id === record.id) : undefined;
  const subject = record?.subject;
  const country = subject?.kind === "foreign" || subject?.kind === "entry-class" ? subject.nation : undefined;
  return (
    <Sheet open={recordId !== undefined} onClose={onClose} title="Signed order" eyebrow="What you signed and where it stands now">
      {record && row ? (
        <Column gap="md">
          <Badge status={row.stage === "standing" ? "success" : "outline"}>{row.stage === "standing" ? "In effect" : "Signed"}</Badge>
          <Text variant="title">{row.name}</Text>
          <Text variant="body">{row.line}</Text>
          <Facts
            items={[
              { label: "Signed", value: row.signed ? formatDate(row.signed) : "Date unknown" },
              { label: "Reference number", value: record.id },
              { label: "Court status", value: record.review?.status ?? "No court review" },
              ...(record.rescindedTurn === undefined ? [] : [{ label: "Canceled on", value: formatDate(selectDateOfTurn(campaign, record.rescindedTurn)) }]),
              {
                label: "What it applies to",
                value: country ? <EntityLink label={campaign.nations[country]?.base.identity.name ?? country} href={place.country(country)} onPress={() => go(place.country(country))} /> : subject?.kind === "state" ? <EntityLink label={`${campaign.states[subject.state]?.base.name ?? subject.state} · ${subject.cause}`} href={place.state(subject.state)} onPress={() => go(place.state(subject.state))} /> : subject?.kind === "ports-of-entry" ? "All federal ports of entry" : subject ? subject.kind.replaceAll("-", " ") : "Not recorded",
              },
              ...(record.legalReviewer ? [{ label: "Legal reviewer", value: <EntityLink label={campaign.people[record.legalReviewer.person]?.base.name ?? "Reviewer"} href={place.person(record.legalReviewer!.person)} onPress={() => go(place.person(record.legalReviewer!.person))} /> }] : []),
            ]}
          />
          <ReadingFrame title="Chance of a court challenge when signed" unit="% chance" help={{ meaning: "How likely it was, on the day you signed, that someone would take this order to court. A full bar would be a sure challenge." }}>
            <TrackRow name="Chance" figure={formatRatio(record.challengeChance)} value={record.challengeChance} />
          </ReadingFrame>
          <Text variant="caption" tone="tertiary">
            These are the estimates from the day you signed, and they haven't been updated. If you cancel the order, its past spending and court history stay on the record. If your save didn't keep the full original terms, we don't try to rebuild them.
          </Text>
        </Column>
      ) : (
        <Text variant="body">We couldn't find this signed order in your term.</Text>
      )}
    </Sheet>
  );
}

/** Who an act lands on: groups it helps run right, groups it costs run left, every bar to scale with the heaviest. */
export function ReachBars({ lines, label = "Who it affects", limit = 6 }: { readonly lines: readonly ReachLine[]; readonly label?: string; readonly limit?: number }) {
  if (lines.length === 0) return <Text variant="body" tone="secondary">No group is singled out.</Text>;
  const heaviest = Math.max(...lines.map((line) => line.weight), 0.0001);
  const helps = lines.filter((line) => line.direction === "helps").length;
  return (
    <ReadingFrame title={label} unit="Size of the effect, to scale with the biggest" legend={toneKey({ good: "Helps this group (right of the line)", bad: "Hurts this group (left of the line)" })} help={{ meaning: "Each bar starts at a center line. A bar to the right helps that group, and a bar to the left costs it. The longest bar is the group affected most." }}>
    <Column gap="xs" role="group" aria-label={label}>
      <Row between>
        <Text variant="caption" tone="danger">← Hurts {lines.length - helps}</Text>
        <Text variant="caption" tone="success">Helps {helps} →</Text>
      </Row>
      <Collection items={lines} initial={limit} noun="groups" gap="2xs" render={(line) => {
        const good = line.direction === "helps";
        return (
          <Row key={line.cohort} gap="sm">
            <Text variant="caption" width={140} numberOfLines={2}>{line.name}</Text>
            <Diverging value={good ? line.weight : -line.weight} scale={heaviest} />
            <Text variant="caption" weight="strong" tone={good ? "success" : "danger"} minWidth={64} textAlign="right">{good ? "▲ Helps" : "▼ Hurts"}</Text>
          </Row>
        );
      }} />
    </Column>
    </ReadingFrame>
  );
}
