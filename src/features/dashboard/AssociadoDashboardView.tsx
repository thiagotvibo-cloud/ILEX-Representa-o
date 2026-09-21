import React, { useMemo } from 'react';
import { useCRM } from '../../lib/store';
import {
  Building2,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Factory,
} from 'lucide-react';
import { ROLE_DEFINITIONS } from '../../types';

export const AssociadoDashboardView: React.FC = () => {
  const {
    currentMember,
    orders,
    customers,
    isLoadingData,
    refreshData,
  } = useCRM();

  // Find customer linked to this user's scope
  const targetCustomerId = currentMember?.scope_customer_id ||
    currentMember?.scopes?.find(s => s.scope_type === 'customer')?.scope_id ||
    'cust-tambasa'; // fallback default for preview

  const currentCustomer = useMemo(() => {
    return customers.find(c => c.id === targetCustomerId) || {
      id: targetCustomerId,
      legal_name: 'Tambasa Atacadista S.A.',
      trade_name: 'Tambasa',
      segment: 'Atacado e Distribuição de Materiais Elétricos',
      status: 'active' as const,
    };
  }, [customers, targetCustomerId]);

  // STRICT ISOLATION: Only orders of this customer
  const customerOrders = useMemo(() => {
    return orders.filter(o => o.customer_id === targetCustomerId);
  }, [orders, targetCustomerId]);

  // Metrics
  const metrics = useMemo(() => {
    let totalPurchases = 0;
    let deliveredCount = 0;
    let inProgressCount = 0;

    customerOrders.forEach(o => {
      totalPurchases += o.total_amount;
      if (o.status === 'received' || o.status === 'invoiced') {
        deliveredCount += 1;
      } else {
        inProgressCount += 1;
      }
    });

    return {
      totalPurchases,
      ordersCount: customerOrders.length,
      deliveredCount,
      inProgressCount,
    };
  }, [customerOrders]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header with Customer Identification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E5] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#355C4D]/10 text-[#355C4D] flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
                  {currentCustomer.trade_name || currentCustomer.legal_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#355C4D]/10 text-[#355C4D] border border-[#355C4D]/20">
                  {currentMember?.role_code ? ROLE_DEFINITIONS[currentMember.role_code]?.label : 'Portal do Associado'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Acompanhamento exclusivo da carteira vinculada e evolução dos pedidos intermediados pela ILEX.
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
            <span className="w-2 h-2 rounded-full bg-[#355C4D]" />
            <span>Carteira Própria Vinculada</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Total em Compras Intermediadas
          </span>
          <div className="text-2xl font-bold text-[#26332D]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalPurchases)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Volume histórico acumulado em suprimentos industriais.
          </p>
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Pedidos Faturados / Concluídos
          </span>
          <div className="text-2xl font-bold text-emerald-800">{metrics.deliveredCount}</div>
          <p className="text-[11px] text-stone-500 mt-1">
            Notas fiscais emitidas pelas fábricas parceiras.
          </p>
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Pedidos em Andamento
          </span>
          <div className="text-2xl font-bold text-amber-800">{metrics.inProgressCount}</div>
          <p className="text-[11px] text-stone-500 mt-1">
            Processamento e fabricação nas indústrias parceiras.
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#26332D]">Histórico de Pedidos da Sua Carteira</h2>
            <p className="text-[11px] text-stone-500">
              Rastreamento de solicitações, valores e status junto às fábricas representadas.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {customerOrders.length} pedido(s)
          </span>
        </div>

        {customerOrders.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-400">
            Nenhum pedido registrado para a sua carteira até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-[#E5E9E5] text-stone-500 font-semibold">
                  <th className="py-3 px-4">Pedido / Data</th>
                  <th className="py-3 px-4">Fábrica Fornecedora</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Assessor ILEX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E5]">
                {customerOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#26332D] block">{order.order_number}</span>
                      <span className="text-[11px] text-stone-500">
                        {new Date(order.order_date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-stone-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Factory size={13} className="text-[#355C4D]" />
                        {order.manufacturer_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#26332D]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
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
                        {order.status === 'received' ? 'Concluído' : order.status === 'invoiced' ? 'Faturado' : 'Em Produção'}
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

      {/* Advisory Support Notice */}
      <div className="bg-[#355C4D]/5 border border-[#355C4D]/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#26332D] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#355C4D]" />
            Assessoria Dedicada ILEX Representações
          </h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xl">
            Sua conta conta com atendimento consultivo para cotações personalizadas, negociações de lote e acompanhamento logístico junto aos maiores fabricantes do Brasil.
          </p>
        </div>
        <div className="text-xs text-stone-500 shrink-0">
          Contato direto: <strong>contato@ilexrepresentacoes.com.br</strong>
        </div>
      </div>
    </div>
  );
};
