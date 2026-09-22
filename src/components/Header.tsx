import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCRM } from '../lib/store';
import {
  Search,
  Bell,
  Plus,
  ShieldCheck,
  Building2,
  Factory,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogIn,
  LogOut,
  X,
  Package,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthModal } from '../features/auth/AuthModal';
import { PWAInstallButton } from './PWAInstallButton';
import {
  ROLE_DEFINITIONS,
  isRepresentadaUser,
  isAssociadoUser,
  canWriteData,
} from '../types';

export const Header: React.FC = () => {
  const {
    organization,
    currentMember,
    user,
    orders,
    customers,
    manufacturers,
    signOut,
    isDemoMode,
    toggleDemoMode,
    isConfigured,
    dataError,
    authError,
  } = useCRM();

  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const roleCode = currentMember?.role_code;
  const isExternalRep = isRepresentadaUser(roleCode);
  const isAssoc = isAssociadoUser(roleCode);
  const canCreate = canWriteData(roleCode);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      return { customers: [], orders: [], manufacturers: [] };
    }
    const q = searchQuery.toLowerCase();
    const matchedCust = customers
      .filter(c => c.legal_name.toLowerCase().includes(q) || (c.trade_name && c.trade_name.toLowerCase().includes(q)))
      .slice(0, 4);

    const matchedOrders = orders
      .filter(o => o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q))
      .slice(0, 4);

    const matchedMfrs = manufacturers
      .filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q))
      .slice(0, 3);

    return { customers: matchedCust, orders: matchedOrders, manufacturers: matchedMfrs };
  }, [searchQuery, customers, orders, manufacturers]);

  // Real operational notifications based on CRM data
  const notifications = useMemo(() => {
    const list: { id: string; title: string; desc: string; type: 'warning' | 'info' | 'success'; date: string }[] = [];

    // Check repurchase alerts
    const repurchases = customers.filter(c =>
      c.manufacturer_links?.some(ml => {
        if (!ml.next_expected_reorder_date) return false;
        const diff = Math.ceil((new Date(ml.next_expected_reorder_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff >= -15 && diff <= 15;
      })
    );

    if (repurchases.length > 0) {
      list.push({
        id: 'notif-reorder',
        title: `${repurchases.length} clientes com ciclo de recompra previsto`,
        desc: 'Recompras estimadas nos próximos 15 dias baseadas no histórico industrial.',
        type: 'warning',
        date: 'Hoje',
      });
    }

    // Check submitted orders awaiting invoice
    const submittedOrders = orders.filter(o => o.status === 'submitted');
    if (submittedOrders.length > 0) {
      list.push({
        id: 'notif-submitted',
        title: `${submittedOrders.length} pedido(s) submetido(s) aguardando faturamento`,
        desc: 'Acompanhe a emissão de nota fiscal junto aos departamentos das indústrias.',
        type: 'info',
        date: 'Em aberto',
      });
    }

    return list;
  }, [customers, orders]);

  return (
    <>
      <header className="bg-white border-b border-[#E5E9E5] px-4 md:px-8 py-3 shrink-0 select-none">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Organization & Profile Context */}
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/assets/logo-06-verde.svg"
              alt="Logotipo ILEX"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-[#26332D] truncate">
                  {organization?.trade_name || organization?.name || 'ILEX Representações'}
                </h2>

                {/* Scoped Entity Badge if External */}
                {isExternalRep && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Factory size={12} />
                    {currentMember?.scope_manufacturer_name || 'Fábrica Representada'}
                  </span>
                )}

                {isAssoc && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Building2 size={12} />
                    {currentMember?.scope_customer_name || 'Carteira Associada'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                <span className="font-semibold text-[#355C4D]">
                  {roleCode && ROLE_DEFINITIONS[roleCode]
                    ? ROLE_DEFINITIONS[roleCode].label
                    : 'Administrador Master'}
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-emerald-700 font-medium flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">
                    {currentMember?.full_name || user?.email || currentMember?.email || 'Sessão Autenticada'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Global Quick Search */}
          <div className="hidden md:flex flex-1 max-w-md relative" ref={searchRef}>
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar clientes, pedidos, fábricas..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] text-xs text-[#26332D] placeholder-stone-400 focus:outline-none focus:border-[#355C4D] focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Search Dropdown Results */}
            {isSearchOpen && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#E5E9E5] rounded-xl shadow-lg p-3 z-50 text-xs max-h-80 overflow-y-auto space-y-3">
                {searchResults.customers.length === 0 && searchResults.orders.length === 0 && searchResults.manufacturers.length === 0 ? (
                  <div className="p-3 text-center text-stone-400">
                    Nenhum resultado encontrado para &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <>
                    {searchResults.customers.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                          Clientes
                        </span>
                        <div className="space-y-1">
                          {searchResults.customers.map(c => (
                            <Link
                              key={c.id}
                              to="/clientes"
                              onClick={() => setIsSearchOpen(false)}
                              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                            >
                              <span className="font-semibold text-[#26332D]">{c.trade_name || c.legal_name}</span>
                              <span className="text-[10px] text-stone-400">{c.segment}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.orders.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                          Pedidos
                        </span>
                        <div className="space-y-1">
                          {searchResults.orders.map(o => (
                            <Link
                              key={o.id}
                              to="/pedidos"
                              onClick={() => setIsSearchOpen(false)}
                              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                            >
                              <span className="font-semibold text-[#26332D]">{o.order_number} • {o.customer_name}</span>
                              <span className="text-[10px] font-bold text-[#355C4D]">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.total_amount)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.manufacturers.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                          Fábricas
                        </span>
                        <div className="space-y-1">
                          {searchResults.manufacturers.map(m => (
                            <Link
                              key={m.id}
                              to="/fabricas"
                              onClick={() => setIsSearchOpen(false)}
                              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                            >
                              <span className="font-semibold text-[#26332D]">{m.name}</span>
                              <span className="text-[10px] text-stone-400 font-mono">{m.code}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Notifications & Session */}
          <div className="flex items-center gap-2.5">
            {/* PWA Direct Install Button for Chrome / Mobile */}
            <PWAInstallButton variant="compact" />

            {/* Operational Notifications Popover */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 rounded-xl text-stone-600 hover:text-[#26332D] hover:bg-stone-100 transition-colors relative"
                title="Notificações operacionais"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E9E5] rounded-2xl shadow-xl p-4 z-50 text-xs animate-fade-in space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E9E5] pb-2">
                    <span className="font-bold text-[#26332D]">Alertas Operacionais</span>
                    <span className="text-[10px] text-stone-500">{notifications.length} ativo(s)</span>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-stone-400 text-xs">
                      Nenhum alerta operacional pendente.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map(n => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-stone-50 border border-[#E5E9E5]/60">
                          <div className="flex items-start gap-2">
                            <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-[#26332D] text-xs">{n.title}</p>
                              <p className="text-[11px] text-stone-500 mt-0.5">{n.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action: New Order */}
            {canCreate && (
              <button
                onClick={() => navigate('/pedidos/novo')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-[#355C4D] hover:bg-[#233D33] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                id="btn-novo-pedido-header"
              >
                <Plus size={15} className="text-[#B69A67]" />
                <span>Novo Pedido</span>
              </button>
            )}

            {/* Auth / Logout Button */}
            {user || currentMember ? (
              <button
                onClick={async () => {
                  if (isDemoMode) toggleDemoMode(false);
                  await signOut();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
                title="Sair do sistema"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            ) : !isDemoMode && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#355C4D] text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-[#233D33] transition-colors"
              >
                <LogIn size={14} />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};
