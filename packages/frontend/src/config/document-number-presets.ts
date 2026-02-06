/**
 * Document Number Format Presets
 *
 * Each preset defines a template format with variables:
 * - {PREFIX}      - Document prefix (e.g., "INV", "OFF")
 * - {YEAR}        - Full year (e.g., "2026")
 * - {YY}          - Two-digit year (e.g., "26")
 * - {MONTH}       - Month (01-12)
 * - {DAY}         - Day (01-31)
 * - {NUMBER}      - Global counter (all-time)
 * - {NUMBER_YEAR} - Counter for current year only
 *
 * Padding: {VARIABLE:N} pads with zeros to N digits
 */

export interface DocumentNumberPreset {
  /** Unique identifier */
  id: string;
  /** Display label (will be translated) */
  labelKey: string;
  /** The template format string */
  format: string;
  /** Example output for display */
  example: string;
}

export const DOCUMENT_NUMBER_PRESETS: DocumentNumberPreset[] = [
  {
    id: 'yy-number-year',
    labelKey: 'settings.numbering.preset.yyNumberYear',
    format: '{YY}.{NUMBER_YEAR:3}',
    example: '26.005',
  },
  {
    id: 'number-only',
    labelKey: 'settings.numbering.preset.numberOnly',
    format: '{NUMBER:5}',
    example: '00042',
  },
  {
    id: 'yy-month-number',
    labelKey: 'settings.numbering.preset.yyMonthNumber',
    format: '{YY}.{MONTH}.{NUMBER_YEAR:3}',
    example: '26.02.005',
  },
  {
    id: 'prefix-year-number',
    labelKey: 'settings.numbering.preset.prefixYearNumber',
    format: '{PREFIX}-{YEAR}-{NUMBER:4}',
    example: 'INV-2026-0042',
  },
  {
    id: 'year-slash-number',
    labelKey: 'settings.numbering.preset.yearSlashNumber',
    format: '{YEAR}/{NUMBER:4}',
    example: '2026/0042',
  },
  {
    id: 'date-number',
    labelKey: 'settings.numbering.preset.dateNumber',
    format: '{YY}{MONTH}{DAY}-{NUMBER:3}',
    example: '260206-042',
  },
  {
    id: 'custom',
    labelKey: 'settings.numbering.preset.custom',
    format: '', // User defines their own
    example: '',
  },
];

/** Get a preset by ID */
export function getPresetById(id: string): DocumentNumberPreset | undefined {
  return DOCUMENT_NUMBER_PRESETS.find((p) => p.id === id);
}

/** Find which preset matches a given format (or 'custom' if none match) */
export function getPresetForFormat(format: string): DocumentNumberPreset {
  const preset = DOCUMENT_NUMBER_PRESETS.find((p) => p.id !== 'custom' && p.format === format);
  // The custom preset is always the last one in the array
  const customPreset = DOCUMENT_NUMBER_PRESETS.find((p) => p.id === 'custom')!;
  return preset ?? customPreset;
}
