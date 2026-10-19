import type { Campaign } from "@admin/engine";
import { buildLift, buildStandDown, pendingAbout, standingToward, type PendingItem, type UnderWayRow } from "@admin/player-core";
import { PendingRows } from "../../shell/Pending";
import type { NationId } from "@admin/world";
import { Button, Card, CardGrid, Column, Icon, Row, Text } from "@admin/ui";
import { StepReading, Unread } from "@admin/ui/world";
import { BandFrame, RELATIONSHIP_BANDS, RELATIONSHIP_LADDER, stanceValence } from "../parts";
import type { ActCommit } from "./commit";

// Where things stand with this government before any choice: how they see
// the President, the tension between the two, and everything already moving
// against them. Each thing under way ends from its own row through the one
// review; leaving it alone needs no press.

function Standing({ campaign, nation }: { readonly campaign: Campaign; readonly nation: NationId }) {
  const standing = standingToward(campaign, nation);
  return (
    <Card title="The relationship" icon="layerTrust">
      <BandFrame title="How you and they see each other" meaning={RELATIONSHIP_BANDS} unit={RELATIONSHIP_LADDER} term={{ id: "their-trust", label: "Their trust in you" }}>
        {standing?.theirs ? <StepReading label={standing.theirs.caption} lit={standing.theirs.trust.level} word={standing.theirs.trust.word} valence={stanceValence(standing.theirs.trust.stance)} /> : <Unread>We don't know yet how they see you.</Unread>}
        {standing?.ours ? <StepReading label={standing.ours.caption} lit={standing.ours.trust.level} word={standing.ours.trust.word} valence={stanceValence(standing.ours.trust.stance)} /> : null}
        {standing?.tension ? <StepReading label="Tension between you" lit={standing.tension.level} word={standing.tension.word} valence={stanceValence(standing.tension.stance)} /> : null}
      </BandFrame>
    </Card>
  );
}

const ROW_ICON = { operation: "pending", authorization: "subjectCapitol", measure: "subjectTrade" } as const;

function Moving({ row, focused, onEnd, busy }: { readonly row: UnderWayRow; readonly focused: boolean; readonly onEnd: () => void; readonly busy: boolean }) {
  return (
    <Row gap="sm" top padding="sm" borderRadius="card" borderWidth={focused ? 2 : 1} borderColor={focused ? "accent" : "borderColor"} backgroundColor="surface" role="listitem">
      <Icon name={ROW_ICON[row.kind]} size={18} tone="colorSecondary" />
      <Column flex={1} minWidth={0} gap="2xs">
        <Text variant="label">{row.title}</Text>
        <Text variant="caption" tone="secondary">
          {row.detail}
        </Text>
      </Column>
      {row.endable ? (
        <Button kind="secondary" size="compact" icon="return" disabled={busy} onPress={onEnd} label={`End ${row.title}`}>
          End
        </Button>
      ) : null}
    </Row>
  );
}

/** The wait a row of the list is, where it has one: an operation's first report, or Congress's vote. */
const waitOf = (row: UnderWayRow, pending: readonly PendingItem[]): PendingItem | undefined => pending.find((item) => item.id === row.id || item.id === `issued-aumf:${row.id}`);

function UnderWay({ campaign, nation, name, rows, focus, act }: { readonly campaign: Campaign; readonly nation: NationId; readonly name: string; readonly rows: readonly UnderWayRow[]; readonly focus?: string; readonly act: ActCommit }) {
  const pending = pendingAbout(campaign, `nation:${nation}`);
  const tied = new Set(rows.flatMap((row) => waitOf(row, pending)?.id ?? []));
  const waits = pending.filter((item) => !tied.has(item.id));
  const end = (row: UnderWayRow) => {
    const measure = row.kind === "measure";
    const verb = measure ? "Lift it" : "Call it off";
    void act.take(() => (measure ? buildLift(campaign, row.id) : buildStandDown(campaign, row.id)), {
      tier: "confirm",
      title: measure ? `Lift the ${row.title.toLowerCase()} on ${name}` : `Call off ${row.title} against ${name}`,
      lines: [{ label: "What happens", value: measure ? "The measure comes off. Prices and trade start going back to normal, and relations get a little better." : "The operation stops before it starts. The money and forces set aside for it come back." }],
      verb,
    });
  };
  return (
    <Card title="Already under way" icon="pending" id="act-underway" helper={rows.length === 0 && waits.length === 0 ? `Nothing you ordered is moving against ${name} right now.` : undefined}>
      {waits.length > 0 ? <PendingRows items={waits} label="Waiting on an answer" {...(focus ? { focus } : {})} /> : null}
      {rows.length > 0 ? (
        <Column gap="xs" role="list" aria-label="Under way">
          {rows.map((row) => {
            const wait = waitOf(row, pending);
            return wait ? (
              <Column key={row.id} gap="2xs">
                <PendingRows items={[wait]} label={row.title} {...(focus ? { focus } : {})} />
                {row.endable ? (
                  <Row justifyContent="flex-end">
                    <Button kind="secondary" size="compact" icon="return" disabled={act.busy} onPress={() => end(row)} label={`End ${row.title}`}>
                      End
                    </Button>
                  </Row>
                ) : null}
              </Column>
            ) : (
              <Moving key={row.id} row={row} focused={row.id === focus} busy={act.busy} onEnd={() => end(row)} />
            );
          })}
        </Column>
      ) : null}
    </Card>
  );
}

export function Situation({ campaign, nation, name, underway, focus, act }: { readonly campaign: Campaign; readonly nation: NationId; readonly name: string; readonly underway: readonly UnderWayRow[]; readonly focus?: string; readonly act: ActCommit }) {
  return (
    <CardGrid columns={{ phone: 1, tablet: 1, desktop: 2, wide: 2 }} gap="lg">
      <Standing campaign={campaign} nation={nation} />
      <UnderWay campaign={campaign} nation={nation} name={name} rows={underway} {...(focus ? { focus } : {})} act={act} />
    </CardGrid>
  );
}
