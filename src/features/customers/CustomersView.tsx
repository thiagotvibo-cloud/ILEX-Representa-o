import React, { useState, useMemo, useEffect } from 'react';
import { useCRM, sortAlphabetically } from '../../lib/store';
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
  FileSpreadsheet,
  CheckCircle2,
  CheckSquare,
  Square,
  MinusSquare,
  Power,
  PowerOff,
  X,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    batchUpdateCustomers,
    deleteCustomer,
    batchDeleteCustomers,
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(50);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<'selected' | 'all' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modal states
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Clientes Ativos strictly filters for real clients (entity_type === 'client') and sorts alphabetically A-Z
  const clientCustomers = useMemo(() => {
    const list = customers.filter(c => c.entity_type === 'client');
    return sortAlphabetically(list);
  }, [customers]);

  const prospectsCount = useMemo(() => {
    return customers.filter(c => c.entity_type === 'contact').length;
  }, [customers]);

  const activeClientsCount = useMemo(() => {
    return clientCustomers.filter(c => c.status === 'active').length;
  }, [clientCustomers]);

  const incompleteClientsCount = useMemo(() => {
    return clientCustomers.filter(c => c.status === 'incomplete').length;
  }, [clientCustomers]);

  const inactiveClientsCount = useMemo(() => {
    return clientCustomers.filter(c => c.status === 'inactive').length;
  }, [clientCustomers]);

  const filteredCustomers = useMemo(() => {
    const list = clientCustomers.filter(c => {
      const matchesSearch =
        c.legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.trade_name && c.trade_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.document && c.document.includes(searchQuery)) ||
        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCountry = countryFilter === 'all' || c.country === countryFilter;

      return matchesSearch && matchesStatus && matchesCountry;
    });
    return sortAlphabetically(list);
  }, [clientCustomers, searchQuery, statusFilter, countryFilter]);

  // Reset page to 1 on filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, countryFilter, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.ceil(filteredCustomers.length / Number(pageSize)) || 1;
  }, [filteredCustomers.length, pageSize]);

  const paginatedCustomers = useMemo(() => {
    if (pageSize === 'all') return filteredCustomers;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredCustomers.slice(start, start + Number(pageSize));
  }, [filteredCustomers, currentPage, pageSize]);

  // Selection helpers
  const isAllSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.includes(c.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Batch Status Actions
  const handleBatchStatus = async (status: 'active' | 'inactive', target: 'selected' | 'all') => {
    const targetIds =
      target === 'all' ? filteredCustomers.map(c => c.id) : selectedIds;

    if (targetIds.length === 0) return;

    setIsBatchProcessing(true);
    setActionError(null);
    try {
      await batchUpdateCustomers(targetIds, {
        status,
        entity_type: status === 'active' ? 'client' : undefined,
      });
      const label = status === 'active' ? 'ativado(s)' : 'inativado(s)';
      setSuccessNotice(`${targetIds.length} cliente(s) ${label} com sucesso.`);
      if (target === 'selected') {
        setSelectedIds([]);
      }
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setActionError(err?.message || 'Falha ao atualizar clientes em massa.');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Delete Action
  const handleConfirmBatchDelete = async () => {
    if (!batchDeleteTarget) return;
    const targetIds =
      batchDeleteTarget === 'all' ? filteredCustomers.map(c => c.id) : selectedIds;

    if (targetIds.length === 0) {
      setBatchDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    setActionError(null);
    try {
      await batchDeleteCustomers(targetIds);
      setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
      setSuccessNotice(`${targetIds.length} cliente(s) excluído(s) permanentemente com sucesso.`);
      setBatchDeleteTarget(null);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setActionError(err?.message || 'Falha ao excluir clientes em lote.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Single Customer Status Toggle
  const handleToggleSingleStatus = async (cust: Customer) => {
    const newStatus: 'active' | 'inactive' = cust.status === 'active' ? 'inactive' : 'active';
    setActionError(null);
    try {
      await updateCustomer(cust.id, {
        status: newStatus,
        entity_type: newStatus === 'active' ? 'client' : cust.entity_type,
        tags:
          newStatus === 'active'
            ? Array.from(new Set([...cust.tags.filter(t => !t.includes('Prospect')), 'Cliente Ativo']))
            : cust.tags,
      });
      setSuccessNotice(
        `Cliente "${cust.legal_name}" foi ${newStatus === 'active' ? 'ativado' : 'inativado'}.`
      );
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setActionError(err?.message || 'Falha ao alterar situação do cliente.');
    }
  };

  const handleActivateCustomer = async (cust: Customer) => {
    setActionError(null);
    try {
      await updateCustomer(cust.id, {
        entity_type: 'client',
        status: 'active',
        tags: Array.from(new Set([...cust.tags.filter(t => !t.includes('Prospect')), 'Cliente Ativo'])),
      });
      setSuccessNotice(`Cliente "${cust.legal_name}" ativado com sucesso.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setActionError(err?.message || 'Falha ao ativar cliente.');
    }
  };

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
        setSelectedIds(prev => prev.filter(id => id !== cust.id));
        if (viewingCustomer && viewingCustomer.id === cust.id) {
          setViewingCustomer(null);
        }
        setSuccessNotice(`Cliente "${cust.legal_name}" inativado com sucesso.`);
        setTimeout(() => setSuccessNotice(null), 4000);
      } catch (err: any) {
        setActionError(err?.message || 'Falha ao inativar cliente.');
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto pb-16 font-sans">
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-600 font-bold hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Success Notice Banner */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="p-1 text-emerald-700 hover:text-emerald-950 rounded cursor-pointer"
          >
            <X size={14} />
          </button>
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
            Seleção múltipla, ativação/inativação em lote e gestão cadastral PJ/PF com suporte fiscal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0 cursor-pointer"
            id="btn-novo-cliente"
          >
            <Plus size={16} className="text-[#A78A63]" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Bulk Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E2DDD5] shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#3E4A32] text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>Todos os Clientes</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-[#2C3524] text-[#EDF1EA]' : 'bg-stone-200 text-stone-700'}`}>
              {clientCustomers.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>Ativos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-bold">
              {activeClientsCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('incomplete')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'incomplete'
                ? 'bg-amber-700 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>Incompletos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
              {incompleteClientsCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-stone-800 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>Inativos</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-200 text-stone-700">
              {inactiveClientsCount}
            </span>
          </button>
        </div>

        {/* Global Batch Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleBatchStatus('active', 'all')}
            disabled={isBatchProcessing || filteredCustomers.length === 0}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Ativar todos os clientes listados nesta visão"
          >
            <Power size={13} className="text-emerald-700" />
            <span>Ativar Todos ({filteredCustomers.length})</span>
          </button>

          <button
            onClick={() => handleBatchStatus('inactive', 'all')}
            disabled={isBatchProcessing || filteredCustomers.length === 0}
            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Inativar todos os clientes listados nesta visão"
          >
            <PowerOff size={13} className="text-stone-600" />
            <span>Inativar Todos ({filteredCustomers.length})</span>
          </button>

          <button
            onClick={() => setBatchDeleteTarget('all')}
            disabled={isBatchProcessing || filteredCustomers.length === 0}
            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Excluir todos os clientes listados nesta visão"
          >
            <Trash2 size={13} className="text-rose-600" />
            <span>Excluir Todos ({filteredCustomers.length})</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="bg-[#1C1A17] text-white p-3.5 rounded-xl border border-[#3E4A32] shadow-lg flex flex-wrap items-center justify-between gap-3 animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 bg-[#3E4A32] rounded-lg text-xs font-bold flex items-center gap-1.5 text-[#EDF1EA]">
              <CheckSquare size={15} />
              <span>{selectedIds.length} cliente(s) selecionado(s)</span>
            </div>
            <span className="text-xs text-stone-400 hidden sm:inline">
              de {filteredCustomers.length} filtrados ({customers.length} total)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBatchStatus('active', 'selected')}
              disabled={isBatchProcessing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Power size={14} />
              <span>Ativar Selecionados ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => handleBatchStatus('inactive', 'selected')}
              disabled={isBatchProcessing}
              className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <PowerOff size={14} />
              <span>Inativar Selecionados ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setBatchDeleteTarget('selected')}
              disabled={isBatchProcessing}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>Excluir Selecionados ({selectedIds.length})</span>
            </button>

            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              {isAllSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>

            <button
              onClick={handleClearSelection}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Limpar seleção"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

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
          {/* Select All Checkbox trigger */}
          <button
            onClick={handleToggleSelectAll}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isAllSelected
                ? 'bg-[#3E4A32] text-white border-[#3E4A32]'
                : isSomeSelected
                ? 'bg-stone-100 text-stone-800 border-stone-300'
                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
            }`}
          >
            {isAllSelected ? (
              <CheckSquare size={14} />
            ) : isSomeSelected ? (
              <MinusSquare size={14} className="text-[#3E4A32]" />
            ) : (
              <Square size={14} className="text-stone-400" />
            )}
            <span>
              {isAllSelected
                ? 'Desmarcar Todos'
                : isSomeSelected
                ? `Selecionados (${selectedIds.length})`
                : 'Selecionar Todos'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 bg-[#F8F7F4] px-2.5 py-1.5 rounded-lg border border-[#E2DDD5]">
            <Filter size={13} className="text-stone-500" />
            <span className="text-stone-500 font-medium">Situação:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-[#1C1A17] focus:outline-none cursor-pointer"
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
              className="bg-transparent font-semibold text-[#1C1A17] focus:outline-none cursor-pointer"
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
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAll}
                        className="text-stone-600 hover:text-black cursor-pointer flex items-center justify-center mx-auto"
                        title={isAllSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      >
                        {isAllSelected ? (
                          <CheckSquare size={16} className="text-[#3E4A32]" />
                        ) : isSomeSelected ? (
                          <MinusSquare size={16} className="text-[#3E4A32]" />
                        ) : (
                          <Square size={16} className="text-stone-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Cliente / Razão Social</th>
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">País / UF</th>
                    <th className="py-3 px-4">Segmento / Tags</th>
                    <th className="py-3 px-4 text-center">Situação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD5]">
                  {paginatedCustomers.map(cust => {
                    const isSelected = selectedIds.includes(cust.id);
                    const isInactive = cust.status === 'inactive';

                    return (
                      <tr
                        key={cust.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#EDF1EA]/80 font-medium'
                            : isInactive
                            ? 'bg-stone-50/50 opacity-75 hover:bg-stone-100/60'
                            : 'hover:bg-[#F8F7F4]/80'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleSelectOne(cust.id)}
                            className="cursor-pointer flex items-center justify-center mx-auto"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[#3E4A32]" />
                            ) : (
                              <Square size={16} className="text-stone-400 hover:text-stone-600" />
                            )}
                          </button>
                        </td>
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
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleSingleStatus(cust)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              cust.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-stone-200 hover:text-stone-700'
                                : cust.status === 'incomplete'
                                ? 'bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800'
                                : 'bg-stone-200 text-stone-700 hover:bg-emerald-100 hover:text-emerald-800'
                            }`}
                            title={cust.status === 'active' ? 'Clique para INATIVAR' : 'Clique para ATIVAR'}
                          >
                            {cust.status === 'active' ? (
                              <>
                                <Check size={10} className="text-emerald-600" />
                                <span>Ativo</span>
                              </>
                            ) : cust.status === 'incomplete' ? (
                              <span>Incompleto</span>
                            ) : (
                              <>
                                <PowerOff size={10} className="text-stone-500" />
                                <span>Inativo</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {cust.status !== 'active' && (
                              <button
                                onClick={() => handleActivateCustomer(cust)}
                                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                title="Ativar como Cliente na Carteira"
                              >
                                <CheckCircle2 size={12} />
                                <span>Ativar Cliente</span>
                              </button>
                            )}
                            <button
                              onClick={() => setViewingCustomer(cust)}
                              className="p-1.5 text-[#3E4A32] hover:bg-[#EDF1EA] rounded transition-colors cursor-pointer"
                              title="Ver 7 seções completas"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => setEditingCustomer(cust)}
                              className="p-1.5 text-stone-600 hover:bg-stone-200 rounded transition-colors cursor-pointer"
                              title="Editar cadastro"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Inativar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-[#E2DDD5]">
              {paginatedCustomers.map(cust => {
                const isSelected = selectedIds.includes(cust.id);
                const isInactive = cust.status === 'inactive';

                return (
                  <div
                    key={cust.id}
                    className={`p-4 space-y-2 transition-colors ${
                      isSelected ? 'bg-[#EDF1EA]/60' : isInactive ? 'bg-stone-50/60 opacity-80' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleSelectOne(cust.id)}
                          className="mt-0.5 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-[#3E4A32]" />
                          ) : (
                            <Square size={16} className="text-stone-400" />
                          )}
                        </button>
                        <div>
                          <h3 className="font-bold text-sm text-[#1C1A17]">{cust.legal_name}</h3>
                          {cust.trade_name && (
                            <p className="text-xs text-stone-500">{cust.trade_name}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSingleStatus(cust)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          cust.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cust.status === 'incomplete'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {cust.status === 'incomplete' ? 'Incompleto' : cust.status === 'active' ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-600 pl-6">
                      <span className="font-mono">
                        {cust.document || 'Documento pendente'}
                      </span>
                      <span>•</span>
                      <span>{cust.country === 'BRA' ? 'Brasil' : cust.country}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 pl-6">
                      <div className="flex flex-wrap gap-1">
                        {cust.tags.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded">
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        {cust.status !== 'active' && (
                          <button
                            onClick={() => handleActivateCustomer(cust)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 size={12} />
                            <span>Ativar</span>
                          </button>
                        )}
                        <button
                          onClick={() => setViewingCustomer(cust)}
                          className="px-2.5 py-1 bg-[#3E4A32] text-white text-xs font-semibold rounded cursor-pointer"
                        >
                          Ver Detalhes
                        </button>
                        <button
                          onClick={() => setEditingCustomer(cust)}
                          className="p-1 text-stone-600 hover:bg-stone-100 rounded cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Inativar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredCustomers.length > 0 && (
              <div className="p-4 border-t border-[#E2DDD5] bg-[#F8F7F4] flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <span>Itens por página:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-[#E2DDD5] rounded-lg font-semibold text-stone-800 cursor-pointer focus:outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value="all">Todos ({filteredCustomers.length})</option>
                  </select>
                  <span className="text-stone-400">|</span>
                  <span>
                    Exibindo {pageSize === 'all' ? `1–${filteredCustomers.length}` : `${Math.min((currentPage - 1) * Number(pageSize) + 1, filteredCustomers.length)}–${Math.min(currentPage * Number(pageSize), filteredCustomers.length)}`} de <strong>{filteredCustomers.length}</strong> clientes (Ordem A–Z)
                  </span>
                </div>

                {pageSize !== 'all' && totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 bg-white border border-[#E2DDD5] rounded-lg font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Anterior</span>
                    </button>

                    <div className="px-3 py-1 font-bold text-stone-800 bg-white border border-[#E2DDD5] rounded-lg">
                      {currentPage} / {totalPages}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 bg-white border border-[#E2DDD5] rounded-lg font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                    >
                      <span>Próxima</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
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

      {/* Batch Delete Confirmation Modal */}
      {batchDeleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-rose-100 bg-rose-50/60 flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-stone-900 text-base">
                  {batchDeleteTarget === 'all'
                    ? `Excluir Todos os Clientes (${filteredCustomers.length})?`
                    : `Excluir ${selectedIds.length} Cliente(s) Selecionado(s)?`}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Esta ação remove permanentemente os cadastros.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isDeleting) setBatchDeleteTarget(null);
                }}
                disabled={isDeleting}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-stone-700 leading-relaxed space-y-1.5">
                <p className="font-semibold text-rose-900">
                  Atenção: Você está prestes a excluir definitivamente{' '}
                  <strong className="text-rose-700 underline font-bold">
                    {batchDeleteTarget === 'all' ? filteredCustomers.length : selectedIds.length} cliente(s)
                  </strong>.
                </p>
                <p className="text-[11px] text-stone-500">
                  Esses registros de clientes serão removidos permanentemente do banco de dados e da listagem do CRM.
                </p>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {actionError}
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBatchDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>
                  {isDeleting
                    ? 'Excluindo...'
                    : `Sim, Excluir ${batchDeleteTarget === 'all' ? filteredCustomers.length : selectedIds.length} Cliente(s)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
