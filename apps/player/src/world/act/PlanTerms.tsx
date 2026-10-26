import { useState } from "react";
import { STRIKE_OBJECTIVES, formatMoney, type ActConfig, type ActTerms, type TariffGood, type TariffGoodReading, type TariffLawRow, type TariffPackageReading, type TradeSectorRow } from "@admin/player-core";
import { Button, ChoiceList, ChoiceMark, Column, Icon, Pressable, ReadingFrame, Row, Text, Toggle } from "@admin/ui";
import { InlineField } from "@admin/ui/forms";
import { PairedBars, Pips, Unread } from "@admin/ui/world";
import { assetGlyph } from "../glyphs";
import { barPercent, tradeGlyph, tradeKey, tradeScale } from "../trade";

// The settings the planned act takes, grouped the way a President thinks of
// them: what is sent or taxed and how much, under which law, and with whom.
// A tariff order covers any number of goods from one country, each at its own
// rate, read as one fold so each good is priced on what the others leave.
// Every bound and status comes from player-core's terms; this file only lays
// out the controls and says each one in plain words.

type OnConfig = (update: Partial<ActConfig>) => void;

const LAW_STATUS: Readonly<Record<TariffLawRow["orders"], string>> = { tariff: "ready to use", investigation: "needs a finding first", wait: "finding under way", nothing: "can't be used" };

const percent = (fraction: number) => `${Math.round(fraction * 1000) / 10}%`;
const RETALIATION_STEP: Readonly<Record<string, number>> = { remote: 1, unlikely: 2, "roughly even": 3, likely: 4, "almost certain": 5 };
const SHOWN_GOODS = 8;

/** What one ticked good comes to under the order: its law's answer, the money, the price, the trade and the chance they hit back. */
function GoodReading({ reading }: { readonly reading: TariffGoodReading }) {
  if (reading.status === "refused") return <Text variant="caption" tone="warning">{`Left out: ${reading.reason}`}</Text>;
  if (reading.status === "investigation") return <Text variant="caption" tone="secondary">{`${reading.law} needs a finding first, so this orders an investigation of these goods.`}</Text>;
  const step = reading.retaliation ? RETALIATION_STEP[reading.retaliation.word] : undefined;
  return (
    <Row gap="lg" rowGap="xs" wrap>
      <Column gap="2xs" minWidth={110}>
        <Text variant="caption" tone="secondary">Money in</Text>
        <Text variant="label" tone="success">{`+${formatMoney(reading.revenue ?? 0)} a year`}</Text>
      </Column>
      <Column gap="2xs" minWidth={110}>
        <Text variant="caption" tone="secondary">Prices here</Text>
        <Text variant="label" tone="warning">{`Up ${percent(reading.shelfPriceRise ?? 0)}`}</Text>
      </Column>
      <Column gap="2xs" minWidth={110}>
        <Text variant="caption" tone="secondary">What we buy from them</Text>
        <Text variant="label">{`Down ${percent(reading.importFall ?? 0)}`}</Text>
      </Column>
      {step ? (
        <Column gap="2xs" minWidth={130}>
          <Text variant="caption" tone="secondary">Chance they hit back</Text>
          <Row gap="xs">
            <Pips lit={step} valence="bad" size={6} />
            <Text variant="caption" weight="strong" tone="danger">{reading.retaliation!.word.charAt(0).toUpperCase() + reading.retaliation!.word.slice(1)}</Text>
          </Row>
        </Column>
      ) : null}
      <Text variant="caption" tone="tertiary" flexBasis="100%">{`${reading.standing > 0 ? `${reading.standing}% on these now. ` : ""}${reading.law} allows up to ${reading.room}% more.`}</Text>
    </Row>
  );
}

