import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { actWorkspace, standingToward, underWayAgainst, type ActOption, type Standing } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Button, Card, Column, Icon, Meter, Page, ReadingFrame, Row, Section, Text, type KeyEntry } from "@admin/ui";
import { ActResult } from "../../executive/ActReceipt";
import { BackButton } from "../../shell/BackButton";
import { RefusedResult } from "../acts";
import { FlagOf, RELATIONSHIP_BANDS, RowTo, go } from "../parts";
import { countryActHref, countryReturnHref, type CountrySearch } from "../params";
import type { ActDone } from "./commit";
import { LockedPath } from "./readings";

// What an act on a government came to: the receipt, what it changed (the
// relationship as it stands now with a tick where it stood, and the readings
// at home), what is now moving against them, and the way back to a locked
// option the act was taken to reach.

const BEFORE_KEY: readonly KeyEntry[] = [{ id: "before", kind: "tick", label: "Where it stood before the act", ink: "gold" }];

const TONE = { favorable: "successInk", neutral: "accent", caution: "warningInk", adverse: "danger" } as const;

function Band({ label, after, before }: { readonly label: string; readonly after: NonNullable<Standing["tension"]>; readonly before: Standing["tension"] }) {
  return <Meter label={label} value={after.level / 4} figure={after.word} tone={TONE[after.stance]} marks={before ? [{ id: "before", label: before.word === after.word ? `Same as before, ${before.word}` : `Before, ${before.word}`, at: before.level / 4, kind: "historical" }] : []} />;
}

function Relationship({ before, after, nation }: { readonly before: Campaign; readonly after: Campaign; readonly nation: NationId }) {
  const was = standingToward(before, nation);
  const now = standingToward(after, nation);
  return (
    <Card title="The relationship" icon="layerTrust" helper="Governments take a few weeks to answer.">
      <ReadingFrame title="Where it stands now" unit="Trust and tension, each on four steps" legend={BEFORE_KEY} help={{ meaning: RELATIONSHIP_BANDS }}>
        <Column gap="md">
          {now?.theirs ? <Band label={now.theirs.caption} after={now.theirs.trust} before={was?.theirs?.trust} /> : <Text variant="body" tone="secondary">We don't know yet how they see you.</Text>}
          {now?.ours ? <Band label={now.ours.caption} after={now.ours.trust} before={was?.ours?.trust} /> : null}
          {now?.tension ? <Band label="Tension between you" after={now.tension} before={was?.tension} /> : null}
        </Column>
      </ReadingFrame>
    </Card>
  );
}

function BackTo({ nation, done, then, origin }: { readonly nation: NationId; readonly done: ActDone; readonly then: ActOption; readonly origin: CountrySearch }) {
  const entry = useMemo(() => actWorkspace(done.after, nation, { option: then.id })?.chosen, [done.after, nation, then.id]);
  const open = entry?.preview.state === "open";
  return (
    <Card title={open ? `${then.name} is open now` : `${then.name} is still locked`} icon={open ? "approve" : "locked"} edge={open ? "success" : "warning"}>
      {!open && entry ? <LockedPath {...(entry.prerequisite ? { prerequisite: entry.prerequisite } : {})} {...(entry.preview.reason ? { reason: entry.preview.reason } : {})} /> : null}
      <Row>
        <Button kind={open ? "primary" : "secondary"} size="compact" icon="return" onPress={() => go(countryActHref(nation, { option: then.id }, origin))}>
          {`Back to ${then.name}`}
        </Button>
      </Row>
    </Card>
  );
}

function NowMoving({ campaign, nation, name, origin }: { readonly campaign: Campaign; readonly nation: NationId; readonly name: string; readonly origin: CountrySearch }) {
  const rows = underWayAgainst(campaign, nation);
  return (
    <Card title="Now under way" icon="pending" helper={rows.length === 0 ? `Nothing you ordered is still moving against ${name}.` : undefined}>
      {rows.map((row) => (
        <RowTo key={row.id} href={countryActHref(nation, { manage: row.id }, origin)} label={`Open ${row.title}`} flexDirection="row" alignItems="flex-start" gap="sm" paddingVertical="xs" paddingHorizontal="xs">
          <Icon name="pending" size={16} tone="colorSecondary" />
          <Column flex={1} gap="2xs">
            <Text variant="label">{row.title}</Text>
            <Text variant="caption" tone="secondary">{row.detail}</Text>
          </Column>
          <Icon name="chevron" size={16} tone="colorTertiary" />
        </RowTo>
      ))}
    </Card>
  );
}

export function ActReceipt({ nation, name, done, then, origin = {} }: { readonly nation: NationId; readonly name: string; readonly done: ActDone; readonly then?: ActOption; readonly origin?: CountrySearch }) {
  const back = (
    <Row gap="sm" wrap>
      <Button kind="secondary" size="compact" icon="dispatch" onPress={() => go(countryActHref(nation, {}, origin))}>
        More options for this country
      </Button>
      <BackButton parent={countryReturnHref(nation, origin)} parentLabel={name} />
    </Row>
  );
  const view = { title: done.title, date: done.date, before: done.before, after: done.after, lines: done.lines.map((line) => ({ label: line.label, value: line.value })), ...(done.eventId ? { eventId: done.eventId } : {}), ...(done.saveError ? { saveError: done.saveError } : {}) };
  return (
    <Page eyebrow="Foreign government" icon="approve" title={name} emblem={<FlagOf nation={nation} name={name} height={40} />}>
      {done.outcome === "refused" ? <RefusedResult title={done.title} date={done.date} lines={done.lines.map((line) => ({ label: line.label, value: line.value }))} {...(done.eventId ? { eventId: done.eventId } : {})} back={back} /> : <ActResult done={view} back={back} />}
      {then ? <BackTo nation={nation} done={done} then={then} origin={origin} /> : null}
      <Section id="act-changed" icon="graph" title="Where it leaves the relationship" helper="Where things stand now, next to where they stood before you acted.">
        <Relationship before={done.before} after={done.after} nation={nation} />
        <NowMoving campaign={done.after} nation={nation} name={name} origin={origin} />
      </Section>
    </Page>
  );
}
