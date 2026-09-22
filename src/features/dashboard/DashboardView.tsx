import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import { isRepresentadaUser, isAssociadoUser } from '../../types';
import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import { RepresentadaDashboardView } from './RepresentadaDashboardView';
import { AssociadoDashboardView } from './AssociadoDashboardView';
import { AlertCircle } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { currentMember, dataError, refreshData } = useCRM();
  const roleCode = currentMember?.role_code;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Supabase Error Banner if any */}
      {dataError && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold block">Alerta de Sincronização:</span>
              <span className="text-rose-700 font-mono text-[11px]">{dataError}</span>
            </div>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-3 py-1.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 text-xs shrink-0 self-start sm:self-auto cursor-pointer"
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
