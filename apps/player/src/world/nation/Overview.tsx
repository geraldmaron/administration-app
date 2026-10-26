import type { ReactNode } from "react";
import type { NationFile, NationVital, TemperamentReading } from "@admin/player-core";
import { CardGrid, CardLink, Column, Icon, ReadingFrame, Row, Reading, ReadingGrid, Surface, Text, type IconName } from "@admin/ui";
import { PairedBars, StepReading, Unread } from "@admin/ui/world";
import { BandFrame, stanceValence } from "../parts";
import { COUNTRY_VIEW_LABELS, type CountryView } from "../params";
import { barPercent, tradeKey } from "../trade";
import { PowerStats, TieFlags } from "./Figures";

/** How many of five steps each force band lights, weakest to strongest. */
export const FORCE_STEPS = { Slight: 1, Limited: 2, Capable: 3, Strong: 4, Formidable: 5 } as const;

export const VITAL_GLYPH: Readonly<Record<NationVital["key"], IconName>> = {
  economy: "economyGrowth",
  prices: "economyInflation",
  jobs: "economyUnemployment",
  order: "layerRegime",
  living: "eventEmergency",
};

export const FORCE_BANDS = "Each bar has five steps for one part of its military: Slight, Limited, Capable, Strong, then Formidable. The word beside it says which step, and the steps are estimates, never head counts.";

export const TEMPERAMENT_BANDS = "Each bar places this country among the world's fifths on one habit: Lowest, Low, Middle, High, then Highest. It says how it behaves compared with other countries, not whether that is good or bad.";

/** Where a government sits among the world's fifths on one temperament axis; the long comparison goes under it. */
export const TEMPERAMENT_WORD = { 1: "Lowest", 2: "Low", 3: "Middle", 4: "High", 5: "Highest" } as const;

export const COUNTRY_VIEW_GLYPH: Readonly<Record<CountryView, IconName>> = {
  overview: "dossier",
  diplomacy: "summit",
  economy: "economyGrowth",
  security: "shield",
  intelligence: "intel",
  activity: "dispatch",
};

export const axisWords = (axis: TemperamentReading["axis"]): string => axis.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase());

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** The Overview's way into one view: the whole card opens it, and a country chip inside still opens that country. */
const BRIEF_LABEL: Readonly<Record<CountryView, string>> = {
  overview: "Open the overview",
  diplomacy: "Open diplomacy: promises, trade penalties, friends, and rivals",
  economy: "Open the economy: its size and its trade with the United States",
  security: "Open security: its military and US forces there",
  intelligence: "Open intel: what our intelligence agencies know about it",
  activity: "Open activity: what it has done lately",
};

function Brief({ view, children, onView }: { readonly view: CountryView; readonly children: ReactNode; readonly onView: (view: CountryView) => void }) {
  return (
    <CardLink onPress={() => onView(view)} label={BRIEF_LABEL[view]} pad="lg" flexGrow={1} gap="md">
      <Row gap="sm">
        <Icon name={COUNTRY_VIEW_GLYPH[view]} size={20} tone="gold" weight="fill" />
        <Text variant="title" role="heading" aria-level={3} flexGrow={1} flexShrink={1}>
          {COUNTRY_VIEW_LABELS[view]}
        </Text>
        <Icon name="chevron" size={18} tone="colorTertiary" />
      </Row>
      {children}
    </CardLink>
  );
}

function EconomyBrief({ file }: { readonly file: NationFile }) {
  const { trade, vitals } = file;
  const top = Math.max(trade.imports, trade.exports, 1);
  return (
    <>
      <PowerStats power={file.power} max={2} />
      <BandFrame title="How its economy is doing" meaning="Each bar has steps and the word beside it says which step the reading is on. More steps is better for the country, and the color follows the word. These are estimates, not official figures.">
        {vitals
          .filter((vital) => vital.key !== "living" && !vital.unread)
          .map((vital) => (
            <StepReading key={vital.key} icon={VITAL_GLYPH[vital.key]} label={vital.caption} lit={vital.level ?? 2} word={vital.word} valence={stanceValence(vital.stance)} />
          ))}
      </BandFrame>
      <ReadingFrame title="Trade with the United States" unit="Dollars a year, both bars on one scale" legend={tradeKey(`We buy ${trade.importsText} a year`, `We sell ${trade.exportsText} a year`)} help={{ meaning: "The top bar is what the United States buys from this country in a year and the bottom bar is what it sells. The longer bar is the larger flow, and the exact amounts are printed in the key." }}>
        <PairedBars buy={barPercent(trade.imports, top)} sell={barPercent(trade.exports, top)} />
      </ReadingFrame>
      <ReadingGrid max={2}>
        <Reading icon="subjectTrade" name="Share of US trade" value={trade.usShareText ?? "None"} size="title" />
        <Reading name="Trade we track" value={String(trade.sectors.length)} period={`kinds of goods, ${plural(trade.partners.length, "partner", "partners")}`} size="title" />
      </ReadingGrid>
    </>
  );
}

