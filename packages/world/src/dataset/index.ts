import { worldSettlements } from "./settlements.js";
import type { WorldDataset } from "../schemas/dataset.js";
import { usaCharter } from "./usa.js";
import { genericCharters } from "./charters.js";
import { worldNations } from "./nations.js";
import { worldCities } from "./cities.js";
import { worldStates } from "./states.js";
import { worldDistricts } from "./districts.js";
import { applyGeography } from "./geography.js";
import { applyBands } from "./bands.js";
import { applyStateMass } from "./state-mass.js";
import { applyVitalRates } from "./vital-rates.js";
import { applyTrade } from "./trade.js";
import { applyMemberships, cradles, organizations } from "./orgs-cradles.js";

export * from "./usa.js";
export * from "./cities.js";
export * from "./settlements.js";
export * from "./places.js";
export * from "./states.js";
export * from "./districts.js";
export * from "./sectors.js";
export * from "./sector-axis.js";
export * from "./parties.js";
export * from "./flags.js";
export * from "./charters.js";
export * from "./nations.js";
export * from "./hashing.js";
export * from "./naming.js";
export * from "./traits.js";
export * from "./agenda-themes.js";
export * from "./name-banks.js";
export * from "./portraits.js";
export * from "./geography.js";
export * from "./bands.js";
export * from "./party-systems.js";
export * from "./state-mass.js";
export * from "./state-vitals.js";
export * from "./state-hazards.js";
export * from "./vital-rates.js";
export * from "./fiscal-identities.js";
export * from "./macro-anchors.js";
export * from "./fiscal-anchors.js";
export * from "./trade.js";
export * from "./stat-consumers.js";
export * from "./units.js";
export * from "./schema-walk.js";
export * from "./metric-copy.js";
export * from "./metrics.js";
export * from "./unit-designations.js";
export * from "./orgs-cradles.js";
export * from "./people.js";
export * from "./vacancy-bench-roles.js";
export * from "./leader-paths.js";
export * from "./platform.js";
export * from "./white-house.js";
export * from "./women-in-cabinet.js";
export * from "./country-reference.js";

// The canonical WorldDataset. The United States leads the nations array — it
// is authored first in worldNations, and founding defaults read the first
// playable nation — and each authoring pass (nations, trait jitter,
// orgs/cradles/geography, charters, cities) adds its slice here;
// validate/dataset-validator gates every change with no exemptions.
import { applyPartySystems } from "./party-systems.js";
import { applyDebtRebase } from "./debt-rebase.js";

export const worldDataset: WorldDataset = {
  // applyStateMass runs innermost: bands read the population and GDP it
  // derives, so a band computed before the sum would be a band of a figure the
  // dataset does not ship.
  nations: applyBands(
    applyPartySystems(applyTrade(applyMemberships(applyGeography(applyVitalRates(applyStateMass([...applyDebtRebase(worldNations)], worldStates)))))),
  ),
  cities: [...worldCities],
  settlements: [...worldSettlements],
  states: [...worldStates],
  districts: [...worldDistricts],
  relationships: [],
  organizations: [...organizations],
  cradles: [...cradles],
  charters: [usaCharter, ...genericCharters],
};
export * from "./schools.js";
export * from "./background.js";
export * from "./compose-nation.js";
export * from "./nation-figures.generated.js";
export * from "./name-cultures.js";
export * from "./surname-forms.js";
export * from "./name-forms.js";
export * from "./name-banks-regional.js";
export * from "./real-names.js";
export * from "./officeholders.generated.js";
export * from "./name-banks.vendored.js";
export * from "./portrait-heritage.js";
export * from "./nation-borders.generated.js";
export * from "./nation-government-types.generated.js";
export * from "./us-goods-trade.generated.js";
export * from "./roster-tables.generated.js";
export * from "./nation-leaders.generated.js";
export * from "./nation-titles.js";
export * from "./portrait-priors.js";
export * from "./faces.js";
export * from "./face-priors.js";
export * from "./name-traditions.js";
export * from "./election-calendar.js";
export * from "./senate-classes.js";
export * from "./house-delegations.js";
export * from "./governor-terms.js";
export * from "./election-rules.js";
export * from "./us-series.js";
export * from "./world-series.js";
export * from "./state-demographics.js";
export * from "./dyads.js";
export * from "./carried-conflicts.js";
export * from "./us-basing.js";
export * from "./maritime-zones.js";
export * from "./federal-sites.js";
export * from "./state-capitols.js";
export * from "./us-munitions.js";
export * from "./force-cost-anchors.js";
export * from "./scenario-cost-anchors.js";
export * from "./commodity-producers.js";
export * from "./chokepoint-flows.js";
export * from "./chokepoint-cargo.js";
export * from "./chokepoint-origins.js";
export * from "./nation-oil-gas.js";
export * from "./us-hulls.js";
export * from "./price-anchors.js";
export * from "./price-shares.js";
export * from "./debt-rebase.js";
