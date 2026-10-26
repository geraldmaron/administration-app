import { useState } from "react";
import type { Campaign } from "@admin/engine";
import { approvalBreakdown, nowReadings, type ApprovalDrag, type BlocTopline, type JudgmentReading, type JudgmentRow, type OpinionTrends, type ToplineView } from "@admin/player-core";
import { Tag, Card, CardGrid, Column, Pressable, ReadingFrame, Row, Sheet, Text, sparklineKey } from "@admin/ui";
import { Track } from "@admin/ui/nation";
import { CompareChart } from "../../compare/CompareChart";
import { VALENCE_TEXT, VALENCE_TRACK, deltaValence, percent, signedPoints, valenceOf } from "../format";
import { toneKey } from "../keys";
import { termDoor } from "../../handbook/term-door";
import { Blocs } from "./Blocs";
import { Course } from "./Course";
import { settledApproval } from "./ConditionStrip";

const CUTS = [0.25, 0.45, 0.65];
const WHOLE_RECORD = 520;

type JudgmentProps = { readonly row: JudgmentRow; readonly campaign: Campaign; readonly trends: OpinionTrends; readonly drag: ApprovalDrag | undefined; readonly outlook: JudgmentReading | undefined };

function JudgmentDetail({ row, campaign, trends, drag, outlook, target }: JudgmentProps & { readonly target: number | undefined }) {
  return (
    <Column gap="md">
      <Text variant="body">{row.meaning}</Text>
      <Track value={row.value} tone={VALENCE_TRACK[valenceOf(row.stance)]} cuts={CUTS} {...(target === undefined ? {} : { target })} />
      <Text variant="body">
        <Text weight="strong">{row.figure}</Text> · {row.word}
        {target === undefined ? "" : ` · heading toward ${percent(target)}`}
      </Text>
      <Text variant="body">This counts for {percent(row.weight)} of how people judge you overall this week. All six together make 100%.</Text>
      {row.causeDetail ? <Text variant="body">{row.causeDetail}</Text> : null}
      {outlook && outlook.louder.length > 0 ? <Text variant="body">People are paying close attention to this right now: {outlook.louder.join(", ")}.</Text> : null}
      {drag ? <Text variant="body">Dropping fastest because of {drag.cause.toLowerCase()}.</Text> : null}
      <Course campaign={campaign} start={trends.start} series={trends.judgments.find((series) => series.id === row.driver)} label={`${row.label}, week by week`} />
    </Column>
  );
}

function Judgment(props: JudgmentProps) {
  const { row, campaign, trends, drag, outlook } = props;
  const [open, setOpen] = useState(false);
  const valence = valenceOf(row.stance);
  const target = outlook && Math.abs(outlook.target - outlook.value) >= 0.005 ? outlook.target : undefined;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} aria-label={`${row.label}: ${row.figure}, ${row.word}. See details`} flexGrow={1} padding="md" gap="xs" borderWidth={1} borderColor="borderColor" borderRadius="card" backgroundColor={{ default: "surface", hover: "surfaceHover" }}>
        <Text variant="label">{row.label}</Text>
        <Row gap="sm">
          <Text variant="heading" tone={VALENCE_TEXT[valence]} tabular>
            {row.figure}
          </Text>
          <Text variant="caption" tone="secondary">
            {row.word}
          </Text>
        </Row>
        <Track value={row.value} tone={VALENCE_TRACK[valence]} cuts={CUTS} {...(target === undefined ? {} : { target })} />
        <Text variant="caption" tone="secondary">
          Counts for {percent(row.weight)} of your approval
        </Text>
        <Row gap="xs" wrap>
          {row.salient ? <Tag tone="warning">People are watching this</Tag> : null}
          {drag ? <Tag tone="danger">Dropping fastest</Tag> : null}
        </Row>
        <Course campaign={campaign} start={trends.start} series={trends.judgments.find((series) => series.id === row.driver)} label={`${row.label}, week by week`} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={row.label} eyebrow="One thing people judge you on">
        <JudgmentDetail {...props} target={target} />
      </Sheet>
    </>
  );
}

