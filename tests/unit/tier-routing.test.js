import { describe, it, expect } from 'vitest';
import { classifyTask, reorderByCost, reorderFreeTierFirst, checkDailyBudget } from '@9router/tier-routing';

const PRICES = {
  'cheap/model-a': { input: 0.1, output: 0.2 },
  'mid/model-b': { input: 1.0, output: 2.0 },
  'expensive/model-c': { input: 10.0, output: 20.0 },
  'free/model-d': { input: 0.005, output: 0.005 },
};
const getPricing = (m) => PRICES[m] || null;

describe('tier-routing: taskClassifier', () => {
  it('flags requests with tools as critical', () => {
    const result = classifyTask({ messages: [{ role: 'user', content: 'hi' }], tools: [{ type: 'function' }] });
    expect(result.hasTools).toBe(true);
    expect(result.critical).toBe(true);
  });

  it('flags code-fenced content as critical even without tools', () => {
    const result = classifyTask({ messages: [{ role: 'user', content: 'fix this:\n```js\nconst x = 1;\n```' }] });
    expect(result.isCode).toBe(true);
    expect(result.critical).toBe(true);
  });

  it('treats plain prose as non-critical', () => {
    const result = classifyTask({ messages: [{ role: 'user', content: 'What is the capital of France?' }] });
    expect(result.hasTools).toBe(false);
    expect(result.isCode).toBe(false);
    expect(result.critical).toBe(false);
  });

  it('reads the last user message, not earlier turns', () => {
    const result = classifyTask({
      messages: [
        { role: 'user', content: '```js\ncode here\n```' },
        { role: 'assistant', content: 'ok' },
        { role: 'user', content: 'thanks, what is 2+2?' },
      ],
    });
    expect(result.isCode).toBe(false);
  });

  it('classifies complexity by text length', () => {
    expect(classifyTask({ messages: [{ role: 'user', content: 'short' }] }).complexity).toBe('low');
    expect(classifyTask({ messages: [{ role: 'user', content: 'x'.repeat(1000) }] }).complexity).toBe('medium');
    expect(classifyTask({ messages: [{ role: 'user', content: 'x'.repeat(5000) }] }).complexity).toBe('high');
  });

  it('handles missing/empty body without throwing', () => {
    expect(() => classifyTask({})).not.toThrow();
    expect(() => classifyTask(null)).not.toThrow();
  });
});

describe('tier-routing: costSort', () => {
  it('sorts models cheapest-first', () => {
    const models = ['expensive/model-c', 'cheap/model-a', 'mid/model-b'];
    expect(reorderByCost(models, getPricing)).toEqual(['cheap/model-a', 'mid/model-b', 'expensive/model-c']);
  });

  it('keeps unknown-priced models last, stable order preserved', () => {
    const models = ['unknown/one', 'cheap/model-a', 'unknown/two'];
    const result = reorderByCost(models, getPricing);
    expect(result[0]).toBe('cheap/model-a');
    expect(result.slice(1)).toEqual(['unknown/one', 'unknown/two']);
  });

  it('never drops a model', () => {
    const models = ['expensive/model-c', 'cheap/model-a', 'unknown/x', 'mid/model-b'];
    expect(reorderByCost(models, getPricing).sort()).toEqual([...models].sort());
  });

  it('is a no-op for single-model or empty lists', () => {
    expect(reorderByCost(['solo/model'], getPricing)).toEqual(['solo/model']);
    expect(reorderByCost([], getPricing)).toEqual([]);
  });

  it('floats free-tier models to the front as a block', () => {
    const models = ['expensive/model-c', 'mid/model-b', 'free/model-d', 'cheap/model-a'];
    const result = reorderFreeTierFirst(models, getPricing, 0.01);
    expect(result[0]).toBe('free/model-d');
    // the rest stay cost-ordered behind the free block
    expect(result.slice(1)).toEqual(['cheap/model-a', 'mid/model-b', 'expensive/model-c']);
  });
});

describe('tier-routing: budgetGuard', () => {
  it('reports no cap when dailyCapUsd is null/0/undefined', () => {
    expect(checkDailyBudget(50, null)).toEqual({ overBudget: false, remainingUsd: null });
    expect(checkDailyBudget(50, 0)).toEqual({ overBudget: false, remainingUsd: null });
    expect(checkDailyBudget(50, undefined)).toEqual({ overBudget: false, remainingUsd: null });
  });

  it('flags over-budget once spend reaches the cap', () => {
    expect(checkDailyBudget(10, 10).overBudget).toBe(true);
    expect(checkDailyBudget(11, 10).overBudget).toBe(true);
    expect(checkDailyBudget(9.99, 10).overBudget).toBe(false);
  });

  it('reports remaining budget when under cap', () => {
    expect(checkDailyBudget(3, 10).remainingUsd).toBe(7);
  });
});
