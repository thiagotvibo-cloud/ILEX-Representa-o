import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import { Lock, Mail, Key, ShieldCheck, AlertCircle, CheckCircle2, X, Sparkles, LogIn, UserCheck, Copy, Database, ArrowRight, ExternalLink } from 'lucide-react';
import { SUPABASE_COMPLETE_SETUP_SQL } from '../../lib/supabaseCompleteScript';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    session,
    currentMember,
    organization,
    signIn,
    signOut,
    activateFounderSession,
    authError,
    clearError,
    isConfigured,
  } = useCRM();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  const isSchemaMissing = (authError && authError.includes('schema cache')) || (localError && localError.includes('schema cache'));

  const sqlBootstrapSnippet = user ? `-- EXECUTAR NO SUPABASE SQL EDITOR:
DO $$
DECLARE
  v_admin_user_id UUID := '${user.id}';
  v_org_id UUID;
  v_user_email TEXT := '${user.email}';
BEGIN
  -- 1. Obter ou criar organização
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, trade_name, city, state, country)
    VALUES ('ILEX Representação e Assessoria Comercial', 'ILEX Comercial', 'São Mateus do Sul', 'PR', 'BRA')
    RETURNING id INTO v_org_id;
  END IF;

  -- 2. Garantir papel admin
  INSERT INTO public.roles (organization_id, code, name, description)
  VALUES (v_org_id, 'admin', 'Administrador', 'Acesso irrestrito a todas as operações, segurança e gestão de usuários.')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- 3. Vincular usuário autenticado como Administrador
  INSERT INTO public.memberships (
    organization_id, user_id, role_code, full_name, email, is_active
  ) VALUES (
    v_org_id, v_admin_user_id, 'admin', 'Administrador Thiago', v_user_email, true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role_code = 'admin', is_active = true;
END $$;` : '';

  const copyCompleteScript = () => {
    navigator.clipboard.writeText(SUPABASE_COMPLETE_SETUP_SQL);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const copySnippetToClipboard = () => {
    if (!sqlBootstrapSnippet) return;
    navigator.clipboard.writeText(sqlBootstrapSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterAsFounder = async () => {
    setLoading(true);
    try {
      await activateFounderSession();
      onClose();
    } catch (err: any) {
      setLocalError(err?.message || 'Falha ao ativar sessão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2DDD5] space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD5]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/LOGO-06.svg"
              alt="Logotipo ILEX Verde"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <h2 className="font-bold text-sm text-[#1C1A17]">Autenticação &amp; Conexão Supabase</h2>
              <p className="text-[10px] text-stone-500">ILEX Representação e Assessoria Comercial Ltda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status / Errors */}
        {(localError || authError) && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-2 shadow-xs">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed flex-1">
                <strong className="block font-bold text-rose-950">
                  {isSchemaMissing ? 'Tabelas do Banco de Dados Ainda Não Criadas no Supabase' : 'Aviso de Autenticação:'}
                </strong>
                <p className="mt-0.5 text-[11px] text-rose-800">
                  {localError || authError}
                </p>
                {isSchemaMissing && (
                  <div className="mt-2 text-[11px] text-rose-950 bg-white/80 p-2.5 rounded-lg border border-rose-300 space-y-1.5">
                    <p>
                      <strong>Como Resolver em 1 Clique:</strong> Criamos o script SQL canônico completo contendo todas as 8 tabelas do sistema, RLS e dados iniciais.
                    </p>
                    <button
                      type="button"
                      onClick={copyCompleteScript}
                      className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-[#3E4A32] hover:bg-[#2C3524] text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
                    >
                      {copiedScript ? <CheckCircle2 size={13} className="text-emerald-300" /> : <Copy size={13} />}
                      <span>{copiedScript ? 'SQL Completo Copiado!' : 'Copiar Script SQL Completo (Setup de 1 Clique)'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logged in state without membership */}
        {user && !currentMember ? (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <UserCheck size={15} className="text-amber-700" />
                Usuário autenticado no Supabase Auth: <span className="font-mono font-bold text-stone-900">{user.email}</span>
              </p>
              <p className="text-stone-700 leading-relaxed text-[11px]">
                Seu usuário autenticado está pronto. Você pode entrar imediatamente no sistema com privilégios de <strong>Administrador</strong>, ou executar o script SQL no seu painel Supabase para gravar todas as tabelas e políticas RLS de forma definitiva.
              </p>
            </div>

            {/* Direct Instant Enter Action */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <Sparkles size={15} className="text-emerald-700" />
                <span>Entrar Imediatamente com Privilégios Totais</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Ativa a sessão como Administrador na organização ILEX Comercial Ltda.
              </p>
              <button
                type="button"
                onClick={handleEnterAsFounder}
                disabled={loading}
                className="w-full py-2.5 bg-[#3E4A32] hover:bg-[#2C3524] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>{loading ? 'Entrando...' : 'Entrar no Sistema como Administrador'}</span>
                <ArrowRight size={14} className="text-[#A78A63]" />
              </button>
            </div>

            {/* Complete Setup SQL Box */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Database size={14} className="text-[#3E4A32]" />
                  Setup Canônico Completo do Banco (SQL DDL)
                </span>
                <button
                  type="button"
                  onClick={copyCompleteScript}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#3E4A32] hover:bg-[#2C3524] text-white rounded text-[10px] font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  {copiedScript ? <CheckCircle2 size={12} className="text-emerald-300" /> : <Copy size={12} />}
                  <span>{copiedScript ? 'Copiado!' : 'Copiar Script SQL Completo'}</span>
                </button>
              </div>
              <p className="text-stone-600 text-[10px] leading-relaxed">
                Execute no <strong>SQL Editor</strong> do painel Supabase (<code className="font-mono text-stone-800">kgesahzkwqvixcqsnplo</code>). Ele cria todas as tabelas, RLS e vincula seu usuário <code className="font-mono text-stone-800">{user.email}</code>.
              </p>
            </div>

            <div className="pt-2 border-t border-[#E2DDD5] flex justify-end items-center text-xs">
              <button
                type="button"
                onClick={() => signOut()}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Encerrar Sessão
              </button>
            </div>
          </div>
        ) : !user ? (
          /* Login Form */
          <div className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">E-mail de Acesso *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="thiagotv.ibo@gmail.com"
                    className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Senha *</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#3E4A32]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#3E4A32] hover:bg-[#2C3524] disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                id="btn-login-submit"
              >
                <LogIn size={15} className="text-[#A78A63]" />
                <span>{loading ? 'Autenticando...' : 'Entrar com E-mail e Senha'}</span>
              </button>
            </form>

            {/* Quick Access for Admin */}
            <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E2DDD5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#A78A63]" />
                  Acesso Direto Administrador
                </span>
                <span className="px-2 py-0.5 bg-[#3E4A32] text-white rounded text-[9px] font-bold uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Entrar diretamente no sistema com o perfil Administrador na organização ILEX Comercial Ltda.
              </p>
              <button
                type="button"
                onClick={handleEnterAsFounder}
                className="w-full py-2 bg-white hover:bg-stone-50 text-[#3E4A32] border border-[#3E4A32]/30 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Acessar como Administrador</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Copy Complete SQL Script anytime */}
            <div className="pt-2 border-t border-[#E2DDD5] flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-500">Banco de dados Supabase:</span>
              <button
                type="button"
                onClick={copyCompleteScript}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#3E4A32] hover:text-[#2C3524] transition-colors"
              >
                {copiedScript ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedScript ? 'SQL Completo Copiado!' : 'Copiar Script SQL Completo'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* User is already logged in with valid membership */
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 bg-[#EDF1EA] rounded-xl border border-[#3E4A32]/20 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#3E4A32]">
                <ShieldCheck size={16} />
                <span>Sessão Supabase Ativa</span>
              </div>
              <p className="text-stone-800">
                Logado como <strong>{currentMember?.full_name}</strong> ({user.email})
              </p>
              <p className="text-stone-600 text-[11px]">
                Papel RLS no banco: <strong className="text-stone-900">{currentMember?.role_code}</strong> • Organização: {organization?.name}
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
              <span className="text-[11px] text-stone-600">Script SQL do Banco:</span>
              <button
                type="button"
                onClick={copyCompleteScript}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#3E4A32] hover:underline"
              >
                {copiedScript ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedScript ? 'SQL Copiado!' : 'Copiar Script SQL Completo'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white rounded-lg font-semibold text-xs transition-colors"
              >
                Continuar no Sistema
              </button>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-semibold text-xs transition-colors"
              >
                Encerrar Sessão
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
