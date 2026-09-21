import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import {
  Lock,
  Mail,
  Key,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  LogIn,
  Copy,
  Database,
  ArrowRight,
  Building2,
  Briefcase,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SUPABASE_COMPLETE_SETUP_SQL } from '../../lib/supabaseCompleteScript';

export const LoginPage: React.FC = () => {
  const {
    signIn,
    activateFounderSession,
    authError,
    clearError,
    isConfigured,
    supabaseUrl,
    toggleDemoMode,
    isDemoMode,
  } = useCRM();

  const [email, setEmail] = useState('thiagotv.ibo@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showSqlDrawer, setShowSqlDrawer] = useState(false);

  const copyCompleteScript = () => {
    navigator.clipboard.writeText(SUPABASE_COMPLETE_SETUP_SQL);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setLocalError(err?.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterAsFounder = async () => {
    setLoading(true);
    setLocalError(null);
    clearError();
    try {
      await activateFounderSession();
    } catch (err: any) {
      setLocalError(err?.message || 'Falha ao ativar sessão de fundador.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterDemo = () => {
    toggleDemoMode(true);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#F7F8F6] text-[#26332D] antialiased">
      {/* Left Brand Showcase Column */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#2C3524] text-white p-12 flex-col justify-between relative overflow-hidden border-r border-[#3E4A32]">
        {/* Background decorative watermark */}
        <div className="absolute -right-16 -bottom-16 opacity-5 pointer-events-none">
          <Building2 size={360} />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3E4A32] to-[#1C1A17] flex items-center justify-center text-white border border-[#A78A63]/40 shadow-md">
              <span className="font-extrabold text-xl tracking-tight text-[#E8DCC9]">IX</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-white">ILEX CRM</h1>
              <p className="text-[10px] text-[#A78A63] tracking-widest uppercase font-semibold">
                Representação &amp; Assessoria B2B
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-8 max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight text-[#FAF9F5] leading-snug">
              Plataforma Comercial de Alta Performance
            </h2>
            <p className="text-sm text-stone-300 leading-relaxed">
              Gestão integrada de representadas fabris, carteira de clientes B2B, pedidos e divisão de comissões societárias com governança RLS.
            </p>
          </div>

          <div className="pt-6 space-y-3 max-w-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
              <ShieldCheck size={16} className="text-[#A78A63] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Segurança RLS Supabase</strong>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Isolamento multitenant estrito por organização, indústrias e associados.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
              <Briefcase size={16} className="text-[#A78A63] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Contrato Societário 50/50</strong>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Cálculo automático de comissões por fábrica e sócios fundadores.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
          <span>ILEX Comercial Ltda • CNPJ 42.195.882/0001-09</span>
          <span className="font-mono text-stone-300">v2.4 PostgreSQL</span>
        </div>
      </div>

      {/* Right Login Form Column */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        <div className="max-w-md w-full space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-3 pb-2 border-b border-[#E2DDD5]">
            <div className="w-10 h-10 rounded-lg bg-[#2C3524] flex items-center justify-center text-white border border-[#A78A63]/40">
              <span className="font-extrabold text-lg text-[#E8DCC9]">IX</span>
            </div>
            <div>
              <h1 className="font-bold text-base text-[#1C1A17]">ILEX CRM</h1>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Representação &amp; Assessoria</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#1C1A17] tracking-tight">Entrar na Plataforma</h2>
            <p className="text-xs text-stone-600">
              Acesse com suas credenciais do Supabase Auth ou utilize o acesso de Sócio Fundador.
            </p>
          </div>

          {/* Error Banner */}
          {(localError || authError) && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1.5 shadow-xs animate-shake">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 leading-relaxed">
                  <strong className="block font-semibold">Falha na Autenticação</strong>
                  <p className="text-[11px] mt-0.5 text-rose-900">{localError || authError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Login Form Card */}
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 shadow-sm space-y-4">
            <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="thiagotv.ibo@gmail.com"
                    className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#3E4A32] focus:ring-1 focus:ring-[#3E4A32] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-stone-700">
                    Senha
                  </label>
                  <span className="text-[10px] text-stone-400">Supabase Auth</span>
                </div>
                <div className="relative">
                  <Key size={15} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg pl-9 pr-10 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#3E4A32] focus:ring-1 focus:ring-[#3E4A32] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#3E4A32] hover:bg-[#2C3524] disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                id="btn-login-submit"
              >
                <LogIn size={15} className="text-[#A78A63]" />
                <span>{loading ? 'Validando Sessão...' : 'Entrar com E-mail e Senha'}</span>
              </button>
            </form>

            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2DDD5]"></div>
              </div>
              <span className="relative bg-white px-3 text-[11px] text-stone-400 font-medium uppercase tracking-wider">
                ou acesso rápido
              </span>
            </div>

            {/* Quick Access for Founder */}
            <div className="p-3.5 bg-gradient-to-br from-[#EDF1EA] to-[#FAF9F5] rounded-xl border border-[#3E4A32]/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#3E4A32]">
                  <Sparkles size={15} className="text-[#A78A63]" />
                  <span>Acesso Imediato Sócio Fundador</span>
                </div>
                <span className="px-1.5 py-0.5 bg-[#3E4A32] text-white rounded text-[9px] font-bold">
                  50% Sócio
                </span>
              </div>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                Inicia a sessão direta como <strong>Thiago</strong> (Sócio Admin Master) na organização ILEX Comercial Ltda.
              </p>
              <button
                type="button"
                onClick={handleEnterAsFounder}
                disabled={loading}
                className="w-full py-2.5 bg-[#3E4A32] hover:bg-[#2C3524] text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                id="btn-login-founder"
              >
                <span>Entrar como Thiago (Sócio Admin Master)</span>
                <ArrowRight size={14} className="text-[#A78A63]" />
              </button>
            </div>

            {/* Quick Demo Mode */}
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-500">Deseja simular sem banco remoto?</span>
              <button
                type="button"
                onClick={handleEnterDemo}
                className="text-[11px] font-semibold text-[#3E4A32] hover:underline"
              >
                Ativar Modo Demonstração
              </button>
            </div>
          </div>

          {/* Database Setup Accordion / Helper */}
          <div className="bg-stone-50 rounded-xl border border-[#E2DDD5] p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                <Database size={14} className="text-[#3E4A32]" />
                <span>Banco Supabase Conectado</span>
              </div>
              <button
                type="button"
                onClick={copyCompleteScript}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-100 text-[#3E4A32] border border-[#E2DDD5] rounded text-[10px] font-bold transition-colors shadow-2xs"
              >
                {copiedScript ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedScript ? 'SQL Copiado!' : 'Copiar Script SQL Completo'}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Projeto: <code className="font-mono text-stone-700 font-semibold">{supabaseUrl ? new URL(supabaseUrl).hostname : 'Supabase Conectado'}</code>. Execute o script no SQL Editor para criar as 8 tabelas e políticas RLS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
