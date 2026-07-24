export function generateCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (field: string | number): string => {
    let str = String(field);
    const first = str.charAt(0);
    if (
      first === '=' || first === '+' || first === '@' || first === '\t' || first === '\r' ||
      (first === '-' && isNaN(Number(str)))
    ) {
      str = "'" + str;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\r') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ];

  // UTF-8 BOM (\uFEFF) ensures Excel opens the file correctly
  return '\uFEFF' + lines.join('\r\n');
}
