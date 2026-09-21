import React from 'react';
import { useCRM } from '../lib/store';
import { AlertTriangle, LogOut } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { isDemoMode, toggleDemoMode } = useCRM();

  if (!isDemoMode) return null;

  return (
    <div
      id="banner-demonstracao"
      className="bg-amber-500 text-stone-950 px-4 py-2 text-xs font-medium flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs shrink-0 z-40 border-b border-amber-600 select-none"
    >
      <div className="flex items-center gap-2 text-center sm:text-left">
        <span className="inline-flex items-center gap-1 bg-stone-950 text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
          <AlertTriangle size={12} className="text-amber-400" />
          DEMONSTRAÇÃO
        </span>
        <span className="font-semibold text-stone-900">
          Modo Demonstração Ativo — Dados locais isolados. Sem comunicação com a base real do Supabase.
        </span>
      </div>

      <button
        onClick={() => toggleDemoMode(false)}
        id="btn-sair-modo-demo"
        className="flex items-center gap-1 px-3 py-1 bg-stone-950 hover:bg-stone-800 text-amber-300 rounded-lg text-xs font-bold transition-colors shrink-0"
      >
        <LogOut size={13} />
        <span>Sair da Demonstração</span>
      </button>
    </div>
  );
};
