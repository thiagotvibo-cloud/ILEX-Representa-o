import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import {
  UserRole,
  ROLE_DEFINITIONS,
  canManageUsersAndSecurity,
  isRepresentadaUser,
  isAssociadoUser,
  Member,
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
  Edit2,
  Trash2,
  Percent,
  Check,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const {
    currentMember,
    members,
    invitations,
    manufacturers,
    customers,
    inviteUser,
    createMemberDirect,
    updateMember,
    deleteMember,
    revokeInvitation,
    deleteInvitation,
    toggleMemberActive,
    refreshData,
    isLoadingData,
  } = useCRM();

  // Create / Invite Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'direct' | 'invite'>('direct');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState<UserRole>('representante');
  const [partnerPercentage, setPartnerPercentage] = useState<number>(0);
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');

  // Edit Member Modal state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleCode, setEditRoleCode] = useState<UserRole>('representante');
  const [editPartnerPercentage, setEditPartnerPercentage] = useState<number>(0);
  const [editScopeId, setEditScopeId] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Delete Member Confirmation state
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Form handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Security check: Only Admin can access this view
  const hasAccess = canManageUsersAndSecurity(currentMember?.role_code);

  if (!hasAccess) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
        <div className="bg-white border border-[#E5E9E5] rounded-2xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-bold text-[#26332D] mb-2">Acesso Restrito ao Administrador</h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
            A gestão de usuários, edições, exclusões e perfis de acesso são exclusivos para contas de <strong>Administrador</strong>.
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

  const handleOpenCreateModal = () => {
    setFullName('');
    setEmail('');
    setRoleCode('representante');
    setPartnerPercentage(0);
    setSelectedScopeId('');
    setCreateMode('direct');
    setFormError(null);
    setSuccessMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member);
    setEditFullName(member.full_name);
    setEditEmail(member.email);
    setEditRoleCode(member.role_code);
    setEditPartnerPercentage(member.partner_percentage || 0);
    setEditScopeId(member.scope_manufacturer_id || member.scope_customer_id || '');
    setEditIsActive(member.is_active);
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
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

    let scopeType: 'manufacturer' | 'customer' | undefined;
    let scopeName: string | undefined;

    if (isRepresentadaUser(roleCode)) {
      scopeType = 'manufacturer';
      const mfr = manufacturers.find(m => m.id === selectedScopeId);
      scopeName = mfr ? mfr.name : undefined;
    }

    setIsSubmitting(true);
    try {
      if (createMode === 'direct') {
        await createMemberDirect({
          email: email.trim(),
          fullName: fullName.trim(),
          roleCode,
          partnerPercentage: Number(partnerPercentage) || 0,
          scopeType,
          scopeId: selectedScopeId || undefined,
          scopeName,
        });
        setSuccessMessage(`Usuário "${fullName}" cadastrado com sucesso e já está ativo!`);
      } else {
        await inviteUser({
          email: email.trim(),
          fullName: fullName.trim(),
          roleCode,
          partnerPercentage: Number(partnerPercentage) || 0,
          scopeType,
          scopeId: selectedScopeId || undefined,
          scopeName,
        });
        setSuccessMessage(`Convite enviado com sucesso para ${email}!`);
      }

      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao salvar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setFormError(null);
    setSuccessMessage(null);

    if (!editFullName.trim() || !editEmail.trim()) {
      setFormError('Nome completo e e-mail são obrigatórios.');
      return;
    }

    if (isRepresentadaUser(editRoleCode) && !editScopeId) {
      setFormError('Para perfis de representada, a seleção de uma fábrica vinculada é obrigatória.');
      return;
    }

    let scopeType: 'manufacturer' | 'customer' | undefined;
    let scopeName: string | undefined;

    if (isRepresentadaUser(editRoleCode)) {
      scopeType = 'manufacturer';
      const mfr = manufacturers.find(m => m.id === editScopeId);
      scopeName = mfr ? mfr.name : undefined;
    }

    setIsSubmitting(true);
    try {
      await updateMember(editingMember.user_id, {
        full_name: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        role_code: editRoleCode,
        partner_percentage: Number(editPartnerPercentage) || 0,
        is_active: editIsActive,
        scope_manufacturer_id: scopeType === 'manufacturer' ? editScopeId : undefined,
        scope_manufacturer_name: scopeType === 'manufacturer' ? scopeName : undefined,
      });

      setSuccessMessage(`Usuário "${editFullName}" atualizado com sucesso!`);
      setEditingMember(null);
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao atualizar dados do usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await deleteMember(memberToDelete.user_id);
      setSuccessMessage(`Usuário "${memberToDelete.full_name}" foi excluído com sucesso.`);
      setMemberToDelete(null);
    } catch (err: any) {
      setFormError(err?.message || 'Falha ao excluir usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (id: string, inviteEmail: string) => {
    if (window.confirm(`Confirma a revogação do convite para ${inviteEmail}?`)) {
      try {
        await revokeInvitation(id);
        setSuccessMessage(`Convite para ${inviteEmail} revogado.`);
      } catch (err: any) {
        alert(err?.message || 'Erro ao revogar convite.');
      }
    }
  };

  const handleDeleteInvite = async (id: string, inviteEmail: string) => {
    if (window.confirm(`Deseja excluir permanentemente o convite para ${inviteEmail}?`)) {
      try {
        await deleteInvitation(id);
        setSuccessMessage(`Convite para ${inviteEmail} excluído.`);
      } catch (err: any) {
        alert(err?.message || 'Erro ao excluir convite.');
      }
    }
  };

  const handleToggleActive = async (memberUser: Member) => {
    if (memberUser.user_id === currentMember?.user_id) {
      alert('Operação bloqueada: você não pode desativar seu próprio usuário logado.');
      return;
    }

    const nextState = !memberUser.is_active;
    const msg = nextState
      ? `Deseja reativar o acesso de ${memberUser.full_name}?`
      : `Deseja desativar o acesso de ${memberUser.full_name}?`;

    if (window.confirm(msg)) {
      try {
        await toggleMemberActive(memberUser.user_id, nextState);
        setSuccessMessage(`Status de ${memberUser.full_name} atualizado para ${nextState ? 'Ativo' : 'Inativo'}.`);
      } catch (err: any) {
        alert(err?.message || 'Erro ao atualizar status do membro.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9E5] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-[#26332D]">
              Gestão de Usuários & Logins
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#355C4D]/10 text-[#355C4D] border border-[#355C4D]/20 flex items-center gap-1">
              <ShieldCheck size={13} />
              Administrador
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Cadastre, edite perfis de acesso, altere permissões de fábrica e exclua usuários da organização.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            className="p-2.5 text-stone-600 hover:text-[#26332D] bg-white border border-[#E5E9E5] rounded-xl hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
            title="Atualizar listagem"
          >
            <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#355C4D] hover:bg-[#233D33] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            id="btn-adicionar-usuario"
          >
            <UserPlus size={16} className="text-[#B69A67]" />
            <span>Adicionar / Convidar Usuário</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center justify-between gap-3 shadow-xs animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
          <button onClick={() => setFormError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Active Users Table */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-sm font-bold text-[#26332D] flex items-center gap-2">
              <UserCheck size={16} className="text-[#355C4D]" />
              Usuários e Perfis Cadastrados
            </h2>
            <p className="text-[11px] text-stone-500">
              Você pode editar permissões, trocar perfis de acesso a qualquer momento ou excluir logins permanentemente.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#355C4D]/10 text-[#355C4D] border border-[#355C4D]/20">
            {members.length} usuário(s) ativo(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-[#E5E9E5] text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Perfil / Modo</th>
                <th className="py-3 px-4">Escopo Vinculado</th>
                <th className="py-3 px-4 text-center">Parceria / Comissão</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E5]">
              {members.map(memberItem => {
                const isSelf = memberItem.user_id === currentMember?.user_id;
                const roleDef = ROLE_DEFINITIONS[memberItem.role_code] || { label: memberItem.role_code };

                return (
                  <tr
                    key={memberItem.user_id}
                    className={`hover:bg-stone-50/70 transition-colors ${
                      isSelf ? 'bg-[#355C4D]/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#355C4D] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#B69A67]/40 shadow-2xs">
                          {memberItem.full_name ? memberItem.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-[#26332D] flex items-center gap-1.5">
                            {memberItem.full_name}
                            {isSelf && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#355C4D] text-white font-bold">
                                Seu Login (Admin)
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono">{memberItem.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#355C4D]/10 text-[#355C4D] border border-[#355C4D]/20">
                        {roleDef.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {memberItem.scope_manufacturer_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold">
                          <Factory size={12} className="text-amber-700" />
                          {memberItem.scope_manufacturer_name}
                        </span>
                      ) : memberItem.scope_customer_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-semibold">
                          <Building2 size={12} className="text-emerald-700" />
                          {memberItem.scope_customer_name}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[11px] italic">Geral da Empresa</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-semibold text-stone-700">
                        {memberItem.partner_percentage ? `${memberItem.partner_percentage}%` : '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {memberItem.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <Ban size={11} />
                          Inativo
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(memberItem)}
                          className="p-1.5 text-stone-600 hover:text-[#355C4D] hover:bg-[#355C4D]/10 rounded-lg transition-colors cursor-pointer"
                          title="Editar Usuário / Modificar Perfil"
                        >
                          <Edit2 size={15} />
                        </button>

                        {!isSelf && (
                          <>
                            <button
                              onClick={() => handleToggleActive(memberItem)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                memberItem.is_active
                                  ? 'text-stone-500 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={memberItem.is_active ? 'Desativar Acesso' : 'Reativar Acesso'}
                            >
                              <Ban size={15} />
                            </button>

                            <button
                              onClick={() => setMemberToDelete(memberItem)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Login / Usuário"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
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

      {/* Pending Invitations Section */}
      <div className="bg-white border border-[#E5E9E5] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E5E9E5] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#26332D] flex items-center gap-2">
              <Clock size={16} className="text-[#B69A67]" />
              Convites Pendentes
            </h2>
            <p className="text-[11px] text-stone-500">
              Convites emitidos aguardando aceite ou primeiro acesso por senha.
            </p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
            {invitations.filter(i => i.status === 'pending').length} pendente(s)
          </span>
        </div>

        {invitations.filter(i => i.status === 'pending').length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            Nenhum convite pendente. Todos os usuários estão ativos ou foram configurados diretamente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-[#E5E9E5] text-stone-500 font-semibold text-[10px] uppercase">
                  <th className="py-3 px-4">Nome Completo</th>
                  <th className="py-3 px-4">E-mail Convidado</th>
                  <th className="py-3 px-4">Perfil Atribuído</th>
                  <th className="py-3 px-4">Escopo Vinculado</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
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
                        <span className="font-semibold text-[#355C4D]">
                          {ROLE_DEFINITIONS[inv.role_code]?.label || inv.role_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600">
                        {inv.scope_name ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-[11px] font-medium text-stone-700">
                            {inv.scope_type === 'manufacturer' ? <Factory size={11} /> : <Building2 size={11} />}
                            {inv.scope_name}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Geral</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                        {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString('pt-BR') : 'Sem expiração'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={11} />
                          Pendente
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRevoke(inv.id, inv.email)}
                            className="px-2.5 py-1 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Revogar convite"
                          >
                            <Ban size={12} />
                            Revogar
                          </button>
                          <button
                            onClick={() => handleDeleteInvite(inv.id, inv.email)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir convite permanentemente"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / INVITE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E9E5] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#26332D] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <UserPlus size={20} className="text-[#B69A67]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adicionar Novo Usuário</h3>
                  <p className="text-[11px] text-[#B69A67]">
                    Defina o papel, escopo industrial e tipo de ativação
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex border-b border-[#E5E9E5] bg-stone-50 px-6 pt-3 gap-2">
              <button
                type="button"
                onClick={() => setCreateMode('direct')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  createMode === 'direct'
                    ? 'border-[#355C4D] text-[#355C4D]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Ativação Imediata (Direto)
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('invite')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  createMode === 'invite'
                    ? 'border-[#355C4D] text-[#355C4D]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Enviar Convite por E-mail
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
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
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  E-mail de Acesso *
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Perfil / Modo de Acesso *
                  </label>
                  <select
                    value={roleCode}
                    onChange={e => {
                      setRoleCode(e.target.value as UserRole);
                      setSelectedScopeId('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-white font-medium"
                  >
                    <option value="admin">Administrador Master</option>
                    <option value="representante">Representante Comercial</option>
                    <option value="representada">Representada / Fábrica</option>
                    <option value="associado">Associado / Parceiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    % de Parceria / Comissão
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0.0"
                      value={partnerPercentage}
                      onChange={e => setPartnerPercentage(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-[#F7F8F6]"
                    />
                    <Percent size={14} className="absolute right-3 top-2.5 text-stone-400" />
                  </div>
                </div>
              </div>

              {/* Conditional: Representada Factory Selector */}
              {isRepresentadaUser(roleCode) && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <Factory size={13} className="text-amber-700" />
                    Fábrica Representada Vinculada *
                  </label>
                  <select
                    required
                    value={selectedScopeId}
                    onChange={e => setSelectedScopeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-stone-800"
                  >
                    <option value="">Selecione a Fábrica...</option>
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9E5]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E9E5] text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#355C4D] hover:bg-[#233D33] text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{createMode === 'direct' ? 'Salvar e Ativar Usuário' : 'Enviar Convite'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E9E5] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#26332D] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Edit2 size={20} className="text-[#B69A67]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Usuário & Perfil</h3>
                  <p className="text-[11px] text-[#B69A67]">
                    Altere o modo, permissões e dados cadastrais
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-[#F7F8F6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  E-mail de Acesso *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-[#F7F8F6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Mudar Perfil / Modo *
                  </label>
                  <select
                    value={editRoleCode}
                    onChange={e => {
                      setEditRoleCode(e.target.value as UserRole);
                      if (!isRepresentadaUser(e.target.value as UserRole)) {
                        setEditScopeId('');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-white font-medium"
                  >
                    <option value="admin">Administrador Master</option>
                    <option value="representante">Representante Comercial</option>
                    <option value="representada">Representada / Fábrica</option>
                    <option value="associado">Associado / Parceiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    % de Parceria / Comissão
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0.0"
                      value={editPartnerPercentage}
                      onChange={e => setEditPartnerPercentage(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E9E5] focus:outline-none focus:border-[#355C4D] text-xs bg-[#F7F8F6]"
                    />
                    <Percent size={14} className="absolute right-3 top-2.5 text-stone-400" />
                  </div>
                </div>
              </div>

              {/* Conditional: Representada Factory Selector */}
              {isRepresentadaUser(editRoleCode) && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                    <Factory size={13} className="text-amber-700" />
                    Fábrica Representada Vinculada *
                  </label>
                  <select
                    required
                    value={editScopeId}
                    onChange={e => setEditScopeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-stone-800"
                  >
                    <option value="">Selecione a Fábrica...</option>
                    {manufacturers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Switch */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-[#E5E9E5]">
                <div>
                  <span className="font-bold text-stone-800 block text-xs">Status do Acesso</span>
                  <span className="text-[11px] text-stone-500">
                    {editIsActive ? 'O usuário pode entrar normalmente.' : 'O login está bloqueado.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    editIsActive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {editIsActive ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9E5]">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E9E5] text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#355C4D] hover:bg-[#233D33] text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E9E5] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-rose-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Trash2 size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Excluir Login / Usuário</h3>
                  <p className="text-[11px] text-rose-100">
                    Esta ação removerá permanentemente o acesso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMemberToDelete(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-rose-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-stone-700">
              <p className="leading-relaxed">
                Tem certeza que deseja excluir o login de{' '}
                <strong className="text-[#26332D] font-bold">{memberToDelete.full_name}</strong> (
                <span className="font-mono text-stone-600">{memberToDelete.email}</span>)?
              </p>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle size={14} className="text-rose-600" />
                  Aviso importante:
                </span>
                <p className="text-[11px] text-rose-800">
                  O usuário perderá imediatamente o acesso ao sistema da ILEX Comercial e seu perfil será removido da base de membros.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9E5]">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E9E5] text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <span>Sim, Excluir Permanentemente</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
