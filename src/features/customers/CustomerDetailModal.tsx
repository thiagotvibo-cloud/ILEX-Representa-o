import React, { useState } from 'react';
import { Customer, CustomerAddress, CustomerContact, CustomerManufacturerLink } from '../../types';
import {
  X,
  Building2,
  MapPin,
  Users,
  Factory,
  FileCheck2,
  Clock,
  FileText,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { calculateNextReorderDate } from '../../domain/validation';

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
  onUpdate: (updated: Partial<Customer>) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onEdit,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<
    'identificacao' | 'enderecos' | 'contatos' | 'comercial' | 'fiscal' | 'historico' | 'documentos'
  >('identificacao');

  // Contact modal state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState<Partial<CustomerContact>>({
    name: '',
    role: '',
    phone: '',
    email: '',
    whatsapp: '',
    preferred_channel: 'whatsapp',
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name) return;
    const contact: CustomerContact = {
      id: crypto.randomUUID(),
      customer_id: customer.id,
      name: newContact.name,
      role: newContact.role || '',
      email: newContact.email || '',
      phone: newContact.phone || '',
      whatsapp: newContact.whatsapp || '',
      preferred_channel: newContact.preferred_channel || 'whatsapp',
      is_primary: (customer.contacts?.length || 0) === 0,
      created_at: new Date().toISOString(),
    };
    const updatedContacts = [...(customer.contacts || []), contact];
    onUpdate({ contacts: updatedContacts });
    setIsAddingContact(false);
    setNewContact({ name: '', role: '', phone: '', email: '', whatsapp: '', preferred_channel: 'whatsapp' });
  };

  const tabs = [
    { id: 'identificacao', label: '1. Identificação', icon: Building2 },
    { id: 'enderecos', label: '2. Endereços', icon: MapPin },
    { id: 'contatos', label: '3. Contatos', icon: Users },
    { id: 'comercial', label: '4. Comercial / Fábrica', icon: Factory },
    { id: 'fiscal', label: '5. Fiscal Contextual', icon: FileCheck2 },
    { id: 'historico', label: '6. Relacionamento', icon: Clock },
    { id: 'documentos', label: '7. Documentos', icon: FileText },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E2DDD5] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-[#E2DDD5] bg-[#F8F7F4] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1C1A17]">{customer.legal_name}</h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  customer.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : customer.status === 'incomplete'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {customer.status === 'incomplete' ? 'Cadastro Incompleto' : customer.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                {customer.country === 'BRA' ? 'Brasil' : customer.country}
              </span>
            </div>
            {customer.trade_name && (
              <p className="text-xs text-stone-500 mt-0.5">Nome Fantasia: {customer.trade_name}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs font-semibold bg-[#3E4A32] text-white hover:bg-[#2C3524] rounded-lg transition-colors"
            >
              Editar Cadastro
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-500"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-[#E2DDD5] bg-white px-4 shrink-0 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-[#A78A63] text-[#3E4A32] bg-[#EDF1EA]/40'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#A78A63]' : 'text-stone-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-[#1C1A17]">
          {/* 1. Identificação */}
          {activeTab === 'identificacao' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Documento ({customer.document_type})</span>
                <span className="text-sm font-bold font-mono">
                  {customer.document || 'Não informado (Cadastro Inicial)'}
                </span>
              </div>

              <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Inscrição Estadual</span>
                <span className="text-sm font-semibold">
                  {customer.is_ie_exempt ? 'ISENTO' : customer.state_registration || 'Não informada'}
                </span>
              </div>

              <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Tipo / Estabelecimento</span>
                <span className="text-sm font-semibold">
                  {customer.person_type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} • {customer.is_branch ? 'Filial' : 'Matriz'}
                </span>
              </div>

              <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Segmento</span>
                <span className="text-sm font-semibold">{customer.segment || 'Não informado'}</span>
              </div>

              <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Porte</span>
                <span className="text-sm font-semibold">{customer.company_size || 'Não informado'}</span>
              </div>

              <div className="p-3 bg-[#F8F7F4] rounded-lg border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {customer.tags.length > 0 ? (
                    customer.tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-stone-200 text-stone-800 rounded text-[10px]">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-stone-400">Nenhuma tag</span>
                  )}
                </div>
              </div>

              <div className="col-span-full p-3 bg-[#F8F7F4] rounded-lg border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Observações Comerciais</span>
                <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                  {customer.notes || 'Sem observações registradas.'}
                </p>
              </div>
            </div>
          )}

          {/* 2. Endereços */}
          {activeTab === 'enderecos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm">Endereços Registrados</h3>
                <span className="text-stone-400 text-[11px]">Faturamento, Entrega e Cobrança</span>
              </div>

              {(!customer.addresses || customer.addresses.length === 0) ? (
                <div className="p-8 text-center bg-[#F8F7F4] rounded-xl border border-dashed border-stone-300 text-stone-500">
                  <MapPin size={24} className="mx-auto mb-2 text-stone-400" />
                  <p className="font-semibold text-xs">Nenhum endereço cadastrado</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Os dados cadastrais serão preenchidos mediante documento ou solicitação da fábrica.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customer.addresses.map((addr, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-[#E2DDD5] bg-[#F8F7F4] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase text-[10px] text-[#3E4A32] px-2 py-0.5 rounded bg-[#EDF1EA]">
                          {addr.type}
                        </span>
                        {addr.is_primary && (
                          <span className="text-[10px] font-semibold text-amber-700">Principal</span>
                        )}
                      </div>
                      <p className="font-semibold text-xs mt-1">
                        {addr.street}, {addr.number} {addr.complement}
                      </p>
                      <p className="text-stone-500 text-[11px]">
                        {addr.district} - {addr.city}/{addr.state} - CEP: {addr.postal_code || 'S/N'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Contatos */}
          {activeTab === 'contatos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Contatos Comerciais</h3>
                  <p className="text-[11px] text-stone-500">Compradores, diretores e canais preferenciais</p>
                </div>
                {!isAddingContact && (
                  <button
                    onClick={() => setIsAddingContact(true)}
                    className="px-3 py-1.5 bg-[#3E4A32] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Adicionar Contato
                  </button>
                )}
              </div>

              {isAddingContact && (
                <form onSubmit={handleAddContact} className="p-4 bg-[#EDF1EA] rounded-xl border border-[#3E4A32]/30 space-y-3">
                  <h4 className="font-bold text-xs text-[#3E4A32]">Novo Contato</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-stone-700 block mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={newContact.name}
                        onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                        className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-stone-700 block mb-1">Função / Cargo</label>
                      <input
                        type="text"
                        placeholder="Ex: Comprador Materiais"
                        value={newContact.role}
                        onChange={e => setNewContact({ ...newContact, role: e.target.value })}
                        className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-stone-700 block mb-1">WhatsApp / Telefone</label>
                      <input
                        type="text"
                        placeholder="(41) 99999-9999"
                        value={newContact.whatsapp}
                        onChange={e => setNewContact({ ...newContact, whatsapp: e.target.value, phone: e.target.value })}
                        className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-stone-700 block mb-1">E-mail</label>
                      <input
                        type="email"
                        placeholder="compras@cliente.com.br"
                        value={newContact.email}
                        onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                        className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingContact(false)}
                      className="px-3 py-1 text-xs text-stone-600 hover:bg-stone-200 rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-[#3E4A32] text-white text-xs font-semibold rounded"
                    >
                      Salvar Contato
                    </button>
                  </div>
                </form>
              )}

              {(!customer.contacts || customer.contacts.length === 0) ? (
                <div className="p-8 text-center bg-[#F8F7F4] rounded-xl border border-dashed border-stone-300 text-stone-500">
                  <Users size={24} className="mx-auto mb-2 text-stone-400" />
                  <p className="font-semibold text-xs">Nenhum contato adicionado ainda</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Adicione os responsáveis de compras para facilitar contato direto por WhatsApp ou ligação.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customer.contacts.map((cnt, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-[#E2DDD5] bg-[#F8F7F4] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#1C1A17]">{cnt.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-medium">
                          {cnt.role || 'Geral'}
                        </span>
                      </div>
                      <div className="space-y-1 text-stone-600 text-[11px]">
                        {cnt.whatsapp && (
                          <div className="flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-emerald-600" />
                            <span>WhatsApp: {cnt.whatsapp}</span>
                            <a
                              href={`https://wa.me/55${cnt.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-700 hover:underline font-semibold ml-1"
                            >
                              Abrir
                            </a>
                          </div>
                        )}
                        {cnt.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail size={13} className="text-stone-400" />
                            <span>{cnt.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Comercial por Fábrica */}
          {activeTab === 'comercial' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">Vínculo Comercial com Fábricas</h3>
                  <p className="text-[11px] text-stone-500">
                    Ciclo de recompra informado (60 dias padrão), código no ERP da indústria e limite
                  </p>
                </div>
              </div>

              {(!customer.manufacturer_links || customer.manufacturer_links.length === 0) ? (
                <div className="p-8 text-center bg-[#F8F7F4] rounded-xl border border-dashed border-stone-300 text-stone-500">
                  <Factory size={24} className="mx-auto mb-2 text-stone-400" />
                  <p className="font-semibold text-xs">Nenhum vínculo de fábrica registrado</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Tambasa compra Betel. Para os demais clientes, o vínculo será registrado conforme demanda.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customer.manufacturer_links.map((link, idx) => {
                    const nextReorder = calculateNextReorderDate(
                      link.last_order_date || '',
                      link.reorder_cycle_days || 60
                    );

                    return (
                      <div key={idx} className="p-4 rounded-xl border border-[#E2DDD5] bg-[#F8F7F4] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#3E4A32]">
                            Fábrica: {link.manufacturer_name || 'Betel'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            Limite: {link.credit_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase block">Ciclo Configurado</span>
                            <span className="font-bold">{link.reorder_cycle_days || 60} dias</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase block">Último Pedido Válido</span>
                            <span className="font-medium text-stone-700">
                              {link.last_order_date || 'Sem histórico'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase block">Próxima Recompra</span>
                            <span className="font-bold text-[#3E4A32]">
                              {nextReorder || 'Sem histórico de compra'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. Fiscal Contextual */}
          {activeTab === 'fiscal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Condição de Contribuinte ICMS</span>
                <span className="text-sm font-bold capitalize">
                  {customer.icms_taxpayer_type === 'taxpayer'
                    ? 'Contribuinte ICMS'
                    : customer.icms_taxpayer_type === 'exempt'
                    ? 'Isento de ICMS'
                    : 'Não Contribuinte'}
                </span>
                <p className="text-[10px] text-stone-400 mt-1">
                  Afeta diretamente o cálculo de DIFAL e aplicação de alíquotas interestaduais nas propostas.
                </p>
              </div>

              <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E2DDD5]">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">Regime Tributário Informado</span>
                <span className="text-sm font-bold capitalize">
                  {customer.tax_regime ? customer.tax_regime.replace('_', ' ') : 'Não informado'}
                </span>
                <p className="text-[10px] text-stone-400 mt-1">
                  Validação efetuada com base no cadastro comercial da indústria.
                </p>
              </div>
            </div>
          )}

          {/* 6. Histórico */}
          {activeTab === 'historico' && (
            <div className="p-8 text-center bg-[#F8F7F4] rounded-xl border border-dashed border-stone-300 text-stone-500">
              <Clock size={24} className="mx-auto mb-2 text-stone-400" />
              <p className="font-semibold text-xs">Sem atividades ou vendas registradas</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Não criamos vendas sintéticas inventadas. Os pedidos reais serão gerados na Etapa 2.
              </p>
            </div>
          )}

          {/* 7. Documentos */}
          {activeTab === 'documentos' && (
            <div className="p-8 text-center bg-[#F8F7F4] rounded-xl border border-dashed border-stone-300 text-stone-500">
              <FileText size={24} className="mx-auto mb-2 text-stone-400" />
              <p className="font-semibold text-xs">Armazenamento Privado de Documentos</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Contratos sociais, certidões e fichas cadastrais serão integrados ao Storage privado do Supabase.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2DDD5] bg-[#F8F7F4] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
