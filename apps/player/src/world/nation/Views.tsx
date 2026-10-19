import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { WAR_POWERS_ANCHOR, actHref, countryWarPowers, underWayAgainst, type ActWorkspace, type NationFile } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Button, Column, Empty, Icon, Row, Text, type IconName } from "@admin/ui";
import { Panel, StepReading, Unread } from "@admin/ui/world";
import { ActsReceipt, useWorldActs } from "../acts";
import { HoldingsTable } from "../forces";
import { BandFrame, CardTo, TopicLaw, go } from "../parts";
import { WarPowersSection } from "../war/WarPowers";
import { FORCE_BANDS, FORCE_STEPS, TEMPERAMENT_BANDS, TEMPERAMENT_WORD, axisWords } from "./Overview";

/**
 * The War Powers paper on force against this government. Where the force is
 * part of a war the decisions live on the war, and this points there; where it
 * is not (a strike with no war behind it, or a war that has ended while the
 * statute still counts), they are made here.
 */
function CountryWarPowers({ campaign, id, name }: { readonly campaign: Campaign; readonly id: NationId; readonly name: string }) {
  const acts = useWorldActs(campaign, `nation:${id}`);
  const reading = useMemo(() => countryWarPowers(campaign, id), [campaign, id]);
  if (reading.papers.length === 0 && !acts.committed) return null;
  const war = reading.war;
  if (war) {
    return (
      <Panel title="War Powers deadlines" icon="gavel" aside={<TopicLaw topic="war-powers" />} id={WAR_POWERS_ANCHOR}>
        <CardTo href={war} label="Open the war's War Powers deadlines" pad="md" flexDirection="row" alignItems="center" gap="sm">
          <Icon name="gavel" size={20} tone="colorSecondary" />
          <Text variant="body" flexGrow={1} flexShrink={1} flexBasis={0} minWidth={0}>
            The troops you sent against {name} are part of a war. Their deadlines, including the report to Congress, the 60-day limit, and the vote in Congress, are handled on the war's page.
          </Text>
          <Icon name="chevron" size={18} tone="colorTertiary" />
        </CardTo>
      </Panel>
    );
  }
  return (
    <Column gap="lg">
      <ActsReceipt acts={acts} again={`Back to ${name}`} />
      <WarPowersSection campaign={campaign} papers={reading.papers} acts={acts} />
    </Column>
  );
}

const PRESENCE_FIRST = 8;

/** Its forces as bands, never headcounts; the counts print only where the services read the government and the dataset holds an order of battle. */
export function SecurityView({ campaign, file }: { readonly campaign: Campaign; readonly file: NationFile }) {
  const { forces, presence } = file;
  const [all, setAll] = useState(false);
  return (
    <Column gap="lg">
      <CountryWarPowers campaign={campaign} id={file.nation} name={file.name} />
      <Panel title={`${file.name}'s forces`} icon="shield">
        {forces.warfighting ? <Text variant="body">Its military is in the {forces.warfighting.label.toLowerCase()} group. {forces.warfighting.sustains}</Text> : null}
        <BandFrame title="Its forces, by branch" meaning={FORCE_BANDS}>
          {forces.strip.map((domain) => (
            <StepReading key={domain.domain} label={domain.label} lit={FORCE_STEPS[domain.band]} steps={5} word={domain.band} />
          ))}
        </BandFrame>
        {forces.nuclear ? (
          <Row gap="xs">
            <Icon name="escalate" size={16} tone="danger" />
            <Text variant="label" weight="regular">
              {forces.nuclear.band}
              {forces.nuclear.warheads !== undefined ? `, with ${forces.nuclear.warheads.toLocaleString("en-US")} nuclear warheads that it admits to` : ""}.
            </Text>
          </Row>
        ) : null}
        {forces.inferred.length > 0 ? <Unread>{`${forces.read ? "We don't have a detailed count for " : "Our intelligence agencies can't see "}${forces.inferred.map((domain) => domain.label.toLowerCase()).join(", ")}. The levels above are educated guesses.`}</Unread> : null}
      </Panel>
      {forces.counted.length > 0 ? (
        <Panel title={`What ${file.name} has, by type`} icon="unitGroundFormation">
          <HoldingsTable holdings={forces.counted} caption={`What ${file.name} has, by type`} />
        </Panel>
      ) : null}
      <Panel title={`US forces in ${file.name}`} icon="mapPin" count={presence.length} lede="Only bases we can confirm are shown at their exact spot. Everything else is marked by general area.">
        {presence.length === 0 ? (
          <Empty title="No US forces here" detail="Forces we place here would be listed with where they are." />
        ) : (
          <Column gap="sm" role="list" aria-label="US forces here">
            {(all ? presence : presence.slice(0, PRESENCE_FIRST)).map((row) => (
              <Row key={row.id} gap="sm" wrap role="listitem">
                <Icon name={row.precision === "installation" ? "mapPin" : "layerBlocs"} size={18} tone="colorSecondary" />
                <Text variant="label" flex={1} minWidth={160}>
                  {row.label}
                </Text>
                <Text variant="caption" tone="secondary">
                  {row.where}
                </Text>
                {row.band ? (
                  <Text variant="caption" weight="strong">
                    {row.band}
                  </Text>
                ) : null}
              </Row>
            ))}
          </Column>
        )}
        {presence.length > PRESENCE_FIRST ? (
          <Button kind="quiet" size="compact" onPress={() => setAll((open) => !open)}>
            {all ? "Show fewer" : `Show all ${presence.length}`}
          </Button>
        ) : null}
      </Panel>
    </Column>
  );
}

