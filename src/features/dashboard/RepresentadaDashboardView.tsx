import React, { useMemo, useState } from 'react';
import { useCRM } from '../../lib/store';
import {
  Factory,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  AlertCircle,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '../../types';

export const RepresentadaDashboardView: React.FC = () => {
  const {
    currentMember,
    orders,
    customers,
    manufacturers,
    isLoadingData,
    refreshData,
  } = useCRM();

  // Find the factory linked to this user's scope
  const targetManufacturerId = currentMember?.scope_manufacturer_id ||
    currentMember?.scopes?.find(s => s.scope_type === 'manufacturer')?.scope_id ||
    'mfr-torralf'; // fallback default for preview

  const currentFactory = useMemo(() => {
    return manufacturers.find(m => m.id === targetManufacturerId) || {
      id: targetManufacturerId,
      name: 'Torralf Indústria de Painéis Elétricos',
      code: 'TORRALF',
      commission_trigger: 'billing' as const,
      initial_commission_rate: 5.0,
      currency: 'BRL',
    };
  }, [manufacturers, targetManufacturerId]);

  // STRICT ISOLATION: Only orders of this factory
  const factoryOrders = useMemo(() => {
    return orders.filter(o => o.manufacturer_id === targetManufacturerId);
  }, [orders, targetManufacturerId]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let totalSales = 0;
    let totalCommission = 0;
    let invoicedSales = 0;
    let pendingOrdersCount = 0;

    factoryOrders.forEach(o => {
      totalSales += o.total_amount;
      totalCommission += o.commission_amount;
      if (o.status === 'invoiced' || o.status === 'received' || o.status === 'partially_received') {
        invoicedSales += o.total_amount;
      }
      if (o.status === 'submitted') {
        pendingOrdersCount += 1;
      }
    });

    const ordersCount = factoryOrders.length;
    const avgTicket = ordersCount > 0 ? totalSales / ordersCount : 0;

    return {
      totalSales,
      totalCommission,
      invoicedSales,
      pendingOrdersCount,
      ordersCount,
      avgTicket,
    };
  }, [factoryOrders]);

  // Product sales breakdown
  const productSales = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; qty: number; total: number }>();
    factoryOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const existing = map.get(item.sku) || {
          sku: item.sku,
          name: item.description,
          qty: 0,
          total: 0,
        };
        existing.qty += item.quantity;
        existing.total += item.total_price ?? item.total_net_price ?? 0;
        map.set(item.sku, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [factoryOrders]);

  // Customers buying this factory's products
  const factoryCustomers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; lastOrder: string }>();
    factoryOrders.forEach(o => {
      const existing = map.get(o.customer_id) || {
        name: o.customer_name,
        total: 0,
        count: 0,
        lastOrder: o.order_date,
      };
      existing.total += o.total_amount;
      existing.count += 1;
      if (new Date(o.order_date) > new Date(existing.lastOrder)) {
        existing.lastOrder = o.order_date;
      }
      map.set(o.customer_id, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [factoryOrders]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header with Factory Identification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E5] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#355C4D]/10 text-[#355C4D] flex items-center justify-center font-bold">
              <Factory size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
                  {currentFactory.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#B69A67]/15 text-[#8C6D37] border border-[#B69A67]/30">
                  {currentMember?.role_code ? ROLE_DEFINITIONS[currentMember.role_code]?.label : 'Portal Representada'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Portal industrial com isolamento rigoroso de fábrica. Comissionamento contratual: {currentFactory.initial_commission_rate}% ({currentFactory.commission_trigger === 'billing' ? 'Gatilho: Faturamento' : 'Gatilho: Recebimento'}).
              </p>
            </div>
          </div>
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
          <div className="px-3.5 py-2 bg-stone-100 border border-[#E5E9E5] rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Escopo Restrito à Indústria</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Faturamento Total
          </span>
          <div className="text-2xl font-bold text-[#26332D]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalSales)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Valor de vendas geradas pela assessoria ILEX.
          </p>
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-bold text-[#355C4D] uppercase tracking-wider block mb-1">
            Comissão Calculada
          </span>
          <div className="text-2xl font-bold text-[#355C4D]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalCommission)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Alíquota {currentFactory.initial_commission_rate}% sobre {currentFactory.commission_trigger === 'billing' ? 'faturamento' : 'recebimento'}.
          </p>
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Pedidos da Indústria
          </span>
          <div className="text-2xl font-bold text-[#26332D]">{metrics.ordersCount}</div>
          <p className="text-[11px] text-stone-500 mt-1">
            Ticket médio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avgTicket)}
          </p>
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Pedidos Aguardando Fábrica
          </span>
          <div className="text-2xl font-bold text-amber-800">{metrics.pendingOrdersCount}</div>
          <p className="text-[11px] text-stone-500 mt-1">
            Aguardando validação ou emissão de nota pela indústria.
          </p>
        </div>
      </div>

      {/* Orders of this Factory */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#26332D]">Pedidos Emitidos para {currentFactory.name}</h2>
            <p className="text-[11px] text-stone-500">
              Pedidos originados pela assessoria comercial ILEX para a sua unidade.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {factoryOrders.length} pedido(s)
          </span>
        </div>

        {factoryOrders.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-400">
            Nenhum pedido registrado para esta fábrica até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-[#E5E9E5] text-stone-500 font-semibold">
                  <th className="py-3 px-4">Pedido / Data</th>
                  <th className="py-3 px-4">Cliente Comprador</th>
                  <th className="py-3 px-4 text-right">Valor do Pedido</th>
                  <th className="py-3 px-4 text-right">Comissão ILEX ({currentFactory.initial_commission_rate}%)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E5]">
                {factoryOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#26332D] block">{order.order_number}</span>
                      <span className="text-[11px] text-stone-500">
                        {new Date(order.order_date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#26332D]">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 size={13} className="text-stone-400" />
                        {order.customer_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#26332D]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#355C4D]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.commission_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          order.status === 'received'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.status === 'invoiced'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {order.status === 'received' ? 'Liquidado' : order.status === 'invoiced' ? 'Faturado' : 'Submetido'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product breakdown & Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products Sold */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#26332D] mb-1 flex items-center gap-2">
            <Package size={16} className="text-[#355C4D]" />
            Desempenho dos SKUs da Indústria
          </h3>
          <p className="text-[11px] text-stone-500 mb-4">Volume e faturamento dos produtos fabricados pela sua unidade.</p>

          {productSales.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400">Nenhum SKU vendido ainda</div>
          ) : (
            <div className="space-y-3 text-xs">
              {productSales.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-[#E5E9E5]/60">
                  <div>
                    <span className="font-semibold text-[#26332D] block">{p.name}</span>
                    <span className="text-[10px] text-stone-500 font-mono">SKU: {p.sku}</span>
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

        {/* Buying Customers */}
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#26332D] mb-1 flex items-center gap-2">
            <Building2 size={16} className="text-[#B69A67]" />
            Clientes Compradores da Sua Marca
          </h3>
          <p className="text-[11px] text-stone-500 mb-4">Empresas atendidas com compras dos seus produtos.</p>

          {factoryCustomers.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400">Nenhum cliente comprou ainda</div>
          ) : (
            <div className="space-y-3 text-xs">
              {factoryCustomers.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-[#E5E9E5]/60">
                  <div>
                    <span className="font-semibold text-[#26332D] block">{c.name}</span>
                    <span className="text-[10px] text-stone-500">
                      Último pedido: {new Date(c.lastOrder).toLocaleDateString('pt-BR')} • {c.count} compra(s)
                    </span>
                  </div>
                  <div className="text-right font-bold text-[#26332D]">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total)}
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
