import {
    normalizeGenerationScope,
    type GenerationScopeInput,
    type GenerationScopeNormalizationResult,
    type ScenarioSourceKind,
} from '../shared/generation-contract';

export function inferDefaultSourceKind(mode?: 'news' | 'manual'): ScenarioSourceKind {
    return mode === 'news' ? 'news' : 'evergreen';
}

export function normalizeGenerationScopeInput(input: GenerationScopeInput): GenerationScopeNormalizationResult {
    return normalizeGenerationScope(input);
}