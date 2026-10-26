import { COHORT_AXES, cohortsOfAxis } from "../schemas/cohort.js";
import type { StatConsumer } from "./stat-consumers.js";

// The places' halves of the authored-field registry (`stat-consumers.ts`): a
// nation's placement, and the cities, states, districts, sectors, seas,
// installations and seats of government the world is laid out on.

// `Nation.geo` — the placement fields. Distance and adjacency have long had
// consumers; `disasterExposure` did not until conditions landed, which is
// exactly the gap that let six authored numbers sit inert.
//
// `coastline` and `chokepointDependence` both named a
// `geography.chokepointExposure` from the registry's founding when no such
// function existed anywhere in the repo. Coastline's real reader was found;
// the exposure function was written.
export const GEO_CONSUMERS: readonly StatConsumer[] = [
  { path: "region",
    readBy: ["packages/world/src/dataset/trade.ts#gravityPull", "packages/world/src/dataset/geography.ts#defaultDependence"],
    purpose: "trade gravity (a shared region) and assembly's chokepoint priors for a coast with none authored",
  },
  { path: "lat",
    readBy: [
      "packages/engine/src/relationship-graph.ts#capitalDistanceKm", "packages/world/src/dataset/places.ts#placeAt",
      "packages/content/src/scenario-locus.ts#resolveSite",
    ],
    purpose: "capital-to-capital distance (force projection, trade gravity), the capital pin and scenario sites",
  },
  { path: "lon",
    readBy: [
      "packages/engine/src/relationship-graph.ts#capitalDistanceKm", "packages/world/src/dataset/places.ts#placeAt",
      "packages/content/src/scenario-locus.ts#resolveSite",
    ],
    purpose: "capital-to-capital distance (force projection, trade gravity), the capital pin and scenario sites",
  },
  { path: "neighbors",
    readBy: [
      "packages/engine/src/instrument-gates.ts#sharesBorder", "packages/engine/src/geography.ts#forceProjectionCost",
      "packages/world/src/dataset/trade.ts#gravityPull", "packages/engine/src/propensity.ts#forceReach", "packages/engine/src/npc-agent.ts#salience",
    ],
    purpose: "instrument-gates.sharesBorder, geography.forceProjectionCost, trade.gravity, propensity.forceReach and npc-agent.salience (armies reach their neighbors)",
  },
  { path: "coastline",
    readBy: ["packages/engine/src/instruments-military.ts#militaryRungs"],
    purpose: "instruments-military.military-3 gate — a landlocked nation cannot be blockaded",
  },
  { path: "chokepoints",
    readBy: ["packages/content/src/scenario-locus.ts#nearestChokepoint"],
    purpose: "content scenario-locus (the straits a country's trade runs through are where its sea scenarios can be set)",
  },
  { path: "chokepointDependence",
    readBy: ["packages/engine/src/geography.ts#chokepointExposure", "packages/engine/src/blockades.ts#blockadeCut", "packages/engine/src/commodity-shocks.ts#chokepointDependence"],
    purpose: "geography.chokepointExposure — how much of a country's trade runs through a strait one government can shut, weighted by how badly each closing hurts it; read by blockades.blockadeCut to set how much of the target's seaborne trade a blockade stops; and commodity-shocks.chokepointDependence — the fallback, where the cargo-by-destination and loadings-by-origin tables (CHOKEPOINT_CARGO, CHOKEPOINT_ORIGINS, over NATION_OIL_GAS) name no such country or commodity, for exporters' stranded sales, importers' shortfall and the route's upstream deduplication (commodity-pressure.ts)",
  },
  { path: "disasterExposure.earthquake",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.flood",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.drought",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.cyclone",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.wildfire",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.pandemic",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.tornado",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.winter-storm",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
  { path: "disasterExposure.heat-wave",
    readBy: ["packages/engine/src/condition-onset.ts#onsetCandidates"],
    purpose: "conditions.onsetCandidates",
  },
];

export const CITY_CONSUMERS: readonly StatConsumer[] = [
  { path: "id",
    readBy: [
      "packages/engine/src/cities.ts#openingCities", "packages/world/src/dataset/places.ts#cityById",
      "packages/content/src/scenario-locus.ts#domesticSite",
    ],
    purpose: "keys the campaign's cities, the place lookup and the scenario locus bind",
  },
  { path: "nation",
    readBy: [
      "packages/content/src/scenario-locus.ts#resolveLocus", "packages/engine/src/cities.ts#selectCitiesForNation",
      "packages/content/src/scenario-locus.ts#domesticSite",
    ],
    purpose: "the validator, the locus's nation filter and the city roll-ups",
  },
  { path: "name",
    readBy: [
      "packages/content/src/scenario-text.ts#boundPlace", "apps/web/src/map/marks/sources.ts#nationPlaceMarks",
      "packages/world/src/dataset/places.ts#cityPlace",
    ],
    purpose: "the {{city}} token, the map's place labels and place names",
  },
  { path: "kind",
    readBy: [
      "packages/content/src/scenario-locus.ts#domesticSite", "packages/content/src/scenario-text.ts#boundPlace",
      "apps/web/src/map/marks/sources.ts#nationPlaceMarks",
    ],
    purpose: "the locus match selector, the {{cityKind}} token and the map's place marks",
  },
  { path: "lat",
    readBy: [
      "apps/web/src/map/marks/sources.ts#nationPlaceMarks", "packages/world/src/dataset/places.ts#cityPlace",
      "packages/content/src/scenario-locus.ts#resolveLocus",
    ],
    purpose: "the map's place marks, place pins and the locus pin",
  },
  { path: "lon",
    readBy: [
      "apps/web/src/map/marks/sources.ts#nationPlaceMarks", "packages/world/src/dataset/places.ts#cityPlace",
      "packages/content/src/scenario-locus.ts#resolveLocus",
    ],
    purpose: "the map's place marks, place pins and the locus pin",
  },
  { path: "population",
    readBy: [
      "packages/engine/src/cities.ts#popWeightedLean", "packages/world/src/validate/dataset-validator.ts#checkCitiesFitTheNation",
      "packages/world/src/dataset/places.ts#largestCityIn",
    ],
    purpose: "election geography weights, the validator and the largest-city pick",
  },
  { path: "employment",
    readBy: ["packages/engine/src/cities.ts#seedCity"],
    purpose: "seeds the live city runtime, which the city phase drifts and the city effect moves",
  },
  { path: "taxBase",
    readBy: ["packages/engine/src/cities.ts#seedCity"],
    purpose: "seeds the live city runtime, which the city phase drifts and the tax holiday and budget's forgone-receipts line read",
  },
  { path: "demShare",
    readBy: ["packages/engine/src/cities.ts#openingAdminLean"],
    purpose: "opening adminLean (US only)",
  },
  { path: "state",
    readBy: [
      "packages/world/src/validate/dataset-validator.ts#checkCityStates", "packages/engine/src/us-placement.ts#placeUsOnset",
      "packages/world/src/dataset/places.ts#cityPlace",
    ],
    purpose: "the validator's US city-state check, US onset placement and the dateline",
  },
];

// Generated from the axis map rather than sixteen hand-copied lines, for the
// same reason orderOfBattleConsumers() is: one entry per cohort id, in
// COHORT_AXIS order, so a new cohort cannot be added to the schema without
// this registry noticing it is missing.
function cohortConsumers(): StatConsumer[] {
  return COHORT_AXES.flatMap((axis) =>
    cohortsOfAxis(axis).map((cohort): StatConsumer => ({
      path: `character.cohorts.${axis}.${cohort}`,
      readBy: [
        "packages/engine/src/route-cohorts.ts#cohortGeography", "packages/engine/src/demos.ts#nationalCohortShares",
        "packages/engine/src/state-cohort-opinion.ts#axisProblem",
      ],
      purpose: "the cohort geography weight, the national cohort shares and the state cohort opinion fit",
    })),
  );
}

// Three leaves under `vitalAnchor`, not one entry for the object: the walk
// unwraps a nested object, so a single line would leave three fields
// unaccounted for.
export const STATE_CONSUMERS: readonly StatConsumer[] = [
  { path: "id",
    readBy: [
      "packages/engine/src/states.ts#openingStates", "packages/world/src/dataset/states.ts#stateById",
      "packages/world/src/validate/dataset-validator.ts#checkCityStates", "packages/engine/src/governors.ts#seatGovernorsByLean",
    ],
    purpose: "keys the campaign's states, the city-state check and the governor stamp",
  },
  { path: "name",
    readBy: [
      "packages/content/src/scenario-text.ts#stateNameOf", "packages/engine/src/people.ts#STATE_NAMES",
      "apps/web/src/map/labels/label-text.ts#STATE_NAMES",
    ],
    purpose: "the {{state}} token, datelines and map labels",
  },
  { path: "fips",
    readBy: ["scripts/vendor-state-demographics.mjs#stateIds"],
    purpose: "the census vendor joins its demographic rows to states by it",
  },
  { path: "population",
    readBy: [
      "packages/engine/src/route-cohorts.ts#cohortGeography", "packages/engine/src/route-cohorts.ts#cohortPeople",
      "packages/world/src/validate/dataset-validator.ts#checkDistricts", "packages/world/src/validate/dataset-validator.ts#checkStateMass",
      "packages/world/src/validate/vitals-checks.ts#checkStateVitalAnchors", "packages/engine/src/states.ts#openingStates",
      "packages/world/src/dataset/state-mass.ts#applyStateMass", "apps/web/src/map/lenses/state-lenses.ts#statePopulationLens",
    ],
    purpose: "the cohort geography's mass weight, the validator's state-mass sum, the opening states (which seed the live headcount the vitals phase moves) and the population lens",
  },
  { path: "grp",
    readBy: [
      "packages/world/src/validate/dataset-validator.ts#checkStateMass", "packages/world/src/dataset/state-mass.ts#applyStateMass",
      "packages/player-core/src/economy/state-economy.ts#stateEconomyBoard", "packages/player-core/src/world/state-dossier.ts#stateDossier",
    ],
    purpose: "the validator's state-mass sum against the nation's GDP, assembly's state mass, and the state economy board and dossier",
  },
  { path: "electoralVotes",
    readBy: [
      "packages/engine/src/elections.ts#projectVote", "packages/engine/src/states.ts#evWeightedLean",
      "packages/world/src/validate/dataset-validator.ts#checkStates",
    ],
    purpose: "the electoral-vote tally and lean weighting, and the validator's sum of 538",
  },
  { path: "houseSeats",
    readBy: [
      "packages/engine/src/election-seating.ts#houseSeatsMoved", "packages/engine/src/founding-congress.ts#houseRepublicans",
      "packages/world/src/validate/election-checks.ts#checkHouse", "packages/engine/src/states.ts#houseSeatsInPlay",
    ],
    purpose: "election-seating.houseSeatsMoved (a presidential year's coattails; a midterm reads each state's delegation instead), founding-congress.houseRepublicans, validator.checkHouse (the roster against the apportionment), states.houseSeatsInPlay, Congress named EV/House/lean hit",
  },
  { path: "lean",
    readBy: [
      "packages/engine/src/states.ts#openingStates", "packages/engine/src/states.ts#statePhase",
      "packages/engine/src/founding-congress.ts#houseRepublicans", "packages/engine/src/governors.ts#seatGovernorsByLean",
    ],
    purpose: "the opening state runtime and its slow drift, the founding House and the governors' seating",
  },
  { path: "region",
    readBy: [
      "packages/engine/src/cast-home.ts#REGION_BY_STATE", "packages/player-core/src/government/governors.ts#governorRows",
      "packages/engine/src/press-filing.ts#LOCALES",
    ],
    purpose: "home-region casting, the governors table and press datelines",
  },
  { path: "character.economy.industrial",
    readBy: ["packages/engine/src/domestic-signature.ts#stateAffinity"],
    purpose: "engine.domestic-signature stateAffinity (routing weight), player.state-record",
  },
  { path: "character.economy.agricultural",
    readBy: ["packages/engine/src/domestic-signature.ts#stateAffinity"],
    purpose: "engine.domestic-signature stateAffinity, player.state-record",
  },
  { path: "character.economy.energy",
    readBy: ["packages/engine/src/domestic-signature.ts#stateAffinity"],
    purpose: "engine.domestic-signature stateAffinity, player.state-record",
  },
  { path: "character.economy.tech",
    readBy: ["packages/engine/src/domestic-signature.ts#stateAffinity"],
    purpose: "engine.domestic-signature stateAffinity, player.state-record",
  },
  { path: "character.economy.services",
    readBy: ["packages/engine/src/domestic-signature.ts#stateAffinity"],
    purpose: "engine.domestic-signature stateAffinity, player.state-record",
  },
  { path: "character.economy.defense",
    readBy: ["packages/engine/src/domestic-signature.ts#stateAffinity"],
    purpose: "engine.domestic-signature stateAffinity, player.state-record",
  },
  { path: "character.urbanization",
    readBy: [
      "packages/engine/src/domestic-signature.ts#stateAffinity", "packages/engine/src/domestic-signature.ts#stateValues",
      "packages/player-core/src/world/state-dossier.ts#stateDossier",
    ],
    purpose: "the domestic signature's urban term and the state dossier",
  },
  { path: "character.federalDependence",
    readBy: [
      "packages/engine/src/domestic-signature.ts#stateAffinity", "packages/engine/src/states.ts#statePhase",
      "packages/player-core/src/world/state-dossier.ts#stateDossier",
    ],
    purpose: "the domestic signature's federal term, the state phase's omission-mark weight and the state dossier",
  },
  { path: "character.vitalAnchor.unemployment",
    readBy: [
      "packages/engine/src/regional-opinion.ts#economicShift", "packages/engine/src/regional-opinion.ts#stateApprovals",
      "packages/player-core/src/world/state-vitals.ts#stateVitals", "packages/player-core/src/economy/state-economy.ts#stateEconomyBoard",
    ],
    purpose: "regional opinion's economic term, and the state vitals and economy readings",
  },
  { path: "character.vitalAnchor.crimeIndex",
    readBy: ["packages/player-core/src/world/state-vitals.ts#stateVitals"],
    purpose: "the state vitals reading",
  },
  { path: "character.vitalAnchor.costOfLiving",
    readBy: [
      "packages/engine/src/regional-opinion.ts#economicShift", "packages/engine/src/regional-opinion.ts#stateApprovals",
      "packages/player-core/src/world/state-vitals.ts#stateVitals", "packages/player-core/src/economy/state-economy.ts#stateEconomyBoard",
    ],
    purpose: "regional opinion's economic term, and the state vitals and economy readings",
  },
  ...cohortConsumers(),
];

// One leaf per cohort under cohortSkew: statLeafPaths walks a `.partial()`
// object the same as a required one. Generated on cohortConsumers()'s own
// precedent.
function districtCohortSkewConsumers(): StatConsumer[] {
  return COHORT_AXES.flatMap((axis) =>
    cohortsOfAxis(axis).map((cohort): StatConsumer => ({
      path: `cohortSkew.${axis}.${cohort}`,
      owedBy: "a district cohort reader. The district dossier that merged this skew over its state's mix left with the previous player, and nothing has read it since",
    })),
  );
}

// Additive to the state layer, not a replacement for it. The House's seat
// math reads a district's state and lean to rank a state's seats for the flips
// an election makes (`house-seats.ts`); `checkDistricts` holds each district
// against its state, and the player surfaces named below read the rest.
export const DISTRICT_CONSUMERS: readonly StatConsumer[] = [
  { path: "id",
    readBy: ["packages/player-core/src/world/district-dossier.ts#assembleDistrictDossier"],
    purpose: "validator identity pin, player.district-dossier route param",
  },
  { path: "state",
    readBy: [
      "packages/world/src/validate/dataset-validator.ts#checkDistricts", "packages/engine/src/house-seats.ts#districtsOf",
      "packages/player-core/src/world/district-dossier.ts#assembleDistrictDossier",
    ],
    purpose: "validator.checkDistricts (state grouping), engine.house-seats (a state's seats), player.district-dossier parent kicker",
  },
  { path: "number",
    readBy: ["packages/player-core/src/world/district-dossier.ts#assembleDistrictDossier"],
    purpose: "player.district-dossier identity, map label",
  },
  { path: "population",
    readBy: [
      "packages/world/src/validate/dataset-validator.ts#checkDistricts",
      "packages/player-core/src/world/district-dossier.ts#assembleDistrictDossier",
    ],
    purpose: "validator.checkDistricts sum against the state, player.district-dossier's own districtPopulation (the sealed share, scaled by the state's live headcount), map choropleth",
  },
  { path: "lean",
    readBy: [
      "packages/engine/src/house-seats.ts#RAW_LEANS", "packages/engine/src/house-seats.ts#districtsOf",
      "packages/player-core/src/world/district-dossier.ts#assembleDistrictDossier",
    ],
    purpose: "engine.house-seats (which seat an election flips first), player.district-dossier, map choropleth — finer than State.lean",
  },
  { path: "incumbentParty",
    readBy: ["packages/player-core/src/world/district-dossier.ts#assembleDistrictDossier"],
    purpose: "player.district-dossier identity",
  },
  ...districtCohortSkewConsumers(),
];

export const SECTOR_CONSUMERS: readonly StatConsumer[] = [
  { path: "sector",
    readBy: [
      "packages/engine/src/sectors.ts#seedEntry", "packages/engine/src/sectors.ts#sliceFrom",
      "packages/engine/src/instruments-economic.ts#embargoedShare", "packages/world/src/validate/dataset-validator.ts#checkSectors",
    ],
    purpose: "seeds the live sector runtime, the embargo's sector share and the validator",
  },
  { path: "mix",
    readBy: ["packages/engine/src/sectors.ts#seedEntry", "packages/world/src/validate/dataset-validator.ts#checkSectors"],
    purpose: "the validator's sum to one and the live sector runtime's opening",
  },
  { path: "employment",
    readBy: ["packages/engine/src/sectors.ts#seedEntry"],
    purpose: "seeds the live sector runtime the sector effect and the unemployment roll-up move",
  },
  { path: "laborPressure",
    readBy: ["packages/engine/src/sectors.ts#seedEntry"],
    purpose: "seeds the live sector runtime the protest roll-up reads",
  },
];

// Where forces stand. The seas and the installation anchors are read by the
// player's force placement, and held to the map by the validator.
export const MARITIME_ZONE_CONSUMERS: readonly StatConsumer[] = [
  { path: "id",
    readBy: [
      "packages/player-core/src/geo/force-placement.ts#commandAreas", "packages/world/src/dataset/maritime-zones.ts#zoneForTheater",
      "packages/world/src/validate/placement-checks.ts#zoneErrors", "packages/world/src/validate/placement-checks.ts#zoneShapeErrors",
    ],
    purpose: "player.force-placement zone of a sea deployment, zoneForTheater, validator.placement",
  },
  { path: "name",
    readBy: ["packages/player-core/src/geo/force-placement.ts#zoneName", "packages/player-core/src/geo/force-placement.ts#zoneSource"],
    purpose: "player.force-placement zone-level marker label",
  },
  { path: "ring",
    readBy: [
      "packages/player-core/src/geo/zone-slots.ts#zoneSlots", "packages/world/src/validate/placement-checks.ts#zoneErrors",
      "packages/world/src/validate/placement-checks.ts#zoneShapeErrors",
    ],
    purpose: "player.force-placement zoneSlots (seeded slots at sea), validator.placement simple-ring, overlap and open-water checks",
  },
  { path: "littoral",
    readBy: [
      "packages/player-core/src/geo/force-placement.ts#seaCommand", "packages/player-core/src/geo/force-placement.ts#commandAreas",
      "packages/world/src/validate/placement-checks.ts#zoneErrors",
    ],
    purpose: "player.force-placement commandAreas (a sea goes to the command holding most of its coast), validator.placement roster check",
  },
  { path: "provenance",
    readBy: ["packages/player-core/src/geo/force-placement.ts#zoneSource"],
    purpose: "player.force-placement marker provenance (a drawn sea says it is the game's approximation)",
  },
];

export const INSTALLATION_ANCHOR_CONSUMERS: readonly StatConsumer[] = [
  { path: "anchor",
    readBy: [
      "packages/player-core/src/geo/force-placement.ts#anchorPoint", "packages/world/src/validate/placement-checks.ts#anchorPlacementErrors",
      "packages/world/src/validate/placement-checks.ts#anchorShapeErrors", "packages/world/src/validate/placement-checks.ts#outlineLessHosts",
    ],
    purpose: "player.force-placement precision (installation or zone-level marker), validator.placement",
  },
  { path: "lat",
    readBy: [
      "packages/player-core/src/geo/force-placement.ts#anchorPoint", "packages/world/src/validate/placement-checks.ts#anchorPlacementErrors",
      "packages/world/src/validate/placement-checks.ts#anchorShapeErrors",
    ],
    purpose: "player.force-placement installation marker, validator.placement host-outline containment",
  },
  { path: "lon",
    readBy: [
      "packages/player-core/src/geo/force-placement.ts#anchorPoint", "packages/world/src/validate/placement-checks.ts#anchorPlacementErrors",
      "packages/world/src/validate/placement-checks.ts#anchorShapeErrors",
    ],
    purpose: "player.force-placement installation marker, validator.placement host-outline containment",
  },
  { path: "anchorSource",
    readBy: ["packages/player-core/src/geo/force-placement.ts#placeForces", "packages/world/src/validate/placement-checks.ts#anchorShapeErrors"],
    purpose: "player.force-placement marker source line, validator.placement opened-source check",
  },
  { path: "anchorOpened",
    readBy: ["packages/player-core/src/geo/force-placement.ts#placeForces", "packages/world/src/validate/placement-checks.ts#anchorShapeErrors"],
    purpose: "player.force-placement marker source line, validator.placement opened-source check",
  },
];

// Where the government sits. The map's Washington camera frames an office by
// its institution's point, and a state with no gazetteer city is pinned at its
// capitol by placeAt.
export const FEDERAL_SITE_CONSUMERS: readonly StatConsumer[] = [
  { path: "institution",
    readBy: [
      "packages/world/src/dataset/federal-sites.ts#federalSite", "packages/world/src/dataset/federal-sites.ts#federalSitePoint",
      "packages/world/src/validate/site-checks.ts#siteErrors", "packages/world/src/validate/site-checks.ts#siteRowErrors",
      "packages/world/src/validate/site-checks.ts#siteShapeErrors",
    ],
    purpose: "federalSite / federalSitePoint lookup behind the map's office:<id> camera key, validator.sites cabinet-department coverage",
  },
  { path: "site",
    readBy: ["packages/player-core/src/government/office-file.ts#officeFile", "packages/player-core/src/government/executive-tree.ts#executivePins"],
    purpose: "player-core officeFile's headquarters line on /washington/office/:id, and the office pins' place names (executivePins)",
  },
  { path: "location",
    readBy: [
      "packages/world/src/dataset/federal-sites.ts#federalSitePoint", "packages/world/src/validate/site-checks.ts#siteErrors",
      "packages/world/src/validate/site-checks.ts#siteRowErrors", "packages/world/src/validate/site-checks.ts#siteShapeErrors",
    ],
    purpose: "federalSitePoint (a row with no location frames no office), validator.sites shape",
  },
  { path: "state",
    readBy: ["packages/world/src/validate/site-checks.ts#siteRowErrors", "packages/world/src/validate/site-checks.ts#siteShapeErrors"],
    purpose: "validator.sites state-outline containment",
  },
  { path: "lat",
    readBy: [
      "packages/world/src/dataset/federal-sites.ts#federalSitePoint", "packages/world/src/validate/site-checks.ts#siteRowErrors",
      "packages/world/src/validate/site-checks.ts#siteShapeErrors",
    ],
    purpose: "federalSitePoint for the map's office:<id> camera, validator.sites state-outline containment",
  },
  { path: "lon",
    readBy: [
      "packages/world/src/dataset/federal-sites.ts#federalSitePoint", "packages/world/src/validate/site-checks.ts#siteRowErrors",
      "packages/world/src/validate/site-checks.ts#siteShapeErrors",
    ],
    purpose: "federalSitePoint for the map's office:<id> camera, validator.sites state-outline containment",
  },
  { path: "hqSource",
    readBy: ["packages/world/src/validate/site-checks.ts#siteShapeErrors"],
    purpose: "validator.sites opened-source check",
  },
  { path: "reason",
    readBy: ["packages/world/src/validate/site-checks.ts#siteShapeErrors"],
    purpose: "validator.sites no-location reason check",
  },
  { path: "source",
    readBy: ["packages/world/src/validate/site-checks.ts#siteShapeErrors"],
    purpose: "validator.sites opened-source check",
  },
  { path: "opened",
    readBy: ["packages/world/src/validate/site-checks.ts#siteShapeErrors"],
    purpose: "validator.sites opened-source check",
  },
];

export const STATE_CAPITOL_CONSUMERS: readonly StatConsumer[] = [
  { path: "state",
    readBy: [
      "packages/world/src/dataset/places.ts#statePlace", "packages/world/src/validate/site-checks.ts#capitolErrors",
      "packages/world/src/validate/site-checks.ts#capitolRowErrors",
    ],
    purpose: "places.statePlace capitol fallback, validator.sites coverage and containment",
  },
  { path: "capitol",
    readBy: ["packages/world/src/validate/site-checks.ts#capitolRowErrors"],
    purpose: "validator.sites, which names the building in every capitol finding",
  },
  { path: "city",
    readBy: ["packages/world/src/dataset/places.ts#statePlace"],
    purpose: "places.statePlace place name (\"Helena, Montana\")",
  },
  { path: "lat",
    readBy: [
      "packages/world/src/dataset/places.ts#statePlace", "packages/world/src/dataset/places.ts#placeAt",
      "packages/world/src/validate/site-checks.ts#capitolRowErrors",
    ],
    purpose: "places.statePlace / placeAt capitol fallback, validator.sites state-outline containment",
  },
  { path: "lon",
    readBy: [
      "packages/world/src/dataset/places.ts#statePlace", "packages/world/src/dataset/places.ts#placeAt",
      "packages/world/src/validate/site-checks.ts#capitolRowErrors",
    ],
    purpose: "places.statePlace / placeAt capitol fallback, validator.sites state-outline containment",
  },
  { path: "source",
    readBy: ["packages/world/src/validate/site-checks.ts#capitolRowErrors"],
    purpose: "validator.sites opened-source check",
  },
  { path: "opened",
    readBy: ["packages/world/src/validate/site-checks.ts#capitolRowErrors"],
    purpose: "validator.sites opened-source check",
  },
];
