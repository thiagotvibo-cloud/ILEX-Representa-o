// ILEX CRM - Domain Validation & Calculation Rules
// Strictly adheres to Brazilian & Mercosur B2B representation standards

/**
 * Normalizes document string by trimming whitespace and converting to uppercase,
 * preserving letters and digits.
 */
export function normalizeDocument(doc: string): string {
  if (!doc) return '';
  return doc.trim().toUpperCase().replace(/[\s./-]/g, '');
}

/**
 * Validates a Brazilian CNPJ, accepting both:
 * 1. Traditional 14-digit numeric CNPJ
 * 2. Modern alphanumeric CNPJ per Receita Federal do Brasil (RFB IN 2.229/2024)
 * 
 * In alphanumeric CNPJ, positions 1-12 can contain letters (A-Z) and digits (0-9),
 * and the 2 check digits (positions 13-14) are numeric.
 */
export function validateCNPJ(doc: string): { valid: boolean; reason?: string; isAlphanumeric?: boolean } {
  if (!doc) return { valid: false, reason: 'Documento não informado' };
  
  const clean = normalizeDocument(doc);
  if (clean.length !== 14) {
    return { valid: false, reason: 'CNPJ deve conter exatamente 14 caracteres alfanuméricos' };
  }

  // Check if it's purely numeric
  const isNumericOnly = /^\d{14}$/.test(clean);
  const isAlphanumeric = /^[A-Z0-9]{12}\d{2}$/.test(clean);

  if (!isNumericOnly && !isAlphanumeric) {
    return { valid: false, reason: 'Formato de CNPJ inválido: caracteres especiais ou posições de dígitos inválidas' };
  }

  // Reject obvious repeated digits if numeric
  if (isNumericOnly && /^(\d)\1{13}$/.test(clean)) {
    return { valid: false, reason: 'CNPJ com todos os dígitos iguais é inválido' };
  }

  // Helper to get value of character for mod 11 calculation:
  // Per RFB specification: ASCII value minus 48 (digits '0'-'9' => 0-9, letters 'A'-'Z' => 17-42)
  const getCharVal = (char: string): number => {
    const code = char.charCodeAt(0);
    return code - 48;
  };

  // 1st Check Digit calculation (weights: 5,4,3,2,9,8,7,6,5,4,3,2)
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += getCharVal(clean[i]) * weights1[i];
  }
  const rem1 = sum1 % 11;
  const d1 = rem1 < 2 ? 0 : 11 - rem1;

  if (d1 !== parseInt(clean[12], 10)) {
    return { valid: false, reason: 'Primeiro dígito verificador do CNPJ incorreto' };
  }

  // 2nd Check Digit calculation (weights: 6,5,4,3,2,9,8,7,6,5,4,3,2)
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 12; i++) {
    sum2 += getCharVal(clean[i]) * weights2[i];
  }
  sum2 += d1 * weights2[12];
  const rem2 = sum2 % 11;
  const d2 = rem2 < 2 ? 0 : 11 - rem2;

  if (d2 !== parseInt(clean[13], 10)) {
    return { valid: false, reason: 'Segundo dígito verificador do CNPJ incorreto' };
  }

  return { valid: true, isAlphanumeric: !isNumericOnly };
}

/**
 * Validates a Paraguayan RUC (Registro Único de Contribuyentes).
 * Paraguayan documents have format like 80012345-6 (typically 5 to 9 digits plus verification digit).
 * Preserves the original format and does NOT apply Brazilian masks.
 */
export function validateRUC(doc: string): { valid: boolean; reason?: string } {
  if (!doc) return { valid: false, reason: 'RUC não informado' };
  const trimmed = doc.trim();
  // Validates standard Paraguayan RUC format: numeric with optional hyphen and check digit
  const rucPattern = /^[0-9]{5,9}(-[0-9A-Za-z])?$/;
  if (!rucPattern.test(trimmed)) {
    return { valid: false, reason: 'Formato de RUC paraguaio inválido (exemplo: 80012345-6)' };
  }
  return { valid: true };
}

/**
 * Calculates compound successive discounts.
 * Rule: 10% + 5% is NOT 15%.
 * Multiplier: (1 - 0.10) * (1 - 0.05) = 0.90 * 0.95 = 0.855 (14.5% effective discount)
 * Final Price on R$ 100 = R$ 85.50
 */
export function calculateCompoundDiscount(basePrice: number, discountPercentages: number[]): {
  finalPrice: number;
  effectiveDiscountRate: number;
  totalDiscountAmount: number;
} {
  if (basePrice <= 0) {
    return { finalPrice: 0, effectiveDiscountRate: 0, totalDiscountAmount: 0 };
  }

  let multiplier = 1.0;
  for (const d of discountPercentages) {
    if (d > 0) {
      multiplier *= (1 - (d / 100));
    }
  }

  const finalPrice = Math.round((basePrice * multiplier) * 1000000) / 1000000;
  const effectiveDiscountRate = Math.round((1 - multiplier) * 10000) / 100;
  const totalDiscountAmount = Math.round((basePrice - finalPrice) * 100) / 100;

  return {
    finalPrice: Math.round(finalPrice * 100) / 100,
    effectiveDiscountRate,
    totalDiscountAmount,
  };
}

/**
 * Calculates the next expected reorder date.
 * Base rule: last purchase date + configured cycle days.
 * Test case: Purchase 2026-09-01 + 60 days => 2026-10-31 (September has 30 days: 29 days in Sep + 31 in Oct = 60 days)
 */
export function calculateNextReorderDate(lastOrderDateStr: string, cycleDays: number = 60): string | null {
  if (!lastOrderDateStr) return null;
  
  // Parse YYYY-MM-DD explicitly in UTC/calendar days to prevent timezone shifts
  const [year, month, day] = lastOrderDateStr.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + cycleDays);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}
