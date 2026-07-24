import { describe, it, expect } from 'vitest';
import { toIso3166Alpha2 } from '../ubl-country-codes';

describe('toIso3166Alpha2', () => {
  it('maps "Nederland" to "NL"', () => {
    expect(toIso3166Alpha2('Nederland')).toBe('NL');
  });

  it('is case-insensitive for full names', () => {
    expect(toIso3166Alpha2('netherlands')).toBe('NL');
  });

  it('passes through lowercase 2-letter codes as uppercase', () => {
    expect(toIso3166Alpha2('nl')).toBe('NL');
  });

  it('passes through uppercase 2-letter codes', () => {
    expect(toIso3166Alpha2('NL')).toBe('NL');
  });

  it('returns undefined for unknown countries', () => {
    expect(toIso3166Alpha2('Atlantis')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(toIso3166Alpha2(undefined)).toBeUndefined();
  });

  it('passes through "BE"', () => {
    expect(toIso3166Alpha2('BE')).toBe('BE');
  });

  it('maps "België" to "BE"', () => {
    expect(toIso3166Alpha2('België')).toBe('BE');
  });
});
