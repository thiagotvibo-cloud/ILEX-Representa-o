import React, { useState } from 'react';
import { runValidationSuite } from '../../domain/validation.test';
import {
  calculateCompoundDiscount,
  calculateNextReorderDate,
  validateCNPJ,
  validateRUC,
} from '../../domain/validation';
import { CheckCircle2, XCircle, Play, RefreshCw, Calculator, Calendar, FileText } from 'lucide-react';

export const ValidationTestsView: React.FC = () => {
  const [suiteResults, setSuiteResults] = useState(() => runValidationSuite());

  // Interactive Playground for Compound Discount
  const [basePrice, setBasePrice] = useState('100');
  const [discounts, setDiscounts] = useState('10, 5');

  // Interactive Playground for Reorder Date
  const [orderDate, setOrderDate] = useState('2026-09-01');
  const [cycleDays, setCycleDays] = useState('60');

  // Interactive Playground for CNPJ/RUC
  const [docInput, setDocInput] = useState('11.222.333/0001-81');

  const handleRerunTests = () => {
    setSuiteResults(runValidationSuite());
  };

  const discountCalc = calculateCompoundDiscount(
    parseFloat(basePrice) || 0,
    discounts
      .split(',')
      .map(d => parseFloat(d.trim()) || 0)
      .filter(d => d > 0)
  );

  const reorderCalc = calculateNextReorderDate(orderDate, parseInt(cycleDays, 10) || 60);

  const cnpjCalc = validateCNPJ(docInput);
  const rucCalc = validateRUC(docInput);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1C1A17] flex items-center gap-2">
            <CheckCircle2 size={22} className="text-[#3E4A32]" />
            Validador de Regras de Negócio e Testes Sintéticos
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Testes automatizados das regras canônicas de representação B2B (descontos compostos, ciclos, documentos e cálculos).
          </p>
        </div>

        <button
          onClick={handleRerunTests}
          className="px-4 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-xs shrink-0"
          id="btn-rerun-tests"
        >
          <RefreshCw size={14} />
          <span>Reexecutar Testes</span>
        </button>
      </div>

      {/* Automated Suite Results */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-xs overflow-hidden">
        <div className="p-4 bg-[#F8F7F4] border-b border-[#E2DDD5] flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-stone-700">
            Bateria de Testes Unitários de Regras e Validações
          </span>
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-300">
            {suiteResults.filter(r => r.passed).length} / {suiteResults.length} Aprovados
          </span>
        </div>

        <div className="divide-y divide-[#E2DDD5]">
          {suiteResults.map((t, idx) => (
            <div key={idx} className="p-4 flex items-start gap-3 hover:bg-[#F8F7F4]/50 transition-colors">
              {t.passed ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <p className="font-semibold text-[#1C1A17]">{t.name}</p>
                {t.details && <p className="text-[11px] text-stone-500 mt-0.5">{t.details}</p>}
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  t.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {t.passed ? 'PASSOU' : 'FALHOU'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Verification Playgrounds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Compound Discount Calculator */}
        <div className="bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
            <Calculator size={17} className="text-[#3E4A32]" />
            <h3 className="font-bold text-xs text-[#1C1A17]">Descontos Sucessivos</h3>
          </div>
          <p className="text-[11px] text-stone-500">
            Regra: 10% + 5% não soma 15%. Fator: 0,90 × 0,95 = 0,855 (14,5% efetivo).
          </p>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-stone-600 block">Preço Base (R$)</label>
              <input
                type="number"
                value={basePrice}
                onChange={e => setBasePrice(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded p-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone-600 block">Descontos (separados por vírgula)</label>
              <input
                type="text"
                value={discounts}
                onChange={e => setDiscounts(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded p-1.5 text-xs font-mono"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#EDF1EA] border border-[#3E4A32]/20 space-y-1 mt-2">
              <div className="flex justify-between text-xs">
                <span>Preço Final:</span>
                <span className="font-bold text-[#3E4A32]">R$ {discountCalc.finalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Desconto Efetivo:</span>
                <span className="font-bold text-[#A78A63]">{discountCalc.effectiveDiscountRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reorder Cycle Calculator */}
        <div className="bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
            <Calendar size={17} className="text-[#3E4A32]" />
            <h3 className="font-bold text-xs text-[#1C1A17]">Ciclo de Recompra</h3>
          </div>
          <p className="text-[11px] text-stone-500">
            Regra: Último pedido aceito + ciclo configurado em dias.
          </p>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-stone-600 block">Data da Compra</label>
              <input
                type="date"
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded p-1.5 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-stone-600 block">Ciclo em Dias</label>
              <input
                type="number"
                value={cycleDays}
                onChange={e => setCycleDays(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded p-1.5 text-xs font-mono"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#EDF1EA] border border-[#3E4A32]/20 space-y-1 mt-2">
              <div className="flex justify-between text-xs">
                <span>Próxima Recompra:</span>
                <span className="font-bold text-[#3E4A32]">
                  {reorderCalc ? reorderCalc.split('-').reverse().join('/') : 'Sem histórico'}
                </span>
              </div>
              <p className="text-[10px] text-stone-500">
                01/09/2026 + 60 dias resulta em 31/10/2026.
              </p>
            </div>
          </div>
        </div>

        {/* Document Validator */}
        <div className="bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
            <FileText size={17} className="text-[#3E4A32]" />
            <h3 className="font-bold text-xs text-[#1C1A17]">Documento CNPJ / RUC</h3>
          </div>
          <p className="text-[11px] text-stone-500">
            Validação oficial: CNPJ numérico, alfanumérico RFB ou RUC internacional.
          </p>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-stone-600 block">Documento para Teste</label>
              <input
                type="text"
                value={docInput}
                onChange={e => setDocInput(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded p-1.5 text-xs font-mono"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#F8F7F4] border border-[#E2DDD5] space-y-1.5 mt-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span>CNPJ Brasil:</span>
                <span className={`font-bold ${cnpjCalc.valid ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {cnpjCalc.valid ? (cnpjCalc.isAlphanumeric ? 'Alfanumérico Válido' : 'Numérico Válido') : 'Inválido'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>RUC Paraguai:</span>
                <span className={`font-bold ${rucCalc.valid ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {rucCalc.valid ? 'RUC Válido' : 'Não compatível'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
