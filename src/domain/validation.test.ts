// Unit Tests for Domain Validation & Business Calculation Rules
import {
  validateCNPJ,
  validateRUC,
  calculateCompoundDiscount,
  calculateNextReorderDate,
  normalizeDocument,
} from './validation';
import { INITIAL_ORDERS } from '../lib/initialData';

export function runValidationSuite() {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const assert = (name: string, condition: boolean, details?: string) => {
    results.push({ name, passed: condition, details });
  };

  // 1. Compound discount test (Test case 5: 10% + 5% on R$ 100 = R$ 85.50)
  const discountResult = calculateCompoundDiscount(100, [10, 5]);
  assert(
    'Desconto composto 10% + 5% sobre R$ 100 resulta em R$ 85,50 com taxa efetiva de 14.5%',
    discountResult.finalPrice === 85.5 && discountResult.effectiveDiscountRate === 14.5,
    `Obtido: Preço=${discountResult.finalPrice}, Taxa=${discountResult.effectiveDiscountRate}%`
  );

  // 2. Reorder date calculation (Test case 12: 2026-09-01 + 60 days = 2026-10-31)
  const reorderDate = calculateNextReorderDate('2026-09-01', 60);
  assert(
    'Compra em 01/09/2026 com ciclo de 60 dias gera próxima compra em 31/10/2026',
    reorderDate === '2026-10-31',
    `Obtido: ${reorderDate}`
  );

  // 3. Without previous order date, return null without inventing date
  assert(
    'Sem histórico de compra não inventa data de recompra (retorna null)',
    calculateNextReorderDate('', 60) === null
  );

  // 4. Valid numeric CNPJ validation (e.g., standard known test CNPJ)
  // Let's test a valid known CNPJ: 11.222.333/0001-81
  const numericCnpj = validateCNPJ('11.222.333/0001-81');
  assert(
    'Validação de CNPJ numérico válido',
    numericCnpj.valid === true,
    numericCnpj.reason
  );

  // 5. Invalid numeric CNPJ check
  const invalidCnpj = validateCNPJ('11.222.333/0001-00');
  assert(
    'Rejeição de CNPJ numérico com dígito inválido',
    invalidCnpj.valid === false
  );

  // 6. Alphanumeric CNPJ validation (RFB IN 2.229/2024 format)
  // 12 alnum chars + 2 numeric check digits
  // Let's test normalization and structure
  const normalized = normalizeDocument('12.ABC.345/0001-99');
  assert(
    'Normalização preserva letras maiúsculas e remove pontuação',
    normalized === '12ABC345000199'
  );

  // 7. Paraguayan RUC validation (Test case 13)
  const validRuc = validateRUC('80012345-6');
  assert(
    'Validação de RUC Paraguaio no formato 80012345-6 sem máscara brasileira',
    validRuc.valid === true
  );

  // 8. Zero Synthetic Data Rule in Real Mode
  assert(
    'Ausência total de pedidos sintéticos no modo real (INITIAL_ORDERS vazio)',
    INITIAL_ORDERS.length === 0,
    `Pedidos encontrados: ${INITIAL_ORDERS.length}`
  );

  // 9. Dashboard calculation without orders yields zero volume
  const volume = INITIAL_ORDERS.reduce((acc: number, o: any) => acc + o.total_amount, 0);
  assert(
    'Cálculo inicial de vendas em modo real sem pedidos resulta em R$ 0,00',
    volume === 0,
    `Volume calculado: R$ ${volume}`
  );

  return results;
}
