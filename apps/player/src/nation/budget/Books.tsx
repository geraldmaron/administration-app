import { useMemo, useState } from "react";
import { selectDateOfTurn, selectFiscalStatement, type Campaign } from "@admin/engine";
import { authorityFlow, fiscalBooks, fiscalOutlaySeries, fiscalPath, fiscalRevenueSeries, formatDate, formatMoney, formatRatio, type FiscalPathPoint } from "@admin/player-core";
import { Pane, BenchmarkChart, Tag, Column, ReadingFrame, Row, Text } from "@admin/ui";
import { DataTable, Facts, Track, TrackRow, sortRows, type SortState } from "@admin/ui/nation";
import { toneKey } from "../keys";
import { termDoor } from "../../handbook/term-door";
import { MetricActs, MetricReading } from "../MetricReading";

const OUTLOOK_WORDS = { positive: "Likely to improve", stable: "Likely to stay the same", negative: "Leaning toward a cut at the next review" } as const;

type LineSort = "order" | "line" | "amount";

/** One year's lines by source or function: the amount a year and each line's share of the total. */
function Breakdown({ title, points }: { readonly title: string; readonly points: readonly FiscalPathPoint[] }) {
  const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0) || 1;
  const [sort, setSort] = useState<SortState<LineSort>>({ key: "order", direction: "ascending" });
  const order = useMemo(() => new Map(points.map((point, index) => [point.label, index])), [points]);
  const lines = useMemo(() => sortRows(points, sort, { order: (point) => order.get(point.label) ?? 0, line: (point) => point.label, amount: (point) => point.value }), [points, sort, order]);
  return (
    <Column gap="xs" flex={1} minWidth={340}>
      <Text variant="label">
        {title}, {formatMoney(total)} a year
      </Text>
      <ReadingFrame title={`${title}, by line`} unit="Dollars per year, and each line's share of the total" legend={[{ id: "share", kind: "swatch", label: "Share of the total", ink: "accent" }]} help={{ meaning: "Each row is one line of the budget with its yearly amount. The bar is that line's share of the whole, so a longer bar is a bigger part of the total." }}>
      <DataTable<FiscalPathPoint, LineSort>
        caption={title}
        rows={lines}
        rowKey={(point) => point.label}
        sort={sort}
        onSort={setSort}
        noun="lines"
        initial={20}
        columns={[
          { id: "line", label: "Line", sortKey: "line", flex: 1.2, render: (point) => <Text variant="label" weight="regular">{point.label}</Text> },
          { id: "amount", label: "Per year", sortKey: "amount", first: "descending", align: "end", flex: 1, render: (point) => <Text variant="label" tabular>{point.figure}</Text> },
          { id: "share", label: "Share", align: "end", flex: 1.6, render: (point) => <Row gap="xs" alignSelf="stretch"><Track value={Math.max(0, point.value) / total} slim /><Text variant="caption" minWidth={40} textAlign="right">{formatRatio(point.value / total)}</Text></Row> },
        ]}
      />
      </ReadingFrame>
    </Column>
  );
}

/** The year's revenue and outlays, source by source. */
function Ledger({ campaign }: { readonly campaign: Campaign }) {
  const purchases = campaign.cleanPowerPurchases ?? [];
  const payments = selectFiscalStatement(campaign).cleanPowerPaymentsRecorded;
  const unknownEarlier = purchases.some((purchase) => purchase.deliveredMwh > 0 && (purchase.paymentTrackingStartMwh === undefined || purchase.paymentTrackingStartMwh > 0));
  return (
    <Pane title="Money in and money out" icon="domesticLedger">
      <Row gap="lg" wrap top>
        <Breakdown title="Money in (revenue)" points={fiscalRevenueSeries(campaign)} />
        <Breakdown title="Money out (spending)" points={fiscalOutlaySeries(campaign)} />
      </Row>
      {purchases.length > 0 ? (
        <Text variant="caption" tone="secondary">
          Payments to clean-power suppliers so far: ${payments.toFixed(2)} million. They're already counted in the spending above, so they don't add anything extra to yearly spending or the debt.
          {unknownEarlier ? " We don't know about payments made before tracking began." : ""}
        </Text>
      ) : null}
    </Pane>
  );
}

