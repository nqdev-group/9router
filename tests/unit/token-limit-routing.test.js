import { describe, it, expect } from 'vitest';
import { estimatePromptTokens, filterModelsByTokenLimit } from '@9router/token-limit-routing';

describe('token-limit-routing: estimatePromptTokens', () => {
  it('estimates tokens from openai/claude messages (char/4 + role overhead)', () => {
    const body = { messages: [{ role: 'user', content: 'x'.repeat(400) }] };
    // 400 chars / 4 = 100, + 4 role overhead
    expect(estimatePromptTokens(body)).toBe(104);
  });

  it('sums tokens across the whole conversation, not just the trailing turn', () => {
    const body = {
      messages: [
        { role: 'user', content: 'x'.repeat(40) },
        { role: 'assistant', content: 'x'.repeat(40) },
        { role: 'user', content: 'x'.repeat(40) },
      ],
    };
    expect(estimatePromptTokens(body)).toBe(3 * (10 + 4));
  });

  it('reads content-block arrays (text blocks only)', () => {
    const body = {
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'x'.repeat(80) }, { type: 'image_url', image_url: {} }] },
      ],
    };
    expect(estimatePromptTokens(body)).toBe(20 + 4);
  });

  it('reads the responses-api `input` shape', () => {
    const body = { input: [{ role: 'user', content: 'x'.repeat(400) }] };
    expect(estimatePromptTokens(body)).toBe(104);
  });

  it('reads gemini `contents`/`request.contents` shape', () => {
    const body = { contents: [{ role: 'user', parts: [{ text: 'x'.repeat(400) }] }] };
    expect(estimatePromptTokens(body)).toBe(104);

    const nested = { request: { contents: [{ role: 'user', parts: [{ text: 'x'.repeat(400) }] }] } };
    expect(estimatePromptTokens(nested)).toBe(104);
  });

  it('includes a top-level claude-style `system` string', () => {
    const body = { system: 'x'.repeat(40), messages: [{ role: 'user', content: 'x'.repeat(40) }] };
    expect(estimatePromptTokens(body)).toBe(10 + (10 + 4));
  });

  it('handles missing/empty/malformed body without throwing', () => {
    expect(estimatePromptTokens(null)).toBe(0);
    expect(estimatePromptTokens({})).toBe(0);
    expect(estimatePromptTokens({ messages: null })).toBe(0);
    expect(() => estimatePromptTokens(undefined)).not.toThrow();
  });
});

describe('token-limit-routing: filterModelsByTokenLimit', () => {
  const LIMITS = {
    'small/model-a': 100,
    'big/model-b': 100000,
  };
  const getMaxInputTokens = (m) => (m in LIMITS ? LIMITS[m] : null);

  it('drops models whose limit is smaller than the prompt', () => {
    const models = ['small/model-a', 'big/model-b'];
    expect(filterModelsByTokenLimit(models, 5000, getMaxInputTokens)).toEqual(['big/model-b']);
  });

  it('keeps models with no configured limit (null = unknown, not blocked)', () => {
    const models = ['unknown/model-x', 'small/model-a'];
    expect(filterModelsByTokenLimit(models, 5000, getMaxInputTokens)).toEqual(['unknown/model-x']);
  });

  it('is stable — does not reorder the remaining models', () => {
    const models = ['big/model-b', 'unknown/model-x', 'small/model-a'];
    expect(filterModelsByTokenLimit(models, 5000, getMaxInputTokens)).toEqual(['big/model-b', 'unknown/model-x']);
  });

  it('fails open: never returns an empty list even if every model is bypassed', () => {
    const models = ['small/model-a', 'big/model-b'];
    expect(filterModelsByTokenLimit(models, 999999, getMaxInputTokens)).toEqual(models);
  });

  it('is a no-op for single-model/empty lists or a missing lookup', () => {
    expect(filterModelsByTokenLimit(['solo/model'], 5000, getMaxInputTokens)).toEqual(['solo/model']);
    expect(filterModelsByTokenLimit([], 5000, getMaxInputTokens)).toEqual([]);
    expect(filterModelsByTokenLimit(['a/b', 'c/d'], 5000, null)).toEqual(['a/b', 'c/d']);
  });

  it('is a no-op when promptTokens is not a positive finite number', () => {
    const models = ['small/model-a', 'big/model-b'];
    expect(filterModelsByTokenLimit(models, 0, getMaxInputTokens)).toEqual(models);
    expect(filterModelsByTokenLimit(models, NaN, getMaxInputTokens)).toEqual(models);
    expect(filterModelsByTokenLimit(models, undefined, getMaxInputTokens)).toEqual(models);
  });
});
