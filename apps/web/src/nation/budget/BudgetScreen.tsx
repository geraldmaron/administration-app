import { useMemo, useState } from "react";
import { selectBudget, type BudgetAccount, type BudgetDraftInput, type Campaign } from "@admin/engine";
import { appropriationStatus, authorityFlow, budgetDraftReading, formatMoney } from "@admin/player-core";
import { Bar, Icon, Tabs, Tag } from "@admin/ui-web";
import { Screen } from "../../shell/Screen";
import { useNationCommit } from "../economy/commit";
import { AllocationEditor, DRAFT_STEP } from "./AllocationEditor";
import { Authority } from "./Authority";
import { Books } from "./Books";
import { CongressionalResponse, ProposalSummary, Tradeoffs } from "./DraftProjection";
import { Request } from "./Request";
import "./budget.css";

export const BUDGET_VIEWS = ["proposal", "authority", "books"] as const;
export type BudgetView = (typeof BUDGET_VIEWS)[number];

export function isBudgetView(value: unknown): value is BudgetView {
  return typeof value === "string" && (BUDGET_VIEWS as readonly string[]).includes(value);
}

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
    <section className="budget-funding" aria-labelledby="budget-status">
      <h2 id="budget-status" className="budget-section__title">
        Funding{" "}
        <Tag tone={closing ? "risk" : "good"} icon={closing ? "caution" : "active"}>
          {status.shutdown ? "Lapsed" : status.onPriorYear ? "On last year's book" : closing ? "Funded, closing" : "Funded"}
        </Tag>
      </h2>
      <div className="budget-runway">
        <span className="budget-runway__figure">
          <strong>{status.shutdown ? "Closed" : weeks}</strong>
          <span className="budget-cap">{status.shutdown ? "The government is closed" : `${weeks === 1 ? "week" : "weeks"} of funding left, through ${status.fundedThrough}`}</span>
        </span>
        <span className="budget-runway__axis">
          <Bar
            label={status.shutdown ? "Funding left: lapsed" : `Funding left: ${weeks} of ${YEAR_WEEKS} weeks, through ${status.fundedThrough}`}
            value={weeks / YEAR_WEEKS}
            tone={closing ? "bad" : weeks <= 2 * CLOSE_WEEKS ? "watch" : "good"}
            marks={[{ at: CLOSE_WEEKS / YEAR_WEEKS, label: `${CLOSE_WEEKS} weeks` }]}
          />
          <span className="budget-runway__scale" aria-hidden="true">
            <span>Lapse</span>
            <span>{CLOSE_WEEKS} weeks</span>
            <span>A year</span>
          </span>
        </span>
      </div>
      <dl className="budget-operating-readings" aria-label="Current spending authority">
        <div><dt>Authority held now</dt><dd>{formatMoney(flow.held)}</dd><span>Ceiling {formatMoney(flow.ceiling)}</span></div>
        <div><dt>Weekly release</dt><dd>{formatMoney(flow.release)}</dd><span>{flow.lapsed ? "Appropriation lapsed" : "From the appropriation"}</span></div>
        <div><dt>Standing commitments / week</dt><dd>{formatMoney(flow.commitmentsDraw)}</dd><span>Existing orders and promises</span></div>
        <div><dt>Net authority / week</dt><dd>{flow.net < 0 ? "−" : "+"}{formatMoney(Math.abs(flow.net))}</dd><span>After account and commitment draws</span></div>
      </dl>
      <p className="budget-note">Spending authority is available capacity, not the federal government's annual revenue or outlays. Inspect its flows in Budget authority and the annual totals in Federal books.</p>
      <ul className="budget-facts">
        {status.onPriorYear ? (
          <li>
            <Icon name="caution" size={20} className="budget-facts__icon" />
            Congress refused the last book; the government runs on last year&rsquo;s.
          </li>
        ) : null}
        {status.struck.length > 0 ? (
          <li>
            <Icon name="reject" size={20} className="budget-facts__icon" />
            Struck from the last book and left at last year&rsquo;s rate: {status.struck.join(", ")}.
          </li>
        ) : null}
        <li>
          <Icon name="schedule" size={20} className="budget-facts__icon" />
          A book passed now pays for fiscal {status.next.fiscalYear} and funds the government through {status.next.fundedThrough}.
        </li>
      </ul>
    </section>
  );
}

const roundStep = (share: number): number => Math.round(share / DRAFT_STEP) * DRAFT_STEP;

export type BudgetScreenProps = {
  readonly campaign: Campaign;
  readonly view: BudgetView;
  readonly onView: (view: BudgetView) => void;
};

/**
 * The budget: the funding constraint, then the President's own book as one
 * editable table with its totals in view, the tradeoffs and the assessed
 * congressional response, one submission, the budget authority's course and
 * weekly flow, and the federal books, each in its own view.
 */
export function BudgetScreen({ campaign, view, onView }: BudgetScreenProps) {
  const [draft, setDraft] = useState<BudgetDraftInput>({});
  const acts = useNationCommit(campaign);
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
  return (
    <Screen icon="budget" title="Budget" eyebrow="Nation · federal finances" lede="The federal books, and the administration's own book of five lines that Congress votes line by line." screenClass="workspace" measure="data" camera="us">
      <div className="budget">
        <FundingState campaign={campaign} />
        <Tabs
          label="Views of the budget"
          tabs={[
            { id: "proposal", label: "Budget proposal" },
            { id: "authority", label: "Budget authority" },
            { id: "books", label: "Federal books" },
          ]}
          selected={view}
          onSelect={(next) => onView(next as BudgetView)}
        >
          {view === "books" ? (
            <Books campaign={campaign} />
          ) : view === "authority" ? (
            <Authority campaign={campaign} />
          ) : acts.committed ? (
            <Request campaign={campaign} reading={reading} draft={draft} acts={acts} onSent={() => setDraft({})} />
          ) : (
            <div className="budget-proposal">
              {reading.ok ? <ProposalSummary reading={reading} /> : null}
              <div className="budget-workbench">
                {editing.ok ? <AllocationEditor rows={editing.accounts} onChange={change} onReset={() => setDraft({})} /> : null}
                <aside className="budget-workbench__evidence" aria-label="Consequences of the proposed allocation">
                  {reading.ok ? (
                    <>
                      <Tradeoffs reading={reading} />
                      <CongressionalResponse reading={reading} />
                    </>
                  ) : (
                    <p className="budget-problem" role="alert">
                      {reading.reason}
                    </p>
                  )}
                </aside>
                <div className="budget-workbench__authorization"><Request campaign={campaign} reading={reading} draft={draft} acts={acts} onSent={() => setDraft({})} /></div>
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </Screen>
  );
}
