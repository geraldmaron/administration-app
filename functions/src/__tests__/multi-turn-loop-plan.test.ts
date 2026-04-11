/**
 * Tests multi-act loop length distribution and normalizeLoopStructure wiring for scenario chains.
 */

import type { BundleScenario } from '../lib/audit-rules';
import { buildLoopLengthPlan, buildMultiActContinuityPromptBlock, normalizeLoopStructure } from '../scenario-engine';

describe('buildLoopLengthPlan', () => {
  it('auto mode yields only 1–3 acts and approximates 60/30/10 over many samples', () => {
    const n = 600;
    const plan = buildLoopLengthPlan(n, { mode: 'auto' });
    expect(plan).toHaveLength(n);
    expect(plan.every((a) => a >= 1 && a <= 3)).toBe(true);
    const ones = plan.filter((a) => a === 1).length;
    const twos = plan.filter((a) => a === 2).length;
    const threes = plan.filter((a) => a === 3).length;
    expect(ones + twos + threes).toBe(n);
    // Allow statistical variance (rounded targets)
    expect(ones / n).toBeGreaterThan(0.45);
    expect(ones / n).toBeLessThan(0.75);
    expect(threes / n).toBeGreaterThan(0.03);
    expect(threes / n).toBeLessThan(0.22);
  });

  it('fixed mode respects loopLength cap', () => {
    const plan = buildLoopLengthPlan(5, { mode: 'fixed', loopLength: 2 });
    expect(plan).toEqual([2, 2, 2, 2, 2]);
  });
});

describe('buildMultiActContinuityPromptBlock', () => {
  it('includes full prior act title, description, and multi-act position for sequential drafting', () => {
    const prior: BundleScenario = {
      id: 'gen_arc_act1',
      title: 'Border Signal',
      description: 'A long description that must appear in the continuity block for act two.',
      options: [
        { id: 'o1', text: 'Option one text for continuity' },
        { id: 'o2', text: 'Second option' },
      ],
      applicability: { requires: {}, metricGates: [] },
      metadata: { severity: 'medium', involvedCountries: ['rival_state', 'ally_state'] },
    } as BundleScenario;

    const block = buildMultiActContinuityPromptBlock([prior], 2, { actIndex: 2, title: 'Aftershock', summary: 's' });
    expect(block).toContain('drafting act 2 of 2');
    expect(block).toContain('Border Signal');
    expect(block).toContain('A long description that must appear');
    expect(block).toContain('rival_state');
    expect(block).toContain('Option one text for continuity');
    expect(block).toContain('Prior act 1');
  });
});

describe('normalizeLoopStructure', () => {
  function minimalAct(id: string, opts: Array<{ id: string } & Record<string, unknown>>): BundleScenario {
    return {
      id,
      title: 't',
      description: 'd'.repeat(80),
      options: opts as any,
      applicability: { requires: {}, metricGates: [] },
      metadata: { severity: 'medium' },
    } as BundleScenario;
  }

  it('wires chainId, chainsTo, consequenceScenarioIds, and clears final act option consequences', () => {
    const a1 = minimalAct('gen_x_act1', [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const a2 = minimalAct('gen_x_act2', [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    a1.actIndex = 2;
    a2.actIndex = 1;
    const loop: BundleScenario[] = [a1, a2];
    normalizeLoopStructure(loop);
    expect(loop[0].actIndex).toBe(1);
    expect(loop[1].actIndex).toBe(2);
    expect(loop[0].phase).toBe('root');
    expect(loop[1].phase).toBe('final');
    expect(loop[0].chainId).toBe('gen_x');
    expect(loop[1].chainId).toBe('gen_x');
    expect(loop[0].chainsTo).toEqual([loop[1].id]);
    expect(loop[1].chainsTo).toEqual([]);
    for (const o of loop[0].options) {
      expect((o as any).consequenceScenarioIds).toEqual([loop[1].id]);
      expect(typeof (o as any).consequenceDelay).toBe('number');
    }
    for (const o of loop[1].options) {
      expect((o as any).consequenceScenarioIds).toBeUndefined();
      expect((o as any).consequenceDelay).toBeUndefined();
    }
  });

  it('after trim + re-normalize, final act has no dangling option consequences', () => {
    const acts = [1, 2, 3].map((i) =>
      minimalAct(`c_act${i}`, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    );
    normalizeLoopStructure(acts);
    const trimmed: BundleScenario[] = [...acts];
    trimmed.splice(2);
    normalizeLoopStructure(trimmed);
    const last = trimmed[trimmed.length - 1];
    expect(last.phase).toBe('final');
    expect(last.chainsTo).toEqual([]);
    for (const o of last.options) {
      expect((o as any).consequenceScenarioIds).toBeUndefined();
    }
  });
});
