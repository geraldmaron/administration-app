import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { PEER_RULES, place, type CompareMetricId, type PeerRule, type Subject } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Button, Column, Icon, Row, Text, type MatrixMetric, type MatrixRow } from "@admin/ui";
import { Panel } from "@admin/ui/world";
import { CompareChart } from "../../compare/CompareChart";
import { RankedMatrix } from "../../compare/RankedMatrix";
import { formatterFor } from "../../compare/format";
import { NATION_METRICS, dossierMatrix } from "../compare";
import { ChooseOne, FlagOf, go } from "../parts";

const REFUSALS_FIRST = 4;

const RULE_LABELS: Readonly<Record<PeerRule, string>> = { g7: "G7", neighbors: "Neighbors", rivals: "Rivals", allies: "Allies", "power-tier": "Similar size" };

/**
 * This government's readings beside the United States and the company the
 * President chooses, ranked column by column against the median, then one
 * reading set against its benchmarks and the President's own record. A cell
 * the services cannot read stays empty and says why underneath.
 */
export function CompareSection({ campaign, nation, name }: { readonly campaign: Campaign; readonly nation: NationId; readonly name: string }) {
  const [rule, setRule] = useState<PeerRule>("rivals");
  const [allRefusals, setAllRefusals] = useState(false);
  const [metric, setMetric] = useState<CompareMetricId>(NATION_METRICS[0] ?? "growth");
  const matrix = useMemo(() => dossierMatrix(campaign, nation, rule), [campaign, nation, rule]);
  const metrics: readonly MatrixMetric[] = matrix.columns.map((column) => ({
    id: column.id,
    label: `${column.label}${column.assessed ? " · estimate" : ""}`,
    format: formatterFor(column.format),
    better: column.better,
    ...(column.benchmark ? { benchmark: column.benchmark } : {}),
  }));
  const rows: readonly MatrixRow[] = matrix.rows.map((row) => ({
    id: row.id,
    label: row.focus ? `${row.label} (this country)` : row.label,
    emblem: <FlagOf nation={row.nation} name={row.label} height={14} />,
    values: row.values,
    ...(row.self ? { self: true } : {}),
    ...(row.self ? {} : { onPress: () => go(place.country(row.nation)) }),
  }));
  const subjects: readonly Subject[] = useMemo(() => [{ kind: "self" }, { kind: "nation", id: nation }], [nation]);
  return (
    <Panel title={`${name} compared with the United States and similar countries`} icon="graph" lede="Public numbers are shown for every country. Estimates from our intelligence agencies only appear where they know enough.">
      <ChooseOne label="Compare with" value={rule} onChange={setRule} options={PEER_RULES.map((entry) => ({ value: entry, label: RULE_LABELS[entry] }))} />
      <Text variant="caption" tone="secondary">
        {matrix.peers.empty ?? matrix.peers.basis}
      </Text>
      <RankedMatrix title="This week's numbers, ranked" metrics={metrics} rows={rows} initialSort={metric} />
      {matrix.refusals.length > 0 ? (
        <Column gap="xs" role="list" aria-label="What's missing, and why">
          {(allRefusals ? matrix.refusals : matrix.refusals.slice(0, REFUSALS_FIRST)).map((refusal) => (
            <Row key={refusal.id} gap="xs" top role="listitem">
              <Icon name="hidden" size={14} tone="colorTertiary" />
              <Text variant="caption" flex={1}>
                <Text variant="caption" weight="strong">
                  {refusal.label}:{" "}
                </Text>
                {refusal.reason}
              </Text>
            </Row>
          ))}
          {matrix.refusals.length > REFUSALS_FIRST ? (
            <Button kind="quiet" size="compact" onPress={() => setAllRefusals((open) => !open)}>
              {allRefusals ? "Show fewer" : `Show all ${matrix.refusals.length} missing numbers`}
            </Button>
          ) : null}
        </Column>
      ) : null}
      <ChooseOne label="Compare one number over time" value={metric} onChange={setMetric} options={matrix.columns.map((column) => ({ value: column.id, label: column.label }))} />
      <CompareChart campaign={campaign} metric={metric} subjects={subjects} window="term" height={220} />
    </Panel>
  );
}
