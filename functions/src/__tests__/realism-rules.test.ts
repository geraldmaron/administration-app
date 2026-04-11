import {
    runRealismGeographyRule,
    runRealismArchetypeRule,
    runEventCooldownRule,
    runCausalPlausibilityRule,
    type RealismContext,
} from '../lib/realism-rules';
import type { RequiresFlag, CountryWorldState } from '../types';
import type { CountryArchetype } from '../data/schemas/country-archetypes';
import type { BundleScenario } from '../shared/scenario-audit';

function makeScenario(text: string, id = 'scn_test'): BundleScenario {
    return {
        id,
        title: 'Crisis unfolds',
        description: text,
        options: [],
    };
}

function ctx(partial: Partial<RealismContext> & { scenario: BundleScenario; inferredFlags: Set<RequiresFlag> }): RealismContext {
    return {
        playerArchetypes: new Set<CountryArchetype>(),
        playerStaticFlags: new Set<RequiresFlag>(),
        ...partial,
    };
}

describe('runRealismGeographyRule', () => {
    test('tsunami on non-coastal country is rejected', () => {
        const issues = runRealismGeographyRule(
            ctx({
                scenario: makeScenario('A massive tsunami strikes the capital'),
                inferredFlags: new Set<RequiresFlag>(['active_natural_disaster']),
                playerStaticFlags: new Set<RequiresFlag>([]),
            }),
        );
        expect(issues).toHaveLength(1);
        expect(issues[0].severity).toBe('error');
        expect(issues[0].rule).toBe('realism-geography');
        expect(issues[0].message).toMatch(/non-coastal/i);
    });

    test('tsunami on coastal country is accepted', () => {
        const issues = runRealismGeographyRule(
            ctx({
                scenario: makeScenario('A massive tsunami strikes the coast'),
                inferredFlags: new Set<RequiresFlag>(['active_natural_disaster']),
                playerStaticFlags: new Set<RequiresFlag>(['coastal']),
            }),
        );
        expect(issues).toHaveLength(0);
    });

    test('earthquake on seismically quiet country is rejected', () => {
        const issues = runRealismGeographyRule(
            ctx({
                scenario: makeScenario('A 7.2 magnitude earthquake devastates the capital'),
                inferredFlags: new Set<RequiresFlag>(['active_natural_disaster']),
                playerStaticFlags: new Set<RequiresFlag>([]),
            }),
        );
        expect(issues.some(i => i.message.includes('seismically quiet'))).toBe(true);
    });

    test('hurricane outside cyclone zone is rejected', () => {
        const issues = runRealismGeographyRule(
            ctx({
                scenario: makeScenario('A Category 4 hurricane makes landfall'),
                inferredFlags: new Set<RequiresFlag>(['active_natural_disaster']),
                playerStaticFlags: new Set<RequiresFlag>(['coastal']),
            }),
        );
        expect(issues.some(i => i.message.match(/cyclone zone/i))).toBe(true);
    });

    test('flood in arid interior is rejected', () => {
        const issues = runRealismGeographyRule(
            ctx({
                scenario: makeScenario('Severe flooding submerges the province'),
                inferredFlags: new Set<RequiresFlag>(['active_natural_disaster']),
                playerStaticFlags: new Set<RequiresFlag>(['arid_interior']),
            }),
        );
        expect(issues.some(i => i.message.includes('arid-interior'))).toBe(true);
    });

    test('no active_natural_disaster flag → no geography issues', () => {
        const issues = runRealismGeographyRule(
            ctx({
                scenario: makeScenario('A tsunami warning'),
                inferredFlags: new Set<RequiresFlag>(),
                playerStaticFlags: new Set<RequiresFlag>([]),
            }),
        );
        expect(issues).toHaveLength(0);
    });
});

describe('runRealismArchetypeRule', () => {
    test('interstate war blocked for non-power archetypes', () => {
        const issues = runRealismArchetypeRule(
            ctx({
                scenario: makeScenario('War declared'),
                inferredFlags: new Set<RequiresFlag>(['active_interstate_war']),
                playerArchetypes: new Set<CountryArchetype>(['small_state']),
            }),
        );
        expect(issues).toHaveLength(1);
        expect(issues[0].severity).toBe('error');
        expect(issues[0].rule).toBe('realism-archetype');
    });

    test('interstate war allowed for regional_power', () => {
        const issues = runRealismArchetypeRule(
            ctx({
                scenario: makeScenario('War declared'),
                inferredFlags: new Set<RequiresFlag>(['active_interstate_war']),
                playerArchetypes: new Set<CountryArchetype>(['regional_power']),
            }),
        );
        expect(issues).toHaveLength(0);
    });

    test('civil war blocked in micro_state', () => {
        const issues = runRealismArchetypeRule(
            ctx({
                scenario: makeScenario('Civil war breaks out'),
                inferredFlags: new Set<RequiresFlag>(['active_civil_war']),
                playerArchetypes: new Set<CountryArchetype>(['micro_state']),
            }),
        );
        expect(issues.some(i => i.rule === 'realism-archetype')).toBe(true);
    });

    test('coup attempt in liberal democracy without prior instability warns', () => {
        const issues = runRealismArchetypeRule(
            ctx({
                scenario: makeScenario("Coup attempt"),
                inferredFlags: new Set<RequiresFlag>(['active_coup_attempt']),
                playerArchetypes: new Set<CountryArchetype>(['liberal_democracy']),
            }),
        );
        expect(issues.some(i => i.severity === 'warn' && i.rule === 'realism-archetype')).toBe(true);
    });

    test('coup attempt in liberal democracy WITH prior instability passes', () => {
        const state: CountryWorldState = {
            countryId: 'xyz',
            currentMetrics: {},
            relationships: [],
            lastTickAt: new Date().toISOString(),
            generation: 1,
            recentScenarioIds: [],
            recentEventHistory: [{ flag: 'active_civil_war', turn: 2 }],
        };
        const issues = runRealismArchetypeRule(
            ctx({
                scenario: makeScenario("Coup attempt"),
                inferredFlags: new Set<RequiresFlag>(['active_coup_attempt']),
                playerArchetypes: new Set<CountryArchetype>(['liberal_democracy']),
                playerWorldState: state,
            }),
        );
        expect(issues).toHaveLength(0);
    });
});

