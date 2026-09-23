import React, { useState, useMemo } from 'react';
import { useCRM } from '../../lib/store';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Factory,
  Tag,
  DollarSign,
  Percent,
  CheckCircle2,
  X,
  Layers,
  ShoppingBag,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  Power,
  PowerOff,
  LayoutGrid,
  List,
  Check,
} from 'lucide-react';
import { Product, canWriteData, isRepresentadaUser, isAdminUser } from '../../types';
import { SpreadsheetImportModal } from '../../components/SpreadsheetImportModal';

export const ProductsView: React.FC = () => {
  const {
    products,
    manufacturers,
    currentMember,
    addProduct,
    updateProduct,
    batchUpdateProducts,
    deleteProduct,
    batchDeleteProducts,
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMfrFilter, setSelectedMfrFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchDeleteTarget, setBatchDeleteTarget] = useState<'selected' | 'all' | null>(null);

  // Modals & Deletion State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    manufacturer_id: '',
    category: 'Geral',
    unit: 'UN',
    unit_price: 100,
    commission_percentage: 5,
    ncm: '',
    minimum_order_quantity: 1,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleCode = currentMember?.role_code;
  const canManage = canWriteData(roleCode);
  const isAdmin = isAdminUser(roleCode);

  // Scoped manufacturers if user is from a specific represented manufacturer
  const scopedProducts = useMemo(() => {
    let list = products;
    if (isRepresentadaUser(roleCode)) {
      const mfrId = currentMember?.scope_manufacturer_id || currentMember?.scopes?.[0]?.scope_id;
      if (mfrId) list = list.filter((p) => p.manufacturer_id === mfrId);
    }

    return list.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.ncm && p.ncm.includes(searchTerm)) ||
        (p.manufacturer_name && p.manufacturer_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMfr = selectedMfrFilter === 'all' || p.manufacturer_id === selectedMfrFilter;
      const matchCat = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? p.status !== 'inactive' : p.status === 'inactive');

      return matchSearch && matchMfr && matchCat && matchStatus;
    });
  }, [products, roleCode, currentMember, searchTerm, selectedMfrFilter, selectedCategoryFilter, statusFilter]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Selection helpers
  const isAllSelected = scopedProducts.length > 0 && scopedProducts.every((p) => selectedIds.includes(p.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(scopedProducts.map((p) => p.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllGlobal = () => {
    setSelectedIds(products.map((p) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Batch Status Actions
  const handleBatchStatus = async (status: 'active' | 'inactive', target: 'selected' | 'all') => {
    const targetIds =
      target === 'all' ? scopedProducts.map((p) => p.id) : selectedIds;

    if (targetIds.length === 0) return;

    setIsBatchProcessing(true);
    try {
      await batchUpdateProducts(targetIds, { status });
      const label = status === 'active' ? 'ativado(s)' : 'inativado(s)';
      setSuccessNotice(`${targetIds.length} produto(s) ${label} com sucesso.`);
      if (target === 'selected') {
        setSelectedIds([]);
      }
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar produtos em massa.');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch Delete Action
  const handleConfirmBatchDelete = async () => {
    if (!batchDeleteTarget) return;
    const targetIds =
      batchDeleteTarget === 'all' ? scopedProducts.map((p) => p.id) : selectedIds;

    if (targetIds.length === 0) {
      setBatchDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await batchDeleteProducts(targetIds);
      setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      setSuccessNotice(`${targetIds.length} produto(s) excluído(s) permanentemente com sucesso.`);
      setBatchDeleteTarget(null);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setDeleteError(err?.message || 'Erro ao excluir produtos em massa.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Single Product Quick Toggle
  const handleToggleSingleStatus = async (prod: Product) => {
    const newStatus: 'active' | 'inactive' = prod.status === 'inactive' ? 'active' : 'inactive';
    try {
      await updateProduct(prod.id, { status: newStatus });
      setSuccessNotice(
        `Produto [${prod.sku}] foi ${newStatus === 'active' ? 'ativado' : 'inativado'}.`
      );
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Erro ao alterar status do produto.');
    }
  };

  const handleOpenNewModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      manufacturer_id: manufacturers[0]?.id || '',
      category: 'Geral',
      unit: 'UN',
      unit_price: 100,
      commission_percentage: 5,
      ncm: '',
      minimum_order_quantity: 1,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      manufacturer_id: prod.manufacturer_id,
      category: prod.category || 'Geral',
      unit: prod.unit,
      unit_price: prod.unit_price,
      commission_percentage: prod.commission_percentage || 5,
      ncm: prod.ncm || '',
      minimum_order_quantity: prod.minimum_order_quantity || 1,
      description: prod.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      alert('Preencha o código SKU e o nome do produto.');
      return;
    }

    const selectedMfr = manufacturers.find((m) => m.id === formData.manufacturer_id);
    const mfrName = selectedMfr?.name || 'Fábrica Parceira';

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          sku: formData.sku,
          name: formData.name,
          manufacturer_id: formData.manufacturer_id,
          manufacturer_name: mfrName,
          category: formData.category,
          unit: formData.unit,
          unit_price: Number(formData.unit_price),
          commission_percentage: Number(formData.commission_percentage),
          ncm: formData.ncm,
          minimum_order_quantity: Number(formData.minimum_order_quantity),
          description: formData.description,
        });
      } else {
        await addProduct({
          sku: formData.sku,
          name: formData.name,
          manufacturer_id: formData.manufacturer_id,
          manufacturer_name: mfrName,
          category: formData.category,
          unit: formData.unit,
          unit_price: Number(formData.unit_price),
          commission_percentage: Number(formData.commission_percentage),
          ncm: formData.ncm,
          minimum_order_quantity: Number(formData.minimum_order_quantity),
          description: formData.description,
          status: 'active',
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestDelete = (prod: Product) => {
    if (!isAdmin) return;
    setDeleteError(null);
    setProductToDelete(prod);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const prodName = productToDelete.name;
      const prodSku = productToDelete.sku;
      await deleteProduct(productToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== productToDelete.id));
      setProductToDelete(null);
      if (editingProduct?.id === productToDelete.id) {
        setIsModalOpen(false);
      }
      setSuccessNotice(`Produto [${prodSku}] "${prodName}" foi excluído com sucesso do catálogo.`);
      setTimeout(() => {
        setSuccessNotice(null);
      }, 5000);
    } catch (err: any) {
      setDeleteError(err?.message || 'Erro ao excluir produto. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = useMemo(() => products.filter((p) => p.status !== 'inactive').length, [products]);
  const inactiveCount = useMemo(() => products.filter((p) => p.status === 'inactive').length, [products]);

  return (
    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto pb-16 font-sans">
      {/* Success Notice Banner */}
      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-fade-in">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#3E4A32] text-white">
              <Package size={20} className="text-[#A78A63]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1C1A17]">
                Catálogo de Produtos &amp; Linhas Industriais
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Seleção múltipla, ativação/inativação em massa e gestão de tabela de preços B2B.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Spreadsheet Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-50 text-[#3E4A32] border border-[#3E4A32]/30 font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={16} className="text-[#3E4A32]" />
            <span>Importar Planilha</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenNewModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={16} className="text-[#A78A63]" />
              <span>Novo Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Filter Tabs & Selection Summary Bar */}
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
            <span>Todos os Produtos</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-[#2C3524] text-[#EDF1EA]' : 'bg-stone-200 text-stone-700'}`}>
              {products.length}
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
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'active' ? 'bg-emerald-900 text-white' : 'bg-emerald-200 text-emerald-900 font-bold'}`}>
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-stone-700 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <span>Inativos</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'inactive' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700 font-bold'}`}>
              {inactiveCount}
            </span>
          </button>
        </div>

        {/* Global Batch Controls */}
        <div className="flex items-center gap-2">
          {canManage && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleBatchStatus('active', 'all')}
                disabled={isBatchProcessing || scopedProducts.length === 0}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Ativar todos os produtos listados nesta visão"
              >
                <Power size={13} className="text-emerald-700" />
                <span>Ativar Todos ({scopedProducts.length})</span>
              </button>

              <button
                onClick={() => handleBatchStatus('inactive', 'all')}
                disabled={isBatchProcessing || scopedProducts.length === 0}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Inativar todos os produtos listados nesta visão"
              >
                <PowerOff size={13} className="text-stone-600" />
                <span>Inativar Todos ({scopedProducts.length})</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setBatchDeleteTarget('all')}
                  disabled={isBatchProcessing || scopedProducts.length === 0}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Excluir todos os produtos listados nesta visão"
                >
                  <Trash2 size={13} className="text-rose-600" />
                  <span>Excluir Todos ({scopedProducts.length})</span>
                </button>
              )}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#3E4A32] shadow-2xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Visualização em Tabela"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#3E4A32] shadow-2xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Visualização em Grade de Cards"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="bg-[#1C1A17] text-white p-3.5 rounded-xl border border-[#3E4A32] shadow-lg flex flex-wrap items-center justify-between gap-3 animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 bg-[#3E4A32] rounded-lg text-xs font-bold flex items-center gap-1.5 text-[#EDF1EA]">
              <CheckSquare size={15} />
              <span>{selectedIds.length} produto(s) selecionado(s)</span>
            </div>
            <span className="text-xs text-stone-400 hidden sm:inline">
              de {scopedProducts.length} visíveis ({products.length} no catálogo)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
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

                {isAdmin && (
                  <button
                    onClick={() => setBatchDeleteTarget('selected')}
                    disabled={isBatchProcessing}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>Excluir Selecionados ({selectedIds.length})</span>
                  </button>
                )}
              </>
            )}

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

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E2DDD5] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por código SKU, nome, NCM ou fábrica..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E2DDD5] bg-[#F8F7F4] text-xs focus:outline-none focus:border-[#3E4A32]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {/* Manufacturer Filter */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-[#F8F7F4] px-3 py-1.5 rounded-lg border border-[#E2DDD5]">
            <Factory size={13} className="text-stone-400" />
            <select
              value={selectedMfrFilter}
              onChange={(e) => setSelectedMfrFilter(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Fábricas</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-[#F8F7F4] px-3 py-1.5 rounded-lg border border-[#E2DDD5]">
              <Layers size={13} className="text-stone-400" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-xs text-stone-500 font-medium px-2">
            Mostrando <strong>{scopedProducts.length}</strong> produtos
          </div>
        </div>
      </div>

      {/* Products Presentation: Table or Grid */}
      {scopedProducts.length === 0 ? (
        <div className="bg-white border border-[#E2DDD5] rounded-xl p-12 text-center shadow-xs">
          <Package size={40} className="mx-auto text-stone-300 mb-3" />
          <h3 className="text-sm font-bold text-stone-700">Nenhum produto encontrado</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Não há produtos correspondentes aos filtros de busca ou ainda não foram cadastrados para esta representada.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#3E4A32] text-[#3E4A32] rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              <span>Importar de Planilha</span>
            </button>
            {canManage && (
              <button
                onClick={handleOpenNewModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3E4A32] text-white rounded-lg text-xs font-medium hover:bg-[#2C3524] cursor-pointer"
              >
                <Plus size={15} className="text-[#A78A63]" />
                <span>Cadastrar Produto Manualmente</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-[#E2DDD5] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
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
                  <th className="py-3 px-4">SKU / Código</th>
                  <th className="py-3 px-4">Produto &amp; Descrição</th>
                  <th className="py-3 px-4">Fábrica Representada</th>
                  <th className="py-3 px-4">Categoria / NCM</th>
                  <th className="py-3 px-4">Preço Tabela (R$)</th>
                  <th className="py-3 px-4">Comissão</th>
                  <th className="py-3 px-4 text-center">Situação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD5]">
                {scopedProducts.map((prod) => {
                  const isSelected = selectedIds.includes(prod.id);
                  const isInactive = prod.status === 'inactive';

                  return (
                    <tr
                      key={prod.id}
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
                          onClick={() => handleToggleSelectOne(prod.id)}
                          className="cursor-pointer flex items-center justify-center mx-auto"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-[#3E4A32]" />
                          ) : (
                            <Square size={16} className="text-stone-400 hover:text-stone-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#3E4A32]">
                        {prod.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1C1A17]">{prod.name}</div>
                        {prod.description && (
                          <div className="text-[11px] text-stone-500 line-clamp-1 max-w-xs">
                            {prod.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-stone-700">
                          {prod.manufacturer_name || 'Fábrica Representada'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-stone-600 font-medium">
                            {prod.category || 'Geral'}
                          </span>
                          {prod.ncm && (
                            <span className="text-[10px] text-stone-400 font-mono">
                              NCM: {prod.ncm}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#3E4A32]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.unit_price)}
                        <span className="text-[10px] text-stone-400 font-normal ml-1">/{prod.unit}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#A78A63]">
                        {prod.commission_percentage || 5}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleSingleStatus(prod)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                            isInactive
                              ? 'bg-stone-200 text-stone-700 hover:bg-emerald-100 hover:text-emerald-800'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-stone-200 hover:text-stone-700'
                          }`}
                          title={isInactive ? 'Clique para ATIVAR produto' : 'Clique para INATIVAR produto'}
                        >
                          {isInactive ? (
                            <>
                              <PowerOff size={10} className="text-stone-500" />
                              <span>Inativo</span>
                            </>
                          ) : (
                            <>
                              <Check size={10} className="text-emerald-600" />
                              <span>Ativo</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <button
                              onClick={() => handleOpenEditModal(prod)}
                              title="Editar Produto"
                              className="p-1.5 text-stone-500 hover:text-[#3E4A32] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleRequestDelete(prod)}
                              title="Excluir Produto (Administrador)"
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scopedProducts.map((prod) => {
            const isSelected = selectedIds.includes(prod.id);
            const isInactive = prod.status === 'inactive';

            return (
              <div
                key={prod.id}
                className={`border rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-[#EDF1EA]/60 border-[#3E4A32] ring-1 ring-[#3E4A32]'
                    : isInactive
                    ? 'bg-stone-50/70 border-stone-300 opacity-80'
                    : 'bg-white border-[#E2DDD5] hover:border-[#3E4A32]/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSelectOne(prod.id)}
                        className="cursor-pointer"
                        title={isSelected ? 'Desmarcar' : 'Selecionar'}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-[#3E4A32]" />
                        ) : (
                          <Square size={16} className="text-stone-400 hover:text-stone-600" />
                        )}
                      </button>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#3E4A32]/10 text-[#3E4A32] font-bold text-[11px] tracking-wide">
                        {prod.sku}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleSingleStatus(prod)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                          isInactive
                            ? 'bg-stone-200 text-stone-700 hover:bg-emerald-100 hover:text-emerald-800'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-stone-200 hover:text-stone-700'
                        }`}
                        title={isInactive ? 'Clique para ATIVAR' : 'Clique para INATIVAR'}
                      >
                        {isInactive ? <PowerOff size={9} /> : <Check size={9} />}
                        <span>{isInactive ? 'Inativo' : 'Ativo'}</span>
                      </button>

                      {canManage && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            title="Editar Produto"
                            className="p-1 text-stone-400 hover:text-[#3E4A32] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleRequestDelete(prod)}
                              title="Excluir Produto"
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-stone-800 text-sm line-clamp-2" title={prod.name}>
                    {prod.name}
                  </h3>

                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-stone-500">
                    <Factory size={13} className="text-[#A78A63]" />
                    <span className="font-medium text-stone-700">{prod.manufacturer_name || 'Fábrica'}</span>
                    {prod.category && (
                      <>
                        <span className="text-stone-300">•</span>
                        <span className="text-stone-500">{prod.category}</span>
                      </>
                    )}
                  </div>

                  {prod.description && (
                    <p className="text-[11px] text-stone-500 mt-2 line-clamp-2 bg-[#F8F7F4] p-2 rounded-lg">
                      {prod.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2DDD5] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Preço Tabela</span>
                    <span className="text-sm font-extrabold text-[#3E4A32]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.unit_price)}
                    </span>
                    <span className="text-[10px] text-stone-400 ml-1">/{prod.unit}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block font-medium">Comissão</span>
                    <span className="text-xs font-bold text-[#A78A63]">
                      {prod.commission_percentage || 5}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#E2DDD5] bg-[#F8F7F4]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#3E4A32] text-white">
                  <Package size={18} className="text-[#A78A63]" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-sm">
                    {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Defina SKU, preço e fábrica representada para compor os pedidos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Código SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="Ex: CAB-750V-100M"
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Fábrica Representada *</label>
                  <select
                    required
                    value={formData.manufacturer_id}
                    onChange={(e) => setFormData({ ...formData, manufacturer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32]"
                  >
                    <option value="" disabled>
                      Selecione a representada
                    </option>
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nome / Descrição Comercial *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cabo Flexível 2,5mm² 750V Rolo 100m"
                  className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32] font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Cabos, Fios, Postes"
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Unidade</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value.toUpperCase() })}
                    placeholder="UN, RL, CX, MT"
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">NCM</label>
                  <input
                    type="text"
                    value={formData.ncm}
                    onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                    placeholder="8544.49.00"
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Preço Tabela (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32] font-semibold text-[#3E4A32]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Qtd. Mínima</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minimum_order_quantity}
                    onChange={(e) => setFormData({ ...formData, minimum_order_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Descrição / Especificações Técnicas</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Informações técnicas adicionais, embalagem, garantia..."
                  className="w-full px-3 py-2 border border-[#E2DDD5] rounded-xl bg-[#F8F7F4] focus:outline-none focus:border-[#3E4A32]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2DDD5] flex items-center justify-between gap-2">
                <div>
                  {editingProduct && isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        handleRequestDelete(editingProduct);
                      }}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Excluir produto do catálogo"
                    >
                      <Trash2 size={14} />
                      <span>Excluir Produto</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin-only Product Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-rose-100 bg-rose-50/60 flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-stone-900 text-base">Excluir Produto do Catálogo?</h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Ação restrita a <strong>Administradores</strong>.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isDeleting) setProductToDelete(null);
                }}
                disabled={isDeleting}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#3E4A32] bg-[#3E4A32]/10 px-2 py-0.5 rounded text-[11px]">
                    {productToDelete.sku}
                  </span>
                  <span className="font-extrabold text-stone-900 text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(productToDelete.unit_price)}
                  </span>
                </div>
                <div className="font-bold text-stone-800 text-sm">
                  {productToDelete.name}
                </div>
                <div className="text-stone-500 text-[11px] flex items-center gap-2">
                  <span>Fábrica: <strong>{productToDelete.manufacturer_name || 'Representada'}</strong></span>
                  <span>•</span>
                  <span>Un: {productToDelete.unit}</span>
                  {productToDelete.category && (
                    <>
                      <span>•</span>
                      <span>{productToDelete.category}</span>
                    </>
                  )}
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {deleteError}
                </div>
              )}

              <p className="text-stone-500 text-[11px] leading-relaxed">
                Tem certeza de que deseja remover este produto? O item será removido permanentemente da listagem e de novas emissões de orçamentos e pedidos.
              </p>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Removendo...' : 'Sim, Excluir Produto'}</span>
              </button>
            </div>
          </div>
        </div>
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
                    ? `Excluir Todos os Produtos (${scopedProducts.length})?`
                    : `Excluir ${selectedIds.length} Produto(s) Selecionado(s)?`}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  Ação restrita a <strong>Administradores</strong>.
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
                    {batchDeleteTarget === 'all' ? scopedProducts.length : selectedIds.length} produto(s)
                  </strong>.
                </p>
                <p className="text-[11px] text-stone-500">
                  Esses produtos serão removidos permanentemente do banco de dados e de todas as listagens do sistema.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                  {deleteError}
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
                    : `Sim, Excluir ${batchDeleteTarget === 'all' ? scopedProducts.length : selectedIds.length} Produto(s)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Import Modal */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultTarget="products"
      />
    </div>
  );
};
