import React, { useState, useMemo } from 'react';
import { useCRM } from '../../lib/store';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Package,
  Building2,
  Factory,
  Clock,
  CheckCircle2,
  DollarSign,
  Calendar,
  X,
  FileSpreadsheet,
  Briefcase,
  TrendingUp,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { canWriteData, canViewCommissions, canDeleteOrder, isRepresentadaUser, isAssociadoUser, Order, OrderStatus } from '../../types';

export const OrdersView: React.FC = () => {
  const {
    orders,
    customers,
    manufacturers,
    products,
    currentMember,
    addOrder,
    updateOrderStatus,
    deleteOrder,
    convertContactToClient,
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Order Form state
  const [selectedMfrId, setSelectedMfrId] = useState('');
  const [selectedCustId, setSelectedCustId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [orderNumber, setOrderNumber] = useState(`PED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemDescription, setItemDescription] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemPrice, setItemPrice] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouped customers for order placement (Active clients + Prospects eligible for conversion)
  const activeClientsList = useMemo(() => {
    return customers.filter(c => c.entity_type === 'client');
  }, [customers]);

  const prospectContactsList = useMemo(() => {
    return customers.filter(c => c.entity_type === 'contact');
  }, [customers]);

  // Available products for selected manufacturer
  const availableProducts = useMemo(() => {
    if (!selectedMfrId) return products;
    return products.filter(p => p.manufacturer_id === selectedMfrId);
  }, [products, selectedMfrId]);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setItemDescription(prod.name);
      setItemSku(prod.sku);
      setItemPrice(prod.unit_price);
      setItemQuantity(prod.minimum_order_quantity || 1);
      if (!selectedMfrId && prod.manufacturer_id) {
        setSelectedMfrId(prod.manufacturer_id);
      }
    }
  };

  const roleCode = currentMember?.role_code;
  const canCreate = canWriteData(roleCode);
  const canCommissions = canViewCommissions(roleCode);
  const canDelete = canDeleteOrder(roleCode);

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOrder(orderToDelete.id);
      if (selectedOrderDetails?.id === orderToDelete.id) {
        setSelectedOrderDetails(null);
      }
      setOrderToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir pedido.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Scoped orders filtering
  const scopedOrders = useMemo(() => {
    let list = orders;
    if (isRepresentadaUser(roleCode)) {
      const mfrId = currentMember?.scope_manufacturer_id || currentMember?.scopes?.[0]?.scope_id;
      if (mfrId) list = list.filter(o => o.manufacturer_id === mfrId);
    } else if (isAssociadoUser(roleCode)) {
      const custId = currentMember?.scope_customer_id || currentMember?.scopes?.[0]?.scope_id;
      if (custId) list = list.filter(o => o.customer_id === custId);
    }

    return list.filter(o => {
      const matchSearch =
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.manufacturer_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, roleCode, currentMember, searchTerm, statusFilter]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMfrId || !selectedCustId || !itemDescription) {
      alert('Selecione a fábrica, o cliente e informe o item do pedido.');
      return;
    }

    const mfr = manufacturers.find(m => m.id === selectedMfrId);
    const cust = customers.find(c => c.id === selectedCustId);
    if (!mfr || !cust) return;

    const total = itemQuantity * itemPrice;
    const rate = mfr.initial_commission_rate || 5.0;
    const commission = (total * rate) / 100;

    setIsSubmitting(true);
    try {
      await addOrder({
        order_number: orderNumber,
        customer_id: cust.id,
        customer_name: cust.trade_name || cust.legal_name,
        manufacturer_id: mfr.id,
        manufacturer_name: mfr.name,
        order_date: orderDate,
        status: 'submitted',
        total_amount: total,
        commission_rate: rate,
        commission_amount: commission,
        seller_name: currentMember?.full_name || 'Julienne Ferreira',
        items: [
          {
            sku: itemSku || 'SKU-001',
            description: itemDescription,
            quantity: itemQuantity,
            unit_price: itemPrice,
            total_price: total,
          },
        ],
      });

      // If customer was a prospect contact, promote to active client upon first order
      if (cust.entity_type === 'contact') {
        try {
          await convertContactToClient(cust.id);
        } catch (convErr) {
          console.warn('[ILEX] Failed to auto-convert prospect on order creation:', convErr);
        }
      }

      setIsNewOrderModalOpen(false);
      setItemDescription('');
      setItemSku('');
      setOrderNumber(`PED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao registrar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E5] pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
            Pedidos &amp; Faturamentos B2B
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Gestão de pedidos de representação comercial, itens industriais e rastreamento de status.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#355C4D] hover:bg-[#233D33] text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
          >
            <Plus size={16} className="text-[#B69A67]" />
            <span>Emitir Novo Pedido</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente ou fábrica..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] text-xs focus:outline-none focus:border-[#355C4D]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E9E5] bg-white text-xs font-medium text-[#26332D]"
          >
            <option value="all">Todos</option>
            <option value="submitted">Submetido</option>
            <option value="invoiced">Faturado</option>
            <option value="partially_received">Parcial</option>
            <option value="received">Recebido</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#26332D]">Listagem Geral de Pedidos</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {scopedOrders.length} pedido(s)
          </span>
        </div>

        {scopedOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400 space-y-2">
            <Package size={24} className="mx-auto text-stone-300" />
            <p className="font-semibold text-stone-600">Nenhum pedido localizado.</p>
            <p>Utilize o botão acima para cadastrar o primeiro pedido da carteira.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-[#E5E9E5] text-stone-500 font-semibold">
                  <th className="py-3 px-4">Pedido / Data</th>
                  <th className="py-3 px-4">Fábrica</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  {canCommissions && <th className="py-3 px-4 text-right">Comissão ILEX</th>}
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E5]">
                {scopedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#26332D]">
                      {order.order_number}
                      <span className="block text-[11px] text-stone-400 font-normal">
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
                    {canCommissions && (
                      <td className="py-3.5 px-4 text-right font-bold text-[#355C4D]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.commission_amount)}
                        <span className="block text-[10px] text-stone-400 font-normal">
                          ({order.commission_rate}%)
                        </span>
                      </td>
                    )}
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
                        {order.status === 'received' ? 'Recebido' : order.status === 'invoiced' ? 'Faturado' : 'Submetido'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrderDetails(order)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#355C4D] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Detalhes
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setOrderToDelete(order)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir pedido"
                            aria-label={`Excluir pedido ${order.order_number}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E9E5] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#26332D]">
                  Detalhes do Pedido {selectedOrderDetails.order_number}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Data de emissão: {new Date(selectedOrderDetails.order_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-xl border border-[#E5E9E5]">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-semibold">Cliente</span>
                  <p className="font-bold text-[#26332D] text-xs mt-0.5">{selectedOrderDetails.customer_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-semibold">Fábrica</span>
                  <p className="font-bold text-[#26332D] text-xs mt-0.5">{selectedOrderDetails.manufacturer_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-semibold">Vendedor / Assessor</span>
                  <p className="font-medium text-[#26332D] text-xs mt-0.5">{selectedOrderDetails.seller_name || 'Julienne Ferreira'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-semibold">Status Operacional</span>
                  <p className="font-medium text-[#355C4D] text-xs mt-0.5 capitalize">{selectedOrderDetails.status}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#26332D] mb-2">Itens do Pedido</h4>
                <div className="space-y-1.5">
                  {(selectedOrderDetails.items || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E9E5]">
                      <div>
                        <span className="font-semibold text-[#26332D] block">{item.description}</span>
                        <span className="text-[10px] text-stone-400 font-mono">SKU: {item.sku} • {item.quantity} un x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price)}</span>
                      </div>
                      <span className="font-bold text-[#26332D]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_price ?? item.total_net_price ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#355C4D]/5 rounded-xl border border-[#355C4D]/20 flex items-center justify-between">
                <span className="font-semibold text-stone-600">Total do Pedido:</span>
                <span className="text-base font-bold text-[#26332D]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrderDetails.total_amount)}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-[#E5E9E5] bg-stone-50 flex items-center justify-between">
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setOrderToDelete(selectedOrderDetails)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100/80 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Excluir Pedido</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs hover:bg-stone-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Esta ação removerá o registro de pedido e atualizará os faturamentos.
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
                  <span className="text-stone-500">Fábrica Representada:</span>
                  <span className="font-semibold text-stone-900">{orderToDelete.manufacturer_name}</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2">
                  <span className="text-stone-500">Valor Total:</span>
                  <span className="font-bold text-stone-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderToDelete.total_amount)}
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

      {/* New Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E9E5] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#26332D]">Cadastrar Pedido / Orçamento</h3>
              <button onClick={() => setIsNewOrderModalOpen(false)} className="text-stone-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Fábrica Representada *</label>
                  <select
                    required
                    value={selectedMfrId}
                    onChange={e => setSelectedMfrId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6]"
                  >
                    <option value="">Selecione...</option>
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Cliente Comprador *</label>
                  <select
                    required
                    value={selectedCustId}
                    onChange={e => setSelectedCustId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6]"
                  >
                    <option value="">Selecione o cliente ou prospect...</option>
                    {activeClientsList.length > 0 && (
                      <optgroup label="Carteira de Clientes Ativos">
                        {activeClientsList.map(c => (
                          <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                        ))}
                      </optgroup>
                    )}
                    {prospectContactsList.length > 0 && (
                      <optgroup label="Contatos em Prospecção (Ativação Automática ao Emitir)">
                        {prospectContactsList.map(c => (
                          <option key={c.id} value={c.id}>⭐ [Prospect] {c.trade_name || c.legal_name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {/* Product catalog selector */}
              <div>
                <label className="block text-[11px] font-semibold text-[#355C4D] mb-1 flex items-center justify-between">
                  <span>Selecionar do Catálogo de Produtos</span>
                  <span className="text-[10px] text-stone-400 font-normal">Preenche dados automaticamente</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => handleSelectProduct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#355C4D]/30 bg-[#F7F8F6] text-stone-800 font-medium"
                >
                  <option value="">-- Escolha um produto cadastrado ou digite abaixo --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.unit_price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Descrição do Item Principal *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Painel Elétrico de Distribuição 400A"
                  value={itemDescription}
                  onChange={e => setItemDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">SKU</label>
                  <input
                    type="text"
                    placeholder="PNL-01"
                    value={itemSku}
                    onChange={e => setItemSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={e => setItemQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">Preço Unit. (R$)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={itemPrice}
                    onChange={e => setItemPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9E5]">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E9E5] text-stone-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#355C4D] text-white font-semibold hover:bg-[#233D33]"
                >
                  Salvar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const PipelineAgendaView: React.FC = () => {
  const { orders } = useCRM();

  const cotacoes = orders.filter(o => o.status === 'submitted');
  const negociacoes = orders.filter(o => o.status === 'invoiced');
  const aguardando = orders.filter(o => o.status === 'partially_received');
  const fechados = orders.filter(o => o.status === 'received');

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="border-b border-[#E5E9E5] pb-5">
        <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">Funil Comercial &amp; Agenda de Atendimentos</h1>
        <p className="text-xs text-stone-500 mt-1">
          Acompanhamento de atendimentos e negociações com base em dados reais da organização.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-4 space-y-3">
          <div className="font-bold text-stone-700 flex items-center justify-between">
            <span>Cotação / Levantamento</span>
            <span className="text-[10px] px-2 py-0.5 bg-stone-100 rounded-full font-semibold">{cotacoes.length}</span>
          </div>
          {cotacoes.length === 0 ? (
            <p className="text-[11px] text-stone-400 italic py-2 text-center">Nenhum atendimento nesta etapa.</p>
          ) : (
            cotacoes.map(o => (
              <div key={o.id} className="p-3 bg-stone-50 rounded-xl border border-[#E5E9E5] space-y-1">
                <span className="font-bold text-[#26332D] block">{o.customer_name}</span>
                <span className="text-stone-500 text-[11px] block">{o.manufacturer_name} • {o.order_number}</span>
                <span className="text-amber-700 text-[10px] font-semibold">Submetido</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-4 space-y-3">
          <div className="font-bold text-stone-700 flex items-center justify-between">
            <span>Negociação de Lote</span>
            <span className="text-[10px] px-2 py-0.5 bg-stone-100 rounded-full font-semibold">{negociacoes.length}</span>
          </div>
          {negociacoes.length === 0 ? (
            <p className="text-[11px] text-stone-400 italic py-2 text-center">Nenhuma negociação nesta etapa.</p>
          ) : (
            negociacoes.map(o => (
              <div key={o.id} className="p-3 bg-stone-50 rounded-xl border border-[#E5E9E5] space-y-1">
                <span className="font-bold text-[#26332D] block">{o.customer_name}</span>
                <span className="text-stone-500 text-[11px] block">{o.manufacturer_name} • {o.order_number}</span>
                <span className="text-blue-700 text-[10px] font-semibold">Faturado</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-4 space-y-3">
          <div className="font-bold text-stone-700 flex items-center justify-between">
            <span>Aguardando Fábrica</span>
            <span className="text-[10px] px-2 py-0.5 bg-stone-100 rounded-full font-semibold">{aguardando.length}</span>
          </div>
          {aguardando.length === 0 ? (
            <p className="text-[11px] text-stone-400 italic py-2 text-center">Nenhum pedido aguardando fábrica.</p>
          ) : (
            aguardando.map(o => (
              <div key={o.id} className="p-3 bg-stone-50 rounded-xl border border-[#E5E9E5] space-y-1">
                <span className="font-bold text-[#26332D] block">{o.customer_name}</span>
                <span className="text-stone-500 text-[11px] block">{o.manufacturer_name} • {o.order_number}</span>
                <span className="text-purple-700 text-[10px] font-semibold">Recebimento Parcial</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-4 space-y-3">
          <div className="font-bold text-stone-700 flex items-center justify-between">
            <span>Fechado &amp; Liquidado</span>
            <span className="text-[10px] px-2 py-0.5 bg-stone-100 rounded-full font-semibold">{fechados.length}</span>
          </div>
          {fechados.length === 0 ? (
            <p className="text-[11px] text-stone-400 italic py-2 text-center">Nenhum pedido liquidado.</p>
          ) : (
            fechados.map(o => (
              <div key={o.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-[#26332D] block">{o.customer_name}</span>
                <span className="text-stone-500 text-[11px] block">{o.manufacturer_name} • {o.order_number}</span>
                <span className="text-emerald-800 text-[10px] font-semibold">Comissão liquidada</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const CommissionsView: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="border-b border-[#E5E9E5] pb-5">
        <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">Gestão Financeira &amp; Comissões</h1>
        <p className="text-xs text-stone-500 mt-1">
          Rastreabilidade de regras de comissionamento das indústrias e liquidações financeiras.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-[#355C4D] uppercase">Regra Torralf (Painéis Elétricos)</span>
          <p className="text-xs text-stone-700 font-medium">5,0% sobre o Faturamento Bruto da Indústria</p>
          <p className="text-[11px] text-stone-500">
            A comissão é reconhecida imediatamente no ato da emissão da nota fiscal de saída da fábrica.
          </p>
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-[11px] font-bold text-[#B69A67] uppercase">Regra Betel (Transformadores)</span>
          <p className="text-xs text-stone-700 font-medium">5,0% sobre a Liquidação / Recebimento</p>
          <p className="text-[11px] text-stone-500">
            A comissão é liberada conforme as duplicatas são quitadas pelo cliente comprador.
          </p>
        </div>
      </div>
    </div>
  );
};

export const FinanceAdvisoryView: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      <div className="border-b border-[#E5E9E5] pb-5">
        <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">Assessoria Comercial &amp; Planos Mensais</h1>
        <p className="text-xs text-stone-500 mt-1">
          Planos de assessoria B2B contratados por indústrias e parceiros.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs space-y-3">
          <span className="text-xs font-bold text-stone-500 uppercase">Plano Básico</span>
          <div className="text-2xl font-bold text-[#26332D]">R$ 2.500,00<span className="text-xs font-normal text-stone-400">/mês</span></div>
          <p className="text-xs text-stone-500">Assessoria de posicionamento e homologação em 10 contas estratégicas.</p>
        </div>

        <div className="bg-white border border-[#355C4D]/30 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#355C4D] text-white text-[9px] font-bold uppercase rounded-bl-lg">
            Mais Escolhido
          </div>
          <span className="text-xs font-bold text-[#355C4D] uppercase">Plano Pro</span>
          <div className="text-2xl font-bold text-[#355C4D]">R$ 3.500,00<span className="text-xs font-normal text-stone-400">/mês + 3%</span></div>
          <p className="text-xs text-stone-500">Gestão ativa de carteira, pós-venda técnico e expansão interestadual.</p>
        </div>

        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-5 shadow-xs space-y-3">
          <span className="text-xs font-bold text-[#B69A67] uppercase">Plano Premium</span>
          <div className="text-2xl font-bold text-[#26332D]">R$ 5.000,00<span className="text-xs font-normal text-stone-400">/mês + 5%</span></div>
          <p className="text-xs text-stone-500">Estruturação comercial integral, canal de distribuição e representação exclusiva.</p>
        </div>
      </div>
    </div>
  );
};