/** What the services read of the government: what it is after, how it decides, what it runs at home, and how its press covers you. */
export function IntelligenceView({ file }: { readonly file: NationFile }) {
  const { posture, program } = file;
  return (
    <Column gap="lg">
      <Panel title="What it wants" icon="intel" aside={<TopicLaw topic="intelligence-collection" />}>
        {posture.unread ? (
          <Unread>Our intelligence agencies don't know yet what this country wants.</Unread>
        ) : (
          <Column gap="xs" role="list" aria-label="Aims">
            {posture.aims.map((aim) => (
              <Row key={aim} gap="sm" top role="listitem">
                <Icon name="intel" size={16} tone="colorSecondary" />
                <Text variant="body" flex={1}>
                  {aim}
                </Text>
              </Row>
            ))}
          </Column>
        )}
        {posture.temperament.length > 0 ? (
          <BandFrame title="How it behaves, compared with other countries" meaning={TEMPERAMENT_BANDS} unit="Five steps, compared with other countries">
            {posture.temperament.map((reading) => (
              <StepReading key={reading.axis} label={axisWords(reading.axis)} lit={reading.level} steps={5} word={TEMPERAMENT_WORD[reading.level]} caption={reading.text} />
            ))}
          </BandFrame>
        ) : null}
        {posture.temperamentSource ? <Text variant="caption" tone="tertiary">{posture.temperamentSource}</Text> : null}
      </Panel>
      <Panel title="Its policies at home" icon="layerRegime">
        <Column gap="xs">
          {program.rows.map((row) => (
            <Row key={row.domain} gap="sm" wrap>
              <Text variant="label" width={180}>
                {row.domainName}
              </Text>
              <Text variant="body" flex={1} minWidth={160}>
                {row.stanceName}
              </Text>
            </Row>
          ))}
        </Column>
        <Text variant="caption" tone="secondary">
          {program.lastChange ? `${program.lastChange.when}: ${program.lastChange.headline} ` : ""}
          It looks at its policies again {program.reviewInWeeks === 0 ? "this week" : `in ${program.reviewInWeeks} ${program.reviewInWeeks === 1 ? "week" : "weeks"}`}.
        </Text>
      </Panel>
      {file.coverage ? (
        <Panel title="How their press covers you" icon="press">
          <Text variant="body">{file.coverage.caption}</Text>
          {file.coverage.piece ? (
            <Text variant="caption" tone="secondary">
              {file.coverage.piece.outlet}: {file.coverage.piece.lede}
            </Text>
          ) : null}
        </Panel>
      ) : null}
      {file.provenance ? <Text variant="caption" tone="tertiary">{file.provenance}</Text> : null}
    </Column>
  );
}

const UNDERWAY_ICON: Readonly<Record<ActWorkspace["underway"][number]["kind"], IconName>> = { operation: "pending", authorization: "law", measure: "subjectTrade" };
const END_VERB: Readonly<Record<ActWorkspace["underway"][number]["kind"], string>> = { operation: "Call it off", authorization: "", measure: "Lift it" };

/** What the President already has moving against this government, said before any new order so a second is never given without the first in view. */
export function UnderWay({ nation, rows }: { readonly nation: NationId; readonly rows: ActWorkspace["underway"] }) {
  if (rows.length === 0) return null;
  return (
    <Panel title="Already under way" icon="pending" count={rows.length} edge="warning">
      {rows.map((row) => (
        <Row key={row.id} gap="sm" wrap>
          <Icon name={UNDERWAY_ICON[row.kind]} size={18} tone="colorSecondary" />
          <Column flex={1} minWidth={200} gap="2xs">
            <Text variant="label">{row.title}</Text>
            <Text variant="caption" tone="secondary">
              {row.detail}
            </Text>
          </Column>
          {row.endable ? (
            <Button kind="secondary" size="compact" icon="return" onPress={() => go(actHref(nation, { manage: row.id }))}>
              {END_VERB[row.kind]}
            </Button>
          ) : null}
        </Row>
      ))}
    </Panel>
  );
}

const MOVES_FIRST = 6;

/** What you have moving against this government, then what it has done lately, newest first, with its reasons where the services can read them. */
export function ActivityView({ campaign, file }: { readonly campaign: Campaign; readonly file: NationFile }) {
  const underway = useMemo(() => underWayAgainst(campaign, file.nation), [campaign, file.nation]);
  const [shown, setShown] = useState(MOVES_FIRST);
  return (
    <Column gap="lg">
      <UnderWay nation={file.nation} rows={underway} />
      <Panel title={`Recent moves by ${file.name}`} icon="dispatch" count={file.recent.length}>
        {file.recent.length === 0 ? (
          <Text variant="body" tone="secondary">This country hasn't done anything in the news lately.</Text>
        ) : (
          <Column gap="md" role="list" aria-label="Recent moves">
            {file.recent.slice(0, shown).map((move) => (
              <Column key={`${move.turn}:${move.headline}`} gap="2xs" role="listitem">
                <Text variant="eyebrow" tone="secondary">
                  {move.when}
                </Text>
                <Text variant="label">{move.headline}</Text>
                {move.reasons.map((reason) => (
                  <Text key={reason.key} variant="caption" tone="secondary">
                    {reason.text}
                  </Text>
                ))}
              </Column>
            ))}
          </Column>
        )}
        {file.recent.length > shown ? (
          <Button kind="quiet" size="compact" onPress={() => setShown(file.recent.length)}>
            {`Show all ${file.recent.length}`}
          </Button>
        ) : null}
      </Panel>
    </Column>
  );
}
