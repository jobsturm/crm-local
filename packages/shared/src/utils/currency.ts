/**
 * Currency helpers for invoice/offer money math.
 *
 * IMPORTANT: All monetary amounts in this app are stored as EURO DECIMALS
 * (e.g. 1351.25), NOT cents. Rounding must target 2 decimal places.
 */

/**
 * Round a monetary amount to 2 decimal places using half-up rounding,
 * guarded against IEEE 754 floating-point midpoint errors.
 *
 * @example
 * roundCurrency(283.7625) // => 283.76
 * roundCurrency(1.005)    // => 1.01  (naive Math.round(x*100)/100 gives 1.00)
 */
export function roundCurrency(amount: number): number {
  // Number.EPSILON nudge fixes cases like 1.005 * 100 = 100.49999999999999
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate VAT/tax amount and gross total from a net subtotal and a
 * percentage tax rate. Both results are rounded to 2 decimals.
 *
 * @param subtotal Net amount in euros (e.g. 1351.25)
 * @param taxRate  Percentage (e.g. 21 for 21%)
 * @returns taxAmount and total, both euro-rounded
 *
 * @example
 * calculateTax(1351.25, 21) // => { taxAmount: 283.76, total: 1635.01 }
 */
export function calculateTax(
  subtotal: number,
  taxRate: number
): { taxAmount: number; total: number } {
  const taxAmount = roundCurrency(subtotal * (taxRate / 100));
  const total = roundCurrency(subtotal + taxAmount);
  return { taxAmount, total };
}
