import { useMemo, useState } from "react";
import { selectBudget, type BudgetAccount, type BudgetDraftInput, type Campaign } from "@admin/engine";
import { appropriationStatus, authorityFlow, budgetDraftReading, formatMoney, sealFor } from "@admin/player-core";
import { Badge, Column, Icon, Page, ReadingFrame, Row, Seal, Text, useMedia } from "@admin/ui";
import { FigureBand, TrackRow, ViewTabs } from "@admin/ui/nation";
import { Panel } from "@admin/ui/world";
import { useNationAct } from "../act";
import { termDoor } from "../../handbook/term-door";
import { markEntry, toneKey } from "../keys";
import { LawTopicHelp } from "../Law";
import { AllocationEditor, DRAFT_STEP } from "./Allocation";
import { Authority, Books } from "./Books";
import { CongressionalResponse, ProposalSummary, Tradeoffs } from "./Draft";
import { Request } from "./Request";

export const BUDGET_VIEWS = ["proposal", "authority", "books"] as const;
export type BudgetView = (typeof BUDGET_VIEWS)[number];
export const isBudgetView = (value: unknown): value is BudgetView => typeof value === "string" && (BUDGET_VIEWS as readonly string[]).includes(value);

/** Weeks in a fiscal year: the scale the funding clock is drawn on. */
const YEAR_WEEKS = 52;
/** Funding this close to its end is drawn as a risk. */
const CLOSE_WEEKS = 8;

/** The fiscal period and the constraint first: how long the government is funded, and what a book passed now would fund. */
function FundingState({ campaign }: { readonly campaign: Campaign }) {
  const flow = authorityFlow(campaign);
  const status = appropriationStatus(campaign);
  const weeks = Math.max(0, status.weeksLeft);
  const closing = status.shutdown || weeks <= CLOSE_WEEKS;
  return (
    <Panel id="budget-status" title="Funding" icon="schedule" edge={closing ? "danger" : "success"} aside={<Badge status={closing ? "danger" : "success"} icon={closing ? "caution" : "active"}>{status.shutdown ? "Shut down" : status.onPriorYear ? "On last year's budget" : closing ? "Money running out" : "Funded"}</Badge>}>
      <ReadingFrame title="Weeks of funding left" unit={`Weeks, out of a ${YEAR_WEEKS}-week fiscal year`} legend={[markEntry("close", `${CLOSE_WEEKS} weeks: a shutdown is close`), ...toneKey({ good: "Funded", watch: "Running low", bad: "A shutdown is close" })]} help={{ meaning: `The bar is how many weeks the government can run on the money it has, out of a full year. The line at ${CLOSE_WEEKS} weeks is where a shutdown is close and needs your attention.`, term: termDoor("shutdown", "shutdown") }}>
        <TrackRow name={status.shutdown ? "The government is closed" : `${weeks === 1 ? "Week" : "Weeks"} left`} figure={status.shutdown ? "Closed" : `${weeks} of ${YEAR_WEEKS}`} value={weeks / YEAR_WEEKS} tone={closing ? "bad" : weeks <= 2 * CLOSE_WEEKS ? "watch" : "good"} marks={[{ at: CLOSE_WEEKS / YEAR_WEEKS, label: `${CLOSE_WEEKS} weeks`, strong: true }]} />
      </ReadingFrame>
      <Text variant="caption" tone="secondary">
        {status.shutdown ? "No money goes out until Congress passes a budget." : `The government has money through ${status.fundedThrough}. Once funding drops below ${CLOSE_WEEKS} weeks, a shutdown is close and needs your attention.`}
      </Text>
      <FigureBand
        label="Budget authority (money you can spend)"
        items={[
          { label: "Available now", value: formatMoney(flow.held), note: Math.abs(flow.held - flow.ceiling) < 1 ? "The most you can hold" : `Limit ${formatMoney(flow.ceiling)}` },
          { label: "Added each week", value: formatMoney(flow.release), note: flow.lapsed ? "The budget has run out" : "From the budget Congress passed" },
          { label: "Already promised / week", value: flow.commitmentsDraw === 0 ? "$0" : formatMoney(flow.commitmentsDraw), note: "Orders and promises already made" },
          { label: "Change / week", value: `${flow.net < 0 ? "−" : "+"}${formatMoney(Math.abs(flow.net))}`, tone: flow.net < 0 ? "bad" : "good", note: "After the budget lines and promises are paid" },
        ]}
      />
      <Text variant="caption" tone="tertiary">
        Budget authority is the money you're allowed to spend right now. It's different from what the whole government takes in and spends in a year. See how it moves under Budget authority, and the yearly totals under Income and debt.
      </Text>
      <Column gap="xs">
        {status.onPriorYear ? <BudgetNote icon="caution" text="Congress turned down the last budget, so the government is running on last year's." /> : null}
        {status.struck.length > 0 ? <BudgetNote icon="reject" text={`Congress cut these lines from the last budget and kept them at last year's amount: ${status.struck.join(", ")}.`} /> : null}
        <BudgetNote icon="schedule" text={`A budget passed now covers fiscal year ${status.next.fiscalYear} and pays for the government through ${status.next.fundedThrough}.`} />
      </Column>
    </Panel>
  );
}

