import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import { Manufacturer, CommissionTrigger } from '../../types';
import {
  Factory,
  Plus,
  Edit2,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export const ManufacturersView: React.FC = () => {
  const {
    manufacturers,
    addManufacturer,
    updateManufacturer,
    isLoadingData,
    dataError,
    refreshData,
    isDemoMode,
    isConfigured,
    user,
  } = useCRM();

  const [editingMfr, setEditingMfr] = useState<Manufacturer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [ratePercent, setRatePercent] = useState('5');
  const [trigger, setTrigger] = useState<CommissionTrigger>('billing');
  const [triggerDesc, setTriggerDesc] = useState('');
  const [cutoffDay, setCutoffDay] = useState('25');
  const [status, setStatus] = useState<'active' | 'planned'>('active');

  const openEdit = (mfr: Manufacturer) => {
    setActionError(null);
    setEditingMfr(mfr);
    setName(mfr.name);
    setCode(mfr.code);
    setRatePercent((mfr.initial_commission_rate * 100).toString());
    setTrigger(mfr.commission_trigger);
    setTriggerDesc(mfr.commission_trigger_description || '');
    setCutoffDay(mfr.order_cutoff_day?.toString() || '25');
    setStatus(mfr.status as any);
  };

  const openCreate = () => {
    setActionError(null);
    setEditingMfr(null);
    setName('');
    setCode('');
    setRatePercent('5');
    setTrigger('billing');
    setTriggerDesc('Comissão vinculada ao faturamento da fábrica.');
    setCutoffDay('25');
    setStatus('active');
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSaving(true);
    const rate = parseFloat(ratePercent) / 100 || 0;
    const cutoff = parseInt(cutoffDay, 10) || 25;

    try {
      if (editingMfr) {
        await updateManufacturer(editingMfr.id, {
          name: name.trim(),
          code: code.toUpperCase().trim(),
          initial_commission_rate: rate,
          commission_trigger: trigger,
          commission_trigger_description: triggerDesc.trim(),
          order_cutoff_day: cutoff,
          status,
        });
        setEditingMfr(null);
      } else {
        await addManufacturer({
          name: name.trim(),
          code: code.toUpperCase().trim(),
          initial_commission_rate: rate,
          commission_trigger: trigger,
          commission_trigger_description: triggerDesc.trim(),
          order_cutoff_day: cutoff,
          status,
          currency: 'BRL',
          is_active: true,
        });
        setIsCreating(false);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Falha ao salvar fábrica.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 font-bold hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Database or RLS Error Banner */}
      {dataError && !isDemoMode && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold block">Falha de Consulta no Supabase:</span>
              <span className="text-rose-700 font-mono text-[11px]">{dataError}</span>
            </div>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-3 py-1.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 text-xs shrink-0 self-start sm:self-auto"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Awaiting Login State Notice */}
      {!isDemoMode && isConfigured && !user && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <p>
            Modo real Supabase ativado. Acesse com seu e-mail e senha no menu lateral para visualizar e cadastrar representadas.
          </p>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#1C1A17] flex items-center gap-2">
            <Factory size={22} className="text-[#3E4A32]" />
            Fábricas &amp; Representadas
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Parametrização contratual, gatilhos de direito à comissão e prazos de repasse.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
          id="btn-nova-fabrica"
        >
          <Plus size={16} className="text-[#A78A63]" />
          <span>Cadastrar Fábrica</span>
        </button>
      </div>

      {/* Rules Overview Callout */}
      <div className="bg-[#EDF1EA] p-4 rounded-xl border border-[#3E4A32]/20 text-xs text-[#1C1A17] space-y-1">
        <div className="font-bold flex items-center gap-1.5 text-[#3E4A32]">
          <CheckCircle2 size={16} className="text-[#A78A63]" />
          Regra de Negócio: Distinção entre Gatilho de Direito e Depósito Bancário
        </div>
        <p className="text-stone-700 leading-relaxed">
          O gatilho de comissão da <strong>Torralf</strong> é integral no <em>faturamento</em>,
          independente do parcelamento do comprador. Na <strong>Betel</strong>, a comissão é proporcional
          ao <em>recebimento efetivo</em> das parcelas pela fábrica. O depósito bancário à ILEX só é realizado após
          o fechamento e conciliação financeira da indústria.
        </p>
      </div>

      {/* Cards Grid */}
      {isLoadingData ? (
        <div className="p-12 text-center text-stone-500 bg-white rounded-xl border border-[#E2DDD5]">
          <div className="w-8 h-8 border-3 border-[#3E4A32] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-semibold text-sm">Consultando fábricas no Supabase...</p>
          <p className="text-xs text-stone-400 mt-1">Carregando dados com RLS ativo.</p>
        </div>
      ) : manufacturers.length === 0 ? (
        <div className="p-12 text-center text-stone-500 bg-white rounded-xl border border-[#E2DDD5]">
          <Factory size={32} className="mx-auto mb-2 text-stone-400" />
          <p className="font-semibold text-sm">Nenhuma fábrica cadastrada</p>
          <p className="text-xs text-stone-400 mt-1">
            {!isDemoMode && isConfigured && !user
              ? 'Faça login para carregar as fábricas da sua organização.'
              : 'Clique em "Cadastrar Fábrica" para adicionar uma representada.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {manufacturers.map(mfr => {
          const isTorralf = mfr.code === 'TORRALF';
          const isBetel = mfr.code === 'BETEL';

          return (
            <div
              key={mfr.id}
              className="bg-white rounded-xl border border-[#E2DDD5] shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-[#3E4A32]/50 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-[#1C1A17]">{mfr.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-100 font-mono text-stone-600 font-semibold">
                        {mfr.code}
                      </span>
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        mfr.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {mfr.status === 'active' ? 'Representada Ativa' : 'Fábrica Planejada'}
                    </span>
                  </div>

                  <button
                    onClick={() => openEdit(mfr)}
                    className="p-1.5 text-stone-500 hover:text-[#3E4A32] hover:bg-[#F8F7F4] rounded-lg transition-colors"
                    title="Editar regras da fábrica"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-[#F8F7F4] border border-[#E2DDD5]">
                    <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                      Gatilho de Direito à Comissão
                    </span>
                    <p className="font-bold text-xs text-[#3E4A32] mt-0.5">
                      {mfr.commission_trigger === 'billing'
                        ? 'Vinculado ao Faturamento (Nota Emitida)'
                        : mfr.commission_trigger === 'receipt'
                        ? 'Proporcional ao Recebimento Efetivo da Fábrica'
                        : 'A Definir em Contrato'}
                    </p>
                    <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                      {mfr.commission_trigger_description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#F8F7F4] border border-[#E2DDD5]">
                      <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                        Taxa Base
                      </span>
                      <span className="text-sm font-bold text-[#1C1A17]">
                        {mfr.status === 'active'
                          ? `${(mfr.initial_commission_rate * 100).toFixed(0)}% da base`
                          : 'Pendente'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#F8F7F4] border border-[#E2DDD5]">
                      <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                        Dia de Fechamento
                      </span>
                      <span className="text-sm font-bold text-[#1C1A17]">
                        Dia {mfr.order_cutoff_day || 25} de cada mês
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2DDD5] flex items-center justify-between text-xs text-stone-500">
                <span>Moeda: {mfr.currency}</span>
                <span className="text-[11px] font-medium text-[#3E4A32]">
                  {isTorralf && 'Tambasa não vinculada'}
                  {isBetel && 'Tambasa compradora confirmada'}
                  {!isTorralf && !isBetel && 'Sem clientes vinculados'}
                </span>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {(isCreating || editingMfr) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2DDD5] space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD5]">
              <h2 className="font-bold text-base text-[#1C1A17]">
                {editingMfr ? `Configurar ${editingMfr.name}` : 'Cadastrar Nova Fábrica'}
              </h2>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingMfr(null);
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">Razão Social da Fábrica *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Código / Sigla *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Ex: TORRALF"
                    className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Situação</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
                  >
                    <option value="active">Ativa (Vigente)</option>
                    <option value="planned">Planejada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Comissão Base (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ratePercent}
                    onChange={e => setRatePercent(e.target.value)}
                    className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">Gatilho de Direito</label>
                  <select
                    value={trigger}
                    onChange={e => setTrigger(e.target.value as any)}
                    className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
                  >
                    <option value="billing">Faturamento (Ex: Torralf)</option>
                    <option value="receipt">Recebimento Efetivo (Ex: Betel)</option>
                    <option value="contract">Pendente / Contrato</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Descrição Exata do Gatilho Contratual
                </label>
                <textarea
                  rows={2}
                  value={triggerDesc}
                  onChange={e => setTriggerDesc(e.target.value)}
                  className="w-full bg-white border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2DDD5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingMfr(null);
                  }}
                  className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#3E4A32] text-white rounded-lg text-xs font-semibold"
                >
                  Salvar Fábrica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
