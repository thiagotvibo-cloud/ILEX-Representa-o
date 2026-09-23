import React, { useState, useMemo, useEffect } from 'react';
import { useCRM, sortAlphabetically } from '../../lib/store';
import {
  Contact,
  Users,
  Factory,
  User,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  ArrowUpRight,
  Phone,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Customer, canWriteData } from '../../types';
import { SpreadsheetImportModal } from '../../components/SpreadsheetImportModal';

export const ContactsView: React.FC = () => {
  const { customers, currentMember, addCustomer, updateCustomer, deleteCustomer, batchDeleteCustomers, batchUpdateCustomers, convertContactToClient } = useCRM();

  const [activeTab, setActiveTab] = useState<'all' | 'person' | 'factory'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(50);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Customer | null>(null);

  // Form State
  const [contactSubtype, setContactSubtype] = useState<'person' | 'factory'>('person');
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [document, setDocument] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('PR');
  const [segment, setSegment] = useState('Materiais / Indústria');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleCode = currentMember?.role_code;
  const canManage = canWriteData(roleCode);

  // Filter contacts (entity_type === 'contact') and sort alphabetically A-Z
  const allContacts = useMemo(() => {
    const list = customers.filter((c) => c.entity_type === 'contact');
    return sortAlphabetically(list);
  }, [customers]);

  const personContactsCount = useMemo(() => {
    return allContacts.filter((c) => c.contact_subtype === 'person' || !c.contact_subtype).length;
  }, [allContacts]);

  const factoryContactsCount = useMemo(() => {
    return allContacts.filter((c) => c.contact_subtype === 'factory').length;
  }, [allContacts]);

  const filteredContacts = useMemo(() => {
    const list = allContacts.filter((c) => {
      // Tab filter
      if (activeTab === 'person') {
        if (c.contact_subtype === 'factory') return false;
      } else if (activeTab === 'factory') {
        if (c.contact_subtype !== 'factory') return false;
      }

      // State filter
      const cState = c.contact_state || c.addresses?.[0]?.state;
      if (selectedStateFilter !== 'all' && cState !== selectedStateFilter) {
        return false;
      }

      // Search filter
      const search = searchTerm.toLowerCase();
      const matchName = (c.legal_name || '').toLowerCase().includes(search);
      const matchTrade = (c.trade_name || '').toLowerCase().includes(search);
      const matchDoc = (c.document || '').toLowerCase().includes(search);
      const matchPerson = (c.contact_person_name || c.contacts?.[0]?.name || '').toLowerCase().includes(search);
      const matchEmail = (c.contact_email || c.contacts?.[0]?.email || '').toLowerCase().includes(search);
      const matchPhone = (c.contact_phone || c.contacts?.[0]?.phone || '').toLowerCase().includes(search);
      const matchCity = (c.contact_city || c.addresses?.[0]?.city || '').toLowerCase().includes(search);
      const matchSegment = (c.segment || '').toLowerCase().includes(search);
      const matchTags = (c.tags || []).some(t => t.toLowerCase().includes(search));

      return matchName || matchTrade || matchDoc || matchPerson || matchEmail || matchPhone || matchCity || matchSegment || matchTags;
    });
    return sortAlphabetically(list);
  }, [allContacts, activeTab, selectedStateFilter, searchTerm]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedStateFilter, searchTerm, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.ceil(filteredContacts.length / Number(pageSize)) || 1;
  }, [filteredContacts.length, pageSize]);

  const paginatedContacts = useMemo(() => {
    if (pageSize === 'all') return filteredContacts;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredContacts.slice(start, start + Number(pageSize));
  }, [filteredContacts, currentPage, pageSize]);

  // Selection helpers
  const isAllSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.includes(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContacts.map(c => c.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBatchConvertToClients = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Deseja promover ${selectedIds.length} contato(s) selecionado(s) para a Carteira de Clientes Ativos?`)) return;
    setIsSubmitting(true);
    try {
      await batchUpdateCustomers(selectedIds, {
        entity_type: 'client',
        status: 'active',
        tags: ['Cliente Ativo', 'Convertido de Prospecção'],
      });
      const count = selectedIds.length;
      setSelectedIds([]);
      setSuccessMessage(`${count} contato(s) promovido(s) com sucesso para Clientes Ativos!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao promover contatos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente ${selectedIds.length} contato(s) selecionado(s)?`)) return;
    setIsSubmitting(true);
    try {
      await batchDeleteCustomers(selectedIds);
      const count = selectedIds.length;
      setSelectedIds([]);
      setSuccessMessage(`${count} contato(s) excluído(s) com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir contatos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenNewModal = () => {
    setEditingContact(null);
    setContactSubtype(activeTab === 'factory' ? 'factory' : 'person');
    setName('');
    setTradeName('');
    setDocument('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setCity('');
    setState('PR');
    setSegment('Materiais Elétricos');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingContact(c);
    setContactSubtype(c.contact_subtype || (c.person_type === 'PJ' ? 'factory' : 'person'));
    setName(c.legal_name);
    setTradeName(c.trade_name || c.legal_name);
    setDocument(c.document || '');
    setContactPerson(c.contact_person_name || c.contacts?.[0]?.name || '');
    setPhone(c.contact_phone || c.contacts?.[0]?.phone || '');
    setEmail(c.contact_email || c.contacts?.[0]?.email || '');
    setCity(c.contact_city || c.addresses?.[0]?.city || '');
    setState(c.contact_state || c.addresses?.[0]?.state || 'PR');
    setSegment(c.segment || 'Materiais');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('Informe o nome ou razão social do contato.');
      return;
    }

    setIsSubmitting(true);
    try {
      const personType: 'PJ' | 'PF' = contactSubtype === 'factory' || document.length > 14 ? 'PJ' : 'PF';

      if (editingContact) {
        await updateCustomer(editingContact.id, {
          legal_name: name,
          trade_name: tradeName || name,
          contact_subtype: contactSubtype,
          contact_person_name: contactPerson,
          contact_phone: phone,
          contact_email: email,
          contact_city: city,
          contact_state: state,
          document: document,
          segment: segment,
          notes: notes,
        });
      } else {
        await addCustomer({
          country: 'BRA',
          person_type: personType,
          legal_name: name,
          trade_name: tradeName || name,
          document_type: personType === 'PJ' ? 'CNPJ' : 'CPF',
          document: document,
          is_ie_exempt: personType === 'PF',
          icms_taxpayer_type: personType === 'PJ' ? 'taxpayer' : 'non_taxpayer',
          status: 'active',
          entity_type: 'contact',
          contact_subtype: contactSubtype,
          contact_person_name: contactPerson || undefined,
          contact_phone: phone || undefined,
          contact_email: email || undefined,
          contact_city: city || undefined,
          contact_state: state || undefined,
          segment: segment,
          tags: [contactSubtype === 'factory' ? 'Fábrica Prospect' : 'Pessoa / Comprador'],
          notes: notes,
          is_branch: false,
          addresses: city
            ? [
                {
                  id: crypto.randomUUID(),
                  customer_id: '',
                  street: '',
                  number: '',
                  district: '',
                  city,
                  state,
                  country: 'BRA',
                  postal_code: '',
                  type: 'billing',
                  is_primary: true,
                },
              ]
            : [],
          contacts:
            contactPerson || phone || email
              ? [
                  {
                    id: crypto.randomUUID(),
                    customer_id: '',
                    name: contactPerson || name,
                    email,
                    phone,
                    preferred_channel: 'whatsapp',
                    is_primary: true,
                  },
                ]
              : [],
          manufacturer_links: [],
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar contato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToClient = async (c: Customer) => {
    if (
      !window.confirm(
        `Deseja converter o contato "${c.trade_name || c.legal_name}" em CLIENTE ATIVO da ILEX? Ele passará a constar na carteira oficial de clientes.`
      )
    )
      return;

    try {
      await convertContactToClient(c.id);
      alert('Contato convertido com sucesso para Cliente Ativo!');
    } catch (err: any) {
      alert(err?.message || 'Erro ao converter para cliente.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deseja remover o contato "${name}"?`)) return;
    try {
      await deleteCustomer(id);
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir contato.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E5] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#355C4D] text-white">
              <Contact size={20} className="text-[#B69A67]" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
              Contatos &amp; Prospecção B2B
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Gestão de potenciais compradores, pessoas físicas, compradores industriais e fábricas em prospecção.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Spreadsheet Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-stone-50 text-[#355C4D] border border-[#355C4D]/30 font-semibold text-xs rounded-xl shadow-2xs transition-colors"
          >
            <FileSpreadsheet size={16} className="text-[#355C4D]" />
            <span>Importar Planilha</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenNewModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#355C4D] hover:bg-[#233D33] text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus size={16} className="text-[#B69A67]" />
              <span>Novo Contato</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Todos / Pessoas / Fabricas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E9E5] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#355C4D] text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Contact size={15} />
            <span>Todos os Contatos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-[#233D33] text-white' : 'bg-stone-200 text-stone-700'}`}>
              {allContacts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('person')}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
              activeTab === 'person'
                ? 'bg-[#355C4D] text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <User size={15} />
            <span>Pessoas &amp; Compradores</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'person' ? 'bg-[#233D33] text-white' : 'bg-stone-200 text-stone-700'}`}>
              {personContactsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('factory')}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xl font-bold transition-all ${
              activeTab === 'factory'
                ? 'bg-[#355C4D] text-white shadow-2xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Factory size={15} />
            <span>Fábricas &amp; Indústrias</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'factory' ? 'bg-[#233D33] text-white' : 'bg-stone-200 text-stone-700'}`}>
              {factoryContactsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-semibold animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Business Rule Notice */}
      <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-2.5 text-stone-700 text-xs">
        <Sparkles size={16} className="text-[#B69A67] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-stone-800">
            Fluxo de Prospecção &amp; Ativação de Clientes
          </p>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Planilhas importadas e novos contatos entram <strong>exclusivamente nesta aba de Prospecção</strong> e não aparecem na Carteira de Clientes Ativos. Quando um contato fechar negócio, selecione-o e clique em <strong>"Virou Cliente"</strong> (ou emita um pedido) para promovê-lo para a Carteira Oficial de Clientes Ativos.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          {filteredContacts.length > 0 && canManage && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 select-none bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-2 rounded-xl transition-colors shrink-0">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 accent-[#355C4D] rounded cursor-pointer"
              />
              <span>Selecionar Todos ({filteredContacts.length})</span>
            </label>
          )}

          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome, comprador, e-mail, telefone ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5E9E5] bg-[#F7F8F6] text-xs focus:outline-none focus:border-[#355C4D]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-[#F7F8F6] px-3 py-1.5 rounded-xl border border-[#E5E9E5]">
            <MapPin size={13} className="text-stone-400" />
            <select
              value={selectedStateFilter}
              onChange={(e) => setSelectedStateFilter(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Estados</option>
              <option value="PR">Paraná (PR)</option>
              <option value="SC">Santa Catarina (SC)</option>
              <option value="RS">Rio Grande do Sul (RS)</option>
              <option value="SP">São Paulo (SP)</option>
              <option value="MS">Mato Grosso do Sul (MS)</option>
            </select>
          </div>

          <div className="text-xs text-stone-500 font-medium">
            Exibindo <strong>{filteredContacts.length}</strong> contatos
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar when items are selected */}
      {selectedIds.length > 0 && canManage && (
        <div className="bg-[#355C4D] text-white p-3.5 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="bg-[#233D33] text-[#FAF7F0] font-bold px-2.5 py-1 rounded-lg text-xs">
              {selectedIds.length} selecionado(s)
            </span>
            <span className="text-xs text-stone-200">
              Escolha uma ação em lote para os contatos selecionados:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchConvertToClients}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF7F0] hover:bg-white text-[#355C4D] font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className="text-[#B69A67]" />
              <span>Promover para Clientes Ativos</span>
              <ArrowUpRight size={14} />
            </button>

            <button
              onClick={handleBatchDelete}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>Excluir Selecionados</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-2 text-stone-300 hover:text-white text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Contacts Cards / List */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-12 text-center shadow-xs">
          <Contact size={40} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-sm font-bold text-stone-700">Nenhum contato encontrado</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Envie sua planilha de contatos ou cadastre novos compradores e fábricas para iniciar a prospecção.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#355C4D] text-[#355C4D] rounded-xl text-xs font-semibold hover:bg-stone-50 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Importar Planilha</span>
            </button>
            {canManage && (
              <button
                onClick={handleOpenNewModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#355C4D] text-white rounded-xl text-xs font-medium hover:bg-[#233D33] cursor-pointer"
              >
                <Plus size={15} className="text-[#B69A67]" />
                <span>Cadastrar Novo Contato</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedContacts.map((c) => {
              const isFactory = c.contact_subtype === 'factory';
              const personName = c.contact_person_name || c.contacts?.[0]?.name;
              const phone = c.contact_phone || c.contacts?.[0]?.phone;
              const email = c.contact_email || c.contacts?.[0]?.email;
              const city = c.contact_city || c.addresses?.[0]?.city;
              const state = c.contact_state || c.addresses?.[0]?.state;
              const cleanPhone = (phone || '').replace(/\D/g, '');
              const isSelected = selectedIds.includes(c.id);

              return (
                <div
                  key={c.id}
                  className={`bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                    isSelected ? 'border-[#355C4D] ring-2 ring-[#355C4D]/20 bg-stone-50/50' : 'border-[#E5E9E5] hover:border-[#B69A67]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(c.id)}
                            className="w-4 h-4 accent-[#355C4D] rounded cursor-pointer"
                          />
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                            isFactory
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isFactory ? <Factory size={11} /> : <User size={11} />}
                          <span>{isFactory ? 'Fábrica' : 'Comprador'}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              title="Editar Contato"
                              className="p-1 text-stone-400 hover:text-[#355C4D] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.trade_name || c.legal_name)}
                              title="Excluir Contato"
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-stone-800 text-sm line-clamp-1" title={c.trade_name || c.legal_name}>
                      {c.trade_name || c.legal_name}
                    </h3>

                    {c.legal_name && c.trade_name && c.legal_name !== c.trade_name && (
                      <p className="text-[11px] text-stone-400 truncate">{c.legal_name}</p>
                    )}

                    <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                      {personName && (
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-[#B69A67] shrink-0" />
                          <span className="font-medium text-stone-800 truncate">{personName}</span>
                        </div>
                      )}

                      {phone && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-stone-600 truncate">
                            <Phone size={13} className="text-stone-400 shrink-0" />
                            <span>{phone}</span>
                          </div>
                          {cleanPhone.length >= 10 && (
                            <a
                              href={`https://wa.me/55${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
                            >
                              <MessageSquare size={11} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}

                      {email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail size={13} className="text-stone-400 shrink-0" />
                          <a href={`mailto:${email}`} className="text-stone-600 hover:underline truncate">
                            {email}
                          </a>
                        </div>
                      )}

                      {(city || state) && (
                        <div className="flex items-center gap-2 text-stone-500">
                          <MapPin size={13} className="text-stone-400 shrink-0" />
                          <span>
                            {city}
                            {city && state ? ', ' : ''}
                            {state}
                          </span>
                        </div>
                      )}
                    </div>

                    {c.notes && (
                      <div className="mt-2.5 p-2 bg-[#F7F8F6] rounded-xl text-[11px] text-stone-500 line-clamp-2">
                        {c.notes}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E9E5] flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">
                      {c.segment || 'Prospecção'}
                    </span>

                    {canManage && (
                      <button
                        onClick={() => handleConvertToClient(c)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF7F0] hover:bg-[#355C4D] text-[#355C4D] hover:text-white border border-[#B69A67]/40 rounded-xl text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                        title="Transformar este contato em Cliente Ativo"
                      >
                        <Sparkles size={12} className="text-[#B69A67]" />
                        <span>Virou Cliente</span>
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {filteredContacts.length > 0 && (
            <div className="p-4 bg-white border border-[#E5E9E5] rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <span>Itens por página:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg font-semibold text-stone-800 cursor-pointer focus:outline-none"
                >
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                  <option value={96}>96</option>
                  <option value={240}>240</option>
                  <option value="all">Todos ({filteredContacts.length})</option>
                </select>
                <span className="text-stone-300">|</span>
                <span>
                  Exibindo {pageSize === 'all' ? `1–${filteredContacts.length}` : `${Math.min((currentPage - 1) * Number(pageSize) + 1, filteredContacts.length)}–${Math.min(currentPage * Number(pageSize), filteredContacts.length)}`} de <strong>{filteredContacts.length}</strong> contatos (Ordem A–Z)
                </span>
              </div>

              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span>Anterior</span>
                  </button>

                  <div className="px-3 py-1 font-bold text-stone-800 bg-stone-50 border border-stone-200 rounded-lg">
                    {currentPage} / {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E9E5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#E5E9E5] bg-[#F7F8F6]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#355C4D] text-white">
                  <Contact size={18} className="text-[#B69A67]" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-sm">
                    {editingContact ? 'Editar Contato' : 'Cadastrar Novo Contato'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Contatos são leads e potenciais compradores antes de virarem clientes ativos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Type selector */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1.5">Tipo de Contato *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setContactSubtype('person')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      contactSubtype === 'person'
                        ? 'border-[#355C4D] bg-[#355C4D]/10 text-[#355C4D]'
                        : 'border-[#E5E9E5] bg-white text-stone-600'
                    }`}
                  >
                    <User size={15} />
                    <span>Pessoa / Comprador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContactSubtype('factory')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      contactSubtype === 'factory'
                        ? 'border-[#355C4D] bg-[#355C4D]/10 text-[#355C4D]'
                        : 'border-[#E5E9E5] bg-white text-stone-600'
                    }`}
                  >
                    <Factory size={15} />
                    <span>Fábrica / Indústria</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {contactSubtype === 'factory' ? 'Razão Social ou Nome da Fábrica *' : 'Nome do Contato ou Empresa *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={contactSubtype === 'factory' ? 'Ex: Metalúrgica Alvorada Ltda' : 'Ex: Carlos Alberto Mendes'}
                  className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Nome Fantasia / Apelido</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Redemac Ponta Grossa"
                    className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {contactSubtype === 'factory' ? 'CNPJ' : 'CPF ou CNPJ'}
                  </label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Pessoa de Contato / Comprador</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Ex: Marcos (Gerente Compras)"
                    className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(41) 99999-0000"
                    className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold text-stone-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Curitiba"
                    className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">UF</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D] font-medium"
                  >
                    <option value="PR">PR</option>
                    <option value="SC">SC</option>
                    <option value="RS">RS</option>
                    <option value="SP">SP</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="RJ">RJ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Segmento / Ramo de Atuação</label>
                <input
                  type="text"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                  placeholder="Ex: Revenda de Materiais Elétricos, Construtora..."
                  className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Notas de Prospecção / Histórico</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações sobre necessidades, potencial de compra, marcas que já utiliza..."
                  className="w-full px-3 py-2 border border-[#E5E9E5] rounded-xl bg-[#F7F8F6] focus:outline-none focus:border-[#355C4D]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E9E5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#355C4D] hover:bg-[#233D33] text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Salvando...' : editingContact ? 'Atualizar Contato' : 'Cadastrar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spreadsheet Import Modal */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultTarget="contacts"
      />
    </div>
  );
};