describe('runEventCooldownRule', () => {
    const base: CountryWorldState = {
        countryId: 'xyz',
        currentMetrics: {},
        relationships: [],
        lastTickAt: new Date().toISOString(),
        generation: 1,
        recentScenarioIds: [],
    };

    test('same event flag within cooldown window is rejected', () => {
        const state: CountryWorldState = {
            ...base,
            recentEventHistory: [{ flag: 'active_school_shooting', turn: 10 }],
        };
        const issues = runEventCooldownRule(
            ctx({
                scenario: makeScenario('Shooting'),
                inferredFlags: new Set<RequiresFlag>(['active_school_shooting']),
                playerWorldState: state,
                currentTurn: 13, // 3 turns later; cooldown is 6
            }),
        );
        expect(issues).toHaveLength(1);
        expect(issues[0].rule).toBe('realism-cooldown');
    });

    test('same event flag outside cooldown window is accepted', () => {
        const state: CountryWorldState = {
            ...base,
            recentEventHistory: [{ flag: 'active_school_shooting', turn: 10 }],
        };
        const issues = runEventCooldownRule(
            ctx({
                scenario: makeScenario('Shooting'),
                inferredFlags: new Set<RequiresFlag>(['active_school_shooting']),
                playerWorldState: state,
                currentTurn: 20, // 10 turns later; cooldown is 6
            }),
        );
        expect(issues).toHaveLength(0);
    });

    test('no world state → cooldown rule short-circuits', () => {
        const issues = runEventCooldownRule(
            ctx({
                scenario: makeScenario('Shooting'),
                inferredFlags: new Set<RequiresFlag>(['active_school_shooting']),
            }),
        );
        expect(issues).toHaveLength(0);
    });
});

describe('runCausalPlausibilityRule', () => {
    test('interstate war without hostile relationship or prior crisis is rejected', () => {
        const state: CountryWorldState = {
            countryId: 'xyz',
            currentMetrics: {},
            relationships: [{ countryId: 'ally', type: 'ally', strength: 70 }],
            lastTickAt: new Date().toISOString(),
            generation: 1,
            recentScenarioIds: [],
            recentEventHistory: [],
        };
        const issues = runCausalPlausibilityRule(
            ctx({
                scenario: makeScenario('War'),
                inferredFlags: new Set<RequiresFlag>(['active_interstate_war']),
                playerWorldState: state,
                currentTurn: 5,
            }),
        );
        expect(issues.some(i => i.rule === 'realism-causal')).toBe(true);
    });

    test('interstate war with pre-existing hostile relationship is accepted', () => {
        const state: CountryWorldState = {
            countryId: 'xyz',
            currentMetrics: {},
            relationships: [{ countryId: 'rival', type: 'rival', strength: -60 }],
            lastTickAt: new Date().toISOString(),
            generation: 1,
            recentScenarioIds: [],
            recentEventHistory: [],
        };
        const issues = runCausalPlausibilityRule(
            ctx({
                scenario: makeScenario('War'),
                inferredFlags: new Set<RequiresFlag>(['active_interstate_war']),
                playerWorldState: state,
                currentTurn: 5,
            }),
        );
        expect(issues).toHaveLength(0);
    });

    test('refugee crisis without neighbor in conflict is rejected', () => {
        const issues = runCausalPlausibilityRule(
            ctx({
                scenario: makeScenario('Refugees flood across the border'),
                inferredFlags: new Set<RequiresFlag>(['active_refugee_crisis']),
                neighborStates: [
                    {
                        countryId: 'n1',
                        currentMetrics: {},
                        relationships: [],
                        lastTickAt: new Date().toISOString(),
                        generation: 1,
                        recentScenarioIds: [],
                    },
                ],
                currentTurn: 5,
            }),
        );
        expect(issues.some(i => i.rule === 'realism-causal')).toBe(true);
    });

    test('refugee crisis with neighbor in civil war is accepted', () => {
        const issues = runCausalPlausibilityRule(
            ctx({
                scenario: makeScenario('Refugees flood across the border'),
                inferredFlags: new Set<RequiresFlag>(['active_refugee_crisis']),
                neighborStates: [
                    {
                        countryId: 'n1',
                        currentMetrics: {},
                        relationships: [],
                        lastTickAt: new Date().toISOString(),
                        generation: 1,
                        recentScenarioIds: [],
                        activeEventFlags: {
                            active_civil_war: { startedAt: 0, expiresAt: 1e15, severity: 0.8 },
                        },
                    },
                ],
                currentTurn: 5,
            }),
        );
        expect(issues).toHaveLength(0);
    });
});
