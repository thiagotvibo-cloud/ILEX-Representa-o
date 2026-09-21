import React, { useState, useEffect } from 'react';
import { useCRM } from '../../lib/store';
import {
  testSupabaseAuthConnection,
  ConnectionTestResult,
} from '../../lib/supabase';
import {
  Database,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Lock,
  Layers,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SUPABASE_COMPLETE_SETUP_SQL } from '../../lib/supabaseCompleteScript';

export const SupabaseSettingsView: React.FC = () => {
  const {
    isConfigured,
    isDemoMode,
    supabaseUrl,
    supabaseAnonKey,
    saveSupabaseConfig,
    toggleDemoMode,
    activateFounderSession,
    user,
    currentMember,
    organization,
  } = useCRM();

  const [urlInput, setUrlInput] = useState(supabaseUrl || '');
  const [keyInput, setKeyInput] = useState(supabaseAnonKey || '');
  const [copied, setCopied] = useState(false);
  const [copiedCompleteSql, setCopiedCompleteSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [founderSuccess, setFounderSuccess] = useState(false);

  // Real Probe Test State
  const [testingProbe, setTestingProbe] = useState(false);
  const [probeResult, setProbeResult] = useState<ConnectionTestResult | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(urlInput.trim(), keyInput.trim());
    setSaveSuccess(true);
    setProbeResult(null);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestProbe = async () => {
    setTestingProbe(true);
    setProbeResult(null);
    try {
      const res = await testSupabaseAuthConnection();
      setProbeResult(res);
    } catch (err: any) {
      setProbeResult({
        connected: false,
        authenticated: false,
        user: null,
        session: null,
        organizationFound: false,
        errorMessage: err?.message || 'Falha desconhecida no teste de conexão.',
      });
    } finally {
      setTestingProbe(false);
    }
  };

  const copyCompleteSql = () => {
    navigator.clipboard.writeText(SUPABASE_COMPLETE_SETUP_SQL);
    setCopiedCompleteSql(true);
    setTimeout(() => setCopiedCompleteSql(false), 3000);
  };

  const handleActivateFounder = async () => {
    await activateFounderSession();
    setFounderSuccess(true);
    setTimeout(() => setFounderSuccess(false), 3000);
  };

  const sqlQuickCopy = `-- ILEX CRM - Executar no Supabase SQL Editor
-- Script canônico completo unificado disponível no botão "Copiar Script SQL Completo"
-- 1. supabase/scripts/setup_complete_database.sql`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlQuickCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs">
        <h1 className="text-xl font-bold text-[#1C1A17] flex items-center gap-2">
          <Database size={22} className="text-[#3E4A32]" />
          Conexão Supabase (PostgreSQL + RLS + Auth)
        </h1>
        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
          O ILEX CRM utiliza o banco relacional PostgreSQL do Supabase como fonte canônica da verdade.
          Autenticação real com Supabase Auth, controle de concorrência com UUID e proteção estrita contra auto-elevação de papéis societários.
        </p>
      </div>

      {/* 1-Click Database Setup & Founder Quick Access Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Setup SQL Card */}
        <div className="bg-gradient-to-br from-[#3E4A32] to-[#2C3524] text-white p-5 rounded-xl shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#A78A63]">
              <Database size={17} />
              <span>Script SQL Canônico Completo</span>
            </div>
            <p className="text-xs text-stone-200 leading-relaxed">
              Cria todas as 8 tabelas principais (organizações, papéis, membros, fábricas, clientes, endereços, contatos, pedidos), políticas RLS e já vincula seu usuário como <strong>Sócio Admin Master</strong>.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={copyCompleteSql}
              className="w-full py-2.5 bg-white hover:bg-stone-100 text-[#3E4A32] rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
              id="btn-copiar-sql-completo"
            >
              {copiedCompleteSql ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
              <span>{copiedCompleteSql ? 'SQL Completo Copiado!' : 'Copiar Script SQL Completo (1 Clique)'}</span>
            </button>
            <p className="text-[10px] text-stone-300 text-center">
              Cole no Supabase &gt; SQL Editor &gt; New query &gt; Run
            </p>
          </div>
        </div>

        {/* Instant Founder Session Access Card */}
        <div className="bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-sm text-[#3E4A32]">
              <Sparkles size={17} className="text-[#A78A63]" />
              <span>Acesso Imediato Sócio Fundador (Thiago)</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Ativa a sessão com privilégios totais de <strong>Sócio Admin Master</strong> (50% de participação) na organização ILEX Comercial Ltda, permitindo operar todo o CRM imediatamente com resiliência a cache local.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleActivateFounder}
              className="w-full py-2.5 bg-[#3E4A32] hover:bg-[#2C3524] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
              id="btn-ativar-sessao-fundador"
            >
              <UserCheck size={15} className="text-[#A78A63]" />
              <span>{founderSuccess ? 'Sessão Ativada com Sucesso!' : 'Ativar Sessão como Sócio Admin Master'}</span>
            </button>
            <p className="text-[10px] text-stone-500 text-center">
              Thiago • thiagotv.ibo@gmail.com • Sócio Admin Master
            </p>
          </div>
        </div>
      </div>

      {/* Connection Mode & Real Probe Status */}
      <div className="bg-white p-5 rounded-xl border border-[#E2DDD5] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2DDD5]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">Modo Operacional</span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isDemoMode
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : isConfigured
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-stone-100 text-stone-800'
                }`}
              >
                {isDemoMode ? 'Modo Demonstração (Isolado)' : isConfigured ? 'Supabase Cloud (Produção)' : 'Supabase Não Configurado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleDemoMode(!isDemoMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isDemoMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
              }`}
            >
              {isDemoMode ? 'Sair do Modo Demo' : 'Ativar Modo Demonstração'}
            </button>

            <button
              onClick={handleTestProbe}
              disabled={testingProbe || !isConfigured}
              className="px-3 py-1.5 bg-[#3E4A32] hover:bg-[#2C3524] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              id="btn-testar-conexao"
            >
              <RefreshCw size={13} className={testingProbe ? 'animate-spin' : ''} />
              <span>{testingProbe ? 'Testando no Supabase...' : 'Testar Conexão Autenticada'}</span>
            </button>
          </div>
        </div>

        {/* Real Probe Result Card */}
        {probeResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
              probeResult.connected && probeResult.authenticated && probeResult.organizationFound
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : probeResult.connected && probeResult.authenticated
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {probeResult.connected && probeResult.authenticated ? (
                <CheckCircle2 size={18} className="text-emerald-700" />
              ) : (
                <AlertTriangle size={18} className="text-rose-700" />
              )}
              <span>
                {probeResult.connected && probeResult.authenticated
                  ? 'Conexão HTTP e Sessão Supabase Auth Válidas!'
                  : 'Falha na Conexão / Autenticação Supabase'}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px] pt-1">
              <div>
                <strong>Status Conexão:</strong> {probeResult.connected ? 'OK (HTTP 200)' : 'Inacessível'}
              </div>
              <div>
                <strong>Sessão Auth:</strong>{' '}
                {probeResult.authenticated ? `Ativa (${probeResult.user?.email})` : 'Nenhuma sessão ativa'}
              </div>
              <div>
                <strong>Consulta RLS organizations:</strong>{' '}
                {probeResult.organizationFound
                  ? `Sucesso: Organização "${probeResult.orgName}" encontrada`
                  : probeResult.authenticated
                  ? 'Nenhuma organização vinculada ao usuário atual (execute o bootstrap ou solicite convite)'
                  : 'Pendente de login'}
              </div>
              {probeResult.errorMessage && (
                <div className="text-rose-800 font-sans font-semibold pt-1">
                  <strong>Detalhes do Erro:</strong> {probeResult.errorMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Credentials Form */}
      <div className="bg-white p-6 rounded-xl border border-[#E2DDD5] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD5]">
          <h2 className="text-sm font-bold text-[#1C1A17] flex items-center gap-2">
            <Key size={16} className="text-[#A78A63]" />
            Credenciais do Projeto Supabase
          </h2>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#3E4A32] font-semibold hover:underline flex items-center gap-1"
          >
            Supabase Dashboard
            <ExternalLink size={12} />
          </a>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-stone-700 block mb-1">
              Supabase Project URL (VITE_SUPABASE_URL)
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3E4A32]"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-stone-700 block mb-1">
              Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-[#F8F7F4] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#3E4A32]"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Utilize somente a chave pública com anon role e RLS ativo. Nunca utilize service-role key no frontend.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              Credenciais salvas com sucesso!
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[#3E4A32] hover:bg-[#2C3524] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              Salvar Credenciais
            </button>
          </div>
        </form>
      </div>

      {/* Security & Anti-Elevation Architecture */}
      <div className="bg-white p-6 rounded-xl border border-[#E2DDD5] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#3E4A32]" />
          <h2 className="text-sm font-bold text-[#1C1A17]">
            Arquitetura de Segurança, RLS e Proteção Anti-Autoelevação
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-700">
          <div className="p-4 rounded-lg bg-[#F8F7F4] border border-[#E2DDD5] space-y-2">
            <h3 className="font-bold text-[#3E4A32] flex items-center gap-1.5">
              <Lock size={14} />
              Impossibilidade de Autoelevação no Cliente
            </h3>
            <p className="leading-relaxed">
              No modo real, o cliente nunca define seu próprio papel societário. A política{' '}
              <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">memberships_admin_manage</code>{' '}
              assegura que somente sócios administradores ativos podem alterar papéis ou convidar novos membros na tabela{' '}
              <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">memberships</code>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#F8F7F4] border border-[#E2DDD5] space-y-2">
            <h3 className="font-bold text-[#3E4A32] flex items-center gap-1.5">
              <UserCheck size={14} />
              Bootstrap Inicial Idempotente e Seguro
            </h3>
            <p className="leading-relaxed">
              A função segura{' '}
              <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-[10px]">bootstrap_initial_organization_and_admin</code>{' '}
              só pode ser invocada se a tabela de organizações estiver vazia. Assim que a primeira organização for provisionada, qualquer nova tentativa de bootstrap é rejeitada no banco de dados.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E2DDD5] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-stone-800">Arquivos de Migração no Repositório:</h3>
            <p className="text-[11px] text-stone-500">Nunca executamos migrações automáticas em banco de dados remoto sem intervenção do usuário.</p>
          </div>
          <button
            onClick={copySql}
            className="text-xs font-semibold text-[#A78A63] hover:underline flex items-center gap-1"
          >
            <Copy size={13} />
            {copied ? 'Copiado!' : 'Copiar Lista'}
          </button>
        </div>

        <ul className="list-disc list-inside text-xs text-stone-700 space-y-1 font-mono bg-stone-50 p-3 rounded-lg border border-stone-200">
          <li>supabase/migrations/20260920000001_initial_schema.sql (Esquema canônico das 28 tabelas)</li>
          <li>supabase/migrations/20260920000002_rls_and_seed.sql (Políticas RLS e current_user_org_id)</li>
          <li>supabase/migrations/20260921000001_auth_bootstrap_fixes.sql (Anti-autoelevação e bootstrap seguro)</li>
        </ul>
      </div>
    </div>
  );
};