/** The federal position: debt against output and where it heads, the year's balance, interest, the rating and the debt limit. */
export function Position({ campaign }: { readonly campaign: Campaign }) {
  const books = fiscalBooks(campaign);
  if (!books) return <Text variant="body" tone="secondary">Your government's money figures aren't ready yet.</Text>;
  const path = fiscalPath(campaign);
  const limit = books.limit;
  const limitUse = limit.ceiling > 0 ? limit.subjectToLimit / limit.ceiling : 0;
  const rising = books.debtToGdpComingYear > 0;
  return (
    <Pane id="books-position" title="Where the government's money stands" icon="departmentTreasury">
      <Facts
        items={[
          { label: books.balance < 0 ? "This year's deficit" : "This year's surplus", value: <Text variant="label" tone={books.balance < 0 ? "warning" : "success"}>{formatMoney(Math.abs(books.balance))} a year</Text> },
          { label: "National debt", value: <Text variant="label" tone={books.debtToGdp >= 1 ? "warning" : "primary"}>{formatRatio(books.debtToGdp)} of what the economy makes in a year</Text> },
          { label: "Interest on the debt", value: `${formatRatio(books.interestShare)} of money coming in` },
          { label: "Credit rating", value: <Text variant="label" tone={books.sovereign.outlook === "positive" ? "success" : books.sovereign.outlook === "negative" ? "danger" : "primary"}>{books.sovereign.notch} · {OUTLOOK_WORDS[books.sovereign.outlook]}</Text> },
        ]}
      />
      <BenchmarkChart title="Debt compared with a year of economic output" unit="Debt as a share of a year of output" period="The next 10 years, if nothing changes" help={{ meaning: "The line is the national debt divided by what the economy makes in a year, projected forward if nothing changes. The red dotted line is where debt equals a full year of output.", term: termDoor("debt-to-output", "debt to output") }} x={path.map((point) => point.label)} series={[{ id: "path", label: "If nothing changes", kind: "self", values: path.map((point) => point.value) }]} benchmarks={[{ id: "parity", label: "Debt equal to a full year's output", value: 1, kind: "danger" }]} format={formatRatio} better="down" />
      <Text variant="caption" tone="secondary">
        <Text variant="caption" weight="strong" tone={rising ? "warning" : "success"}>
          {rising ? "▲ +" : "▼ −"}
          {(Math.abs(books.debtToGdpComingYear) * 100).toFixed(1)} pts
        </Text>{" "}
        over the next year if nothing changes, by your staff's estimate. New loans cost {formatRatio(books.sovereign.marketRate)} a year in interest. Credit agencies grade how safe it is to lend to the United States, and they check the rating again on {formatDate(selectDateOfTurn(campaign, books.sovereign.nextReview))}.
      </Text>
      <ReadingFrame title="The debt limit, used" unit="% of the legal limit on borrowing" legend={toneKey({ good: "Room to borrow", watch: "Getting close", bad: "At or near the limit" })} help={{ meaning: "The bar is how much of the legal limit on federal borrowing is already used. When it is full, the Treasury can't borrow more until Congress raises the limit.", term: termDoor("debt-limit", "debt limit") }}>
        <TrackRow name="Used" figure={`${formatMoney(limit.subjectToLimit)} of ${formatMoney(limit.ceiling)}`} value={limitUse} tone={limitUse >= 0.95 ? "bad" : limitUse >= 0.85 ? "watch" : "good"} />
      </ReadingFrame>
      <Row gap="xs" wrap>
        {limit.binding ? <Tag tone="danger">At the limit</Tag> : null}
        <Text variant="caption" tone="secondary" flex={1}>
          {limit.binding ? `The Treasury has hit the debt limit${limit.prioritizing ? ` and is holding back payments. ${formatMoney(limit.arrears)} is owed once the limit goes up` : ""}.` : `At this year's pace of borrowing, about ${limit.headroomWeeks} weeks are left before the limit. That counts the special accounting steps the Treasury can use to buy time.`}
        </Text>
      </Row>
    </Pane>
  );
}

/** The historical books: the federal position, then the ledger behind it. */
export function Books({ campaign }: { readonly campaign: Campaign }) {
  return (
    <Column gap="lg">
      <Position campaign={campaign} />
      <Ledger campaign={campaign} />
    </Column>
  );
}

/** What the week adds to the authority and what it takes out, on one scale, so the net is the visible gap. */
function Weekly({ campaign }: { readonly campaign: Campaign }) {
  const flow = authorityFlow(campaign);
  const rows = [
    { label: "Added this week", note: flow.lapsed ? "Nothing comes in while the budget has run out." : flow.atCeiling ? "You're at the limit, so only what you spend gets refilled." : "The money Congress approved, paid out a week at a time.", amount: flow.release, tone: "good" as const },
    { label: "Used by the five budget lines", note: "Beyond what it takes to keep them running.", amount: flow.accountsDraw, tone: "bad" as const },
    { label: "Used by earlier promises", note: "Orders and promises already made.", amount: flow.commitmentsDraw, tone: "bad" as const },
  ];
  const scale = Math.max(1, ...rows.map((row) => Math.abs(row.amount)));
  return (
    <Column gap="sm">
      <ReadingFrame title="Where your budget authority goes each week" unit="Dollars per week, all bars on one scale" legend={toneKey({ good: "Money added", bad: "Money used" })} help={{ meaning: "Each bar is money added to or used from your budget authority this week, all on one scale. The difference between what is added and what is used is the change in what you can spend.", term: termDoor("budget-authority", "budget authority") }}>
        <Column gap="sm">
          {rows.map((row) => (
            <Column key={row.label} gap="2xs">
              <TrackRow name={row.label} figure={formatMoney(row.amount)} value={Math.abs(row.amount) / scale} tone={row.tone} />
              <Text variant="caption" tone="tertiary">
                {row.note}
              </Text>
            </Column>
          ))}
          <TrackRow name="Available now" figure={formatMoney(flow.held)} value={flow.ceiling > 0 ? flow.held / flow.ceiling : 0} tone={flow.underfunded ? "bad" : "reading"} />
        </Column>
      </ReadingFrame>
      <Text variant="body">{flow.net >= 0 ? `This week, ${formatMoney(flow.net)} of the new money goes unused.` : `This week uses ${formatMoney(-flow.net)} more than comes in.`}</Text>
      <Text variant="caption" tone="tertiary">
        Out of the {formatMoney(flow.ceiling)} limit you can hold at one time.
      </Text>
    </Column>
  );
}

/** Budget authority where it is spent: the reading and its course, the weekly flow behind it, and the acts that drew on it. */
export function Authority({ campaign }: { readonly campaign: Campaign }) {
  return (
    <Column gap="lg">
      <MetricReading campaign={campaign} metric="treasury">
        <Weekly campaign={campaign} />
      </MetricReading>
      <MetricActs campaign={campaign} metric="treasury" actor="player" title="What your actions did to it" empty="Nothing you've done has changed your budget authority yet. It still moves each week as money comes in and the budget lines use it." />
    </Column>
  );
}
