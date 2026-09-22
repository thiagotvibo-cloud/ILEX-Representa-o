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
  Eye,
  EyeOff,
  Factory,
} from 'lucide-react';
import { SUPABASE_COMPLETE_SETUP_SQL } from '../../lib/supabaseCompleteScript';

export const LoginPage: React.FC = () => {
  const {
    signIn,
    authError,
    clearError,
    supabaseUrl,
  } = useCRM();

  const [email, setEmail] = useState('thiagotv.ibo@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

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

  return (
    <div className="min-h-[100dvh] w-screen flex flex-col md:flex-row bg-[#F7F8F6] text-[#26332D] antialiased">
      {/* Left Brand Showcase Column */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#2C3524] text-white p-12 flex-col justify-between relative overflow-hidden border-r border-[#3E4A32]">
        {/* Background decorative watermark */}
        <div className="absolute -right-16 -bottom-16 opacity-5 pointer-events-none">
          <Building2 size={360} />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <img
              src="/assets/logo-05-dourada.svg"
              alt="Logotipo ILEX Dourada"
              className="w-14 h-14 object-contain shrink-0 drop-shadow-md"
            />
            <div>
              <h1 className="font-extrabold text-xl tracking-wider text-white">ILEX COMERCIAL</h1>
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
              Gestão integrada de indústrias representadas, carteira de clientes B2B, emissão de pedidos, cálculo de comissões e acompanhamento de faturamento.
            </p>
          </div>

          <div className="pt-6 space-y-3 max-w-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
              <ShieldCheck size={16} className="text-[#A78A63] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Segurança &amp; Acesso por Perfil</strong>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Isolamento seguro para Administradores, Representadas e Representantes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 text-xs">
              <Factory size={16} className="text-[#A78A63] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Gestão Industrial Completa</strong>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Controle de tabelas de preços, prazos médios, comissionamento e ciclos de recompra.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
          <span>ILEX Comercial Ltda • CNPJ 42.195.882/0001-09</span>
          <span className="font-mono text-stone-300">Sistema Comercial</span>
        </div>
      </div>

      {/* Right Login Form Column */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto pt-[max(env(safe-area-inset-top,0px),1.5rem)] pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]">
        <div className="max-w-md w-full space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-3 pb-3 border-b border-[#E2DDD5]">
            <img
              src="/assets/logo-06-verde.svg"
              alt="Logotipo ILEX"
              className="w-11 h-11 object-contain shrink-0"
            />
            <div>
              <h1 className="font-bold text-base text-[#1C1A17]">ILEX CRM</h1>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Representação &amp; Assessoria</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#1C1A17] tracking-tight">Entrar na Plataforma</h2>
            <p className="text-xs text-stone-600">
              Digite seu e-mail e senha para acessar o painel com as permissões da sua conta.
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
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
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
                </div>
                <div className="relative">
                  <Key size={15} className="absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg pl-9 pr-10 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#3E4A32] focus:ring-1 focus:ring-[#3E4A32] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#3E4A32] hover:bg-[#2C3524] disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
                id="btn-login-submit"
              >
                <LogIn size={15} className="text-[#A78A63]" />
                <span>{loading ? 'Entrando...' : 'Entrar'}</span>
              </button>
            </form>
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
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-100 text-[#3E4A32] border border-[#E2DDD5] rounded text-[10px] font-bold transition-colors shadow-2xs cursor-pointer"
              >
                {copiedScript ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedScript ? 'SQL Copiado!' : 'Copiar Script SQL Completo'}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Projeto: <code className="font-mono text-stone-700 font-semibold">{supabaseUrl ? new URL(supabaseUrl).hostname : 'Supabase Conectado'}</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
