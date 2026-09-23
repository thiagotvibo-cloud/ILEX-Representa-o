import React, { useState, useMemo } from 'react';
import { useCRM } from '../../lib/store';
import {
  canExportReports,
  canDeleteOrder,
  Order,
  ROLE_DEFINITIONS,
} from '../../types';
import {
  TrendingUp,
  DollarSign,
  Package,
  Building2,
  Factory,
  Filter,
  Download,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  ArrowUpRight,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ExecutiveDashboardView: React.FC = () => {
  const {
    currentMember,
    orders,
    customers,
    manufacturers,
    isLoadingData,
    refreshData,
    deleteOrder,
  } = useCRM();

  // Filters State - Simplified, Modern & Compact
  const [period, setPeriod] = useState<'today' | '7days' | 'current_month' | 'last_month' | 'quarter' | 'year' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canExport = canExportReports(currentMember?.role_code);
  const canDelete = canDeleteOrder(currentMember?.role_code);

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrder(orderToDelete.id);
      setOrderToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir pedido.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute date range based on period filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date();

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === '7days') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'current_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'quarter') {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom' && customStartDate) {
      start = new Date(customStartDate);
      if (customEndDate) {
        end = new Date(customEndDate + 'T23:59:59');
      }
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }, [period, customStartDate, customEndDate]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.order_date);
      if (orderDate < dateRange.start || orderDate > dateRange.end) {
        return false;
      }
      if (selectedManufacturer !== 'all' && order.manufacturer_id !== selectedManufacturer) {
        return false;
      }
      if (selectedCustomer !== 'all' && order.customer_id !== selectedCustomer) {
        return false;
      }
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }
      if (selectedSeller !== 'all' && order.seller_name !== selectedSeller) {
        return false;
      }
      return true;
    });
  }, [orders, dateRange, selectedManufacturer, selectedCustomer, selectedStatus, selectedSeller]);

  // Financial Indicators (Filtered)
  const metrics = useMemo(() => {
    let salesVolume = 0;
    let ilexRevenue = 0;
    let commissionReceived = 0;
    let commissionPending = 0;

    filteredOrders.forEach(order => {
      const total = Number(order.total_amount) || 0;
      const commission = Number(order.commission_amount) || 0;
      salesVolume += total;
      ilexRevenue += commission;

      if (order.status === 'received') {
        commissionReceived += commission;
      } else if (order.status === 'partially_received') {
        commissionReceived += commission * 0.5;
        commissionPending += commission * 0.5;
      } else {
        commissionPending += commission;
      }
    });

    const ordersCount = filteredOrders.length;
    const avgTicket = ordersCount > 0 ? salesVolume / ordersCount : 0;
    const activeCustomersCount = customers.filter(c => c.status === 'active' || c.status === 'incomplete').length;
    const liquidationRate = ilexRevenue > 0 ? Math.round((commissionReceived / ilexRevenue) * 100) : 0;

    return {
      salesVolume,
      ilexRevenue,
      commissionReceived,
      commissionPending,
      ordersCount,
      avgTicket,
      activeCustomersCount,
      liquidationRate,
    };
  }, [filteredOrders, customers]);

  // Chart Data: Monthly trend (Last 6 Months)
  const monthlyChartData = useMemo(() => {
    const monthsMap = new Map<string, { key: string; month: string; faturamento: number; comissao: number; pedidos: number }>();
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthRaw = d.toLocaleDateString('pt-BR', { month: 'short' });
      const cleanMonth = monthRaw.replace('.', '');
      const label = `${cleanMonth.charAt(0).toUpperCase() + cleanMonth.slice(1)}/${String(d.getFullYear()).slice(-2)}`;
      monthsMap.set(key, { key, month: label, faturamento: 0, comissao: 0, pedidos: 0 });
    }

    orders.forEach(o => {
      if (!o.order_date) return;
      const d = new Date(o.order_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthsMap.get(key);
      if (entry) {
        entry.faturamento += Number(o.total_amount) || 0;
        entry.comissao += Number(o.commission_amount) || 0;
        entry.pedidos += 1;
      }
    });

    return Array.from(monthsMap.values());
  }, [orders]);

  // Chart Data: Manufacturer share
  const manufacturerChartData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; comissao: number; count: number }>();

    manufacturers.forEach(m => {
      map.set(m.id, { name: m.name, total: 0, comissao: 0, count: 0 });
    });

    orders.forEach(o => {
      const existing = map.get(o.manufacturer_id) || {
        name: o.manufacturer_name || 'Outra Fábrica',
        total: 0,
        comissao: 0,
        count: 0,
      };
      existing.total += Number(o.total_amount) || 0;
      existing.comissao += Number(o.commission_amount) || 0;
      existing.count += 1;
      map.set(o.manufacturer_id, existing);
    });

    const totalSales = Array.from(map.values()).reduce((acc, curr) => acc + curr.total, 0);

    return Array.from(map.values())
      .filter(item => item.total > 0 || manufacturers.length <= 4)
      .map(item => ({
        ...item,
        percent: totalSales > 0 ? Math.round((item.total / totalSales) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [orders, manufacturers]);

  // Top Customers
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    filteredOrders.forEach(o => {
      const existing = map.get(o.customer_id) || { name: o.customer_name, total: 0, count: 0 };
      existing.total += Number(o.total_amount) || 0;
      existing.count += 1;
      map.set(o.customer_id, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredOrders]);

  // Top Products
  const topProducts = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; total: number; qty: number; factory: string }>();
    filteredOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const existing = map.get(item.sku) || {
          sku: item.sku,
          name: item.description,
          total: 0,
          qty: 0,
          factory: o.manufacturer_name,
        };
        existing.total += item.total_price ?? item.total_net_price ?? 0;
        existing.qty += item.quantity;
        map.set(item.sku, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredOrders]);

  // CSV Export
  const handleExportCSV = () => {
    if (!canExport) return;
    setIsExporting(true);

    try {
      const headers = ['Numero Pedido', 'Data', 'Fabrica', 'Cliente', 'Status', 'Valor Total (R$)', 'Comissao ILEX (R$)', 'Vendedor'];
      const rows = filteredOrders.map(o => [
        o.order_number,
        o.order_date,
        `"${o.manufacturer_name}"`,
        `"${o.customer_name}"`,
        o.status,
        o.total_amount.toFixed(2),
        o.commission_amount.toFixed(2),
        `"${o.seller_name || ''}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `ilex_relatorio_executivo_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setPeriod('current_month');
    setSelectedManufacturer('all');
    setSelectedCustomer('all');
    setSelectedStatus('all');
    setSelectedSeller('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const hasActiveFilters =
    selectedManufacturer !== 'all' ||
    selectedCustomer !== 'all' ||
    selectedStatus !== 'all' ||
    selectedSeller !== 'all' ||
    period !== 'current_month';

  const PIE_COLORS = ['#234537', '#C4A66C', '#3E6652', '#8C7449', '#546A5E'];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);

  return (
    <div className="space-y-5 animate-fade-in w-full max-w-full min-w-0 overflow-hidden pb-10 text-stone-800">
      {/* 1. Header Executivo Premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Painel Executivo Comercial
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#234537]/10 text-[#234537] border border-[#234537]/20 uppercase">
              {currentMember?.role_code ? ROLE_DEFINITIONS[currentMember.role_code]?.label : 'Diretoria'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Consolidação de vendas industriais, comissões de assessoria e fluxo de recebíveis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            className="p-2 text-stone-500 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw size={14} className={isLoadingData ? 'animate-spin' : ''} />
          </button>

          {canExport && (
            <button
              onClick={handleExportCSV}
              disabled={isExporting || filteredOrders.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#234537] hover:bg-[#1A3429] text-white font-medium text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet size={13} className="text-[#C4A66C]" />
              <span>{isExporting ? 'Exportando...' : 'Exportar CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE CONTROLE E FILTROS RÁPIDOS (Super Compacta, Intuitiva e Limpa) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2.5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Seletor de Período em Pílula Flutuante */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl gap-1 text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setPeriod('current_month')}
              className={`px-3 py-1 rounded-lg font-medium transition-all text-xs whitespace-nowrap cursor-pointer ${
                period === 'current_month'
                  ? 'bg-white text-[#234537] font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`px-3 py-1 rounded-lg font-medium transition-all text-xs whitespace-nowrap cursor-pointer ${
                period === '7days'
                  ? 'bg-white text-[#234537] font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('last_month')}
              className={`px-3 py-1 rounded-lg font-medium transition-all text-xs whitespace-nowrap cursor-pointer ${
                period === 'last_month'
                  ? 'bg-white text-[#234537] font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mês Anterior
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1 rounded-lg font-medium transition-all text-xs whitespace-nowrap cursor-pointer ${
                period === 'quarter'
                  ? 'bg-white text-[#234537] font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1 rounded-lg font-medium transition-all text-xs whitespace-nowrap cursor-pointer ${
                period === 'year'
                  ? 'bg-white text-[#234537] font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ano 2026
            </button>
          </div>

          {/* Botão de Filtros Avançados & Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border font-medium transition-colors cursor-pointer ${
                isFiltersExpanded || hasActiveFilters
                  ? 'bg-[#234537]/5 border-[#234537]/30 text-[#234537] font-bold'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <SlidersHorizontal size={13} className="text-[#234537]" />
              <span>Filtros Específicos</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#234537]" />
              )}
              {isFiltersExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-semibold px-2 py-1 transition-colors cursor-pointer"
                title="Limpar todos os filtros"
              >
                <RotateCcw size={11} />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Linha expansível apenas se o usuário quiser filtrar especificamente por fábrica, cliente ou vendedor */}
        {isFiltersExpanded && (
          <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                Fábrica
              </label>
              <select
                value={selectedManufacturer}
                onChange={e => setSelectedManufacturer(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 focus:outline-none focus:border-[#234537]"
              >
                <option value="all">Todas as Fábricas</option>
                {manufacturers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                Cliente
              </label>
              <select
                value={selectedCustomer}
                onChange={e => setSelectedCustomer(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 focus:outline-none focus:border-[#234537]"
              >
                <option value="all">Todos os Clientes</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.trade_name || c.legal_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                Status do Pedido
              </label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 focus:outline-none focus:border-[#234537]"
              >
                <option value="all">Todos os Status</option>
                <option value="received">Comissão Recebida</option>
                <option value="invoiced">Faturado</option>
                <option value="partially_received">Comissão Parcial</option>
                <option value="submitted">Submetido à Fábrica</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                Vendedor / Representante
              </label>
              <select
                value={selectedSeller}
                onChange={e => setSelectedSeller(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 text-xs font-medium text-stone-800 focus:outline-none focus:border-[#234537]"
              >
                <option value="all">Toda a Equipe</option>
                <option value="Julienne Ferreira">Julienne Ferreira</option>
                <option value="Thiago Marcondes">Thiago Marcondes</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. CARDS DE KPIS EXECUTIVOS (Design Limpo, Tipografia Ampla, Sem Truncar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        {/* Card 1: Volume de Vendas das Fábricas */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-500">
                Volume de Vendas
              </span>
              <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                <TrendingUp size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              {formatCurrency(metrics.salesVolume)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>{metrics.ordersCount} operação(ões)</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Faturado
            </span>
          </div>
        </div>

        {/* Card 2: Receita ILEX (Destaque Principal) */}
        <div className="bg-gradient-to-br from-[#234537] to-[#183127] text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-100/80">
                Receita ILEX (Comissões)
              </span>
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#C4A66C]">
                <DollarSign size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {formatCurrency(metrics.ilexRevenue)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/80">
            <span>Alíquota média</span>
            <span className="font-bold text-[#C4A66C]">~5% bruto</span>
          </div>
        </div>

        {/* Card 3: Comissões Recebidas (Liquidadas) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-emerald-800">
                Comissões Recebidas
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-800 tracking-tight">
              {formatCurrency(metrics.commissionReceived)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>{metrics.liquidationRate}% liquidado</span>
            <span className="text-emerald-700 font-medium">Bancário</span>
          </div>
        </div>

        {/* Card 4: Comissões a Receber (Vincendas) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-amber-200 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-900">
                Comissões a Receber
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-900 tracking-tight">
              {formatCurrency(metrics.commissionPending)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Previsão de repasse</span>
            <span className="text-amber-800 font-medium">Conciliação</span>
          </div>
        </div>
      </div>

      {/* 4. RÉGUA DE INTELIGÊNCIA COMERCIAL (Elegante e em 1 Linha) */}
      <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium">Ticket Médio:</span>
          <span className="font-bold text-stone-900">{formatCurrency(metrics.avgTicket)}</span>
        </div>
        <div className="hidden sm:block h-3.5 w-px bg-stone-200" />
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium">Clientes Compradores:</span>
          <span className="font-bold text-stone-900">{metrics.activeCustomersCount} parceiros</span>
        </div>
        <div className="hidden sm:block h-3.5 w-px bg-stone-200" />
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium">Gatilho Torralf:</span>
          <span className="font-semibold text-[#234537]">Faturamento (Integral)</span>
        </div>
        <div className="hidden sm:block h-3.5 w-px bg-stone-200" />
        <div className="flex items-center gap-2">
          <span className="text-stone-400 font-medium">Gatilho Betel:</span>
          <span className="font-semibold text-[#C4A66C]">Recebimento (Parcelas)</span>
        </div>
      </div>

      {/* 5. SEÇÃO DE GRÁFICOS VISUAIS E INTUITIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
        {/* Gráfico 1: Evolução Semestral (Vendas vs Comissões) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <BarChart3 size={16} className="text-[#234537]" />
                <span>Evolução de Vendas &amp; Comissões ILEX</span>
              </h2>
              <p className="text-[11px] text-stone-500">
                Histórico consolidado de faturamento industrial e comissão auferida.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="flex items-center gap-1 text-stone-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#234537]" />
                Volume Vendas
              </span>
              <span className="flex items-center gap-1 text-stone-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#C4A66C]" />
                Comissão ILEX
              </span>
            </div>
          </div>

          <div className="w-full h-60 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F3EF" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#78716C' }}
                  axisLine={{ stroke: '#E7E9E3' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#78716C' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value) || 0),
                    name === 'faturamento' ? 'Volume de Vendas' : 'Comissão ILEX',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="faturamento" name="faturamento" fill="#234537" radius={[5, 5, 0, 0]} maxBarSize={30} />
                <Bar dataKey="comissao" name="comissao" fill="#C4A66C" radius={[5, 5, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Participação por Indústria Representada (Donut Moderno) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <PieChartIcon size={16} className="text-[#C4A66C]" />
                <span>Divisão por Fábrica</span>
              </h2>
              <span className="text-[10px] font-bold text-[#234537] bg-[#234537]/10 px-2 py-0.5 rounded-full">
                Representadas
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mb-2">
              Proporção das vendas no período.
            </p>
          </div>

          <div className="relative w-full h-36 min-w-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={manufacturerChartData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={5}
                >
                  {manufacturerChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), name]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
            {manufacturerChartData.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="font-semibold text-stone-800 truncate">{m.name}</span>
                </div>
                <span className="font-bold text-stone-900 shrink-0">
                  {formatCurrency(m.total)}{' '}
                  <span className="text-stone-400 font-normal">({m.percent}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. TABELA OPERACIONAL DE PEDIDOS FILTRADOS */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs min-w-0">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Operações Comerciais Filtradas</h2>
            <p className="text-[11px] text-stone-500">
              Rastreamento de faturamento por cliente e apuração de comissão.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#234537]/10 text-[#234537]">
            {filteredOrders.length} pedido(s)
          </span>
        </div>

        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 font-semibold">
                <th className="py-3 px-4">Pedido / Data</th>
                <th className="py-3 px-4">Fábrica</th>
                <th className="py-3 px-4">Cliente Comprador</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4 text-right">Comissão ILEX</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Vendedor</th>
                {canDelete && <th className="py-3 px-4 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-stone-900 block">{order.order_number}</span>
                    <span className="text-[11px] text-stone-400">
                      {new Date(order.order_date).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-stone-700">
                    <span className="inline-flex items-center gap-1.5">
                      <Factory size={13} className="text-[#234537]" />
                      {order.manufacturer_name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-stone-900">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 size={13} className="text-stone-400" />
                      {order.customer_name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-stone-900">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#234537]">
                    {formatCurrency(order.commission_amount)}
                    <span className="block text-[10px] text-stone-400 font-normal">
                      ({order.commission_rate}%)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        order.status === 'received'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : order.status === 'invoiced'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : order.status === 'partially_received'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {order.status === 'received'
                        ? 'Comissão Recebida'
                        : order.status === 'invoiced'
                        ? 'Faturado'
                        : order.status === 'partially_received'
                        ? 'Parcial'
                        : 'Submetido'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600 text-[11px]">
                    {order.seller_name || 'Julienne Ferreira'}
                  </td>
                  {canDelete && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setOrderToDelete(order)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Excluir pedido"
                        aria-label={`Excluir pedido ${order.order_number}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. TOP CLIENTES & TOP PRODUTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        {/* Top Clientes */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-stone-900 mb-1 flex items-center gap-1.5">
            <Building2 size={16} className="text-[#234537]" />
            Principais Clientes no Período
          </h3>
          <p className="text-[11px] text-stone-500 mb-3">Compradores com maior volume de pedidos.</p>

          <div className="space-y-2 text-xs">
            {topCustomers.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/60">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-5 h-5 rounded-full bg-[#234537]/10 text-[#234537] font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-stone-900 block truncate">{c.name}</span>
                    <span className="text-[10px] text-stone-400">{c.count} pedido(s)</span>
                  </div>
                </div>
                <div className="text-right font-bold text-stone-900 shrink-0">
                  {formatCurrency(c.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Produtos / SKUs */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-stone-900 mb-1 flex items-center gap-1.5">
            <Package size={16} className="text-[#C4A66C]" />
            Itens Industriais Mais Vendidos
          </h3>
          <p className="text-[11px] text-stone-500 mb-3">Produtos de maior tração comercial.</p>

          <div className="space-y-2 text-xs">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/80 border border-stone-200/60">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-stone-900 block truncate">{p.name}</span>
                  <span className="text-[10px] text-stone-400 font-mono truncate block">
                    {p.sku} • {p.factory}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-stone-900 block">
                    {formatCurrency(p.total)}
                  </span>
                  <span className="text-[10px] text-stone-400">{p.qty} un</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Delete Order */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-stone-100 flex items-start gap-3 bg-rose-50/60">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-stone-900">
                  Confirmar Exclusão de Pedido
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Esta ação removerá o pedido e atualizará os faturamentos da assessoria.
                </p>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-stone-600">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Número do Pedido:</span>
                  <span className="font-bold text-stone-900 font-mono">{orderToDelete.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Cliente:</span>
                  <span className="font-semibold text-stone-900">{orderToDelete.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Fábrica:</span>
                  <span className="font-semibold text-stone-900">{orderToDelete.manufacturer_name}</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2">
                  <span className="text-stone-500">Valor Total:</span>
                  <span className="font-bold text-stone-900">
                    {formatCurrency(orderToDelete.total_amount)}
                  </span>
                </div>
              </div>

              <p className="text-stone-500 text-[11px] leading-relaxed">
                Tem certeza que deseja excluir o pedido <strong>{orderToDelete.order_number}</strong>? A comissão apurada e as estatísticas financeiras serão recalculadas automaticamente.
              </p>
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-stone-200 text-stone-700 font-semibold rounded-xl text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
