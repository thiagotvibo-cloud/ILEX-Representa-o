import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import { isRepresentadaUser, isAssociadoUser } from '../../types';
import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import { RepresentadaDashboardView } from './RepresentadaDashboardView';
import { AssociadoDashboardView } from './AssociadoDashboardView';
import { AuthModal } from '../auth/AuthModal';
import {
  AlertCircle,
  LogIn,
  Play,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  ShieldCheck,
  Building2,
  Lock,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    currentMember,
    isDemoMode,
    isConfigured,
    user,
    dataError,
    refreshData,
    toggleDemoMode,
  } = useCRM();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const roleCode = currentMember?.role_code;

  // Real Mode without active session or membership: show zero / empty state
  if (!isDemoMode && (!user || !currentMember)) {
    return (
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
        {/* Supabase Error Banner if any */}
        {dataError && (
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E9E5] pb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
              Painel Executivo Comercial
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Indicadores consolidados, pedidos e comissões de representação industrial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuthModalOpen(true)}
              id="btn-login-dashboard-empty"
              className="flex items-center gap-2 px-4 py-2 bg-[#355C4D] hover:bg-[#233D33] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <LogIn size={15} className="text-[#B69A67]" />
              <span>Entrar com Credenciais</span>
            </button>
            <button
              onClick={() => toggleDemoMode(true)}
              id="btn-demo-dashboard-empty"
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#E5E9E5] hover:bg-stone-50 text-stone-700 font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Play size={13} className="text-amber-600 fill-amber-600" />
              <span>Modo Demonstração</span>
            </button>
          </div>
        </div>

        {/* Prominent Authentication Notice */}
        <div
          id="login-required-notice"
          className="bg-white border-2 border-amber-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                <Lock size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                    Modo Real Supabase
                  </span>
                  <span className="text-xs text-amber-800 font-semibold">Sessão Não Iniciada</span>
                </div>
                <h2 className="text-base font-bold text-[#26332D]">
                  Faça login para consultar dados reais
                </h2>
                <p className="text-xs text-stone-600 mt-1 max-w-2xl leading-relaxed">
                  Para preservar a integridade das informações comerciais e a conformidade com as regras de auditoria,
                  o sistema não exibe valores, pedidos ou produtos fictícios. Faça login com sua conta para carregar
                  os faturamentos e clientes reais da sua organização no Supabase, ou ative o modo demonstração para testar as telas locais.
                </p>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#355C4D] hover:bg-[#233D33] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <LogIn size={15} className="text-[#B69A67]" />
                <span>Fazer Login</span>
              </button>
              <button
                onClick={() => toggleDemoMode(true)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl transition-colors"
              >
                <span>Ativar Demonstração</span>
              </button>
            </div>
          </div>
        </div>

        {/* Authentic Zero-State KPI Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Volume de Vendas</span>
              <DollarSign size={16} className="text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-[#26332D]">R$ 0,00</div>
            <p className="text-[11px] text-stone-400 mt-1">0 pedido(s) faturado(s)</p>
          </div>

          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Receita em Comissões</span>
              <TrendingUp size={16} className="text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-[#26332D]">R$ 0,00</div>
            <p className="text-[11px] text-stone-400 mt-1">Margem média 0,0%</p>
          </div>

          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Pedidos em Carteira</span>
              <Package size={16} className="text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-[#26332D]">0</div>
            <p className="text-[11px] text-stone-400 mt-1">Nenhum pedido aberto</p>
          </div>

          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 mb-2">
              <span className="text-xs font-semibold">Clientes Ativos</span>
              <Users size={16} className="text-stone-400" />
            </div>
            <div className="text-2xl font-bold text-[#26332D]">0</div>
            <p className="text-[11px] text-stone-400 mt-1">0 em ciclo de recompra</p>
          </div>
        </div>

        {/* Empty Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders Empty State */}
          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9E5] pb-3">
              <h3 className="text-sm font-bold text-[#26332D]">Pedidos Recentes</h3>
              <span className="text-[11px] text-stone-400 font-semibold">0 pedidos</span>
            </div>
            <div className="py-12 text-center text-xs text-stone-400 space-y-2">
              <Package size={28} className="mx-auto text-stone-300" />
              <p className="font-semibold text-stone-600">Nenhum pedido localizado.</p>
              <p className="text-stone-400">Faça login para consultar os dados reais da sua organização.</p>
            </div>
          </div>

          {/* Top Products Empty State */}
          <div className="bg-white border border-[#E5E9E5] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9E5] pb-3">
              <h3 className="text-sm font-bold text-[#26332D]">Top Produtos Faturados</h3>
              <span className="text-[11px] text-stone-400 font-semibold">0 produtos</span>
            </div>
            <div className="py-12 text-center text-xs text-stone-400 space-y-2">
              <TrendingUp size={28} className="mx-auto text-stone-300" />
              <p className="font-semibold text-stone-600">Nenhum produto faturado.</p>
              <p className="text-stone-400">Os itens faturados serão consolidados a partir do banco de dados.</p>
            </div>
          </div>
        </div>

        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  // Active Session or Explicit Demo Mode: Dispatch to specialized views
  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Role-based Dashboard Dispatcher */}
      {isRepresentadaUser(roleCode) ? (
        <RepresentadaDashboardView />
      ) : isAssociadoUser(roleCode) ? (
        <AssociadoDashboardView />
      ) : (
        <ExecutiveDashboardView />
      )}
    </div>
  );
};

