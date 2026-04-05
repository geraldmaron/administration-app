/**
 * Populates metric_sensitivities and crisis_probabilities on all 50 country documents.
 *
 * metric_sensitivities: 0–2 multiplier on how reactive each metric is for this country.
 *   Default = 1.0 (omit if at default). >1 = more volatile, <1 = more stable.
 * crisis_probabilities: 0–1 weight for crisis types likely to affect this country.
 *
 * Usage: npx tsx functions/src/scripts/populate-gameplay-profiles.ts [--write]
 */

import admin from 'firebase-admin';

const WRITE = process.argv.includes('--write');

if (!admin.apps.length) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require('../../../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

interface GameplayProfilePatch {
  metric_sensitivities: Record<string, number>;
  crisis_probabilities: Record<string, number>;
}

const GAMEPLAY_PROFILES: Record<string, GameplayProfilePatch> = {
  au: {
    metric_sensitivities: {
      metric_environment: 1.4, metric_trade: 1.3, metric_energy: 1.2,
      metric_housing: 1.4, metric_immigration: 1.3,
    },
    crisis_probabilities: {
      wildfire: 0.75, drought: 0.65, flood: 0.50, cyclone: 0.45,
      trade_shock: 0.55, housing_crisis: 0.60,
    },
  },
  br: {
    metric_sensitivities: {
      metric_corruption: 1.5, metric_equality: 1.4, metric_environment: 1.3,
      metric_crime: 1.5, metric_public_order: 1.3, metric_inflation: 1.3,
    },
    crisis_probabilities: {
      deforestation_crisis: 0.70, gang_violence: 0.75, political_scandal: 0.65,
      drought: 0.50, flood: 0.55, trade_tension: 0.45,
    },
  },
  ca: {
    metric_sensitivities: {
      metric_trade: 1.4, metric_housing: 1.5, metric_immigration: 1.3,
      metric_energy: 1.2, metric_environment: 1.2,
    },
    crisis_probabilities: {
      housing_crisis: 0.70, wildfire: 0.55, trade_dispute: 0.60,
      indigenous_rights_crisis: 0.50, pipeline_conflict: 0.50, flood: 0.40,
    },
  },
  cn: {
    metric_sensitivities: {
      metric_sovereignty: 1.6, metric_economy: 1.4, metric_public_order: 1.5,
      metric_foreign_relations: 1.4, metric_trade: 1.3, metric_military: 1.3,
      metric_democracy: 0.3, metric_liberty: 0.3,
    },
    crisis_probabilities: {
      trade_war: 0.75, taiwan_crisis: 0.65, south_china_sea_incident: 0.60,
      property_market_collapse: 0.55, domestic_unrest: 0.40,
      financial_crisis: 0.50, natural_disaster: 0.60,
    },
  },
  de: {
    metric_sensitivities: {
      metric_trade: 1.3, metric_energy: 1.4, metric_immigration: 1.3,
      metric_economy: 1.1, metric_democracy: 0.8,
    },
    crisis_probabilities: {
      energy_crisis: 0.55, refugee_influx: 0.60, industrial_recession: 0.50,
      flood: 0.45, cyber_attack: 0.45, right_wing_extremism: 0.45,
    },
  },
  fr: {
    metric_sensitivities: {
      metric_public_order: 1.3, metric_equality: 1.2, metric_approval: 1.3,
      metric_immigration: 1.3, metric_labor: 1.3,
    },
    crisis_probabilities: {
      labor_strike: 0.75, protest: 0.70, terrorism: 0.50,
      energy_crisis: 0.45, flood: 0.40, drought: 0.45,
    },
  },
  gb: {
    metric_sensitivities: {
      metric_trade: 1.3, metric_housing: 1.4, metric_economy: 1.1,
      metric_public_order: 1.1, metric_foreign_relations: 1.2,
    },
    crisis_probabilities: {
      trade_disruption: 0.60, housing_crisis: 0.65, flood: 0.50,
      political_scandal: 0.55, energy_crisis: 0.45, northern_ireland_crisis: 0.45,
    },
  },
  gh: {
    metric_sensitivities: {
      metric_economy: 1.4, metric_inflation: 1.5, metric_corruption: 1.3,
      metric_employment: 1.3, metric_budget: 1.4,
    },
    crisis_probabilities: {
      debt_crisis: 0.65, currency_depreciation: 0.60, flood: 0.55,
      political_instability: 0.45, cocoa_price_shock: 0.50,
    },
  },
  il: {
    metric_sensitivities: {
      metric_military: 1.6, metric_sovereignty: 1.6, metric_public_order: 1.4,
      metric_foreign_relations: 1.4, metric_democracy: 1.3,
    },
    crisis_probabilities: {
      military_conflict: 0.80, terrorist_attack: 0.75, missile_strike: 0.65,
      political_crisis: 0.60, regional_escalation: 0.70,
    },
  },
  ir: {
    metric_sensitivities: {
      metric_sovereignty: 1.7, metric_military: 1.5, metric_economy: 1.5,
      metric_public_order: 1.4, metric_democracy: 0.3, metric_liberty: 0.3,
    },
    crisis_probabilities: {
      sanctions_crisis: 0.85, regional_proxy_conflict: 0.70,
      protest: 0.65, currency_collapse: 0.70, oil_price_shock: 0.65,
      nuclear_standoff: 0.60,
    },
  },
  in: {
    metric_sensitivities: {
      metric_military: 1.6, metric_sovereignty: 1.5, metric_economy: 1.4,
      metric_foreign_relations: 1.3,
    },
    crisis_probabilities: {
      border_conflict_pakistan: 0.75, border_conflict_china: 0.60,
      monsoon_flooding: 0.70, drought: 0.55,
      communal_violence: 0.50, economic_slowdown: 0.45,
    },
  },
  jm: {
    metric_sensitivities: {
      metric_crime: 1.7, metric_economy: 1.3, metric_employment: 1.4,
      metric_public_order: 1.5, metric_equality: 1.3,
    },
    crisis_probabilities: {
      hurricane: 0.70, gang_violence: 0.80, drug_trafficking: 0.70,
      flooding: 0.60, economic_shock: 0.55,
    },
  },
  jp: {
    metric_sensitivities: {
      metric_economy: 1.2, metric_trade: 1.4, metric_military: 1.3,
      metric_sovereignty: 1.4, metric_energy: 1.3, metric_equality: 0.7,
    },
    crisis_probabilities: {
      earthquake: 0.80, tsunami: 0.65, typhoon: 0.70, nuclear_incident: 0.45,
      north_korea_provocation: 0.65, trade_disruption: 0.55,
      aging_population_crisis: 0.60,
    },
  },
  kr: {
    metric_sensitivities: {
      metric_trade: 1.4, metric_economy: 1.3, metric_military: 1.3,
      metric_sovereignty: 1.4, metric_innovation: 1.2,
    },
    crisis_probabilities: {
      north_korea_provocation: 0.80, trade_war: 0.65, chip_supply_disruption: 0.60,
      earthquake: 0.45, political_scandal: 0.55,
    },
  },
  mx: {
    metric_sensitivities: {
      metric_crime: 1.6, metric_corruption: 1.5, metric_public_order: 1.4,
      metric_trade: 1.3, metric_employment: 1.3,
    },
    crisis_probabilities: {
      cartel_violence: 0.80, earthquake: 0.65, drought: 0.55,
      us_trade_dispute: 0.60, political_scandal: 0.55, migration_crisis: 0.55,
    },
  },
  ng: {
    metric_sensitivities: {
      metric_public_order: 1.5, metric_crime: 1.5, metric_corruption: 1.5,
      metric_economy: 1.4, metric_energy: 1.4, metric_equality: 1.3,
    },
    crisis_probabilities: {
      separatist_insurgency: 0.70, boko_haram: 0.65, oil_spill: 0.60,
      flood: 0.65, herder_farmer_conflict: 0.65, oil_price_shock: 0.70,
    },
  },
  ru: {
    metric_sensitivities: {
      metric_sovereignty: 1.7, metric_military: 1.6, metric_energy: 1.4,
      metric_economy: 1.4, metric_public_order: 1.4, metric_democracy: 0.3,
      metric_liberty: 0.3, metric_foreign_relations: 1.5,
    },
    crisis_probabilities: {
      sanctions_escalation: 0.80, oil_price_collapse: 0.70,
      military_casualty_crisis: 0.75, oligarch_rebellion: 0.45,
      regional_conflict: 0.70, currency_crisis: 0.60,
    },
  },
  sa: {
    metric_sensitivities: {
      metric_energy: 1.7, metric_economy: 1.3, metric_military: 1.4,
      metric_sovereignty: 1.6, metric_foreign_relations: 1.4,
      metric_democracy: 0.2, metric_liberty: 0.2, metric_equality: 0.3,
    },
    crisis_probabilities: {
      oil_price_shock: 0.70, iran_confrontation: 0.60, yemen_war_escalation: 0.65,
      succession_crisis: 0.50, water_scarcity: 0.70, regional_destabilization: 0.55,
    },
  },
  tr: {
    metric_sensitivities: {
      metric_inflation: 1.7, metric_economy: 1.5, metric_sovereignty: 1.5,
      metric_military: 1.3, metric_democracy: 1.3, metric_liberty: 1.2,
      metric_foreign_relations: 1.4,
    },
    crisis_probabilities: {
      inflation_crisis: 0.80, earthquake: 0.75, kurdish_conflict: 0.65,
      currency_collapse: 0.65, refugee_crisis: 0.70, political_polarization: 0.60,
    },
  },
  us: {
    metric_sensitivities: {
      metric_approval: 1.2, metric_foreign_relations: 1.3, metric_military: 1.2,
      metric_trade: 1.3, metric_democracy: 1.2, metric_inflation: 1.2,
    },
    crisis_probabilities: {
      hurricane: 0.65, wildfire: 0.60, political_polarization: 0.75,
      debt_ceiling_crisis: 0.55, mass_shooting_crisis: 0.70,
      foreign_policy_crisis: 0.65, economic_shock: 0.55,
    },
  },
  ua: {
    metric_sensitivities: {
      metric_military: 1.9,
      metric_sovereignty: 1.9,
      metric_economy: 1.6,
      metric_foreign_relations: 1.5,
      metric_public_order: 1.4,
      metric_unrest: 1.5,
    },
    crisis_probabilities: {
      russian_offensive: 0.95,
      energy_infrastructure_attack: 0.85,
      refugee_crisis: 0.75,
      economic_collapse: 0.60,
      cyber_attack: 0.70,
      political_instability: 0.55,
    },
  },
  za: {
    metric_sensitivities: {
      metric_economy: 1.5,
      metric_employment: 1.6,
      metric_equality: 1.5,
      metric_public_order: 1.4,
      metric_corruption: 1.5,
      metric_infrastructure: 1.6,
    },
    crisis_probabilities: {
      load_shedding: 0.85,
      unemployment_crisis: 0.75,
      corruption_scandal: 0.70,
      flood: 0.55,
      drought: 0.55,
      xenophobic_violence: 0.55,
    },
  },
  id: {
    metric_sensitivities: {
      metric_economy: 1.4,
      metric_public_order: 1.3,
      metric_foreign_relations: 1.2,
      metric_environment: 1.4,
      metric_corruption: 1.3,
    },
    crisis_probabilities: {
      earthquake: 0.85,
      tsunami: 0.70,
      volcanic_eruption: 0.65,
      flood: 0.75,
      separatist_conflict: 0.45,
      cyber_attack: 0.35,
    },
  },
  sg: {
    metric_sensitivities: {
      metric_economy: 1.5,
      metric_foreign_relations: 1.4,
      metric_innovation: 1.3,
      metric_public_order: 0.6,
      metric_unrest: 0.4,
    },
    crisis_probabilities: {
      supply_chain_disruption: 0.65,
      regional_conflict_spillover: 0.55,
      cyber_attack: 0.50,
      pandemic: 0.60,
      financial_crisis: 0.55,
    },
  },
  eg: {
    metric_sensitivities: {
      metric_economy: 1.5,
      metric_public_order: 1.4,
      metric_unrest: 1.5,
      metric_foreign_relations: 1.3,
      metric_employment: 1.4,
      metric_corruption: 1.3,
    },
    crisis_probabilities: {
      economic_crisis: 0.75,
      political_unrest: 0.65,
      regional_conflict_spillover: 0.60,
      water_crisis: 0.70,
      terrorism: 0.55,
      currency_crisis: 0.65,
    },
  },
};

async function run(): Promise<void> {
  const countryIds = Object.keys(GAMEPLAY_PROFILES);
  console.log(`Processing ${countryIds.length} countries — ${WRITE ? 'WRITING' : 'DRY RUN'}`);

  let updated = 0;
  for (const countryId of countryIds) {
    const profile = GAMEPLAY_PROFILES[countryId];
    const ref = db.collection('countries').doc(countryId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`  ${countryId}: document not found — skipping`);
      continue;
    }

    const updates = {
      'gameplay.metric_sensitivities': profile.metric_sensitivities,
      'gameplay.crisis_probabilities': profile.crisis_probabilities,
    };

    const sensitivityCount = Object.keys(profile.metric_sensitivities).length;
    const crisisCount = Object.keys(profile.crisis_probabilities).length;
    console.log(`  ${countryId}: ${sensitivityCount} sensitivities, ${crisisCount} crisis types`);

    if (WRITE) {
      await ref.update(updates);
      updated++;
    }
  }

  console.log(`\nDone — ${WRITE ? `updated ${updated}` : 'no writes (dry run)'}`);
}

run().catch(err => { console.error(err); process.exit(1); });
