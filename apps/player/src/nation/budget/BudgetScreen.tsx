import { useEffect, useMemo, useRef, useState } from "react";
import { selectBudget, type BudgetAccount, type BudgetDraftInput, type Campaign } from "@admin/engine";
import { appropriationStatus, authorityFlow, budgetDraftReading, formatMoney, sealFor } from "@admin/player-core";
import { Pane, Tag, Column, Icon, Page, ReadingFrame, Row, Seal, Text, useMedia } from "@admin/ui";
import { FigureBand, TrackRow, ViewTabs } from "@admin/ui/nation";
import { useDraftState, useDraftStore } from "../../device/hooks";
import { openDrafts } from "../../shell/Drafts";
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
    <Pane id="budget-status" title="Funding" icon="schedule" band={closing ? "danger" : "success"} actions={<Tag tone={closing ? "danger" : "success"} icon={closing ? "caution" : "active"}>{status.shutdown ? "Shut down" : status.onPriorYear ? "On last year's budget" : closing ? "Money running out" : "Funded"}</Tag>}>
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
    </Pane>
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

/** A slider drag settles before the book is drafted, so a drag is priced once rather than every frame. */
const SETTLE_MS = 250;

/**
 * The book being drafted: the President's budget draft as the drafts hold it,
 * with the edit in hand laid over it until it has been written there.
 */
function useBudgetDraft(): { readonly draft: BudgetDraftInput; readonly edit: (next: BudgetDraftInput) => void; readonly flush: () => Promise<void>; readonly reset: () => void } {
  const drafts = useDraftStore();
  const { drafts: list } = useDraftState();
  const stored = useMemo(() => {
    const entry = list.find((draft) => draft.spec.kind === "budget");
    return entry?.spec.kind === "budget" ? entry.spec.lines : {};
  }, [list]);
  const [local, setLocal] = useState<BudgetDraftInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Each edit is numbered, so a slower write finishing after a newer edit does not clear that edit.
  const revision = useRef(0);
  const latest = useRef<BudgetDraftInput | null>(null);
  latest.current = local;
  const write = async (next: BudgetDraftInput) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const mine = revision.current;
    await drafts.put({ kind: "budget", lines: next });
    if (mine === revision.current) setLocal(null);
  };
  // Leaving the page writes the edit in hand rather than dropping it.
  useEffect(
    () => () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      if (latest.current) void drafts.put({ kind: "budget", lines: latest.current });
    },
    [drafts],
  );
  return {
    draft: local ?? stored,
    edit: (next) => {
      revision.current += 1;
      latest.current = next;
      setLocal(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void write(next), SETTLE_MS);
    },
    flush: async () => {
      if (latest.current) await write(latest.current);
    },
    reset: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      revision.current += 1;
      latest.current = null;
      setLocal(null);
      void drafts.discard("budget");
    },
  };
}

function Proposal({ campaign }: { readonly campaign: Campaign }) {
  const media = useMedia();
  const { draft, edit, flush, reset } = useBudgetDraft();
  const reading = useMemo(() => budgetDraftReading(campaign, draft), [campaign, draft]);
  const fallback = useMemo(() => budgetDraftReading(campaign, {}), [campaign]);
  const editing = reading.ok ? reading : fallback;
  const change = (account: BudgetAccount, share: number) => {
    const inForce = selectBudget(campaign)[account];
    // The line has already put the share on the drafting grid and inside its limits; snapping again could step past zero.
    const next = share;
    const { [account]: _dropped, ...rest } = draft;
    edit(Math.abs(next - inForce) < DRAFT_STEP / 2 ? rest : { ...rest, [account]: next });
  };
  const send = async () => {
    await flush();
    openDrafts("budget");
  };
  return (
    <Column gap="lg">
      {reading.ok ? <ProposalSummary reading={reading} /> : null}
      <Row gap="lg" wrap={!media.desktop} top>
        <Column flex={3} minWidth={300} gap="lg">
          {editing.ok ? <AllocationEditor rows={editing.accounts} onChange={change} onReset={reset} /> : null}
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
      <Request campaign={campaign} reading={reading} onSend={() => void send()} />
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
    <Page eyebrow="Office of Management and Budget" icon="budget" title="Budget" lede="Your budget has 5 lines, and Congress votes on each one separately." emblem={<Seal spec={sealFor("INST-OMB")} size={72} />}>
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
