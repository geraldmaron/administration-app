import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { bilateralTradePartners, formatMoney, type ActAssessment, type ActConfig, type ActWorkspace } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Card, CardGrid, Column, Icon, Row, Text } from "@admin/ui";
import { OddsSteps } from "@admin/ui/review";
import { LawChips } from "../parts";
import { actAuthorities } from "../law";
import { Changes, Finding, LockedPath, moneySentence } from "./readings";
import { PlanTerms, type TariffPick } from "./PlanTerms";

// The one option being planned: its terms on one side and, on the other,
// what it changes from today once those terms are set. The staff's other
// findings (who reacts, what could go wrong) follow as plain lines.

// The rows the plan already draws above, and the ones that only restate the option.
const DRAWN = new Set(["What it does", "Chance it works", "Cost now", "Revenue", "When", "Would they accept", "Would they sign", "Congress says yes", "Chance they hit back"]);

const STEP: Readonly<Record<string, number>> = { remote: 1, unlikely: 2, "roughly even": 3, "could go either way": 3, likely: 4, "almost certain": 5 };
const VALENCE = { favorable: "good", caution: "watch", adverse: "bad" } as const;

function WhatChanges({ view, chosen, assessment, tariff }: { readonly view: ActWorkspace; readonly chosen: NonNullable<ActWorkspace["chosen"]>; readonly assessment: ActAssessment; readonly tariff?: TariffPick }) {
  const several = tariff?.reading && tariff.picked.length > 1 ? tariff.reading : undefined;
  const odds = chosen.preview.odds;
  const law = actAuthorities(chosen.option, view.terms.tariff?.law.statute);
  const findings = assessment.rows.filter((row) => !DRAWN.has(row.label));
  return (
    <Card title="What changes from today" icon="graph">
      <Column gap="lg">
        <Row gap="xl" wrap>
          {odds ? (
            <Column gap="2xs" minWidth={140}>
              <Text variant="caption" tone="secondary">{odds.label}</Text>
              <OddsSteps step={STEP[odds.word.toLowerCase()] ?? 3} word={odds.word.charAt(0).toUpperCase() + odds.word.slice(1)} valence={VALENCE[odds.stance]} label={odds.label} />
            </Column>
          ) : null}
          <Column gap="2xs" minWidth={160} flexShrink={1}>
            <Text variant="caption" tone="secondary">Money</Text>
            <Text variant="label" tone={chosen.preview.money?.perYearIn || several ? "success" : "primary"}>{several ? `Brings in about ${formatMoney(several.revenue)} a year across ${several.ordered} goods` : moneySentence(chosen.preview.money)}</Text>
          </Column>
          <Column gap="2xs" minWidth={140} flexShrink={1}>
            <Text variant="caption" tone="secondary">When</Text>
            <Text variant="label">{chosen.preview.timing}</Text>
          </Column>
        </Row>
        {chosen.preview.basis ? <Text variant="caption" tone="tertiary">{chosen.preview.basis}</Text> : null}
        {chosen.preview.warning ? (
          <Row gap="xs" top role="alert">
            <Icon name="conflict" size={16} tone="danger" />
            <Text variant="label" tone="danger" flex={1}>{chosen.preview.warning}</Text>
          </Row>
        ) : null}
        <Changes view={chosen} />
        {several ? <Text variant="caption" tone="secondary">{`The findings below are for ${several.goods[0]?.name.toLowerCase() ?? "the first good"}. Each good's own reading is under it in the terms.`}</Text> : null}
        {findings.length > 0 ? (
          <Column gap="md" role="list" aria-label="What the staff found">
            {findings.map((row) => (
              <Finding key={row.label} label={row.label} cell={row.act} />
            ))}
          </Column>
        ) : null}
        {law.length > 0 ? <LawChips authorities={law} compact /> : null}
      </Column>
    </Card>
  );
}

/** The locked option this plan was opened to build toward, and how far it still has to go. */
function Toward({ view }: { readonly view: ActWorkspace }) {
  const then = view.then;
  if (!then || !view.chosen || then.option.id === view.chosen.option.id) return null;
  return (
    <Card title={`This builds toward ${then.option.name}`} icon="locked" level="sunken" helper="When it's done, the receipt takes you back to it.">
      {then.preview.state === "open" ? <Text variant="body">{`${then.option.name} is open now.`}</Text> : <LockedPath {...(then.prerequisite ? { prerequisite: then.prerequisite } : {})} {...(then.preview.reason ? { reason: then.preview.reason } : {})} />}
    </Card>
  );
}

export function PlanPanel({ campaign, nation, view, config, onConfig, tariff }: { readonly campaign: Campaign; readonly nation: NationId; readonly view: ActWorkspace; readonly config: ActConfig; readonly onConfig: (next: ActConfig) => void; readonly tariff?: TariffPick }) {
  const chosen = view.chosen;
  const taxes = chosen?.option.ref.kind === "tariff";
  const goods = useMemo(() => (taxes ? (bilateralTradePartners(campaign, nation)?.sectors ?? []) : []), [campaign, nation, taxes]);
  if (!chosen || !view.assessment) {
    return (
      <Text variant="body" tone="secondary">
        Pick an option above to plan it. Its settings and what it changes appear here.
      </Text>
    );
  }
  if (chosen.preview.state !== "open") {
    return (
      <Card title={`${chosen.option.name} can't be ordered now`} icon="locked" level="sunken">
        <LockedPath {...(chosen.prerequisite ? { prerequisite: chosen.prerequisite } : {})} {...(chosen.preview.reason ? { reason: chosen.preview.reason } : {})} onFirst={(builder) => onConfig({ ...(config.goal ? { goal: config.goal } : {}), option: builder, then: chosen.option.id, ...(config.compare ? { compare: config.compare } : {}) })} />
      </Card>
    );
  }
  return (
    <Column gap="lg">
      <Toward view={view} />
      <CardGrid columns={{ phone: 1, tablet: 1, desktop: 2, wide: 2 }} gap="lg">
        <Card title="Terms" icon="utilitySettings">
          <PlanTerms name={view.name} goods={goods} terms={view.terms} config={config} onConfig={(update) => onConfig({ ...config, ...update })} {...(tariff ? { tariff } : {})} />
        </Card>
        <WhatChanges view={view} chosen={chosen} assessment={view.assessment} {...(tariff ? { tariff } : {})} />
      </CardGrid>
    </Column>
  );
}
