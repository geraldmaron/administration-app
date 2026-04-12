import { normalizeTokenAliases } from './token-registry';
import { sanitizeInventedTokens } from './audit-rules';
import { tryNormalizeMetricId } from '../data/schemas/metricIds';

export interface PhaseValidationResult {
    pass: boolean;
    fixes: string[];
    issues: string[];
}

// ---------------------------------------------------------------------------
// Skeleton validation (after Phase A, before Phase B)
// ---------------------------------------------------------------------------

export function validateSkeleton(
    skeleton: { title?: string; description?: string; options?: Array<{ id?: string; text?: string; label?: string }> },
    tokenValidator: (t: string) => boolean,
): PhaseValidationResult {
    const fixes: string[] = [];
    const issues: string[] = [];

    if (!skeleton.title || skeleton.title.trim().length === 0) {
        issues.push('missing title');
    }
    if (!skeleton.description || skeleton.description.trim().length < 20) {
        issues.push('missing or too-short description');
    }
    const options = (skeleton.options || []).slice(0, 3);
    if (options.length < 3) {
        issues.push(`only ${options.length} options (need 3)`);
        return { pass: false, fixes, issues };
    }
    for (const opt of options) {
        if (!opt.text || opt.text.trim().length < 10) {
            issues.push(`option ${opt.id ?? '?'}: missing or too-short text`);
        }
    }

    if (skeleton.title) {
        const before = skeleton.title;
        skeleton.title = normalizeTokenAliases(skeleton.title);
        if (skeleton.title !== before) fixes.push('normalized title token aliases');
    }
    if (skeleton.description) {
        const before = skeleton.description;
        skeleton.description = normalizeTokenAliases(skeleton.description);
        if (skeleton.description !== before) fixes.push('normalized description token aliases');
    }
    for (const opt of options) {
        if (opt.text) {
            const before = opt.text;
            opt.text = normalizeTokenAliases(opt.text);
            if (opt.text !== before) fixes.push(`normalized ${opt.id} text token aliases`);
        }
        if (opt.label) {
            const before = opt.label;
            opt.label = normalizeTokenAliases(opt.label);
            if (opt.label !== before) fixes.push(`normalized ${opt.id} label token aliases`);
        }
    }

    const allText = [skeleton.title, skeleton.description, ...options.map(o => o.text)].filter(Boolean).join(' ');
    const inventedTokens = [...allText.matchAll(/\{([a-z_]+)\}/g)]
        .map(m => m[1])
        .filter(t => !tokenValidator(t));

    if (inventedTokens.length > 0) {
        const scenarioLike = {
            title: skeleton.title ?? '',
            description: skeleton.description ?? '',
            options: options.map(o => ({
                id: o.id ?? '',
                text: o.text ?? '',
                label: o.label ?? '',
                outcomeHeadline: '',
                outcomeSummary: '',
                outcomeContext: '',
                effects: [],
                advisorFeedback: [],
            })),
            metadata: {},
            conditions: [],
            relationship_conditions: [],
        };
        const { sanitized, replaced } = sanitizeInventedTokens(scenarioLike as any, tokenValidator);
        if (sanitized) {
            skeleton.title = scenarioLike.title;
            skeleton.description = scenarioLike.description;
            for (let i = 0; i < options.length; i++) {
                options[i].text = scenarioLike.options[i]?.text ?? options[i].text;
                options[i].label = scenarioLike.options[i]?.label ?? options[i].label;
            }
            fixes.push(...replaced.map((r: string) => `sanitized: ${r}`));
        }

        const remainingText = [skeleton.title, skeleton.description, ...options.map(o => o.text)].filter(Boolean).join(' ');
        const remaining = [...remainingText.matchAll(/\{([a-z_]+)\}/g)]
            .map(m => m[1])
            .filter(t => !tokenValidator(t));

        if (remaining.length > 3) {
            issues.push(`${remaining.length} invented tokens remain after normalization: ${remaining.slice(0, 5).map(t => `{${t}}`).join(', ')}`);
            return { pass: false, fixes, issues };
        }
    }

    const hasBlockingIssues = issues.some(i =>
        i.includes('missing title') ||
        i.includes('only') ||
        i.includes('missing or too-short description')
    );

    return { pass: !hasBlockingIssues, fixes, issues };
}

// ---------------------------------------------------------------------------
// Effects validation (after Phase B, before Phase D advisor)
// ---------------------------------------------------------------------------

export function validateEffects(
    effectsData: { options?: Array<{ id?: string; effects?: Array<{ targetMetricId?: string; value?: number; duration?: number; probability?: number }> }> },
    validMetricIds: ReadonlySet<string>,
    inverseMetrics: ReadonlySet<string>,
    defaultCap?: number,
): PhaseValidationResult {
    const fixes: string[] = [];
    const issues: string[] = [];
    const cap = defaultCap ?? 4.2;

    const effectOptions = effectsData.options || [];
    if (effectOptions.length < 3) {
        issues.push(`only ${effectOptions.length} option effect sets (need 3)`);
        return { pass: false, fixes, issues };
    }

    let totalEffects = 0;
    let unmappableMetrics = 0;
    const unmappableMetricDetails = new Set<string>();

    for (const opt of effectOptions) {
        const effects = opt.effects || [];
        if (effects.length === 0) {
            issues.push(`option ${opt.id ?? '?'}: no effects`);
            continue;
        }

        for (const eff of effects) {
            totalEffects++;

            if (eff.targetMetricId && !validMetricIds.has(eff.targetMetricId)) {
                const resolved = tryNormalizeMetricId(eff.targetMetricId);
                if (resolved && validMetricIds.has(resolved)) {
                    fixes.push(`${opt.id}: metric ${eff.targetMetricId} → ${resolved}`);
                    eff.targetMetricId = resolved;
                } else {
                    unmappableMetrics++;
                    unmappableMetricDetails.add(`${opt.id}:${eff.targetMetricId}`);
                    issues.push(`${opt.id}: unmappable metric "${eff.targetMetricId}"`);
                }
            }

            if (typeof eff.value === 'number') {
                if (Math.abs(eff.value) > cap) {
                    const clamped = Math.sign(eff.value) * cap;
                    fixes.push(`${opt.id}: clamped ${eff.value} → ${clamped}`);
                    eff.value = clamped;
                }

                if (eff.targetMetricId && inverseMetrics.has(eff.targetMetricId) && eff.value > 0) {
                    fixes.push(`${opt.id}: flipped inverse metric ${eff.targetMetricId} value ${eff.value} → ${-Math.abs(eff.value)}`);
                    eff.value = -Math.abs(eff.value);
                }
            }

            if (eff.probability !== undefined && eff.probability !== 1) {
                fixes.push(`${opt.id}: probability ${eff.probability} → 1`);
                eff.probability = 1;
            }

            if (eff.duration !== undefined && (!Number.isFinite(eff.duration) || eff.duration < 1)) {
                fixes.push(`${opt.id}: duration ${eff.duration} → 1`);
                eff.duration = 1;
            }
        }
    }

    if (unmappableMetrics > 0) {
        issues.push(`unmappable metrics remain after normalization: ${Array.from(unmappableMetricDetails).join(', ')}`);
        return { pass: false, fixes, issues };
    }

    return { pass: true, fixes, issues };
}
