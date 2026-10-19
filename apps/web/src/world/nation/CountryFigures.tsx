import { formatMoney, type NationPower, type TieRow } from "@admin/player-core";
import { Bar, Flag, Icon, Stat, StatRow, type IconName } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";
import "./figures.css";

/** A government as a flag and its name, one chip that opens its file. */
export function FlagChip({ nation, name, href, word, tone }: { readonly nation: string; readonly name: string; readonly href: string; readonly word?: string; readonly tone?: "ally" | "rival" }) {
  const src = nationFlagUrl(nation as never);
  return (
    <Door href={href} className="flag-chip" {...(tone ? { "data-tone": tone } : {})}>
      <Flag name={name} {...(src ? { src } : {})} height={16} decorative />
      <span className="flag-chip__name">{name}</span>
      {word ? <span className="flag-chip__word">{word}</span> : null}
    </Door>
  );
}

/** Close partners and rivals as two rows of flags, each under its own glyph. */
export function TieFlags({ ties, limit = 6 }: { readonly ties: readonly TieRow[]; readonly limit?: number }) {
  const rows: readonly { readonly kind: TieRow["kind"]; readonly icon: IconName; readonly label: string }[] = [
    { kind: "ally", icon: "summit", label: "Close partners" },
    { kind: "rival", icon: "escalate", label: "Rivals" },
  ];
  return (
    <div className="tie-flags">
      {rows.map((row) => {
        const own = ties.filter((tie) => tie.kind === row.kind);
        if (own.length === 0) return null;
        return (
          <div key={row.kind} className="tie-flags__row" data-kind={row.kind}>
            <span className="tie-flags__label">
              <Icon name={row.icon} size={16} /> {row.label}
              <span className="tie-flags__count">{own.length}</span>
            </span>
            <ul className="tie-flags__list" aria-label={row.label}>
              {own.slice(0, limit).map((tie) => (
                <li key={tie.nation}>
                  <FlagChip nation={tie.nation} name={tie.name} href={tie.href} tone={row.kind} />
                </li>
              ))}
            </ul>
            {own.length > limit ? <span className="tie-flags__more">{limit} of {own.length} shown. Open diplomacy for every tie.</span> : null}
          </div>
        );
      })}
    </div>
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

/** Size of the government: people, output, output per person and, where the services can read the budget, the defense bill against the economy. */
export function PowerStats({ power }: { readonly power: NationPower }) {
  const spend = power.militarySpendUsdMillions;
  const share = power.militarySpendShareOfGdp;
  return (
    <div className="country-power">
      <StatRow layout="comparison">
        <Stat layout="comparison" size="heading" icon="subjectPerson" label="People" value={headcount(power.population)} />
        <Stat layout="comparison" size="heading" icon="economyGrowth" label="Economy" value={<>{formatMoney(power.gdpUsdMillions)}<small>a year</small></>} />
        <Stat layout="comparison" size="heading" icon="budget" label="Per person" value={<>{`$${Math.round(power.gdpPerCapitaUsd).toLocaleString("en-US")}`}<small>a year</small></>} />
      </StatRow>
      {spend === undefined ? (
        <p className="country-unread">
          <Icon name="hidden" size={16} /> Defense spending: not assessed. The services have no read on this budget.
        </p>
      ) : (
        <div className="country-power__spend">
          <p className="country-power__line">
            <Icon name="shield" size={16} /> Defense spending <strong>{formatMoney(spend)}</strong>
            {share === undefined ? null : <> a year, {(share * 100).toFixed(1)}% of its economy</>}
          </p>
          {share === undefined ? null : (
            <Bar label={`Defense spending is ${(share * 100).toFixed(1)}% of its economy. The bar runs to ${SPEND_SCALE * 100}%.`} value={share / SPEND_SCALE} tone="neutral" slim marks={[{ at: 1, label: `${SPEND_SCALE * 100}% of economy` }]} />
          )}
        </div>
      )}
    </div>
  );
}
