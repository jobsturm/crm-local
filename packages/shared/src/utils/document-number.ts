/**
 * Document Number Template System
 *
 * Supports formatting document numbers with variables:
 * - {PREFIX}      - The document prefix (e.g., "INV", "OFF")
 * - {YEAR}        - Full year (e.g., "2026")
 * - {YY}          - Two-digit year (e.g., "26")
 * - {MONTH}       - Month (01-12)
 * - {DAY}         - Day (01-31)
 * - {NUMBER}      - Global counter (all-time)
 * - {NUMBER_YEAR} - Counter for current year only
 *
 * Padding syntax: {VARIABLE:WIDTH} pads with zeros
 * Example: {NUMBER:4} → "0042"
 */

/** Valid template variable names */
export const TEMPLATE_VARIABLES = [
  'PREFIX',
  'YEAR',
  'YY',
  'MONTH',
  'DAY',
  'NUMBER',
  'NUMBER_YEAR',
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

/** Regex to match template variables with optional padding */
const TEMPLATE_REGEX = /\{(\w+)(?::(\d+))?\}/g;

/** Variables needed to format a document number */
export interface DocumentNumberVariables {
  PREFIX: string;
  YEAR: number;
  YY: number;
  MONTH: number;
  DAY: number;
  NUMBER: number;
  NUMBER_YEAR: number;
}

/**
 * Format a document number using a template string
 *
 * @param template - Template string with variables (e.g., "{PREFIX}-{YEAR}-{NUMBER:4}")
 * @param variables - Variable values to substitute
 * @returns Formatted document number (e.g., "INV-2026-0042")
 *
 * @example
 * formatDocumentNumber('{YY}.{NUMBER_YEAR:3}', { YY: 26, NUMBER_YEAR: 5, ... })
 * // → "26.005"
 *
 * formatDocumentNumber('{PREFIX}-{YEAR}-{NUMBER:4}', { PREFIX: 'INV', YEAR: 2026, NUMBER: 42, ... })
 * // → "INV-2026-0042"
 */
export function formatDocumentNumber(
  template: string,
  variables: DocumentNumberVariables
): string {
  return template.replace(TEMPLATE_REGEX, (match, key: string, padding?: string) => {
    const value = variables[key as keyof DocumentNumberVariables];
    if (value === undefined) return match; // Keep unknown variables as-is

    const stringValue = String(value);
    if (padding) {
      return stringValue.padStart(parseInt(padding, 10), '0');
    }
    return stringValue;
  });
}

/**
 * Build variables object from current date and counters
 */
export function buildDocumentNumberVariables(
  prefix: string,
  globalCounter: number,
  yearCounter: number,
  date: Date = new Date()
): DocumentNumberVariables {
  return {
    PREFIX: prefix,
    YEAR: date.getFullYear(),
    YY: date.getFullYear() % 100,
    MONTH: date.getMonth() + 1,
    DAY: date.getDate(),
    NUMBER: globalCounter,
    NUMBER_YEAR: yearCounter,
  };
}

/**
 * Validation result for a template string
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
}

/**
 * Validate a document number template
 *
 * @param template - Template string to validate
 * @returns Validation result with errors and warnings
 */
export function validateTemplate(template: string): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const variables: string[] = [];

  // Check for empty template
  if (!template || template.trim() === '') {
    errors.push('Template cannot be empty');
    return { valid: false, errors, warnings, variables };
  }

  // Find all variables in template
  const matches = [...template.matchAll(TEMPLATE_REGEX)];

  if (matches.length === 0) {
    errors.push('Template must contain at least one variable like {NUMBER} or {YEAR}');
    return { valid: false, errors, warnings, variables };
  }

  for (const match of matches) {
    const varName = match[1] ?? '';
    const padding = match[2];

    if (varName) {
      variables.push(varName);

      // Check if variable is valid
      if (!TEMPLATE_VARIABLES.includes(varName as TemplateVariable)) {
        errors.push(
          `Unknown variable: {${varName}}. Valid variables: ${TEMPLATE_VARIABLES.join(', ')}`
        );
      }

      // Validate padding
      if (padding !== undefined) {
        const paddingNum = parseInt(padding, 10);
        if (paddingNum < 1 || paddingNum > 10) {
          errors.push(`Invalid padding for {${varName}:${padding}}. Padding must be between 1 and 10`);
        }
      }
    }
  }

  // Warn if no counter variable is used
  const hasCounter = variables.includes('NUMBER') || variables.includes('NUMBER_YEAR');
  if (!hasCounter) {
    warnings.push(
      'Template does not include {NUMBER} or {NUMBER_YEAR}. Document numbers may not be unique.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    variables,
  };
}

/**
 * Generate a preview of what a document number will look like
 *
 * @param template - Template string
 * @param prefix - Document prefix
 * @param globalCounter - Current global counter
 * @param yearCounter - Current year counter
 * @returns Preview string or error message
 */
export function previewDocumentNumber(
  template: string,
  prefix: string,
  globalCounter: number,
  yearCounter: number
): string {
  const validation = validateTemplate(template);
  if (!validation.valid) {
    return `Error: ${validation.errors[0]}`;
  }

  const variables = buildDocumentNumberVariables(prefix, globalCounter, yearCounter);
  return formatDocumentNumber(template, variables);
}

/** Default template that matches the current hardcoded format */
export const DEFAULT_INVOICE_NUMBER_FORMAT = '{PREFIX}-{YEAR}-{NUMBER:4}';
export const DEFAULT_OFFER_NUMBER_FORMAT = '{PREFIX}-{YEAR}-{NUMBER:4}';
