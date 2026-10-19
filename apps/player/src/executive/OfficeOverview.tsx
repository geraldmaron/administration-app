import type { Campaign } from "@admin/engine";
import { formatRatio, type OfficeCondition, type OfficeFile } from "@admin/player-core";
import { CardGrid, Column, Icon, LegalCitation, Meter, ReadingFrame, Row, Surface, Text, markKeyEntries, type IconName } from "@admin/ui";
import { termDoor } from "../handbook/term-door";
import { DossierSection } from "@admin/ui/dossier";
import { FigureBand } from "@admin/ui/nation";
import { useOpenAuthority } from "../law/AuthorityProvider";
import { againstBranch, appointmentWords, branchAverages, type ConditionKey } from "./office-view";
import { QUALITY_METER, actCitation, qualityOf } from "./present";

function Appointment({ file }: { readonly file: OfficeFile }) {
  const openLaw = useOpenAuthority();
  const words = appointmentWords(file);
  const law = file.lever === "cabinet" ? actCitation("nominate") : file.lever === "acting" ? actCitation("acting") : undefined;
  const condition = file.condition;
  return (
    <Column gap="sm">
      <Surface level="raised" pad="md" accentEdge="gold">
        <Row gap="sm" top wrap>
          <Icon name="appoint" size={20} tone="gold" />
          <Column flex={1} gap="2xs" minWidth={200}>
            <Text variant="caption" tone="secondary">
              Who picks the leader
            </Text>
            <Text variant="label">{words.title}</Text>
            <Text variant="caption" tone="secondary">
              {words.detail}
            </Text>
          </Column>
          {law ? <LegalCitation citation={law} onPress={() => openLaw(law.cite)} /> : null}
        </Row>
      </Surface>
      <FigureBand
        label="The office in numbers"
        items={[
          ...(condition ? [{ label: "Work piled up", value: String(condition.backlog), unit: "items" }, { label: "Orders in progress", value: String(condition.directives) }] : []),
          ...(condition && condition.vacantDays > 0 ? [{ label: "Without a confirmed leader", value: String(condition.vacantDays), unit: "days" }] : []),
          ...(file.office.actingLimitDays !== undefined ? [{ label: "Most days a stand-in can serve", value: String(file.office.actingLimitDays), unit: "days" }] : []),
        ]}
      />
    </Column>
  );
}

const METERS: readonly { readonly key: ConditionKey; readonly icon: IconName; readonly label: string; readonly caption: string }[] = [
  { key: "implementationQuality", icon: "approve", label: "Work done", caption: "How well it carries out orders" },
  { key: "capacity", icon: "building", label: "Capacity", caption: "Whether it can handle its job" },
  { key: "staffing", icon: "subjectPerson", label: "Staffing", caption: "How many jobs are filled" },
  { key: "morale", icon: "layerBlocs", label: "Morale", caption: "How the workers feel" },
];

/** Office performance as four readings on one 0 to 100 axis, each against the branch's average so the reading means something. */
function Condition({ campaign, condition }: { readonly campaign: Campaign; readonly condition: OfficeCondition }) {
  const averages = branchAverages(campaign);
  const gap = averages ? againstBranch(condition, averages) : undefined;
  return (
    <DossierSection n={1} icon="graph" title="How the department is doing" note="Each score runs from 0 to 100%. The mark shows the average across your whole government.">
      <ReadingFrame title="Four readings of the office" unit="% of the most it could be" period="Now" legend={averages ? markKeyEntries([{ kind: "historical" }]) : []} help={{ meaning: "Each bar is one reading of how the office is doing, from 0 to 100%. The tick marks the average across your whole government, so a bar past the tick is doing better than most.", term: termDoor("policy-delivery", "policy delivery") }}>
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 4, wide: 4 }} gap="lg">
        {METERS.map((meter) => {
          const value = condition[meter.key];
          const points = gap?.[meter.key];
          return (
            <Column key={meter.key} flexGrow={1} gap="xs">
              <Meter label={meter.label} value={value} figure={formatRatio(value)} tone={QUALITY_METER[qualityOf(value)]} marks={averages ? [{ id: "branch", label: `Government average ${formatRatio(averages[meter.key])}`, at: averages[meter.key], kind: "historical" }] : []} />
              <Text variant="caption" tone="secondary">
                {meter.caption}
                {points === undefined ? "" : ` · ${points === 0 ? "the same as" : `${Math.abs(points)} pts ${points > 0 ? "above" : "below"}`} the average`}
              </Text>
            </Column>
          );
        })}
      </CardGrid>
      </ReadingFrame>
    </DossierSection>
  );
}

/** The office at a glance: its mandate, the rule that fills it and the law behind that rule, its workload, and how it runs against the branch. */
export function OfficeOverview({ campaign, file }: { readonly campaign: Campaign; readonly file: OfficeFile }) {
  return (
    <Column gap="xl">
      <Column gap="xs" role="region" aria-label="What it does">
        <Row gap="sm">
          <Icon name="building" size={20} tone="gold" />
          <Text variant="title" role="heading" aria-level={2}>
            What it does
          </Text>
        </Row>
        <Text variant="document">{file.institution.mandate}</Text>
      </Column>
      <Appointment file={file} />
      {file.condition ? (
        <Condition campaign={campaign} condition={file.condition} />
      ) : (
        <Text variant="body" tone="secondary">
          The game doesn't score this office's day-to-day work.
        </Text>
      )}
    </Column>
  );
}
