import { useState, type ReactNode } from "react";
import type { ProjectRow, ProjectsReading, ServiceRow, ServiceTone, ServicesReading } from "@admin/player-core";
import { Tag, Column, HelpButton, Row, Surface, Text, useMedia, type InkRole } from "@admin/ui";
import { Segmented } from "@admin/ui/forms";
import { BarKey } from "@admin/ui/dossier";
import { InstitutionSeal, OwnLayer, RowTo } from "./parts";

/** The institution behind an office address, for its seal; the services name their department in words only. */
export type SealOf = (href: string) => { readonly id: string; readonly name: string } | undefined;

const STATUS = { good: "success", watch: "warning", bad: "danger", neutral: "outline" } as const;
const RANK: Readonly<Record<ServiceTone, number>> = { bad: 0, watch: 1, neutral: 2, good: 3 };
const AGE_INK: Readonly<Record<string, InkRole>> = { fresh: "successInk", month: "accent", quarter: "warningInk", half: "danger" };
const STAGE_INK: Readonly<Record<string, InkRole>> = { review: "gold", build: "accent", late: "danger" };

const pct = (value: number | undefined): string => (value === undefined ? "—" : `${Math.round(value * 100)}%`);
const weeks = (value: number): string => (value < 10 ? value.toFixed(1) : `${Math.round(value)}`);
const share = (part: number, scale: number): `${number}%` => `${Math.round(Math.max(0, Math.min(1, scale > 0 ? part / scale : 0)) * 1000) / 10}%`;

function FractionSegments({ parts, label }: { readonly parts: readonly { readonly key: string; readonly value: number; readonly ink: InkRole }[]; readonly label: string }) {
  return (
    <Row role="img" aria-label={label} height={10} borderRadius="pill" backgroundColor="borderColor" overflow="hidden">
      {parts.map((part) => (part.value > 0 ? <Column key={part.key} height={10} width={share(part.value, 1)} backgroundColor={part.ink} /> : null))}
    </Row>
  );
}

function Name({ row, sealOf, sub }: { readonly row: { readonly name: string; readonly href: string; readonly department: string; readonly why: string; readonly action: string; readonly tone: ServiceTone; readonly statusLabel: string }; readonly sealOf: SealOf; readonly sub: string }) {
  const seal = sealOf(row.href);
  return (
    <Row gap="sm" flex={1} minWidth={240} top>
      {seal ? <InstitutionSeal id={seal.id} name={seal.name} size={32} /> : null}
      <Column flex={1} gap="2xs">
        <Text variant="label">{row.name}</Text>
        <Text variant="caption" tone="secondary">
          {sub}
        </Text>
        <Row gap="xs">
          <Tag tone={STATUS[row.tone]}>{row.statusLabel}</Tag>
          {row.tone === "good" || row.tone === "neutral" ? null : (
            <OwnLayer>
              <HelpButton label={`Why ${row.name} is ${row.statusLabel.toLowerCase()}`} content={{ title: row.name, meaning: row.why, steps: [row.action] }} />
            </OwnLayer>
          )}
        </Row>
      </Column>
    </Row>
  );
}

/** A service row opens the office that runs it; a row whose office is not in the game is not a door. */
function Line({ href, name, first, children }: { readonly href: string; readonly name: string; readonly first: boolean; readonly children: ReactNode }) {
  return (
    <RowTo first={first} href={href || undefined} label={`Open the office that runs ${name}`}>
      <Row gap="md" wrap padding="md" top>
        {children}
      </Row>
    </RowTo>
  );
}

function ServiceLine({ row, scale, sealOf, first }: { readonly row: ServiceRow; readonly scale: number; readonly sealOf: SealOf; readonly first: boolean }) {
  const media = useMedia();
  const opening = row.status === "opening";
  const ages = row.ages.map((age) => ({ key: age.key, value: scale > 0 ? age.weeks / scale : 0, ink: AGE_INK[age.key] ?? "accent" }));
  return (
    <Line first={first} href={row.href} name={row.name}>
      <Name row={row} sealOf={sealOf} sub={row.owner === row.department ? row.department : `${row.department} · ${row.owner}`} />
      <Column flexBasis={media.phone ? "100%" : 300} flexGrow={1} gap="xs">
        {opening ? <Text variant="caption" tone="tertiary">Not yet tracked</Text> : <FractionSegments parts={ages} label={`${weeks(row.pendingWeeks)} weeks of new cases waiting. ${row.ages.map((age) => `${age.label}: ${weeks(age.weeks)} weeks`).join("; ")}.`} />}
        <Row gap="md" wrap>
          <Text variant="caption">{opening ? "—" : `${weeks(row.pendingWeeks)} weeks of cases waiting`}</Text>
          <Text variant="caption" tone="secondary">{opening ? "" : `${pct(row.lateShare)} waiting over ${row.standardWeeks} weeks`}</Text>
          <Text variant="caption" tone="secondary">{`${pct(row.wrongShare)} decided wrong`}</Text>
          {row.refusedShare === undefined ? null : <Text variant="caption" tone="secondary">{`${pct(row.refusedShare)} turned down`}</Text>}
        </Row>
      </Column>
    </Line>
  );
}

