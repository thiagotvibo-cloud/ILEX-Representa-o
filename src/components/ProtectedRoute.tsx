import React from 'react';
import { useCRM } from '../lib/store';
import { UserRole, ROLE_DEFINITIONS } from '../types';
import { Lock, ShieldAlert, LogIn } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  checkPermission?: (role?: UserRole) => boolean;
  requiredModuleTitle?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  checkPermission,
  requiredModuleTitle = 'Módulo Restrito',
}) => {
  const { currentMember, user, isDemoMode, isConfigured } = useCRM();

  // 1. Session check: If in real mode and not authenticated
  if (!isDemoMode && isConfigured && !user) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 animate-fade-in text-center">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-8 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4">
            <LogIn size={26} />
          </div>
          <h2 className="text-xl font-bold text-[#26332D] mb-2">Autenticação Necessária</h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
            Para acessar <strong>{requiredModuleTitle}</strong> e consultar dados protegidos por RLS no Supabase, é obrigatório efetuar login com uma conta com associação de membro ativa.
          </p>
        </div>
      </div>
    );
  }

  const roleCode = currentMember?.role_code;

  // 2. Role and Permission Check
  let isAllowed = true;

  if (allowedRoles && roleCode) {
    isAllowed = allowedRoles.includes(roleCode);
  }

  if (checkPermission) {
    isAllowed = checkPermission(roleCode);
  }

  if (!isAllowed) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 animate-fade-in text-center">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-8 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-bold text-[#26332D] mb-2">Acesso Não Autorizado</h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
            O seu perfil de acesso não possui autorização para visualizar ou manipular o módulo <strong>{requiredModuleTitle}</strong>.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-100 border border-[#E5E9E5] text-xs text-stone-600">
            <span>Perfil Ativo:</span>
            <strong className="text-[#355C4D]">
              {roleCode ? ROLE_DEFINITIONS[roleCode]?.label : 'Não identificado'}
            </strong>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
