import { describe, it, expect } from 'vitest';
import { generateCsv } from '../src/utils/csv.js';

describe('generateCsv', () => {
  it('produces header + data rows', () => {
    const result = generateCsv(['id', 'name'], [['1', 'Alice'], ['2', 'Bob']]);
    expect(result).toContain('id,name');
    expect(result).toContain('1,Alice');
    expect(result).toContain('2,Bob');
  });

  it('starts with UTF-8 BOM', () => {
    const result = generateCsv(['a'], [['b']]);
    expect(result.charCodeAt(0)).toBe(0xFEFF);
  });

  it('quotes fields containing commas', () => {
    const result = generateCsv(['name'], [['Smith, Inc.']]);
    expect(result).toContain('"Smith, Inc."');
  });

  it('escapes double quotes by doubling them', () => {
    const result = generateCsv(['name'], [['"Quoted"']]);
    expect(result).toContain('"""Quoted"""');
  });

  it('quotes fields containing newlines', () => {
    const result = generateCsv(['notes'], [['line1\nline2']]);
    expect(result).toContain('"line1\nline2"');
  });

  it('handles empty string fields', () => {
    const result = generateCsv(['a', 'b'], [['', 'value']]);
    expect(result).toContain(',value');
  });

  it('converts numbers to strings', () => {
    const result = generateCsv(['price'], [[123.45]]);
    expect(result).toContain('123.45');
  });

  it('uses CRLF line endings', () => {
    const result = generateCsv(['a'], [['b'], ['c']]);
    expect(result).toContain('\r\n');
  });

  it('prefixes formula-like strings starting with = to prevent injection', () => {
    const result = generateCsv(['v'], [['=cmd']]);
    expect(result).toContain("'=cmd");
  });

  it('prefixes formula-like strings starting with +', () => {
    const result = generateCsv(['v'], [['+x']]);
    expect(result).toContain("'+x");
  });

  it('prefixes formula-like strings starting with @', () => {
    const result = generateCsv(['v'], [['@x']]);
    expect(result).toContain("'@x");
  });

  it('leaves negative numbers like -12.50 intact', () => {
    const result = generateCsv(['v'], [['-12.50']]);
    expect(result).toContain('-12.50');
    expect(result).not.toContain("'-12.50");
  });

  it('prefixes non-numeric strings starting with -', () => {
    const result = generateCsv(['v'], [['-not-a-number']]);
    expect(result).toContain("'-not-a-number");
  });

  it('leaves plain strings unchanged', () => {
    const result = generateCsv(['v'], [['hello']]);
    expect(result).toContain('hello');
    expect(result).not.toContain("'hello");
  });
});