function ProgramLine({ row, scale, sealOf, first }: { readonly row: ProjectRow; readonly scale: number; readonly sealOf: SealOf; readonly first: boolean }) {
  const media = useMedia();
  const opening = row.status === "opening";
  const stages = row.stages.map((stage) => ({ key: stage.key, value: scale > 0 ? stage.count / scale : 0, ink: STAGE_INK[stage.key] ?? "accent" }));
  return (
    <Line first={first} href={row.href} name={row.name}>
      <Name row={row} sealOf={sealOf} sub={row.reviewer ? `${row.department} · reviewed by ${row.reviewer}` : row.department} />
      <Column flexBasis={media.phone ? "100%" : 300} flexGrow={1} gap="xs">
        {opening ? <Text variant="caption" tone="tertiary">Not yet tracked</Text> : <FractionSegments parts={stages} label={`${row.underway} ${row.unit} underway. ${row.stages.map((stage) => `${stage.label}: ${stage.count}`).join("; ")}.`} />}
        {opening ? null : (
          <Row gap="md" wrap>
            <Text variant="caption">{`${row.underway} ${row.unit} underway`}</Text>
            <Text variant="caption" tone="secondary">{`${row.completed} finished${row.completedLate ? `, ${row.completedLate} late` : ""}`}</Text>
            <Text variant="caption" tone="secondary">{`Next grant ${pct(row.nextAwardReady)} of the way through review · planned for ${row.plannedWeeks} weeks`}</Text>
          </Row>
        )}
      </Column>
    </Line>
  );
}

type Order = "status" | "name";

function ordered<T extends { readonly tone: ServiceTone; readonly name: string }>(rows: readonly T[], order: Order): readonly T[] {
  return order === "name" ? [...rows].sort((a, b) => a.name.localeCompare(b.name)) : [...rows].sort((a, b) => RANK[a.tone] - RANK[b.tone]);
}

function Programs({ reading, sealOf, order }: { readonly reading: ProjectsReading; readonly sealOf: SealOf; readonly order: Order }) {
  if (reading.rows.length === 0) return null;
  return (
    <Column gap="sm">
      <Text variant="title" role="heading" aria-level={3}>
        Grant programs
      </Text>
      <Text variant="caption" tone="secondary">
        {reading.summary}
      </Text>
      <BarKey items={[{ key: "review", label: "In review", ink: "gold" }, { key: "build", label: "Being built", ink: "accent" }, { key: "late", label: "Behind schedule", ink: "danger" }]} />
      <Surface pad="none" overflow="hidden">
        {ordered(reading.rows, order).map((row, index) => (
          <ProgramLine key={row.id} row={row} scale={reading.scale} sealOf={sealOf} first={index === 0} />
        ))}
      </Surface>
    </Column>
  );
}

/**
 * The departments' case work: each service, whether it is keeping up, how
 * long its cases have waited, what it gets wrong, why, and who to look to.
 * Each service is read on its own scale of a normal week's intake, so the
 * rates are compared row by row and never pooled.
 */
export function ServicesPanel({ reading, sealOf }: { readonly reading: ServicesReading; readonly sealOf: SealOf }) {
  const [order, setOrder] = useState<Order>("status");
  return (
    <Column gap="md" role="region" aria-label="How public services are keeping up">
      <Text variant="heading" role="heading" aria-level={2}>
        How public services are keeping up
      </Text>
      <Text variant="body">{reading.summary}</Text>
      <BarKey items={(reading.rows.find((row) => row.ages.length > 0)?.ages ?? []).map((age) => ({ key: age.key, label: age.label, ink: AGE_INK[age.key] ?? "accent" }))} />
      <Text variant="caption" tone="tertiary">
        Each bar shows waiting cases as weeks of normal new cases, so every service uses the same scale.
      </Text>
      <Segmented<Order> label="Order by" value={order} onChange={setOrder} options={[{ value: "status", label: "Worst first" }, { value: "name", label: "Service" }]} />
      <Surface pad="none" overflow="hidden">
        {ordered(reading.rows, order).map((row, index) => (
          <ServiceLine key={row.id} row={row} scale={reading.scaleWeeks} sealOf={sealOf} first={index === 0} />
        ))}
      </Surface>
      <Programs reading={reading.projects} sealOf={sealOf} order={order} />
    </Column>
  );
}