function GoodRow({ row, scale, picked, reading, onToggle, onRate }: { readonly row: TradeSectorRow; readonly scale: number; readonly picked?: TariffGood; readonly reading?: TariffGoodReading; readonly onToggle: () => void; readonly onRate: (rate: number) => void }) {
  const max = Math.max(1, reading?.room ?? 100);
  return (
    <Column borderRadius="card" borderWidth={picked ? 2 : 1} borderColor={picked ? "accent" : "borderColor"} backgroundColor="surface" overflow="hidden" role="listitem">
      <Pressable onPress={onToggle} role="checkbox" aria-checked={Boolean(picked)} aria-label={`${picked ? "Take out" : "Add"} ${row.name}`} padding="md" backgroundColor={{ default: "transparent", hover: "surfaceHover" }}>
        <Row gap="sm" top>
          <ChoiceMark selected={Boolean(picked)} shape="check" />
          <Icon name={tradeGlyph(row)} size={20} tone="colorSecondary" />
          <Column flex={1} minWidth={0} gap="xs">
            <Row gap="sm" between wrap>
              <Text variant="label">{row.name}</Text>
              <Text variant="caption" tone="secondary">{`We buy ${row.importsText} a year · ${row.tariffPercent > 0 ? `${row.tariffPercent}% now` : "no tariff now"}`}</Text>
            </Row>
            <PairedBars buy={barPercent(row.imports, scale)} sell={barPercent(row.exports, scale)} />
          </Column>
        </Row>
      </Pressable>
      {picked ? (
        <Column gap="md" paddingHorizontal="md" paddingBottom="md">
          {reading?.status === "tariff" ? (
            <Column gap="xs">
              <Text variant="label">{`Added on ${row.name.toLowerCase()}`}</Text>
              <InlineField label={`Added tariff on ${row.name.toLowerCase()}`} min={1} max={max} step={1} value={Math.min(picked.rate, max)} format={(value) => `${value}%`} onChange={onRate} />
            </Column>
          ) : null}
          {reading ? <GoodReading reading={reading} /> : null}
        </Column>
      ) : null}
    </Column>
  );
}

/** Every kind of goods a tariff could land on, any number ticked, each with its own rate and what it would bring. */
function Goods({ name, goods, picked, reading, onGoods }: { readonly name: string; readonly goods: readonly TradeSectorRow[]; readonly picked: readonly TariffGood[]; readonly reading?: TariffPackageReading; readonly onGoods: (goods: readonly TariffGood[]) => void }) {
  const [all, setAll] = useState(false);
  const scale = tradeScale(goods);
  const sorted = [...goods].sort((a, b) => b.imports - a.imports);
  const shown = all ? sorted : sorted.filter((row, index) => index < SHOWN_GOODS || picked.some((good) => good.sector === row.sector));
  const toggle = (sector: string) => onGoods(picked.some((good) => good.sector === sector) ? picked.filter((good) => good.sector !== sector) : [...picked, { sector, rate: picked[0]?.rate ?? 10 }]);
  const rate = (sector: string, value: number) => onGoods(picked.map((good) => (good.sector === sector ? { ...good, rate: value } : good)));
  const sameRate = picked.every((good) => good.rate === picked[0]?.rate);
  const room = Math.max(1, Math.min(...(reading?.goods.filter((good) => good.status === "tariff").map((good) => good.room) ?? [100]), 100));
  return (
    <Column gap="md">
      <Column gap="2xs">
        <Text variant="label">Goods</Text>
        <Text variant="caption" tone="secondary">{`The order covers goods from ${name}, each at its own added rate. Each kind of goods is a whole category. If you leave one out, none of it from ${name} is covered by the order.`}</Text>
      </Column>
      {picked.length > 1 ? (
        <Column gap="xs">
          <Text variant="label">{sameRate ? `Common rate for ${picked.length} goods` : `Common rate for ${picked.length} goods with separate rates`}</Text>
          <InlineField label="Common added tariff" min={1} max={room} step={1} value={Math.min(picked[0]!.rate, room)} format={(value) => `${value}%`} hint="Applies to every good in this order" onChange={(value) => onGoods(picked.map((good) => ({ ...good, rate: value })))} />
        </Column>
      ) : null}
      {reading && picked.length > 1 ? (
        <Text variant="body" weight="medium">{`${reading.ordered} of ${picked.length} goods in the order · about +${formatMoney(reading.revenue)} a year`}</Text>
      ) : null}
      <ReadingFrame title="Trade by kind of goods" unit="Dollars a year, every pair of bars on one scale" legend={tradeKey(`What we buy from ${name}`, `What we sell to ${name}`)} help={{ meaning: "Each pair of bars is one kind of goods. The top bar is what the United States buys from this country and the bottom bar is what it sells. All the bars share one scale, so you can compare any two." }}>
        <Column gap="sm" role="list" aria-label={`Goods from ${name}`}>
          {shown.map((row) => {
            const good = picked.find((entry) => entry.sector === row.sector);
            const read = reading?.goods.find((entry) => entry.sector === row.sector);
            return <GoodRow key={row.sector} row={row} scale={scale} {...(good ? { picked: good } : {})} {...(read ? { reading: read } : {})} onToggle={() => toggle(row.sector)} onRate={(value) => rate(row.sector, value)} />;
          })}
        </Column>
      </ReadingFrame>
      {sorted.length > SHOWN_GOODS ? (
        <Row>
          <Button kind="quiet" size="compact" icon={all ? "restorePanel" : "expandPanel"} onPress={() => setAll(!all)}>
            {all ? "Show fewer" : `Show all ${sorted.length} kinds of goods`}
          </Button>
        </Row>
      ) : null}
    </Column>
  );
}

