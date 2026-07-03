import { describe, it, expect } from 'vitest';
import { roundCurrency, calculateTax } from '@crm-local/shared';

describe('roundCurrency', () => {
  it('rounds down when third decimal < 5', () => {
    expect(roundCurrency(283.7625)).toBe(283.76);
  });

  it('rounds up at midpoint (half-up)', () => {
    expect(roundCurrency(283.765)).toBe(283.77);
  });

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0);
  });

  it('handles whole numbers unchanged', () => {
    expect(roundCurrency(100)).toBe(100);
  });

  it('handles negative amounts (credit notes)', () => {
    expect(roundCurrency(-283.7625)).toBe(-283.76);
  });

  it('IEEE-754 stress test: 1.005 rounds to 1.01 (not 1.00)', () => {
    expect(roundCurrency(1.005)).toBe(1.01);
  });
});

describe('calculateTax', () => {
  it('calculates the reported bug case: 1351.25 @ 21%', () => {
    const result = calculateTax(1351.25, 21);
    expect(result.taxAmount).toBe(283.76);
    expect(result.total).toBe(1635.01);
  });

  it('handles integer result: 4900 @ 19%', () => {
    const result = calculateTax(4900, 19);
    expect(result.taxAmount).toBe(931);
    expect(result.total).toBe(5831);
  });

  it('handles zero subtotal', () => {
    const result = calculateTax(0, 21);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles zero tax rate', () => {
    const result = calculateTax(1000, 0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(1000);
  });
});