/**
 * Approval in one place: the settled figure every screen quotes, the tracking
 * poll drawn as a sample of it with its error, the term's course against the
 * historical landmarks, the three blocs it adds up to and the six judgments
 * behind it.
 */
export function Topline({ topline, blocs, campaign, trends }: { readonly topline: ToplineView; readonly blocs: BlocTopline; readonly campaign: Campaign; readonly trends: OpinionTrends }) {
  const { poll, sinceOath, judgments } = topline;
  const headline = nowReadings(campaign).find((reading) => reading.key === "approval");
  const settled = settledApproval(topline, campaign);
  const valence = valenceOf(headline?.stance);
  const breakdown = approvalBreakdown(campaign);
  const drag = breakdown.drag;
  return (
    <Card id="elec-topline" title="Approval and this week's poll" icon="ballot">
      <Row gap="xl" wrap top>
        <Column gap="sm" flexGrow={1} flexShrink={1} flexBasis={280} minWidth={0}>
          <ReadingFrame title="Your approval and this week's poll" unit="% of adults" legend={[...toneKey({ good: "Your approval, when it is healthy", watch: "Your approval, when it is slipping", bad: "Your approval, when it is in trouble" }), { id: "poll", kind: "dot", label: "This week's poll, with its margin of error as the shaded range", ink: "colorTertiary" }, { id: "cuts", kind: "tick", label: "Thin lines at 25%, 45% and 65%", ink: "colorTertiary", weight: 1 }]} help={{ meaning: "The top bar is your true approval. The bar under it is this week's poll. The dot is its estimate, and the shaded range is how far off it could be. The true number is probably inside that range.", term: termDoor("approval-rating", "approval rating") }}>
            <Column gap="sm">
              <Track value={settled} tone={VALENCE_TRACK[valence]} cuts={CUTS} label={`Your approval, ${percent(settled)}`} />
              <Track value={poll.reading} band={[poll.low, poll.high]} tone="neutral" cuts={CUTS} label={`This week's poll ${poll.figure} ${poll.margin}`} />
            </Column>
          </ReadingFrame>
          <Text variant="body">
            <Text weight="strong">Your approval is {percent(settled)}.</Text> This is the true number. The Brief uses it, and so does the pressure to remove you from office.
          </Text>
          <Text variant="body">
            <Text weight="strong">
              This week's poll {poll.figure} {poll.margin}
            </Text>{" "}
            is a survey that estimates it. The true number is probably somewhere from {poll.range}.
          </Text>
          {sinceOath !== undefined ? (
            <Text variant="label" tone={VALENCE_TEXT[deltaValence(sinceOath)]}>
              {signedPoints(sinceOath)} since you took office
            </Text>
          ) : (
            <Text variant="caption" tone="secondary">
              Your first week isn't over yet, so there's nothing to compare.
            </Text>
          )}
        </Column>
        <Column flexGrow={2} flexShrink={1} flexBasis={360} minWidth={0}>
          <CompareChart campaign={campaign} metric="approval" subjects={[{ kind: "self" }]} window={WHOLE_RECORD} title="Approval, week by week, compared with past presidents" />
        </Column>
      </Row>
      <Blocs blocs={blocs} valence={valence} campaign={campaign} trends={trends} />
      <ReadingFrame
        title="Six things people judge you on"
        unit="% satisfied"
        legend={[...toneKey({ good: "Going well", watch: "Needs watching", bad: "Going badly" }), { id: "cuts", kind: "tick", label: "Thin lines at 25%, 45% and 65% split each bar into four ranges", ink: "colorTertiary", weight: 1 }, { id: "target", kind: "tick", label: "Where it's heading", ink: "gold", weight: 3 }, ...sparklineKey("neutral")]}
        pressHint="Press a card to see what it means and which way it's moving."
        help={{ meaning: "People judge you on six things. Each bar is how satisfied they are with one of them, and each counts for a share of your approval." }}
      >
        <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 3 }}>
          {judgments.map((row) => (
            <Judgment key={row.driver} row={row} campaign={campaign} trends={trends} drag={drag?.driver === row.label ? drag : undefined} outlook={breakdown.judgments.find((entry) => entry.driver === row.driver)} />
          ))}
        </CardGrid>
      </ReadingFrame>
    </Card>
  );
}
