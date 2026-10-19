import { AuthorityHelp } from "../../help/AuthorityHelp";
import { STRIKE_OBJECTIVES, type ActConfig, type ActTerms, type TradeSectorRow } from "@admin/player-core";
import { Button, Choice, Field, Toggle } from "@admin/ui-web";
import { AssetGlyph } from "../forces/AssetFigure";
import { TariffGoods } from "./TariffGoods";

type Props = {
  /** The target's name, for the comparison's headings. */
  readonly name: string;
  readonly terms: ActTerms;
  readonly config: ActConfig;
  readonly onConfig: (update: Partial<ActConfig>) => void;
  /** What the United States trades with the target, kind of goods by kind of goods, for the tariff's comparison. */
  readonly goods?: readonly TradeSectorRow[];
};

function Tariff({ name, terms, goods, onConfig }: { readonly name: string; readonly terms: NonNullable<ActTerms["tariff"]>; readonly goods: readonly TradeSectorRow[]; readonly onConfig: Props["onConfig"] }) {
  const reachable = goods.filter((row) => terms.sectors.some((sector) => sector.sector === row.sector));
  return (
    <>
      {reachable.length > 0 ? (
        <TariffGoods name={name} goods={reachable} picked={terms.sector} onPick={(sector) => onConfig({ sector })} />
      ) : (
        <Field label="Goods" hint="Only goods the United States buys from them can carry a tariff.">
          {(props) => (
            <select {...props} className="ui-input" value={terms.sector} onChange={(event) => onConfig({ sector: event.target.value })}>
              {terms.sectors.map((sector) => (
                <option key={sector.sector} value={sector.sector}>
                  {sector.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <AuthorityHelp topic="tariffs" compact />
      <Field label={`Additional rate: ${terms.rate}%`} hint={terms.standing > 0 ? `${terms.standing}% in force + ${terms.rate}% additional = ${terms.standing + terms.rate}% total. Room for ${terms.room}% additional before the 100% limit.` : `Total after this order: ${terms.rate}%. Up to ${terms.room}% total.`}>
        {(props) => <input {...props} type="range" className="ui-input ui-input--range" min={1} max={Math.max(1, terms.room)} step={1} value={Math.min(terms.rate, Math.max(1, terms.room))} onChange={(event) => onConfig({ rate: Number(event.target.value) })} />}
      </Field>
    </>
  );
}

function Force({ terms, onConfig }: { readonly terms: NonNullable<ActTerms["force"]>; readonly onConfig: Props["onConfig"] }) {
  if (terms.closedReason) return <p className="act-terms__closed">{terms.closedReason}</p>;
  return (
    <Field
      label={
        <span className="asset-line">
          <AssetGlyph unitType={terms.unitType} size={24} /> What it sends: {terms.countText}
        </span>
      }
      hint={[terms.purpose, `The staff proposes ${terms.preferredText}.`, terms.availableText, terms.sizing].filter(Boolean).join(" ")}
    >
      {(props) => <input {...props} type="range" className="ui-input ui-input--range" min={terms.min} max={terms.max} step={1} value={terms.count} onChange={(event) => onConfig({ count: Number(event.target.value) })} />}
    </Field>
  );
}

function Support({ terms, config, onConfig }: { readonly terms: NonNullable<ActTerms["support"]> } & Pick<Props, "config" | "onConfig">) {
  const chosen = new Set(config.partners ?? []);
  const toggle = (nation: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(nation);
    else next.delete(nation);
    onConfig({ partners: [...next] });
  };
  return (
    <>
      <Choice
        legend="Who acts"
        layout="cards"
        className="act-terms__who"
        value={terms.mode}
        onChange={(mode) => onConfig({ support: mode, ...(mode === "unilateral" ? { partners: [] } : {}) })}
        options={[
          { value: "unilateral", label: "Alone", detail: "No partner is asked. Nothing waits on anyone's answer." },
          { value: "seek", label: "With partners", detail: "Ask partners to take part. Each answers on its own terms, and the order waits three days for them." },
        ]}
      />
      {terms.mode === "seek" ? (
        terms.partners.length > 0 ? (
          <div className="act-terms__partners">
            {terms.partners.map((partner) => (
              <Toggle key={partner.nation} label={`${partner.name} (${partner.compact})`} checked={partner.chosen} onChange={(on) => toggle(partner.nation, on)} />
            ))}
          </div>
        ) : (
          <p className="brief-section__note">No partner shares a compact with you on this one.</p>
        )
      ) : null}
    </>
  );
}

function Strike({ terms, onConfig }: { readonly terms: NonNullable<ActTerms["strike"]>; readonly onConfig: Props["onConfig"] }) {
  return (
    <>
      <Choice
        legend="What it targets"
        layout="cards"
        value={terms.objective}
        onChange={(objective) => onConfig({ strikeObjective: objective })}
        options={STRIKE_OBJECTIVES.map((objective) => ({ value: objective.value, label: objective.label, detail: objective.detail }))}
      />
      <Choice
        legend="Civilian protection"
        layout="cards"
        value={terms.protection}
        onChange={(protection) => onConfig({ civilianProtection: protection })}
        options={[
          { value: "standard", label: "Standard assessment", detail: "The usual review of who could be hurt." },
          { value: "additional-assessment", label: "Additional assessment", detail: "Adds three days of preparation and lowers the modeled risk to civilians. It does not guarantee anyone's safety." },
        ]}
      />
    </>
  );
}

function Regime({ terms, onConfig }: { readonly terms: NonNullable<ActTerms["regime"]>; readonly onConfig: Props["onConfig"] }) {
  return (
    <Choice
      legend="What the operation does"
      layout="cards"
      value={terms.act}
      onChange={(regimeAct) => onConfig({ regimeAct })}
      options={terms.options.map((option) => ({ value: option.value, label: option.label, detail: option.detail }))}
    />
  );
}

/** The terms the chosen act takes: goods and rate, the size of the force, who acts, what a strike aims at, and which operation a regime action runs. */
export function ActTermsForm({ name, terms, config, onConfig, goods = [] }: Props) {
  const none = !terms.tariff && !terms.force && !terms.support && !terms.strike && !terms.regime;
  if (none && (config.option === "tariff" || config.option === "economic-2")) return <div role="status"><p>Tariff terms need correction. Choose imported goods and a whole-number additional rate within the remaining capacity below 100%.</p><Button onClick={() => onConfig({ option: "tariff", sector: undefined, rate: undefined })}>Choose goods and rate</Button></div>;
  if (none) return <p className="brief-section__note">This act takes no terms. Its size is fixed.</p>;
  return (
    <div className="act-terms">
      {terms.tariff ? <Tariff name={name} terms={terms.tariff} goods={goods} onConfig={onConfig} /> : null}
      {terms.force ? <Force terms={terms.force} onConfig={onConfig} /> : null}
      {terms.strike ? <Strike terms={terms.strike} onConfig={onConfig} /> : null}
      {terms.regime ? <Regime terms={terms.regime} onConfig={onConfig} /> : null}
      {terms.support ? <Support terms={terms.support} config={config} onConfig={onConfig} /> : null}
    </div>
  );
}
