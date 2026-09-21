import React, { useState, useMemo } from 'react';
import { useCRM } from '../../lib/store';
import { Customer } from '../../types';
import { CustomerDetailModal } from './CustomerDetailModal';
import { CustomerFormModal } from './CustomerFormModal';
import {
  Users,
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Building2,
  Globe,
  Tag,
  AlertCircle,
  FileText,
  MapPin,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    isLoadingData,
    isLoadingAuth,
    dataError,
    refreshData,
    isConfigured,
    isDemoMode,
    user,
    organization,
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'incomplete' | 'inactive'>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | 'BRA' | 'PRY'>('all');

  // Modal states
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch =
        c.legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.document && c.document.includes(searchQuery)) ||
        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCountry = countryFilter === 'all' || c.country === countryFilter;

      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [customers, searchQuery, statusFilter, countryFilter]);

  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    setActionError(null);
    setIsSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, customerData);
        if (viewingCustomer && viewingCustomer.id === editingCustomer.id) {
          setViewingCustomer(prev => (prev ? { ...prev, ...customerData } : null));
        }
        setEditingCustomer(null);
      } else {
        const created = await addCustomer(customerData as any);
        setIsCreating(false);
        setViewingCustomer(created);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Falha ao salvar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (confirm(`Deseja inativar o cliente ${cust.legal_name}?`)) {
      setActionError(null);
      try {
        await deleteCustomer(cust.id);
        if (viewingCustomer && viewingCustomer.id === cust.id) {
          setViewingCustomer(null);
        }
      } catch (err: any) {
        setActionError(err?.message || 'Falha ao inativar cliente.');
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
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

      {/* Database or RLS Error Banner (Never silently fallback to demo!) */}
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
            Modo real Supabase ativado. Para consultar ou cadastrar clientes respeitando as regras RLS do PostgreSQL, acesse com seu e-mail e senha no menu lateral.
          </p>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#1C1A17] flex items-center gap-2">
            <Users size={22} className="text-[#3E4A32]" />
            Carteira de Clientes
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Cadastro comercial e fiscal estruturado. Suporte a CNPJ numérico, CNPJ alfanumérico e RUC paraguaio.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
          id="btn-novo-cliente"
        >
          <Plus size={16} className="text-[#A78A63]" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-[#E2DDD5] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por razão social, fantasia, CNPJ/RUC ou tag..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8F7F4] border border-[#E2DDD5] rounded-lg text-xs focus:outline-none focus:border-[#3E4A32]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#F8F7F4] px-2.5 py-1.5 rounded-lg border border-[#E2DDD5]">
            <Filter size={13} className="text-stone-500" />
            <span className="text-stone-500 font-medium">Situação:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-[#1C1A17] focus:outline-none"
            >
              <option value="all">Todas ({customers.length})</option>
              <option value="active">Ativos</option>
              <option value="incomplete">Incompletos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8F7F4] px-2.5 py-1.5 rounded-lg border border-[#E2DDD5]">
            <Globe size={13} className="text-stone-500" />
            <span className="text-stone-500 font-medium">País:</span>
            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-[#1C1A17] focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="BRA">Brasil (BRA)</option>
              <option value="PRY">Paraguai (PRY)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List: Table on Desktop, Cards on Mobile */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-xs overflow-hidden">
        {isLoadingData ? (
          <div className="p-12 text-center text-stone-500">
            <div className="w-8 h-8 border-3 border-[#3E4A32] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-semibold text-sm">Consultando banco de dados...</p>
            <p className="text-xs text-stone-400 mt-1">Carregando carteira de clientes com RLS ativo.</p>
          </div>
        ) : !isDemoMode && isConfigured && !user ? (
          <div className="p-12 text-center text-stone-500">
            <Users size={32} className="mx-auto mb-2 text-stone-400" />
            <p className="font-semibold text-sm">Sessão Supabase Necessária</p>
            <p className="text-xs text-stone-400 mt-1">
              Faça login no menu lateral para carregar a lista de clientes da sua organização.
            </p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <Users size={32} className="mx-auto mb-2 text-stone-400" />
            <p className="font-semibold text-sm">Nenhum cliente encontrado</p>
            <p className="text-xs text-stone-400 mt-1">Ajuste os filtros ou cadastre uma nova empresa.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1C1A17]">
                <thead className="bg-[#F8F7F4] border-b border-[#E2DDD5] text-[11px] uppercase font-semibold text-stone-600">
                  <tr>
                    <th className="py-3 px-4">Cliente / Razão Social</th>
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">País / UF</th>
                    <th className="py-3 px-4">Segmento / Tags</th>
                    <th className="py-3 px-4">Situação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD5]">
                  {filteredCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-[#F8F7F4]/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1C1A17]">{cust.legal_name}</div>
                        {cust.trade_name && (
                          <div className="text-[11px] text-stone-500">{cust.trade_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-700">
                        {cust.document || <span className="text-stone-400 italic">Pendente</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-stone-100 font-semibold text-[10px]">
                          {cust.country === 'BRA' ? 'Brasil' : cust.country}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {cust.segment && (
                            <span className="px-1.5 py-0.5 bg-[#EDF1EA] text-[#3E4A32] rounded text-[10px] font-medium">
                              {cust.segment}
                            </span>
                          )}
                          {cust.tags.map((tag, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cust.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cust.status === 'incomplete'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {cust.status === 'incomplete' ? 'Cadastro Incompleto' : cust.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingCustomer(cust)}
                            className="p-1.5 text-[#3E4A32] hover:bg-[#EDF1EA] rounded transition-colors"
                            title="Ver 7 seções completas"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setEditingCustomer(cust)}
                            className="p-1.5 text-stone-600 hover:bg-stone-200 rounded transition-colors"
                            title="Editar cadastro"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(cust)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Inativar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-[#E2DDD5]">
              {filteredCustomers.map(cust => (
                <div key={cust.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#1C1A17]">{cust.legal_name}</h3>
                      {cust.trade_name && (
                        <p className="text-xs text-stone-500">{cust.trade_name}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cust.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : cust.status === 'incomplete'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {cust.status === 'incomplete' ? 'Incompleto' : cust.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-600">
                    <span className="font-mono">
                      {cust.document || 'Documento pendente'}
                    </span>
                    <span>•</span>
                    <span>{cust.country === 'BRA' ? 'Brasil' : cust.country}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-wrap gap-1">
                      {cust.tags.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingCustomer(cust)}
                        className="px-2.5 py-1 bg-[#3E4A32] text-white text-xs font-semibold rounded"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => setEditingCustomer(cust)}
                        className="p-1 text-stone-600 hover:bg-stone-100 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(cust)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Inativar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Customer Details Modal (7 sections) */}
      {viewingCustomer && (
        <CustomerDetailModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onEdit={() => {
            setEditingCustomer(viewingCustomer);
            setViewingCustomer(null);
          }}
          onUpdate={async updates => {
            try {
              await updateCustomer(viewingCustomer.id, updates);
              setViewingCustomer(prev => (prev ? { ...prev, ...updates } : null));
            } catch (err: any) {
              setActionError(err?.message || 'Falha ao atualizar dados do cliente.');
            }
          }}
        />
      )}

      {/* Customer Form Modal (Create / Edit) */}
      {(isCreating || editingCustomer) && (
        <CustomerFormModal
          initialCustomer={editingCustomer}
          onClose={() => {
            setIsCreating(false);
            setEditingCustomer(null);
          }}
          onSave={handleSaveCustomer}
        />
      )}
    </div>
  );
};
