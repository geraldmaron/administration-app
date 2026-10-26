import { formatMoney, formatRatio, type AuthorityFlow, type BudgetDraftReading } from "@admin/player-core";
import { Pane, Tag, Column, Icon, ReadingFrame, Row, Surface, Text, type IconName } from "@admin/ui";
import { TrackRow, type TrackTone } from "@admin/ui/nation";
import { markEntry, toneKey } from "../keys";
import { pointChange } from "./Allocation";

const ACCOUNT_GLYPH: Readonly<Record<string, IconName>> = { diplomatic: "instrumentDiplomatic", economic: "instrumentEconomic", covert: "instrumentCovert", military: "instrumentMilitary" };

/** The weeks scale a funded authority is drawn on: a year, the span an appropriation is written for. */
const AUTHORITY_SCALE_WEEKS = 52;

export type Drafted = Extract<BudgetDraftReading, { ok: true }>;

/** Weeks the authority lasts at a flow's draw, in words. */
export function lastsWords(flow: AuthorityFlow): string {
  if (flow.lapsed) return "Nothing comes in while the budget has run out";
  if (!Number.isFinite(flow.turnsFunded)) return "The weekly money covers it";
  return `${Math.round(flow.turnsFunded)} weeks, then bills go unpaid`;
}

function Draw({ flow, label }: { readonly flow: AuthorityFlow; readonly label: string }) {
  const draw = flow.accountsDraw + flow.commitmentsDraw;
  const share = flow.release > 0 ? Math.max(0, draw) / flow.release : 0;
  const tone: TrackTone = draw > flow.release ? "bad" : share > 0.85 ? "watch" : "good";
  return <TrackRow name={label} figure={formatMoney(Math.abs(draw))} value={share} tone={tone} marks={[{ at: 1, label: `${formatMoney(flow.release)} comes in each week`, strong: true }]} label={`${label}: ${formatMoney(Math.abs(draw))} beyond upkeep, out of ${formatMoney(flow.release)} coming in each week`} />;
}

function Lasts({ flow, label }: { readonly flow: AuthorityFlow; readonly label: string }) {
  const covered = !flow.lapsed && !Number.isFinite(flow.turnsFunded);
  const weeksLeft = covered ? AUTHORITY_SCALE_WEEKS : flow.lapsed ? 0 : flow.turnsFunded;
  return <TrackRow name={label} figure={flow.lapsed ? "Closed" : covered ? "Covered" : `${Math.round(flow.turnsFunded)} weeks`} value={weeksLeft / AUTHORITY_SCALE_WEEKS} tone={covered || weeksLeft >= AUTHORITY_SCALE_WEEKS ? "good" : "bad"} label={`${label}: ${lastsWords(flow)}`} />;
}

function claimWords(flow: AuthorityFlow): string {
  if (Math.abs(flow.annualClaim) < 1) return "None, because it keeps every line where it is";
  return `${flow.annualClaim > 0 ? "Uses" : "Saves"} ${formatMoney(Math.abs(flow.annualClaim))} beyond upkeep, ${formatRatio(Math.abs(flow.shareOfDiscretionary))} of the spending Congress sets each year`;
}

/** The tradeoffs the numbers carry: what the money draws, how long the authority lasts, and what it buys next. */
export function Tradeoffs({ reading }: { readonly reading: Drafted }) {
  const { inForce, draft } = reading.flow;
  return (
    <Pane title="What you give up and what you get" icon="graph" line="The current budget next to yours, on the same scales.">
      <ReadingFrame title="Spent each week, compared with what comes in" unit="% of the money added each week" legend={[markEntry("in", "All the money that comes in each week"), ...toneKey({ good: "Spending stays under it", watch: "Close to using all of it", bad: "Spending more than comes in" })]} help={{ meaning: "Each bar is what the budget draws each week beyond upkeep, compared with the money that comes in. Past the line, the budget uses more than it gets." }}>
        <Draw flow={inForce} label="Current budget" />
        <Draw flow={draft} label="Your proposal" />
      </ReadingFrame>
      <ReadingFrame title="How long the money lasts" unit={`Weeks, out of a ${AUTHORITY_SCALE_WEEKS}-week year`} legend={toneKey({ good: "Lasts the whole year", bad: "Runs out sooner" })} help={{ meaning: "Each bar is how many weeks the money lasts at that budget's spending, out of a year. A full bar means the weekly money covers it." }}>
        <Lasts flow={inForce} label="Current budget" />
        <Lasts flow={draft} label="Your proposal" />
      </ReadingFrame>
      <Text variant="label">Spending beyond upkeep, per year</Text>
      <Text variant="body">Current budget: {claimWords(inForce)}.</Text>
      <Text variant="body">Your proposal: {claimWords(draft)}.</Text>
      {reading.horizons.length > 0 ? <Horizons rows={reading.horizons} /> : null}
    </Pane>
  );
}

