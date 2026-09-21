import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import {
  UserRole,
  ROLE_DEFINITIONS,
  canManageUsersAndSecurity,
  isRepresentadaUser,
  isAssociadoUser,
} from '../../types';
import {
  ShieldCheck,
  UserPlus,
  Mail,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  Lock,
  Building2,
  Factory,
  Sparkles,
  X,
  RefreshCw,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const {
    currentMember,
    members,
    invitations,
    manufacturers,
    customers,
    inviteUser,
    revokeInvitation,
    toggleMemberActive,
    isDemoMode,
    refreshData,
    isLoadingData,
  } = useCRM();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState<UserRole>('comercial');
  const [partnerPercentage, setPartnerPercentage] = useState<number>(0);
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Security check: Only socio_admin_master can access this view
  const hasAccess = canManageUsersAndSecurity(currentMember?.role_code);

  if (!hasAccess) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-bold text-[#26332D] mb-2">Acesso Restrito ao Master</h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
            A gestão de usuários, atribuição de perfis RBAC, auditoria de segurança e envio de convites são funcionalidades exclusivas do perfil <strong>Sócio Admin Master (Thiago)</strong>.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 border border-[#E5E9E5] text-xs text-stone-600">
            <span>Seu perfil atual:</span>
            <strong className="text-[#355C4D]">
              {currentMember?.role_code ? ROLE_DEFINITIONS[currentMember.role_code]?.label : 'Não identificado'}
            </strong>
          </div>
        </div>
      </div>
    );
  }

  const handleOpenModal = () => {
    setFullName('');
    setEmail('');
    setRoleCode('comercial');
    setPartnerPercentage(0);
    setSelectedScopeId('');
    setFormError(null);
    setSuccessMessage(null);
    setIsInviteModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRoleCode(newRole);
    setSelectedScopeId('');
    if (newRole === 'socio_admin_master' || newRole === 'socio_admin') {
      setPartnerPercentage(50);
    } else {
      setPartnerPercentage(0);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !email.trim()) {
      setFormError('Nome completo e e-mail são obrigatórios.');
      return;
    }

    if (isRepresentadaUser(roleCode) && !selectedScopeId) {
      setFormError('Para perfis de representada, a seleção de uma fábrica vinculada é obrigatória.');
      return;
    }

    if (isAssociadoUser(roleCode) && !selectedScopeId) {
      setFormError('Para perfis de associado, o vínculo com a carteira/empresa é obrigatório.');
      return;
    }

    let scopeType: 'manufacturer' | 'customer' | undefined;
    let scopeName: string | undefined;

    if (isRepresentadaUser(roleCode)) {
      scopeType = 'manufacturer';
      const mfr = manufacturers.find(m => m.id === selectedScopeId);
      scopeName = mfr ? mfr.name : undefined;
    } else if (isAssociadoUser(roleCode)) {
      scopeType = 'customer';
      const cust = customers.find(c => c.id === selectedScopeId);
      scopeName = cust ? cust.legal_name : undefined;
    }

    setIsSubmitting(true);
    try {
      await inviteUser({
        email: email.trim(),
        fullName: fullName.trim(),
        roleCode,
        partnerPercentage: Number(partnerPercentage) || 0,
        scopeType,
        scopeId: selectedScopeId || undefined,
        scopeName,
      });

      setSuccessMessage(`Convite enviado com sucesso para ${email}! O status ficará pendente até o aceite e primeiro login do usuário.`);
      setIsInviteModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao emitir convite de usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string, inviteEmail: string) => {
    if (window.confirm(`Confirma a revogação do convite para ${inviteEmail}?`)) {
      try {
        await revokeInvitation(id);
      } catch (err: any) {
        alert(err?.message || 'Erro ao revogar convite.');
      }
    }
  };

  const handleToggleActive = async (memberUser: any) => {
    if (memberUser.user_id === currentMember?.user_id) {
      alert('Operação bloqueada: você não pode desativar seu próprio usuário.');
      return;
    }

    const nextState = !memberUser.is_active;
    const msg = nextState
      ? `Deseja reativar o acesso de ${memberUser.full_name}?`
      : `Deseja desativar o acesso de ${memberUser.full_name}? O usuário perderá o acesso às consultas e operações da organização.`;

    if (window.confirm(msg)) {
      try {
        await toggleMemberActive(memberUser.user_id, nextState);
      } catch (err: any) {
        alert(err?.message || 'Erro ao atualizar status do membro.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header & Main CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E5] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
              Usuários & Controle de Acesso
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#355C4D]/10 text-[#355C4D] border border-[#355C4D]/20 flex items-center gap-1">
              <ShieldCheck size={13} />
              Sócio Admin Master
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Gestão restrita de membros, concessão de perfis individuais e envio seguro de convites via Edge Function.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            className="p-2.5 text-stone-600 hover:text-[#26332D] bg-white border border-[#E5E9E5] rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
            title="Atualizar listagem"
          >
            <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#355C4D] hover:bg-[#233D33] text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
            id="btn-convidar-usuario"
          >
            <UserPlus size={16} className="text-[#B69A67]" />
            <span>Convidar Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pending Invitations Section */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#26332D] flex items-center gap-2">
              <Clock size={16} className="text-[#B69A67]" />
              Convites Pendentes de Aceite
            </h2>
            <p className="text-[11px] text-stone-500">
              Convites emitidos aguardando cadastro e primeiro login do usuário no Supabase.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {invitations.filter(i => i.status === 'pending').length} pendente(s)
          </span>
        </div>

        {invitations.filter(i => i.status === 'pending').length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Nenhum convite pendente no momento. Todos os convites foram ativados ou revogados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-[#E5E9E5] text-stone-500 font-semibold">
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-4">E-mail Convidado</th>
                  <th className="py-3 px-4">Perfil Atribuído</th>
                  <th className="py-3 px-4">Escopo Vinculado</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E5]">
                {invitations
                  .filter(i => i.status === 'pending')
                  .map(inv => (
                    <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#26332D]">{inv.full_name}</td>
                      <td className="py-3.5 px-4 text-stone-600 flex items-center gap-1.5">
                        <Mail size={13} className="text-stone-400" />
                        <span>{inv.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#355C4D]">
                          {ROLE_DEFINITIONS[inv.role_code]?.label || inv.role_code}
                        </span>
                        {inv.partner_percentage > 0 && (
                          <span className="ml-1 text-[10px] text-stone-500">({inv.partner_percentage}%)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {inv.scope_name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-[11px] font-medium text-stone-700">
                            {inv.scope_type === 'manufacturer' ? <Factory size={11} /> : <Building2 size={11} />}
                            {inv.scope_name}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Geral da Organização</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                        Até {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={11} />
                          Pendente
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRevoke(inv.id, inv.email)}
                          className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          title="Revogar convite de acesso"
                        >
                          <Ban size={12} />
                          Revogar
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Members Table */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#26332D]">Membros Cadastrados & Permissões</h2>
            <p className="text-[11px] text-stone-500">
              Usuários com associações ativas no PostgreSQL memberships. Perfis controlam rigidamente as políticas RLS.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {members.length} membro(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50/80 border-b border-[#E5E9E5] text-stone-500 font-semibold">
                <th className="py-3 px-4">Membro</th>
                <th className="py-3 px-4">Perfil RBAC</th>
                <th className="py-3 px-4">Escopo Vinculado</th>
                <th className="py-3 px-4">Participação</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E5]">
              {members.map(memberItem => {
                const isSelf = memberItem.user_id === currentMember?.user_id;
                return (
                  <tr key={memberItem.user_id} className={`hover:bg-stone-50/50 transition-colors ${isSelf ? 'bg-emerald-50/20' : ''}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#355C4D] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#B69A67]/30">
                          {memberItem.full_name ? memberItem.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-semibold text-[#26332D] block flex items-center gap-1.5">
                            {memberItem.full_name}
                            {isSelf && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Você
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-stone-500">{memberItem.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-[#355C4D] block">
                        {ROLE_DEFINITIONS[memberItem.role_code]?.label || memberItem.role_code}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {memberItem.role_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {memberItem.scope_manufacturer_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-[11px] font-medium text-stone-700">
                          <Factory size={11} className="text-[#355C4D]" />
                          {memberItem.scope_manufacturer_name}
                        </span>
                      ) : memberItem.scope_customer_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-[11px] font-medium text-stone-700">
                          <Building2 size={11} className="text-[#355C4D]" />
                          {memberItem.scope_customer_name}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[11px]">Geral da Organização</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {memberItem.partner_percentage > 0 ? (
                        <span className="font-semibold text-[#26332D]">{memberItem.partner_percentage}%</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {memberItem.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          <Ban size={11} />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isSelf ? (
                        <span className="text-[11px] text-stone-400 italic" title="Protegido contra auto-bloqueio">
                          Auto-protegido
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(memberItem)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            memberItem.is_active
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {memberItem.is_active ? 'Desativar' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E9E5] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#355C4D]/10 text-[#355C4D] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#26332D]">Convidar Novo Usuário</h3>
                  <p className="text-[11px] text-stone-500">
                    Processado exclusivamente via Edge Function servidora com chave service_role segura.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-[#F7F8F6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  E-mail Profissional *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@empresa.com.br"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-[#F7F8F6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Perfil de Acesso (RBAC) *
                </label>
                <select
                  value={roleCode}
                  onChange={e => handleRoleChange(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-white"
                >
                  <option value="comercial">Equipe Comercial (Clientes, Pipeline, Pedidos)</option>
                  <option value="financeiro">Financeiro (Faturamento, Comissões e Relatórios)</option>
                  <option value="leitura">Consulta (Somente Leitura Geral)</option>
                  <option value="socio_admin">Sócio Administrador (Julienne - Gestão Geral sem BD/Segurança)</option>
                  <option value="socio_admin_master">Sócio Admin Master (Thiago - Administração Total)</option>
                  <option value="representada_admin">Representada Admin (Fábrica - Gestão Própria)</option>
                  <option value="representada_leitura">Representada Consulta (Fábrica - Somente Leitura)</option>
                  <option value="associado">Associado Externo (Carteira Própria Vinculada)</option>
                </select>
                <p className="text-[10px] text-stone-500 mt-1">
                  {ROLE_DEFINITIONS[roleCode]?.description}
                </p>
              </div>

              {/* Conditional: Representada Factory Selector */}
              {isRepresentadaUser(roleCode) && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <Factory size={13} className="text-amber-700" />
                    Fábrica Representada Obrigatória *
                  </label>
                  <p className="text-[10px] text-amber-800">
                    O usuário terá acesso restrito exclusivamente aos dados desta fábrica. Métricas de outras marcas jamais serão misturadas.
                  </p>
                  <select
                    required
                    value={selectedScopeId}
                    onChange={e => setSelectedScopeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold"
                  >
                    <option value="">Selecione a Fábrica Representada...</option>
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.currency || 'BRL'}) — Regra: {m.commission_trigger === 'billing' ? 'Faturamento' : 'Recebimento'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional: Associado Customer/Wallet Selector */}
              {isAssociadoUser(roleCode) && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                    <Building2 size={13} className="text-emerald-700" />
                    Cliente / Carteira Atribuída Obrigatória *
                  </label>
                  <p className="text-[10px] text-emerald-800">
                    O associado visualizará unicamente pedidos, evolução e relatórios desta empresa atribuída.
                  </p>
                  <select
                    required
                    value={selectedScopeId}
                    onChange={e => setSelectedScopeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-white text-xs font-semibold"
                  >
                    <option value="">Selecione a Empresa / Cliente Associado...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.legal_name} {c.trade_name ? `(${c.trade_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Partner percentage */}
              {(roleCode === 'socio_admin_master' || roleCode === 'socio_admin' || roleCode === 'associado') && (
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Percentual de Participação / Comissão (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={partnerPercentage}
                    onChange={e => setPartnerPercentage(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-[#F7F8F6]"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Ex: 50% para sócios fundadores (Julienne e Thiago) ou percentual contratual para associados.
                  </p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-stone-50 border border-[#E5E9E5] text-[11px] text-stone-500 leading-relaxed flex items-start gap-2">
                <Sparkles size={14} className="text-[#B69A67] shrink-0 mt-0.5" />
                <span>
                  <strong>Regra de Segurança:</strong> Senhas nunca são definidas pelo administrador. O usuário receberá o convite com token seguro de 7 dias e criará suas credenciais no primeiro acesso.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9E5]">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E9E5] text-stone-600 hover:bg-stone-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#355C4D] hover:bg-[#233D33] text-white text-xs font-semibold shadow-xs flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Emitindo Convite...</span>
                    </>
                  ) : (
                    <span>Registrar & Enviar Convite</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
