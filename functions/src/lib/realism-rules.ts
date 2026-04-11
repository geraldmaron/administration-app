/**
 * Realism rules — event-state plausibility gates.
 *
 * These rules complement the core auditScenario() pipeline. They operate on
 * inferred `active_*` flags and the player country's world state (geography,
 * archetype, recent event history, neighbor state) to reject implausible
 * scenarios that would otherwise slip past text-only audit.
 *
 * Each rule is a pure function: (context) → Issue[]. The caller composes
 * them by concatenation. Feature-flagged: only runs when
 * WORLD_DYNAMIC_EVENTS_ENABLED is on.
 */

import type { RequiresFlag, CountryWorldState } from '../types';
import type { CountryArchetype } from '../data/schemas/country-archetypes';
import type { Issue, BundleScenario, BundleOption } from '../shared/scenario-audit';
import { ACTIVE_EVENT_FLAGS, EVENT_COOLDOWN_TURNS } from '../shared/scenario-audit';

// ── Context passed to every realism rule ─────────────────────────────────────

export interface RealismContext {
    scenario: BundleScenario;
    /** Flags inferred by inferRequirementsFromNarrative — the active_* subset matters here. */
    inferredFlags: ReadonlySet<RequiresFlag>;
    /** Player country archetypes (e.g. ['coastal','regional_power']). */
    playerArchetypes: ReadonlySet<CountryArchetype>;
    /** Static geography hazard flags on the player country (e.g. 'coastal','seismically_active'). */
    playerStaticFlags: ReadonlySet<RequiresFlag>;
    /** Current world state — used for cooldown + causal rules. Optional; if absent, cooldown skips. */
    playerWorldState?: CountryWorldState;
    /** Known neighbor states — used by causal rule (e.g. refugee crisis needs war next door). */
    neighborStates?: CountryWorldState[];
    /** Current generation turn counter; cooldown compares scenario.turn - historyEntry.turn. */
    currentTurn?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DISASTER_TYPE_PATTERNS: Array<{ subtype: string; pattern: RegExp }> = [
    { subtype: 'tsunami', pattern: /\btsunami\b/i },
    { subtype: 'earthquake', pattern: /\bearthquake|seismic\s+event\b/i },
    { subtype: 'hurricane', pattern: /\b(?:hurricane|typhoon|cyclone)\b/i },
    { subtype: 'wildfire', pattern: /\bwildfire|bushfire|forest\s+fire\b/i },
    { subtype: 'flood', pattern: /\bflood(?:ing)?|inundation\b/i },
    { subtype: 'volcanic', pattern: /\bvolcan(?:ic|o)\s+eruption|lava\s+flow\b/i },
];

function scenarioText(scenario: BundleScenario): string {
    const optionTexts = (scenario.options ?? []).flatMap((o: BundleOption) => [
        o.text,
        o.outcomeHeadline,
        o.outcomeSummary,
        o.outcomeContext,
    ]);
    return [scenario.title, scenario.description, ...optionTexts]
        .filter((s): s is string => typeof s === 'string')
        .join(' ');
}

function detectDisasterSubtypes(text: string): Set<string> {
    const hits = new Set<string>();
    for (const { subtype, pattern } of DISASTER_TYPE_PATTERNS) {
        if (pattern.test(text)) hits.add(subtype);
    }
    return hits;
}

// ── Rule 1: RealismGeographyRule ─────────────────────────────────────────────
// Tsunami ↔ coastal, earthquake ↔ seismically_active, hurricane ↔
// tropical_cyclone_zone, wildfire blocked on arid, flooding blocked on arid.

export function runRealismGeographyRule(ctx: RealismContext): Issue[] {
    if (!ctx.inferredFlags.has('active_natural_disaster')) return [];

    const issues: Issue[] = [];
    const text = scenarioText(ctx.scenario);
    const subtypes = detectDisasterSubtypes(text);

    const add = (rule: string, message: string) =>
        issues.push({
            severity: 'error',
            rule,
            target: ctx.scenario.id,
            message,
            autoFixable: false,
        });

    if (subtypes.has('tsunami') && !ctx.playerStaticFlags.has('coastal')) {
        add('realism-geography', `Tsunami scenario on non-coastal country — impossible geography`);
    }
    if (subtypes.has('earthquake') && !ctx.playerStaticFlags.has('seismically_active')) {
        add('realism-geography', `Earthquake scenario on seismically quiet country — implausible`);
    }
    if (subtypes.has('hurricane') && !ctx.playerStaticFlags.has('tropical_cyclone_zone')) {
        add('realism-geography', `Hurricane/typhoon/cyclone scenario outside tropical cyclone zone — impossible geography`);
    }
    if (subtypes.has('flood') && ctx.playerStaticFlags.has('arid_interior')) {
        add('realism-geography', `Flooding scenario on arid-interior country — implausible`);
    }
    if (subtypes.has('wildfire') && ctx.playerStaticFlags.has('arid_interior')) {
        // Arid can still burn; this is a soft case. Warn instead of error.
        issues.push({
            severity: 'warn',
            rule: 'realism-geography',
            target: ctx.scenario.id,
            message: `Wildfire in arid-interior country — double-check plausibility of vegetation load`,
            autoFixable: false,
        });
    }
    return issues;
}

// ── Rule 2: RealismArchetypeRule ─────────────────────────────────────────────
// Interstate war against a great power requires ≥ regional_power. Civil war
// blocked in micro_state. Coup blocked in mature liberal democracies without
// prior instability signal on world state.

const POWER_TIERS_ALLOWED_FOR_WAR = new Set<CountryArchetype>([
    'major_power',
    'regional_power',
]);

export function runRealismArchetypeRule(ctx: RealismContext): Issue[] {
    const issues: Issue[] = [];
    const add = (rule: string, severity: 'error' | 'warn', message: string) =>
        issues.push({ severity, rule, target: ctx.scenario.id, message, autoFixable: false });

    if (ctx.inferredFlags.has('active_interstate_war')) {
        const anyPowerTier = [...POWER_TIERS_ALLOWED_FOR_WAR].some(tier =>
            ctx.playerArchetypes.has(tier)
        );
        if (!anyPowerTier) {
            add(
                'realism-archetype',
                'error',
                'Interstate war scenario on non-power-projection country — requires regional_power or major_power archetype',
            );
        }
    }

    if (ctx.inferredFlags.has('active_civil_war') && ctx.playerArchetypes.has('micro_state')) {
        add('realism-archetype', 'error', 'Civil war scenario in micro_state — implausible population/geography');
    }

    if (ctx.inferredFlags.has('active_coup_attempt') && ctx.playerArchetypes.has('liberal_democracy')) {
        // Allow if world state shows prior instability (fragile state or recent violence).
        const priorInstability =
            ctx.playerStaticFlags.has('fragile_state') ||
            (ctx.playerWorldState?.recentEventHistory ?? []).some(h =>
                h.flag === 'active_civil_war' || h.flag === 'active_terror_campaign',
            );
        if (!priorInstability) {
            add(
                'realism-archetype',
                'warn',
                'Coup attempt in mature liberal democracy without prior instability signal — implausible',
            );
        }
    }

    return issues;
}

// ── Rule 3: EventCooldownRule ────────────────────────────────────────────────
// Reject repeat of the same active_* flag inside the per-flag cooldown window
// (see EVENT_COOLDOWN_TURNS). Reads recentEventHistory off the world state.

export function runEventCooldownRule(ctx: RealismContext): Issue[] {
    const state = ctx.playerWorldState;
    if (!state || !state.recentEventHistory?.length || ctx.currentTurn == null) return [];

    const issues: Issue[] = [];
    for (const flag of ctx.inferredFlags) {
        if (!ACTIVE_EVENT_FLAGS.has(flag)) continue;
        const cooldown = EVENT_COOLDOWN_TURNS[flag];
        if (!cooldown) continue;
        const lastHit = state.recentEventHistory.find(h => h.flag === flag);
        if (!lastHit) continue;
        const delta = ctx.currentTurn - lastHit.turn;
        if (delta < cooldown) {
            issues.push({
                severity: 'error',
                rule: 'realism-cooldown',
                target: ctx.scenario.id,
                message: `Event "${flag}" repeated ${delta} turn(s) after last occurrence (cooldown: ${cooldown})`,
                autoFixable: false,
            });
        }
    }
    return issues;
}

// ── Rule 4: CausalPlausibilityRule ───────────────────────────────────────────
// Interstate war requires pre-existing hostile relationship OR recent
// diplomatic crisis. Pandemic requires prior health signal. Refugee crisis
// requires a neighbor in conflict.

const RELATIONSHIP_WAR_THRESHOLD = -50;
const DIPLOMATIC_CRISIS_LOOKBACK_TURNS = 8;

export function runCausalPlausibilityRule(ctx: RealismContext): Issue[] {
    const state = ctx.playerWorldState;
    const issues: Issue[] = [];
    const add = (rule: string, message: string) =>
        issues.push({ severity: 'error', rule, target: ctx.scenario.id, message, autoFixable: false });

    if (ctx.inferredFlags.has('active_interstate_war')) {
        const hostileRelationship = (state?.relationships ?? []).some(
            r => typeof r.strength === 'number' && r.strength <= RELATIONSHIP_WAR_THRESHOLD,
        );
        const recentCrisis = (state?.recentEventHistory ?? []).some(
            h =>
                h.flag === 'active_diplomatic_crisis' &&
                ctx.currentTurn != null &&
                ctx.currentTurn - h.turn <= DIPLOMATIC_CRISIS_LOOKBACK_TURNS,
        );
        if (state && !hostileRelationship && !recentCrisis) {
            add(
                'realism-causal',
                'Interstate war with no prior hostile relationship or diplomatic crisis — missing escalation ladder',
            );
        }
    }

    if (ctx.inferredFlags.has('active_refugee_crisis')) {
        const neighborInConflict = (ctx.neighborStates ?? []).some(n =>
            ['active_civil_war', 'active_interstate_war'].some(
                flag => n.activeEventFlags && (n.activeEventFlags as Record<string, unknown>)[flag],
            ),
        );
        if (ctx.neighborStates && !neighborInConflict) {
            add(
                'realism-causal',
                'Refugee crisis with no neighbor in civil or interstate war — missing origin',
            );
        }
    }

    return issues;
}

// ── Composed runner ──────────────────────────────────────────────────────────

export function runRealismRules(ctx: RealismContext): Issue[] {
    return [
        ...runRealismGeographyRule(ctx),
        ...runRealismArchetypeRule(ctx),
        ...runEventCooldownRule(ctx),
        ...runCausalPlausibilityRule(ctx),
    ];
}
