import { describe, it, expect } from 'vitest';
import { computeTier } from '../src/logic.js';

describe('computeTier', () => {
  it('classifies a score of exactly 70 as low risk (lower boundary of the low tier)', () => {
    expect(computeTier(70).key).toBe('low');
  });

  it('classifies a score of exactly 69 as medium risk (just below the low tier boundary)', () => {
    expect(computeTier(69).key).toBe('medium');
  });

  it('classifies a score of exactly 40 as medium risk (lower boundary of the medium tier)', () => {
    expect(computeTier(40).key).toBe('medium');
  });

  it('classifies a score of exactly 39 as high risk (just below the medium tier boundary)', () => {
    expect(computeTier(39).key).toBe('high');
  });

  it('classifies a score of 0 as high risk (minimum extreme)', () => {
    expect(computeTier(0).key).toBe('high');
  });

  it('classifies a score of 100 as low risk (maximum extreme)', () => {
    expect(computeTier(100).key).toBe('low');
  });
});