function Tariff({ name, terms, goods, picked, reading, onGoods, onConfig }: { readonly name: string; readonly terms: NonNullable<ActTerms["tariff"]>; readonly goods: readonly TradeSectorRow[]; readonly picked: readonly TariffGood[]; readonly reading?: TariffPackageReading; readonly onGoods: (goods: readonly TariffGood[]) => void; readonly onConfig: OnConfig }) {
  const reachable = goods.filter((row) => terms.sectors.some((sector) => sector.sector === row.sector));
  const law = terms.law;
  return (
    <Column gap="xl">
      <ChoiceList
        label="The law it rests on"
        help="A President can only add a tariff under a law Congress passed. Each one has its own reason, its own limit and its own risk in court."
        value={law.statute}
        onChange={(statute) => onConfig({ statute })}
        options={terms.laws.map((row) => ({ value: row.statute, label: `${row.name}, ${LAW_STATUS[row.orders]}`, detail: `${row.purpose}. ${row.reason} ${row.limits}` }))}
      />
      <Text variant="caption" tone="tertiary">{`${law.cite}. ${law.courts}`}</Text>
      {reachable.length > 0 ? <Goods name={name} goods={reachable} picked={picked} {...(reading ? { reading } : {})} onGoods={onGoods} /> : <Unread>{`We don't buy anything from ${name} that a tariff could cover.`}</Unread>}
    </Column>
  );
}

function Force({ terms, onConfig }: { readonly terms: NonNullable<ActTerms["force"]>; readonly onConfig: OnConfig }) {
  if (terms.closedReason) return <Unread>{terms.closedReason}</Unread>;
  return (
    <Column gap="xs">
      <Row gap="sm"><Icon name={assetGlyph(terms.unitType)} size={24} tone="colorSecondary" /><Text variant="label">Force in the plan</Text></Row>
      <InlineField label="Force count" min={terms.min} max={terms.max} step={1} value={terms.count} onChange={(count) => onConfig({ count })} hint={terms.countText} />
      <Text variant="caption" tone="secondary">{[terms.purpose, `Your staff suggests ${terms.preferredText}.`, terms.availableText, terms.sizing].filter(Boolean).join(" ")}</Text>
    </Column>
  );
}

