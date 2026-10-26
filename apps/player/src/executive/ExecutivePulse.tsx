import { LOST_LABELS, formatRatio, type ExecutiveOverview } from "@admin/player-core";
import { CardGrid, Column, Icon, Meter, Pane, Reading, ReadingFrame, Row, Text, markKeyEntries, type IconName, type MeterMark } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { Distribution } from "@admin/ui/dossier";
import { QUALITY_METER, qualityOf } from "./present";

const DELIVERY_MARKS: readonly MeterMark[] = [{ id: "holds", label: "Holds from 60%", at: 0.6, kind: "target" }, { id: "fails", label: "Fails under 40%", at: 0.4, kind: "gate" }];

function PulseTile({ icon, eyebrow, figure, unit, children }: { readonly icon: IconName; readonly eyebrow: string; readonly figure: string; readonly unit: string; readonly children: React.ReactNode }) {
  return (
    <Pane level="base">
      <Column gap="sm" flexGrow={1}>
        <Reading name={eyebrow} value={figure} period={unit} icon={icon} minWidth={0} />
        {children}
      </Column>
    </Pane>
  );
}

/**
 * The executive at a glance: how much of the requested work the branch
 * delivers and what it is losing, how the chairs are held, and how the
 * public services are keeping up.
 */
export function ExecutivePulse({ overview }: { readonly overview: ExecutiveOverview }) {
  const { delivery, chairs, serviceTally } = overview;
  const assessed = serviceTally.good + serviceTally.watch + serviceTally.bad;
  const tone = qualityOf(delivery.quality);
  return (
    <CardGrid columns={{ phone: 1, tablet: 1, desktop: 3, wide: 3 }} gap="lg" role="region" aria-label="How your government is running">
      <PulseTile icon="graph" eyebrow="Work getting done" figure={formatRatio(delivery.quality)} unit="of the work you've asked for, with bigger offices counting more">
        <ReadingFrame title="How much of the work is delivered" unit="% of the requested work, bigger offices counting more" period="Now" legend={markKeyEntries(DELIVERY_MARKS)} help={{ meaning: "The bar is how much of the work you've asked for the government gets done. At 60% or more the branch holds its own. Under 40% it is failing at its job. In between it is behind. The words under the bar name each line.", term: termDoor("policy-delivery", "policy delivery") }}>
          <Meter label="Delivery" value={delivery.quality} figure={formatRatio(delivery.quality)} tone={QUALITY_METER[tone]} marks={DELIVERY_MARKS} />
        </ReadingFrame>
        {delivery.lost.map((part) => (
          <Row key={part.key} gap="xs">
            <Icon name="adverse" size={14} tone="danger" />
            <Text variant="caption">
              −{(part.value * 100).toFixed(1)} pts · {LOST_LABELS[part.key]}
            </Text>
          </Row>
        ))}
      </PulseTile>
      <PulseTile icon="subjectPerson" eyebrow={`Staffing · ${chairs.total} top jobs`} figure={String(chairs.confirmed)} unit={`confirmed · ${overview.nominations.length} nominees waiting on the Senate`}>
        <ReadingFrame title="How the top jobs are held" unit={`${chairs.total} top jobs, by who holds them`} help={{ meaning: "The bar splits the top jobs by how they are held. Confirmed means the Senate approved the person. A stand-in fills the job without that approval. Empty means no one is doing it.", term: termDoor("confirmation", "confirmation") }}>
          <Distribution
            label="Staffing"
            parts={[
              { key: "confirmed", count: chairs.confirmed, label: "confirmed", ink: "successInk" },
              { key: "acting", count: chairs.acting, label: "stand-in", ink: "warningInk" },
              { key: "vacant", count: chairs.vacant, label: "empty", ink: "danger" },
            ]}
          />
        </ReadingFrame>
      </PulseTile>
      <PulseTile icon="building" eyebrow="Public services" figure={`${assessed} of ${serviceTally.total}`} unit="services measured">
        <ReadingFrame title="How the public services are keeping up" unit={`${serviceTally.total} services, by how they are doing`} help={{ meaning: "Each public service is rated by how it is keeping up with demand. The bar splits all of them. A service not measured has no rating yet, so it is counted apart." }}>
        <Distribution
          label="Public services"
          parts={[
            { key: "good", count: serviceTally.good, label: "keeping up", ink: "successInk" },
            { key: "watch", count: serviceTally.watch, label: "behind or delayed", ink: "warningInk" },
            { key: "bad", count: serviceTally.bad, label: "critical", ink: "danger" },
            { key: "neutral", count: serviceTally.neutral, label: "not measured", ink: "colorTertiary" },
          ]}
        />
        </ReadingFrame>
      </PulseTile>
    </CardGrid>
  );
}
