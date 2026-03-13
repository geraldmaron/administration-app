/**
 * NeighborEventEngine
 *
 * Backend utility for selecting neighbor-driven scenarios based on a player's
 * geopolitical profile. This mirrors the high-level behavior implemented on iOS
 * in GameStore.generateNextScenario, but is kept backend-only so that future
 * web clients or server-side jobs can reuse the same logic.
 */

import type { Scenario, GeopoliticalProfile, CountryRelationship } from '../types';

export interface NeighborEventContext {
  playerCountryId: string;
  geopoliticalProfile: GeopoliticalProfile;
}

export interface NeighborPickResult {
  scenario: Scenario;
  neighborCountryId: string;
  relationship: CountryRelationship;
}

/**
 * Filter a pool of scenarios down to those that:
 * - Are explicitly marked as neighbor events (metadata.isNeighborEvent === true)
 * - Optionally restrict to the player's country via metadata.applicable_countries
 */
export function filterNeighborEventScenarios(
  playerCountryId: string,
  scenarios: Scenario[]
): Scenario[] {
  return scenarios.filter(s => {
    if (!s.metadata || s.metadata.isNeighborEvent !== true) return false;
    const ac = s.metadata.applicable_countries;
    if (!ac || ac === 'all') return true;
    if (Array.isArray(ac) && ac.length > 0) {
      return ac.some(id => id.toLowerCase() === playerCountryId.toLowerCase());
    }
    return false;
  });
}

/**
 * Pick a neighbor and a corresponding neighbor-event scenario.
 *
 * NOTE: This function does not currently write back neighbor-specific token
 * values (e.g. {neighbor_country}) — that is handled on the client side where
 * full Country objects and token resolution are available. Here we simply
 * return the selected scenario + neighbor identifiers.
 */
export function pickNeighborEvent(
  ctx: NeighborEventContext,
  candidates: Scenario[]
): NeighborPickResult | null {
  const { geopoliticalProfile, playerCountryId } = ctx;
  if (!geopoliticalProfile.neighbors || geopoliticalProfile.neighbors.length === 0) {
    return null;
  }
  const pool = filterNeighborEventScenarios(playerCountryId, candidates);
  if (!pool.length) return null;

  const neighbors = geopoliticalProfile.neighbors;
  const weights = neighbors.map(n => Math.max(Math.abs(n.strength), 30));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return null;

  let r = Math.random() * total;
  let chosen = neighbors[0];
  for (let i = 0; i < neighbors.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      chosen = neighbors[i];
      break;
    }
  }

  const scenario = pool[Math.floor(Math.random() * pool.length)];
  return { scenario, neighborCountryId: chosen.countryId, relationship: chosen };
}