function Partners({ terms, config, onConfig }: { readonly terms: NonNullable<ActTerms["support"]>; readonly config: ActConfig; readonly onConfig: OnConfig }) {
  const chosen = new Set(config.partners ?? []);
  const toggle = (nation: string, on: boolean) => onConfig({ partners: on ? [...chosen, nation] : [...chosen].filter((entry) => entry !== nation) });
  return (
    <Column gap="sm">
      <ChoiceList
        label="Who takes part"
        value={terms.mode}
        onChange={(mode) => onConfig({ support: mode, ...(mode === "unilateral" ? { partners: [] } : {}) })}
        options={[
          { value: "unilateral", label: "Alone", detail: "You act on your own, so there's no waiting on anyone." },
          { value: "seek", label: "With partners", detail: "You ask other countries to join. Each decides for itself, and your order waits three days for their answers." },
        ]}
      />
      {terms.mode === "seek" ? (
        terms.partners.length > 0 ? (
          terms.partners.map((partner) => <Toggle key={partner.nation} label={`${partner.name}, ${partner.compact}`} value={partner.chosen} onChange={(on) => toggle(partner.nation, on)} />)
        ) : (
          <Text variant="body" tone="secondary">None of your treaty partners can join you on this one.</Text>
        )
      ) : null}
    </Column>
  );
}

function Strike({ terms, onConfig }: { readonly terms: NonNullable<ActTerms["strike"]>; readonly onConfig: OnConfig }) {
  return (
    <Column gap="lg">
      <ChoiceList label="What it hits" value={terms.objective} onChange={(strikeObjective) => onConfig({ strikeObjective })} options={STRIKE_OBJECTIVES.map((objective) => ({ value: objective.value, label: objective.label, detail: objective.detail }))} />
      <ChoiceList
        label="Protecting civilians"
        value={terms.protection}
        onChange={(civilianProtection) => onConfig({ civilianProtection })}
        options={[
          { value: "standard", label: "Usual check", detail: "The usual check of who could get hurt." },
          { value: "additional-assessment", label: "Extra check", detail: "Three more days to prepare, and less risk to civilians. It can't promise no one gets hurt." },
        ]}
      />
    </Column>
  );
}

/** The terms of the planned act, or a plain line when it has none to set. */
export type TariffPick = { readonly picked: readonly TariffGood[]; readonly reading?: TariffPackageReading; readonly onGoods: (goods: readonly TariffGood[]) => void };

export function PlanTerms({ name, terms, config, onConfig, goods, tariff }: { readonly name: string; readonly terms: ActTerms; readonly config: ActConfig; readonly onConfig: OnConfig; readonly goods: readonly TradeSectorRow[]; readonly tariff?: TariffPick }) {
  const none = !terms.tariff && !terms.force && !terms.support && !terms.strike && !terms.regime;
  if (none && config.option === "tariff") {
    return (
      <Column gap="sm" role="status">
        <Text variant="body">These goods or rates are outside the available tariff terms.</Text>
        <Row>
          <Button kind="secondary" size="compact" onPress={() => onConfig({ sector: undefined, rate: undefined, goods: undefined })}>
            Start the tariff over
          </Button>
        </Row>
      </Column>
    );
  }
  if (none) return <Text variant="body" tone="secondary">There's nothing to set. This one comes in one size.</Text>;
  return (
    <Column gap="xl">
      {terms.tariff && tariff ? <Tariff name={name} terms={terms.tariff} goods={goods} picked={tariff.picked} {...(tariff.reading ? { reading: tariff.reading } : {})} onGoods={tariff.onGoods} onConfig={onConfig} /> : null}
      {terms.force ? <Force terms={terms.force} onConfig={onConfig} /> : null}
      {terms.strike ? <Strike terms={terms.strike} onConfig={onConfig} /> : null}
      {terms.regime ? <ChoiceList label="What the operation does" value={terms.regime.act} onChange={(regimeAct) => onConfig({ regimeAct })} options={terms.regime.options.map((option) => ({ value: option.value, label: option.label, detail: option.detail }))} /> : null}
      {terms.support ? <Partners terms={terms.support} config={config} onConfig={onConfig} /> : null}
    </Column>
  );
}
