import React, { useState, useMemo } from 'react';
import { useCRM } from '../../lib/store';
import {
  canViewCostsAndMargins,
  canExportReports,
  Order,
  ROLE_DEFINITIONS,
} from '../../types';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Building2,
  Factory,
  Calendar,
  Filter,
  Download,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ExecutiveDashboardView: React.FC = () => {
  const {
    currentMember,
    orders,
    customers,
    manufacturers,
    isLoadingData,
    refreshData,
  } = useCRM();

  // Filters State
  const [period, setPeriod] = useState<'today' | '7days' | 'current_month' | 'last_month' | 'quarter' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const canExport = canExportReports(currentMember?.role_code);
  const canViewCosts = canViewCostsAndMargins(currentMember?.role_code);

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
      // Date filter
      const orderDate = new Date(order.order_date);
      if (orderDate < dateRange.start || orderDate > dateRange.end) {
        return false;
      }
      // Manufacturer filter
      if (selectedManufacturer !== 'all' && order.manufacturer_id !== selectedManufacturer) {
        return false;
      }
      // Customer filter
      if (selectedCustomer !== 'all' && order.customer_id !== selectedCustomer) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }
      // Seller filter
      if (selectedSeller !== 'all' && order.seller_name !== selectedSeller) {
        return false;
      }
      return true;
    });
  }, [orders, dateRange, selectedManufacturer, selectedCustomer, selectedStatus, selectedSeller]);

  // Financial Indicators
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

    // Customer repurchase cycle calculation
    const activeCustomersCount = customers.filter(c => c.status === 'active').length;
    const repurchasePending = customers.filter(c =>
      c.manufacturer_links?.some(ml => {
        if (!ml.next_expected_reorder_date) return false;
        const reorderDate = new Date(ml.next_expected_reorder_date);
        const diffDays = Math.ceil((reorderDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diffDays >= -15 && diffDays <= 15;
      })
    ).length;

    return {
      salesVolume,
      ilexRevenue,
      commissionReceived,
      commissionPending,
      ordersCount,
      avgTicket,
      activeCustomersCount,
      repurchasePending,
    };
  }, [filteredOrders, customers]);

  // Top Customers by sales volume
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    filteredOrders.forEach(o => {
      const existing = map.get(o.customer_id) || { name: o.customer_name, total: 0, count: 0 };
      existing.total += o.total_amount;
      existing.count += 1;
      map.set(o.customer_id, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredOrders]);

  // Top Products / SKUs
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

  // Handle CSV Export
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

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header & Role Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E5] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
              Painel Executivo Comercial
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#355C4D]/10 text-[#355C4D] border border-[#355C4D]/20">
              {currentMember?.role_code ? ROLE_DEFINITIONS[currentMember.role_code]?.label : 'Equipe Interna'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Visão consolidada de faturamento industrial, comissões ILEX e previsibilidade de recompras.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            className="p-2.5 text-stone-600 hover:text-[#26332D] bg-white border border-[#E5E9E5] rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
          </button>

          {canExport ? (
            <button
              onClick={handleExportCSV}
              disabled={isExporting || filteredOrders.length === 0}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E5E9E5] hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              title="Exportar planilha CSV para faturamento e auditoria"
            >
              <FileSpreadsheet size={15} className="text-[#355C4D]" />
              <span>{isExporting ? 'Exportando...' : 'Exportar Relatório'}</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 border border-[#E5E9E5] text-stone-400 text-xs rounded-xl cursor-not-allowed"
              title="Exportação de relatórios restrita aos perfis Sócios e Financeiro"
            >
              <Download size={14} />
              <span>Exportar (Restrito)</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E9E5]/60 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#26332D]">
            <Filter size={14} className="text-[#355C4D]" />
            <span>Filtros Operacionais</span>
          </div>
          {(selectedManufacturer !== 'all' || selectedCustomer !== 'all' || selectedStatus !== 'all' || selectedSeller !== 'all' || period !== 'current_month') && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-stone-500 hover:text-[#355C4D] flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw size={12} />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Period Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Período
            </label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] font-medium text-[#26332D] focus:outline-none focus:border-[#355C4D]"
            >
              <option value="today">Hoje</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="current_month">Mês Atual</option>
              <option value="last_month">Mês Anterior</option>
              <option value="quarter">Último Trimestre</option>
              <option value="custom">Personalizado...</option>
            </select>
          </div>

          {/* Manufacturer Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Fábrica
            </label>
            <select
              value={selectedManufacturer}
              onChange={e => setSelectedManufacturer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] font-medium text-[#26332D] focus:outline-none focus:border-[#355C4D]"
            >
              <option value="all">Todas as Fábricas</option>
              {manufacturers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Cliente
            </label>
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] font-medium text-[#26332D] focus:outline-none focus:border-[#355C4D]"
            >
              <option value="all">Todos os Clientes</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.trade_name || c.legal_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Status do Pedido
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] font-medium text-[#26332D] focus:outline-none focus:border-[#355C4D]"
            >
              <option value="all">Todos os Status</option>
              <option value="submitted">Submetido à Fábrica</option>
              <option value="invoiced">Faturado</option>
              <option value="partially_received">Parcialmente Recebido</option>
              <option value="received">Comissão Recebida</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Seller Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Vendedor / Responsável
            </label>
            <select
              value={selectedSeller}
              onChange={e => setSelectedSeller(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] font-medium text-[#26332D] focus:outline-none focus:border-[#355C4D]"
            >
              <option value="all">Todos</option>
              <option value="Julienne Ferreira">Julienne Ferreira</option>
              <option value="Thiago Marcondes">Thiago Marcondes</option>
            </select>
          </div>
        </div>

        {/* Custom date range row */}
        {period === 'custom' && (
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs border-t border-[#E5E9E5]/60">
            <span className="text-stone-500 font-medium">Intervalo de datas:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E9E5] bg-[#F7F8F6]"
            />
            <span className="text-stone-400">até</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E9E5] bg-[#F7F8F6]"
            />
          </div>
        )}
      </div>

      {/* Financial Metrics Cards (Volume Vendas vs Receita ILEX vs Comissoes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Volume de Vendas das Indústrias */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Volume de Vendas</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#26332D]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.salesVolume)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Faturamento bruto das representadas no período.
          </p>
        </div>

        {/* Card 2: Receita ILEX (Total de Comissões) */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#355C4D]/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold text-[#355C4D] uppercase tracking-wider">Receita ILEX (Total)</span>
            <div className="w-8 h-8 rounded-lg bg-[#355C4D]/10 flex items-center justify-center text-[#355C4D]">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#355C4D]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.ilexRevenue)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Comissões totais calculadas para a assessoria.
          </p>
        </div>

        {/* Card 3: Comissão Liquidada / Recebida */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Comissão Recebida</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.commissionReceived)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Liquidada conforme regra da indústria.
          </p>
        </div>

        {/* Card 4: Comissão a Receber / Vincenda */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Comissão a Receber</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.commissionPending)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Aguardando faturamento ou quitação pelo cliente.
          </p>
        </div>
      </div>

      {/* Operational Indicators Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white border border-[#E5E9E5] rounded-xl p-3.5 shadow-xs">
          <span className="text-stone-500 text-[10px] font-semibold uppercase">Pedidos no Período</span>
          <div className="text-lg font-bold text-[#26332D] mt-0.5">{metrics.ordersCount}</div>
        </div>
        <div className="bg-white border border-[#E5E9E5] rounded-xl p-3.5 shadow-xs">
          <span className="text-stone-500 text-[10px] font-semibold uppercase">Ticket Médio</span>
          <div className="text-lg font-bold text-[#26332D] mt-0.5">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avgTicket)}
          </div>
        </div>
        <div className="bg-white border border-[#E5E9E5] rounded-xl p-3.5 shadow-xs">
          <span className="text-stone-500 text-[10px] font-semibold uppercase">Clientes Ativos</span>
          <div className="text-lg font-bold text-[#26332D] mt-0.5">{metrics.activeCustomersCount}</div>
        </div>
        <div className="bg-white border border-[#E5E9E5] rounded-xl p-3.5 shadow-xs">
          <span className="text-stone-500 text-[10px] font-semibold uppercase">Recompras Previstas</span>
          <div className="text-lg font-bold text-amber-800 mt-0.5">{metrics.repurchasePending}</div>
        </div>
      </div>

      {/* Orders List / Honest Empty State */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#26332D]">Pedidos Filtrados no Período</h2>
            <p className="text-[11px] text-stone-500">
              Listagem operacional com rastreabilidade de faturamento e comissionamento.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {filteredOrders.length} pedido(s)
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <Package size={22} />
            </div>
            <h3 className="font-bold text-[#26332D]">Nenhum pedido localizado para os filtros selecionados</h3>
            <p className="text-stone-500 max-w-sm mx-auto">
              Ajuste o período, a fábrica ou o status selecionado para expandir os resultados da busca.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-[#355C4D] text-white text-xs font-semibold rounded-xl hover:bg-[#233D33] transition-colors"
            >
              Redefinir Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-[#E5E9E5] text-stone-500 font-semibold">
                  <th className="py-3 px-4">Pedido / Data</th>
                  <th className="py-3 px-4">Fábrica</th>
                  <th className="py-3 px-4">Cliente Comprador</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-right">Comissão ILEX</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Vendedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E5]">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#26332D] block">{order.order_number}</span>
                      <span className="text-[11px] text-stone-500">
                        {new Date(order.order_date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-stone-700">
                      <span className="inline-flex items-center gap-1">
                        <Factory size={12} className="text-[#355C4D]" />
                        {order.manufacturer_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#26332D]">
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={12} className="text-stone-400" />
                        {order.customer_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#26332D]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#355C4D]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.commission_amount)}
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
                          ? 'Recebido'
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Clientes & Top Produtos Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Clientes */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#26332D] mb-1 flex items-center gap-2">
            <Building2 size={16} className="text-[#355C4D]" />
            Principais Clientes Compradores
          </h3>
          <p className="text-[11px] text-stone-500 mb-4">Classificação por volume de compras no período selecionado.</p>

          {topCustomers.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400">Sem pedidos registrados</div>
          ) : (
            <div className="space-y-3 text-xs">
              {topCustomers.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-[#E5E9E5]/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#355C4D]/10 text-[#355C4D] font-bold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-[#26332D] block">{c.name}</span>
                      <span className="text-[10px] text-stone-500">{c.count} pedido(s)</span>
                    </div>
                  </div>
                  <div className="text-right font-bold text-[#26332D]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Produtos / SKUs */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#26332D] mb-1 flex items-center gap-2">
            <Package size={16} className="text-[#B69A67]" />
            Produtos / SKUs Mais Vendidos
          </h3>
          <p className="text-[11px] text-stone-500 mb-4">Itens industriais com maior demanda e tração comercial.</p>

          {topProducts.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400">Sem itens registrados</div>
          ) : (
            <div className="space-y-3 text-xs">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-[#E5E9E5]/60">
                  <div>
                    <span className="font-semibold text-[#26332D] block">{p.name}</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      SKU: {p.sku} • {p.factory}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#26332D] block">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.total)}
                    </span>
                    <span className="text-[10px] text-stone-500">{p.qty} un</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
