import React, { useState } from 'react';
import { Customer } from '../../types';
import { validateCNPJ, validateRUC, normalizeDocument } from '../../domain/validation';
import { X, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';

interface CustomerFormModalProps {
  initialCustomer?: Customer | null;
  onClose: () => void;
  onSave: (customerData: Partial<Customer>) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  initialCustomer,
  onClose,
  onSave,
}) => {
  const [country, setCountry] = useState(initialCustomer?.country || 'BRA');
  const [personType, setPersonType] = useState<'PJ' | 'PF'>(initialCustomer?.person_type || 'PJ');
  const [legalName, setLegalName] = useState(initialCustomer?.legal_name || '');
  const [tradeName, setTradeName] = useState(initialCustomer?.trade_name || '');
  const [docType, setDocType] = useState<'CNPJ' | 'CPF' | 'RUC' | 'OTHER'>(
    initialCustomer?.document_type || (country === 'PRY' ? 'RUC' : 'CNPJ')
  );
  const [document, setDocument] = useState(initialCustomer?.document || '');
  const [stateReg, setStateReg] = useState(initialCustomer?.state_registration || '');
  const [isIeExempt, setIsIeExempt] = useState(initialCustomer?.is_ie_exempt || false);
  const [taxpayerType, setTaxpayerType] = useState<'taxpayer' | 'exempt' | 'non_taxpayer'>(
    initialCustomer?.icms_taxpayer_type || 'taxpayer'
  );
  const [segment, setSegment] = useState(initialCustomer?.segment || '');
  const [companySize, setCompanySize] = useState(initialCustomer?.company_size || '');
  const [status, setStatus] = useState<'active' | 'incomplete' | 'inactive' | 'blocked'>(
    initialCustomer?.status || 'active'
  );
  const [notes, setNotes] = useState(initialCustomer?.notes || '');
  const [tagsInput, setTagsInput] = useState(initialCustomer?.tags?.join(', ') || '');

  // Validation state
  const [docFeedback, setDocFeedback] = useState<{
    tested: boolean;
    valid: boolean;
    message?: string;
  }>({ tested: false, valid: true });

  const validateCurrentDoc = (value: string) => {
    if (!value.trim()) {
      setDocFeedback({ tested: false, valid: true });
      return;
    }

    if (country === 'PRY' || docType === 'RUC') {
      const res = validateRUC(value);
      setDocFeedback({
        tested: true,
        valid: res.valid,
        message: res.valid ? 'Formato aceito (RUC Paraguaio)' : res.reason,
      });
    } else if (docType === 'CNPJ') {
      const res = validateCNPJ(value);
      setDocFeedback({
        tested: true,
        valid: res.valid,
        message: res.valid
          ? res.isAlphanumeric
            ? 'Formato aceito: CNPJ Alfanumérico (Padrão RFB)'
            : 'Formato aceito: CNPJ Numérico'
          : res.reason,
      });
    } else {
      setDocFeedback({ tested: true, valid: true, message: 'Documento informado' });
    }
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDocument(val);
    validateCurrentDoc(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!legalName.trim()) {
      alert('A Razão Social é obrigatória.');
      return;
    }

    // Process tags
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload: Partial<Customer> = {
      country,
      person_type: personType,
      legal_name: legalName.trim(),
      trade_name: tradeName.trim() || undefined,
      document_type: docType,
      document: document.trim() || undefined,
      document_normalized: normalizeDocument(document),
      state_registration: isIeExempt ? undefined : stateReg.trim() || undefined,
      is_ie_exempt: isIeExempt,
      icms_taxpayer_type: taxpayerType,
      segment: segment.trim() || undefined,
      company_size: companySize,
      status,
      tags,
      notes: notes.trim() || undefined,
      is_branch: false,
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E2DDD5] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-[#E2DDD5] bg-[#F8F7F4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-[#3E4A32]" />
            <h2 className="text-base font-bold text-[#1C1A17]">
              {initialCustomer ? 'Editar Cadastro de Cliente' : 'Novo Cliente / Lead Comercial'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Country & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">País do Cliente</label>
              <select
                value={country}
                onChange={e => {
                  const c = e.target.value;
                  setCountry(c);
                  if (c === 'PRY') {
                    setDocType('RUC');
                  } else {
                    setDocType('CNPJ');
                  }
                }}
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              >
                <option value="BRA">Brasil (BRA)</option>
                <option value="PRY">Paraguai (PRY - Mercosul)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Tipo de Pessoa</label>
              <select
                value={personType}
                onChange={e => setPersonType(e.target.value as 'PJ' | 'PF')}
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              >
                <option value="PJ">Pessoa Jurídica (PJ)</option>
                <option value="PF">Pessoa Física (PF)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Situação do Cadastro</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              >
                <option value="active">Ativo / Regular</option>
                <option value="incomplete">Cadastro Incompleto</option>
                <option value="inactive">Inativo</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Razão Social (Nome Legal) *
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="Ex: Comercial Paranaense Ltda"
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                placeholder="Ex: Paranaense Distribuição"
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              />
            </div>
          </div>

          {/* Document & Validation */}
          <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E2DDD5] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#1C1A17]">
                Documento Fiscal ({docType})
              </label>
              <span className="text-[10px] text-stone-500">
                {country === 'BRA'
                  ? 'Suporta CNPJ Numérico ou Alfanumérico oficial da Receita Federal'
                  : 'RUC Paraguaio (formato internacional preservado)'}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={document}
                onChange={handleDocChange}
                placeholder={
                  country === 'PRY'
                    ? 'Ex: 80012345-6'
                    : 'Ex: 11.222.333/0001-81 ou 12ABC345000199'
                }
                className={`flex-1 bg-white border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                  docFeedback.tested
                    ? docFeedback.valid
                      ? 'border-emerald-500 ring-1 ring-emerald-400'
                      : 'border-rose-400 ring-1 ring-rose-300'
                    : 'border-[#E2DDD5] focus:border-[#3E4A32]'
                }`}
              />
            </div>

            {docFeedback.tested && (
              <div
                className={`flex items-center gap-1.5 text-[11px] font-medium mt-1 ${
                  docFeedback.valid ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {docFeedback.valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{docFeedback.message}</span>
              </div>
            )}
          </div>

          {/* State Registration & ICMS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-stone-700">Inscrição Estadual (IE)</label>
                <label className="flex items-center gap-1 text-[10px] text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIeExempt}
                    onChange={e => setIsIeExempt(e.target.checked)}
                    className="rounded text-[#3E4A32]"
                  />
                  <span>Isento de IE</span>
                </label>
              </div>
              <input
                type="text"
                disabled={isIeExempt}
                value={isIeExempt ? 'ISENTO' : stateReg}
                onChange={e => setStateReg(e.target.value)}
                placeholder="Ex: 90123456-78"
                className="w-full bg-white disabled:bg-stone-100 border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Condição de Contribuinte ICMS
              </label>
              <select
                value={taxpayerType}
                onChange={e => setTaxpayerType(e.target.value as any)}
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              >
                <option value="taxpayer">Contribuinte ICMS</option>
                <option value="exempt">Isento de ICMS</option>
                <option value="non_taxpayer">Não Contribuinte</option>
              </select>
            </div>
          </div>

          {/* Segment & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Segmento (Opcional)</label>
              <input
                type="text"
                value={segment}
                onChange={e => setSegment(e.target.value)}
                placeholder="Ex: Atacadista, Revenda (se conhecido)"
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Porte (Opcional)</label>
              <input
                type="text"
                value={companySize}
                onChange={e => setCompanySize(e.target.value)}
                placeholder="Ex: Médio, Grande (se conhecido)"
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="Ex: Comprador Betel, Curva A"
                className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-stone-700 block mb-1">Observações Comerciais</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Informações relevantes sobre contato, preferências ou histórico..."
              className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E2DDD5] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Salvar Cadastro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