function SecurityBrief({ file }: { readonly file: NationFile }) {
  const { forces, presence } = file;
  return (
    <>
      <BandFrame title="Its forces" meaning={FORCE_BANDS}>
        {forces.strip.map((domain) => (
          <StepReading key={domain.domain} label={domain.label} lit={FORCE_STEPS[domain.band]} steps={5} word={domain.band} />
        ))}
      </BandFrame>
      <ReadingGrid max={2}>
        <Reading icon="shield" name="US forces here" value={String(presence.length)} period={presence.length === 1 ? "location" : "locations"} size="title" />
        {forces.warfighting ? <Reading icon="unitGroundFormation" name="Military size" value={forces.warfighting.label} basis="estimate" size="title" /> : null}
        {forces.nuclear ? <Reading icon="escalate" name="Nuclear" value={forces.nuclear.band} size="title" /> : null}
      </ReadingGrid>
    </>
  );
}

function DiplomacyBrief({ file }: { readonly file: NationFile }) {
  const standing = file.commitments.filter((commitment) => commitment.status !== "wound-down").length;
  return (
    <>
      {file.ties.length > 0 ? <TieFlags ties={file.ties} limit={4} /> : <Text variant="body" tone="secondary">No close friend or rival stands out.</Text>}
      <ReadingGrid max={2}>
        <Reading icon="sign" name="Promises" value={String(standing)} period="active" size="title" />
        <Reading icon="subjectTrade" name="Trade penalties" value={String(file.trade.measures.length)} period="in place" size="title" />
        <Reading icon="building" name="Organizations" value={String(file.organizations.length)} size="title" />
      </ReadingGrid>
    </>
  );
}

function IntelBrief({ file }: { readonly file: NationFile }) {
  const { posture } = file;
  if (posture.unread) return <Unread>Our intelligence agencies don't know yet what this country wants.</Unread>;
  return (
    <>
      <BandFrame title="How it behaves" meaning={TEMPERAMENT_BANDS} unit="Five steps, compared with other countries">
        {posture.temperament.slice(0, 3).map((reading) => (
          <StepReading key={reading.axis} label={axisWords(reading.axis)} lit={reading.level} steps={5} word={TEMPERAMENT_WORD[reading.level]} caption={reading.text} />
        ))}
      </BandFrame>
      <ReadingGrid max={2}>
        <Reading icon="intel" name="Known goals" value={String(posture.aims.length)} size="title" />
        {file.provenance ? <Reading name="Source" value="Rough estimate" period="not fully researched" size="title" /> : null}
      </ReadingGrid>
    </>
  );
}

function ActivityBrief({ file }: { readonly file: NationFile }) {
  const latest = file.recent[0];
  if (!latest) return <Text variant="body" tone="secondary">This country hasn't done anything in the news lately.</Text>;
  return (
    <Column gap="2xs">
      <Text variant="label">{latest.headline}</Text>
      <Text variant="caption" tone="secondary">
        {latest.when}. {plural(file.recent.length, "recent move", "recent moves")} in the news.
      </Text>
    </Column>
  );
}

/** The file at a glance: its posture on a scale, then each of the other views as a card of drawn figures with the way into it. */
export function Overview({ file, onView }: { readonly file: NationFile; readonly onView: (view: CountryView) => void }) {
  const { posture } = file;
  return (
    <Column gap="lg">
      <Surface level="raised" pad="md">
        <BandFrame title="Military stance" meaning="The bar has steps and the word beside it says which step the reading is on. The line under it says what the reading is based on.">
          <StepReading icon="layerRegime" label="Military stance" lit={posture.posture.level} word={posture.posture.word} valence={stanceValence(posture.posture.stance)} caption="What its official plans say it will do with its military." />
        </BandFrame>
      </Surface>
      <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 3 }} gap="xl">
        <Brief view="diplomacy" onView={onView}>
          <DiplomacyBrief file={file} />
        </Brief>
        <Brief view="economy" onView={onView}>
          <EconomyBrief file={file} />
        </Brief>
        <Brief view="security" onView={onView}>
          <SecurityBrief file={file} />
        </Brief>
        <Brief view="intelligence" onView={onView}>
          <IntelBrief file={file} />
        </Brief>
        <Brief view="activity" onView={onView}>
          <ActivityBrief file={file} />
        </Brief>
      </CardGrid>
    </Column>
  );
}