function BudgetNote({ icon, text }: { readonly icon: "caution" | "reject" | "schedule"; readonly text: string }) {
  return (
    <Row gap="sm" top>
      <Icon name={icon} size={18} tone="colorSecondary" />
      <Text variant="body" flex={1}>
        {text}
      </Text>
    </Row>
  );
}

const roundStep = (share: number): number => Math.round(share / DRAFT_STEP) * DRAFT_STEP;

function Proposal({ campaign }: { readonly campaign: Campaign }) {
  const media = useMedia();
  const [draft, setDraft] = useState<BudgetDraftInput>({});
  const acts = useNationAct(campaign);
  const reading = useMemo(() => budgetDraftReading(campaign, draft), [campaign, draft]);
  const fallback = useMemo(() => budgetDraftReading(campaign, {}), [campaign]);
  const editing = reading.ok ? reading : fallback;
  const change = (account: BudgetAccount, share: number) => {
    const inForce = selectBudget(campaign)[account];
    const next = roundStep(share);
    setDraft((current) => {
      const { [account]: _dropped, ...rest } = current;
      return Math.abs(next - inForce) < DRAFT_STEP / 2 ? rest : { ...rest, [account]: next };
    });
  };
  const request = <Request campaign={campaign} reading={reading} acts={acts} onSent={() => setDraft({})} />;
  if (acts.done) return <Column gap="lg">{acts.layer}{request}</Column>;
  return (
    <Column gap="lg">
      {acts.layer}
      {reading.ok ? <ProposalSummary reading={reading} /> : null}
      <Row gap="lg" wrap={!media.desktop} top>
        <Column flex={3} minWidth={300} gap="lg">
          {editing.ok ? <AllocationEditor rows={editing.accounts} onChange={change} onReset={() => setDraft({})} /> : null}
        </Column>
        <Column flex={2} minWidth={300} gap="lg">
          {reading.ok ? (
            <>
              <Tradeoffs reading={reading} />
              <CongressionalResponse reading={reading} />
            </>
          ) : (
            <Text variant="body" tone="danger" role="alert">
              {reading.reason}
            </Text>
          )}
        </Column>
      </Row>
      {request}
    </Column>
  );
}

/**
 * The budget: the funding constraint, then the administration's own book as
 * five editable lines with their totals, the tradeoffs and the votes each line
 * needs, one submission, the budget authority's course and weekly flow, and
 * the federal books.
 */
export function BudgetScreen({ campaign, view, onView }: { readonly campaign: Campaign; readonly view: BudgetView; readonly onView: (view: BudgetView) => void }) {
  return (
    <Page eyebrow="Office of Management and Budget" icon="budget" title="Budget" lede="See where the government's money stands, and write your budget. It has 5 lines, and Congress votes on each line separately." emblem={<Seal spec={sealFor("INST-OMB")} size={72} />}>
      <FundingState campaign={campaign} />
      <LawTopicHelp topic="appropriations" compact />
      <ViewTabs<BudgetView>
        label="Budget sections"
        tabs={[
          { id: "proposal", label: "Your budget", icon: "sign" },
          { id: "authority", label: "Budget authority", icon: "graph" },
          { id: "books", label: "Income and debt", icon: "domesticLedger" },
        ]}
        selected={view}
        onSelect={onView}
      />
      {view === "books" ? <Books campaign={campaign} /> : view === "authority" ? <Authority campaign={campaign} /> : <Proposal campaign={campaign} />}
    </Page>
  );
}