/** Weeks to open each next rung, in force against the proposal, on one shared axis; a quicker proposal is marked in favor. */
function Horizons({ rows }: { readonly rows: Drafted["horizons"] }) {
  const longest = Math.max(1, ...rows.flatMap((row) => [row.nowTurns ?? 0, row.draftTurns ?? 0]));
  return (
    <Column gap="sm">
      <ReadingFrame title="What the money buys next" unit="Weeks until the next step opens, on one scale" legend={[markEntry("opens", "The next step opens here"), ...toneKey({ good: "Your proposal gets there sooner", bad: "Your proposal gets there later", neutral: "Same, or the current budget" })]} help={{ meaning: "Each card is a capability a budget line can unlock. The top bar is progress toward it. The two bars under it are how many weeks the current budget and your proposal take to get there. A shorter bar is quicker." }}>
      {rows.map((row) => {
        const faster = row.nowTurns !== undefined && row.draftTurns !== undefined && row.draftTurns < row.nowTurns;
        const slower = (row.nowTurns !== undefined && row.draftTurns !== undefined && row.draftTurns > row.nowTurns) || (row.nowTurns !== undefined && row.draftTurns === undefined);
        const progress = row.required > 0 ? Math.min(1, Math.max(0, row.current / row.required)) : undefined;
        return (
          <Surface key={row.account} level="raised" pad="md">
            <Column gap="xs">
              <Row gap="sm">
                <Icon name={ACCOUNT_GLYPH[row.account] ?? "budget"} size={22} tone="gold" />
                <Column flex={1}>
                  <Text variant="label">{row.milestone}</Text>
                  <Text variant="caption" tone="secondary">
                    {row.accountName}, {row.capability}
                  </Text>
                </Column>
              </Row>
              {progress !== undefined ? <TrackRow name="Progress to the next step" figure={formatRatio(progress)} value={progress} marks={[{ at: 1, label: `${row.milestone} opens here` }]} /> : null}
              <TrackRow name="Current budget" figure={row.nowTurns === undefined ? "Not getting closer" : `${row.nowTurns} weeks`} value={row.nowTurns === undefined ? 0 : row.nowTurns / longest} tone="neutral" />
              <TrackRow name="Your proposal" figure={row.draftTurns === undefined ? "Not getting closer" : `${row.draftTurns} weeks`} value={row.draftTurns === undefined ? 0 : row.draftTurns / longest} tone={faster ? "good" : slower ? "bad" : "neutral"} />
            </Column>
          </Surface>
        );
      })}
      </ReadingFrame>
    </Column>
  );
}

/** The votes every changed line needs, chamber by chamber, before any vote is held. */
export function CongressionalResponse({ reading }: { readonly reading: Drafted }) {
  const lines = reading.floor.accounts.map((entry) => ({
    account: entry.account,
    name: reading.accounts.find((row) => row.account === entry.account)?.name ?? entry.account,
    house: entry.votes.find((vote) => vote.chamber === "house"),
    senate: entry.votes.find((vote) => vote.chamber === "senate"),
  }));
  return (
    <Pane title="Votes needed in Congress" icon="subjectChamber" line="This shows how many votes each changed line needs. It doesn't tell you how members will vote." actions={<Tag tone="outline">Requirements</Tag>}>
      {lines.length === 0 ? (
        <Text variant="body" tone="secondary">
          Your budget matches the current one, so there's nothing for Congress to vote on.
        </Text>
      ) : (
        lines.map((line) => (
          <Row key={line.account} gap="md" wrap padding="sm" borderBottomWidth={1} borderBottomColor="borderColor">
            <Text variant="label" flex={1} minWidth={140}>
              {line.name}
            </Text>
            {(
              [
                ["House", line.house],
                ["Senate", line.senate],
              ] as const
            ).map(([chamber, vote]) => (
              <Column key={chamber} minWidth={130}>
                <Text variant="caption" tone="secondary">
                  {chamber}
                </Text>
                {vote ? (
                  <Text variant="label">
                    {vote.required} votes to pass
                    {vote.cloture ? <Text variant="caption" tone="secondary">{`, ${vote.cloture.required} to end debate`}</Text> : null}
                  </Text>
                ) : (
                  <Text variant="caption" tone="tertiary">
                    Not known
                  </Text>
                )}
              </Column>
            ))}
          </Row>
        ))
      )}
    </Pane>
  );
}

/** The proposal's headline against the book in force, kept in view while the lines are edited. */
export function ProposalSummary({ reading }: { readonly reading: Drafted }) {
  const { draft, inForce } = reading.totals;
  return (
    <Surface level="sunken" pad="md" aria-live="polite">
      <Row gap="lg" wrap>
        <Column>
          <Text variant="figure" tabular>
            {(draft * 100).toFixed(2)}%
          </Text>
          <Text variant="caption" tone="secondary">
            of national income per year
          </Text>
        </Column>
        {reading.floor.accounts.length === 0 ? (
          <Text variant="label" tone="secondary">
            Same as the current budget
          </Text>
        ) : (
          <Column>
            <Text variant="heading">{pointChange(draft - inForce)}</Text>
            <Text variant="caption" tone="secondary">
              compared with the current budget · Congress hasn't voted
            </Text>
          </Column>
        )}
      </Row>
    </Surface>
  );
}
