import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Calendar,
  Menu,
  Factory,
  DollarSign,
  Briefcase,
  Settings,
  X,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useCRM } from '../lib/store';
import { useTheme } from '../lib/theme';
import {
  canManageUsersAndSecurity,
  isRepresentadaUser,
  isAssociadoUser,
} from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export const BottomNav: React.FC = () => {
  const { currentMember } = useCRM();
  const { effectiveTheme, toggleTheme } = useTheme();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const roleCode = currentMember?.role_code;
  const isMaster = canManageUsersAndSecurity(roleCode);
  const isExternalRep = isRepresentadaUser(roleCode);
  const isAssoc = isAssociadoUser(roleCode);

  return (
    <>
      {/* Mobile Drawer when "Mais" is tapped */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-fade-in">
          <div className="bg-[#1C1A17] text-white rounded-t-2xl p-5 border-t border-[#355C4D]/40 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
              <span className="font-bold text-sm text-[#B69A67]">Mais Módulos ILEX</span>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400"
                aria-label="Fechar menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Theme Switch in mobile drawer */}
            <div className="mb-3 p-2.5 rounded-xl bg-[#233D33]/60 border border-[#355C4D]/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-300">Modo de Exibição</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#355C4D] hover:bg-[#2A473C] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {effectiveTheme === 'dark' ? (
                  <>
                    <Sun size={14} className="text-amber-400" />
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon size={14} className="text-indigo-300" />
                    <span>Modo Escuro</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {!isAssoc && (
                <NavLink
                  to="/fabricas"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#233D33] hover:bg-[#355C4D] border border-[#355C4D]/30 text-white"
                >
                  <Factory size={16} className="text-[#B69A67]" />
                  <span>Fábricas</span>
                </NavLink>
              )}

              <NavLink
                to="/comissoes"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#233D33] hover:bg-[#355C4D] border border-[#355C4D]/30 text-white"
              >
                <DollarSign size={16} className="text-[#B69A67]" />
                <span>Comissões</span>
              </NavLink>

              {!isExternalRep && !isAssoc && (
                <NavLink
                  to="/assessoria"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#233D33] hover:bg-[#355C4D] border border-[#355C4D]/30 text-white"
                >
                  <Briefcase size={16} className="text-[#B69A67]" />
                  <span>Assessoria</span>
                </NavLink>
              )}

              {isMaster && (
                <NavLink
                  to="/admin/usuarios"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#233D33] hover:bg-[#355C4D] border border-[#355C4D]/30 text-white"
                >
                  <ShieldCheck size={16} className="text-[#B69A67]" />
                  <span>Usuários & Equipe</span>
                </NavLink>
              )}

              {/* Accessible to ALL users */}
              <NavLink
                to="/configuracoes"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#233D33] hover:bg-[#355C4D] border border-[#355C4D]/30 text-white"
              >
                <Settings size={16} className="text-[#B69A67]" />
                <span>Configurações & Tema</span>
              </NavLink>
            </div>

            <div className="mt-3 pt-3 border-t border-stone-800">
              <PWAInstallButton variant="full" />
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1C1A17] border-t border-[#355C4D]/30 px-2 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] flex items-center justify-around md:hidden shadow-lg select-none">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-white'
            }`
          }
        >
          <LayoutDashboard size={18} className="text-[#B69A67]" />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/pedidos"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-white'
            }`
          }
        >
          <ShoppingCart size={18} className="text-[#B69A67]" />
          <span>Pedidos</span>
        </NavLink>

        <NavLink
          to="/clientes"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-white'
            }`
          }
        >
          <Users size={18} className="text-[#B69A67]" />
          <span>Clientes</span>
        </NavLink>

        {!isExternalRep && !isAssoc && (
          <NavLink
            to="/agenda"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-white'
              }`
            }
          >
            <Calendar size={18} className="text-[#B69A67]" />
            <span>Agenda</span>
          </NavLink>
        )}

        <button
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium text-stone-400 hover:text-white"
        >
          <Menu size={18} className="text-[#B69A67]" />
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
};
