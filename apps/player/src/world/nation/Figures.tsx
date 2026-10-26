import { formatMoney, type NationPower, type TieRow } from "@admin/player-core";
import { Column, Icon, ReadingFrame, Row, Reading, ReadingGrid, Text, type IconName } from "@admin/ui";
import { BarRow, BarScale, Unread } from "@admin/ui/world";
import { NationChip } from "../parts";

/** Close partners and rivals as two rows of flags, each under its own glyph. */
export function TieFlags({ ties, limit = 6 }: { readonly ties: readonly TieRow[]; readonly limit?: number }) {
  const kinds: readonly { readonly kind: TieRow["kind"]; readonly icon: IconName; readonly label: string }[] = [
    { kind: "ally", icon: "summit", label: "Close friends" },
    { kind: "rival", icon: "escalate", label: "Rivals" },
  ];
  return (
    <Column gap="sm">
      {kinds.map((row) => {
        const own = ties.filter((tie) => tie.kind === row.kind);
        if (own.length === 0) return null;
        return (
          <Column key={row.kind} gap="xs">
            <Row gap="xs">
              <Icon name={row.icon} size={16} tone={row.kind === "rival" ? "danger" : "successInk"} />
              <Text variant="label" tone="secondary">
                {row.label} · {own.length}
              </Text>
            </Row>
            <Row gap="xs" wrap role="list" aria-label={row.label}>
              {own.slice(0, limit).map((tie) => (
                <NationChip key={tie.nation} nation={tie.nation} name={tie.name} />
              ))}
            </Row>
            {own.length > limit ? (
              <Text variant="caption" tone="tertiary">
                Showing {limit} of {own.length}.
              </Text>
            ) : null}
          </Column>
        );
      })}
    </Column>
  );
}

const MILLION = 1_000_000;
const BILLION = 1_000_000_000;

function headcount(people: number): string {
  if (people >= BILLION) return `${(people / BILLION).toFixed(2)}B`;
  if (people >= MILLION) return `${(people / MILLION).toFixed(1)}M`;
  return Math.round(people).toLocaleString("en-US");
}

/** The bar's full width: a tenth of the economy. Few governments spend more, and the label says so. */
const SPEND_SCALE = 0.1;

/**
 * Size of the government: people, output, output per person and, where the services can read the budget, the defense bill against the economy.
 * `max` caps the figures per line, so a narrow card does not squeeze three large figures past its edge.
 */
export function PowerStats({ power, max = 3 }: { readonly power: NationPower; readonly max?: number }) {
  const spend = power.militarySpendUsdMillions;
  const share = power.militarySpendShareOfGdp;
  return (
    <Column gap="sm">
      <ReadingGrid max={max}>
        <Reading icon="subjectPerson" name="People" value={headcount(power.population)} size="heading" />
        <Reading icon="economyGrowth" name="Economy" value={formatMoney(power.gdpUsdMillions)} period="a year" size="heading" />
        <Reading icon="budget" name="Per person" value={`$${Math.round(power.gdpPerCapitaUsd).toLocaleString("en-US")}`} period="a year" size="heading" />
      </ReadingGrid>
      {spend === undefined ? (
        <Unread>We don't know how much it spends on defense. Our intelligence agencies can't see this budget.</Unread>
      ) : (
        <Column gap="xs">
          <Row gap="xs">
            <Icon name="shield" size={16} tone="colorSecondary" />
            <Text variant="label" weight="regular">
              Defense spending {formatMoney(spend)}
              {share === undefined ? "" : ` a year, ${(share * 100).toFixed(1)}% of its economy`}
            </Text>
          </Row>
          {share === undefined ? null : (
            <ReadingFrame title="Defense spending against its economy" unit="Share of its economy, a year" help={{ meaning: `The bar is the share of the country's whole economy that goes to defense. A full bar is ${SPEND_SCALE * 100}%, and few governments spend more.` }}>
              <Column gap="2xs">
                <BarScale from="0%" to={`${SPEND_SCALE * 100}%`} unit="Of its economy" />
                <BarRow label="Defense" value={share / SPEND_SCALE} figure={`${(share * 100).toFixed(1)}%`} valence="neutral" />
              </Column>
            </ReadingFrame>
          )}
        </Column>
      )}
    </Column>
  );
}
