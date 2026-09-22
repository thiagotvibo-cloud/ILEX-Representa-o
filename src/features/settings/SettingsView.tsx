import React, { useState } from 'react';
import { useCRM } from '../../lib/store';
import { useTheme } from '../../lib/theme';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  CheckCircle2,
  User,
  Shield,
  Briefcase,
  Sun,
  Moon,
  Monitor,
  Palette,
  Check,
} from 'lucide-react';
import { ROLE_DEFINITIONS, canManageUsersAndSecurity } from '../../types';

export const SettingsView: React.FC = () => {
  const { organization, updateOrganization, currentMember } = useCRM();
  const { theme, setTheme } = useTheme();

  const roleCode = currentMember?.role_code;
  const isMaster = canManageUsersAndSecurity(roleCode);

  const [tradeName, setTradeName] = useState(organization?.trade_name || 'ILEX Comercial');
  const [legalName, setLegalName] = useState(organization?.name || 'ILEX Representação e Assessoria Comercial Ltda');
  const [document, setDocument] = useState(organization?.document || '42.195.882/0001-09');
  const [city, setCity] = useState(organization?.city || 'São Mateus do Sul');
  const [state, setState] = useState(organization?.state || 'PR');
  const [country, setCountry] = useState(organization?.country || 'BRA');
  const [email, setEmail] = useState(organization?.email || 'contato@ilexcomercial.com.br');
  const [phone, setPhone] = useState(organization?.phone || '(42) 3532-1000');
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMaster) return;

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await updateOrganization({
        trade_name: tradeName.trim(),
        name: legalName.trim(),
        document: document.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1C1A17] tracking-tight">Configurações & Aparência</h1>
        <p className="text-xs text-stone-500 mt-1">
          Ajuste as preferências visuais do seu dispositivo, tema claro ou escuro e consulte os dados cadastrais da representação.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">Configurações atualizadas com sucesso!</span>
        </div>
      )}

      {/* Theme and Appearance Selector (Accessible to ALL users) */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E2DDD5]">
          <div className="w-8 h-8 rounded-lg bg-[#384633] text-white flex items-center justify-center">
            <Palette size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1C1A17]">Aparência & Modo de Visualização</h2>
            <p className="text-[11px] text-stone-500">Disponível para todos os usuários: escolha entre modo claro, escuro ou automático</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-[#355C4D] bg-[#EDF3F0]/80 ring-2 ring-[#355C4D]/20 shadow-xs'
                : 'border-[#E2DDD5] hover:border-stone-300 bg-stone-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sun size={17} />
              </div>
              {theme === 'light' && (
                <span className="w-5 h-5 rounded-full bg-[#355C4D] text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-xs text-[#1C1A17]">Modo Claro</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Paleta clássica com tons areia e verde botânico</p>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-[#355C4D] bg-[#222D27] ring-2 ring-[#355C4D]/40 shadow-xs'
                : 'border-[#E2DDD5] hover:border-stone-300 bg-stone-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-300 flex items-center justify-center border border-indigo-800/40">
                <Moon size={17} />
              </div>
              {theme === 'dark' && (
                <span className="w-5 h-5 rounded-full bg-[#355C4D] text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-xs text-[#1C1A17]">Modo Escuro</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Design executivo de alto contraste para conforto visual</p>
            </div>
          </button>

          {/* System Mode */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              theme === 'system'
                ? 'border-[#355C4D] bg-[#EDF3F0]/80 ring-2 ring-[#355C4D]/20 shadow-xs'
                : 'border-[#E2DDD5] hover:border-stone-300 bg-stone-50/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center">
                <Monitor size={17} />
              </div>
              {theme === 'system' && (
                <span className="w-5 h-5 rounded-full bg-[#355C4D] text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div>
              <p className="font-bold text-xs text-[#1C1A17]">Automático (Sistema)</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Acompanha o tema configurado no seu dispositivo</p>
            </div>
          </button>
        </div>
      </div>

      {/* Current User Session Profile */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E2DDD5]">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1C1A17]">Seu Perfil de Acesso</h2>
            <p className="text-[11px] text-stone-500">Informações da sua conta e permissões concedidas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">Nome</span>
            <span className="font-bold text-stone-900 text-sm">{currentMember?.full_name || 'Usuário Autenticado'}</span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">E-mail</span>
            <span className="font-bold text-stone-900 text-xs truncate block">{currentMember?.email || '—'}</span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">Papel no Sistema</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#384633] text-xs mt-0.5">
              <Shield size={12} className="text-[#A18557]" />
              {roleCode ? ROLE_DEFINITIONS[roleCode]?.label : 'Administrador'}
            </span>
          </div>
        </div>
      </div>

      {/* Organization Details (Admin editable, Others read-only) */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2DDD5]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#384633] text-white flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1C1A17]">Dados da Representação Comercial</h2>
                <p className="text-[11px] text-stone-500">Identificação jurídica e comercial da ILEX</p>
              </div>
            </div>
            {!isMaster && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                Visualização (Restrito a Admin)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                disabled={!isMaster}
                required
                className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#384633] disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">Razão Social</label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                disabled={!isMaster}
                required
                className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#384633] disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">CNPJ</label>
              <input
                type="text"
                value={document}
                onChange={e => setDocument(e.target.value)}
                disabled={!isMaster}
                placeholder="00.000.000/0000-00"
                className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#384633] disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!isMaster}
                className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#384633] disabled:opacity-80"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={!isMaster}
                className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#384633] disabled:opacity-80"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  disabled={!isMaster}
                  className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#384633] disabled:opacity-80"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">UF</label>
                <input
                  type="text"
                  value={state}
                  maxLength={2}
                  onChange={e => setState(e.target.value.toUpperCase())}
                  disabled={!isMaster}
                  className="w-full bg-[#FAF9F5] border border-[#E2DDD5] rounded-lg px-3 py-2 text-xs text-[#1C1A17] text-center uppercase focus:outline-none focus:border-[#384633] disabled:opacity-80"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button (only if admin/master) */}
        {isMaster && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#384633] hover:bg-[#2A3526] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Save size={15} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
