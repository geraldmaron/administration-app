import { formatRatio, type StateDossier, type StateVital } from "@admin/player-core";
import { Collection, Gauge, Icon, type IconName } from "@admin/ui-web";
import { valenceOf, type Valence } from "../../shell/valence";

const VITAL_MARK: Readonly<Record<StateVital["key"], IconName>> = { jobs: "economyUnemployment", prices: "economyInflation", crime: "shield" };

const SECTOR_MARK: Readonly<Record<StateDossier["industry"][number]["axis"], IconName>> = {
  industrial: "sectorSteelHeavy",
  agricultural: "sectorAgriculture",
  energy: "sectorEnergyOil",
  tech: "sectorSemiconductors",
  services: "sectorFinance",
  defense: "sectorDefenseIndustrial",
};

const SIGN: Readonly<Record<Valence, string>> = { good: "▲", watch: "⚠", bad: "▼", neutral: "" };

const STANCE_STEPS = ["adverse", "caution", "neutral", "favorable"] as const;

/** A state's pulse against the country: four steps from worst to best, the state's own step lit, its word beside it. */
function VitalScale({ vital }: { readonly vital: StateVital }) {
  const at = STANCE_STEPS.indexOf(vital.stance);
  return (
    <li className="vital" data-stance={vital.stance} data-valence={valenceOf(vital.stance)}>
      <span className="vital__caption">
        <Icon name={VITAL_MARK[vital.key]} size={18} className="vital__mark" /> {vital.caption}
      </span>
      <span className="vital__scale" role="img" aria-label={`${vital.caption}: ${vital.word}, step ${at + 1} of 4 from worst to best`}>
        {STANCE_STEPS.map((step, index) => (
          <span key={step} className="vital__step" data-on={index === at ? "true" : undefined} />
        ))}
      </span>
      <span className="vital__word ui-valence-ink">
        <span aria-hidden="true" className="vital__sign">{SIGN[valenceOf(vital.stance)]}</span>
        {vital.word}
      </span>
    </li>
  );
}

/** What the state's economy is made of and how it is doing beside the country, and its largest metros. */
export function Economy({ dossier }: { readonly dossier: StateDossier }) {
  return (
    <section id="state-economy" className="state-section" aria-labelledby="state-economy-title">
      <h2 id="state-economy-title" className="brief-section__title">
        <Icon name="economyGrowth" size={20} /> Economy
      </h2>
      <ul className="vitals" aria-label="Against the national figure">
        {dossier.vitals.map((vital) => (
          <VitalScale key={vital.key} vital={vital} />
        ))}
      </ul>
      <div className="industry">
        <p className="industry__title">What the economy is made of</p>
        <ul className="industry__rows">
          {dossier.industry.map((axis) => (
            <li key={axis.axis} className="industry__row">
              <span className="industry__mark" aria-hidden="true">
                <Icon name={SECTOR_MARK[axis.axis]} size={18} />
              </span>
              <Gauge shape="meter" label={axis.label} value={axis.share} valueText={axis.text} />
            </li>
          ))}
        </ul>
      </div>
      <ul className="industry__rows">
        <li className="industry__row">
          <span className="industry__mark" aria-hidden="true">
            <Icon name="economyGrowth" size={18} />
          </span>
          <Gauge shape="meter" label="Income through federal money" value={dossier.federalDependence} valueText={formatRatio(dossier.federalDependence)} caption="How hard a missed appropriation lands here." />
        </li>
        <li className="industry__row">
          <span className="industry__mark" aria-hidden="true">
            <Icon name="mapPin" size={18} />
          </span>
          <Gauge shape="meter" label="Living in metro areas" value={dossier.urbanization} valueText={formatRatio(dossier.urbanization)} />
        </li>
      </ul>
      {dossier.metros.length > 0 ? (
        <div className="metros">
          <p className="industry__title">Largest metros</p>
          <Collection
            as="ol"
            items={dossier.metros}
            initial={5}
            noun="metros"
            className="metros__list"
            render={(metro) => (
              <li key={metro.id}>
                <Icon name="mapPin" size={16} className="metros__mark" />
                <span className="metros__name">{metro.name}</span>
                <span className="metros__bar" aria-hidden="true">
                  <span style={{ inlineSize: `${(metro.population / Math.max(1, ...dossier.metros.map((m) => m.population))) * 100}%` }} />
                </span>
                <span className="metros__people">{metro.populationText}</span>
              </li>
            )}
          />
        </div>
      ) : null}
    </section>
  );
}
