import type { MetricId } from './metricIds';
import type { BundleId } from './bundleIds';
import type { BranchId } from './branchIds';

export type TraitDomain = 'military' | 'economic' | 'diplomatic' | 'geographic' | 'social' | 'technological' | 'governance' | 'crisis';

export interface CountryTrait {
  id: string;
  label: string;
  type: 'strength' | 'weakness';
  domain: TraitDomain;
  effects: {
    metric_equilibrium_shift?: Partial<Record<MetricId, number>>;
    bundle_weight_modifier?: Partial<Record<BundleId, number>>;
    capability_modifier?: {
      branch_id: BranchId;
      readiness_bonus: number;
    };
    scenario_condition_tags?: string[];
  };
  description: string;
}

export interface PersonTrait {
  id: string;
  label: string;
  type: 'strength' | 'weakness';
  domain: TraitDomain;
  effect: {
    metric_modifier?: { target: MetricId; magnitude: number };
    condition?: string;
    scenario_tags_unlocked?: string[];
    corruption_modifier?: number;
  };
  description: string;
}
