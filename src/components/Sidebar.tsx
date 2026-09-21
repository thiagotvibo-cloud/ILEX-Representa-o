import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Factory,
  ShoppingCart,
  Calendar,
  DollarSign,
  Briefcase,
  Settings,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Lock,
} from 'lucide-react';
import { useCRM } from '../lib/store';
import { AuthModal } from '../features/auth/AuthModal';
import {
  ROLE_DEFINITIONS,
  canManageUsersAndSecurity,
  canManageCommercial,
  canViewCommissions,
  isRepresentadaUser,
  isAssociadoUser,
} from '../types';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggleCollapse }) => {
  const {
    currentMember,
    organization,
    user,
    signOut,
    isDemoMode,
    toggleDemoMode,
    isConfigured,
    isLoadingAuth,
    isLoadingData,
    dataError,
    authError,
  } = useCRM();

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const roleCode = currentMember?.role_code;
  const isMaster = canManageUsersAndSecurity(roleCode);
  const isExternalRep = isRepresentadaUser(roleCode);
  const isAssoc = isAssociadoUser(roleCode);

  // Build navigation items tailored strictly to the role
  const getNavItems = () => {
    if (isExternalRep) {
      return [
        { to: '/', label: 'Portal da Fábrica', icon: LayoutDashboard },
        { to: '/pedidos', label: 'Pedidos da Fábrica', icon: ShoppingCart },
        { to: '/clientes', label: 'Clientes Compradores', icon: Users },
        { to: '/comissoes', label: 'Comissões & Regras', icon: DollarSign },
      ];
    }

    if (isAssoc) {
      return [
        { to: '/', label: 'Minha Carteira', icon: LayoutDashboard },
        { to: '/pedidos', label: 'Histórico de Pedidos', icon: ShoppingCart },
        { to: '/fabricas', label: 'Catálogo de Fábricas', icon: Factory },
      ];
    }

    // Internal Roles
    const items = [
      { to: '/', label: 'Início & Indicadores', icon: LayoutDashboard },
      { to: '/clientes', label: 'Clientes & Contatos', icon: Users },
      { to: '/fabricas', label: 'Fábricas (Representadas)', icon: Factory },
      { to: '/pedidos', label: 'Pedidos & Faturamento', icon: ShoppingCart },
    ];

    if (canManageCommercial(roleCode)) {
      items.push({ to: '/agenda', label: 'Funil & Agenda', icon: Calendar });
    }

    if (canViewCommissions(roleCode)) {
      items.push({ to: '/comissoes', label: 'Comissões & Recebimento', icon: DollarSign });
    }

    if (roleCode === 'socio_admin_master' || roleCode === 'socio_admin' || roleCode === 'financeiro') {
      items.push({ to: '/assessoria', label: 'Assessoria & Planos', icon: Briefcase });
    }

    // Only socio_admin_master can access Users & Accesses and Database Settings
    if (isMaster) {
      items.push({ to: '/admin/usuarios', label: 'Admin: Usuários & Acessos', icon: ShieldCheck });
      items.push({ to: '/configuracoes', label: 'Supabase & Segurança', icon: Settings });
      items.push({ to: '/testes', label: 'Testes de Regras (QA)', icon: CheckCircle2 });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      <aside
        className={`bg-[#1C1A17] text-[#EBE8E1] flex flex-col h-screen border-r border-[#355C4D]/30 shrink-0 select-none transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#355C4D]/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#355C4D] flex items-center justify-center text-[#B69A67] font-bold text-base border border-[#B69A67]/30 shadow-xs shrink-0">
              IX
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-sm tracking-wider text-white truncate">ILEX CRM</h1>
                <p className="text-[9px] text-[#B69A67] uppercase tracking-widest font-semibold truncate">
                  {organization?.trade_name || 'Representações'}
                </p>
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Quick Action Button (only if not external read-only) */}
        {!collapsed && roleCode !== 'leitura' && roleCode !== 'representada_leitura' && (
          <div className="p-3">
            <NavLink
              to="/pedidos/novo"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-[#355C4D] hover:bg-[#233D33] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors border border-[#B69A67]/30"
              id="btn-novo-pedido-sidebar"
            >
              <Plus size={15} className="text-[#B69A67]" />
              <span>Novo Pedido / Orçamento</span>
            </NavLink>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-xs">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#355C4D] text-white font-semibold shadow-xs'
                      : 'text-stone-300 hover:bg-stone-800/70 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0 text-[#B69A67]" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Identity & Session Area (Strictly Individual - NO identity switcher) */}
        <div className="p-3 border-t border-[#355C4D]/30 bg-[#141311]">
          {isDemoMode ? (
            <div className="space-y-1.5">
              {!collapsed && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-[#B69A67] tracking-wider">
                    Modo Demonstração
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#355C4D] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#B69A67]/40">
                  {currentMember?.full_name ? currentMember.full_name[0].toUpperCase() : 'U'}
                </div>
                {!collapsed && (
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-semibold text-white truncate">{currentMember?.full_name}</p>
                    <p className="text-[10px] text-stone-400 truncate">
                      {roleCode ? ROLE_DEFINITIONS[roleCode]?.label : 'Membro'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : user && currentMember ? (
            <div className="space-y-1.5">
              {!collapsed && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    Supabase Ativo
                  </span>
                  <button
                    onClick={() => {
                      if (isDemoMode) toggleDemoMode(false);
                      signOut();
                    }}
                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    title="Encerrar sessão"
                  >
                    <LogOut size={11} />
                    Sair
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#355C4D] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#B69A67]/40">
                  {currentMember.full_name ? currentMember.full_name[0].toUpperCase() : 'U'}
                </div>
                {!collapsed && (
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs font-semibold text-white truncate">{currentMember.full_name}</p>
                    <p className="text-[10px] text-stone-400 truncate">
                      {roleCode ? ROLE_DEFINITIONS[roleCode]?.label : roleCode}
                    </p>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="mt-1 px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] flex items-center justify-between">
                  <span className="text-stone-500">Escopo:</span>
                  <span className="font-semibold text-stone-300 truncate max-w-[120px]">
                    {currentMember.scope_manufacturer_name || currentMember.scope_customer_name || 'Organização'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {!collapsed && (
                <p className="text-[10px] text-stone-400 leading-tight">
                  Sessão não iniciada.
                </p>
              )}
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full py-2 px-2 bg-[#355C4D] hover:bg-[#233D33] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-[#B69A67]/30"
                title="Entrar com conta Supabase"
              >
                <LogIn size={13} className="text-[#B69A67]" />
                {!collapsed && <span>Entrar</span>}
              </button>
            </div>
          )}
        </div>
      </aside>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};
