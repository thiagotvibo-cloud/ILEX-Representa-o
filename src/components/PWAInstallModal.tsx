import React, { useState } from 'react';
import { Download, Smartphone, Chrome, Apple, Monitor, X, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, install, isIOS, isInstalled } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(
    isIOS ? 'ios' : 'android'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-[#E5E9E5] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#26332D] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/10 text-stone-300 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <img
              src="/assets/logo-05-dourada.svg"
              alt="ILEX Logo"
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <h3 className="font-extrabold text-base tracking-wide text-white">ILEX Comercial</h3>
              <p className="text-[10px] text-[#B69A67] uppercase tracking-wider font-semibold">
                Instalar Aplicativo Oficial (PWA)
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-300 mt-2 leading-relaxed">
            Instale o app nativo ILEX CRM diretamente no seu celular ou computador para rodar em tela cheia, sem barras de navegador e com acesso rápido.
          </p>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'android'
                ? 'border-[#355C4D] text-[#355C4D]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Smartphone size={15} />
            <span>Android (Chrome)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'ios'
                ? 'border-[#355C4D] text-[#355C4D]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Apple size={15} />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'desktop'
                ? 'border-[#355C4D] text-[#355C4D]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Monitor size={15} />
            <span>Computador</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-xs text-stone-700 max-h-[70vh] overflow-y-auto">
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Aplicativo já Instalado!</p>
                <p className="text-[11px] text-emerald-800">
                  O ILEX CRM já está funcionando como app nativo no seu dispositivo.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Direct 1-Click Install Button if supported by browser */}
              {isInstallable && (
                <div className="p-4 bg-stone-50 border border-[#E5E9E5] rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-[#B69A67] shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-[#26332D]">Instalação Direta Disponível</p>
                      <p className="text-[11px] text-stone-500">
                        Seu navegador suporta instalação imediata com 1 clique.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const success = await install();
                      if (success) onClose();
                    }}
                    className="w-full py-3 bg-[#355C4D] hover:bg-[#233D33] text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    id="btn-instalar-pwa-direto"
                  >
                    <Download size={16} className="text-[#B69A67]" />
                    <span>Instalar Aplicativo Agora</span>
                  </button>
                </div>
              )}

              {/* Tab 1: Android Guide */}
              {activeTab === 'android' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-[#26332D] text-sm pb-1 border-b border-stone-200">
                    <Chrome size={18} className="text-[#355C4D]" />
                    <span>Passo a Passo para Instalar no Android</span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
                    <strong>Nota:</strong> O app é instalado como <strong>aplicativo completo</strong> (com ícone próprio na sua gaveta de aplicativos e inicialização independente em tela cheia), não um simples atalho.
                  </div>

                  <ol className="space-y-3 text-xs text-stone-600 list-decimal pl-4 leading-relaxed">
                    <li>
                      Abra o link do sistema no navegador <strong>Google Chrome</strong> do seu celular Android.
                    </li>
                    <li>
                      Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito da tela do Chrome.
                    </li>
                    <li>
                      Toque na opção <strong>&quot;Instalar aplicativo&quot;</strong> (ou <strong>&quot;Instalar app&quot;</strong>).
                    </li>
                    <li>
                      Confirme em <strong>&quot;Instalar&quot;</strong> no diálogo do sistema Android.
                    </li>
                    <li>
                      Pronto! O ícone dourado do <strong>ILEX CRM</strong> aparecerá na sua tela inicial e gaveta de apps como qualquer aplicativo nativo.
                    </li>
                  </ol>
                </div>
              )}

              {/* Tab 2: iOS Guide */}
              {activeTab === 'ios' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-[#26332D] text-sm pb-1 border-b border-stone-200">
                    <Apple size={18} className="text-stone-800" />
                    <span>Passo a Passo para iPhone / iPad (Safari)</span>
                  </div>

                  <ol className="space-y-3 text-xs text-stone-600 list-decimal pl-4 leading-relaxed">
                    <li>
                      Abra o sistema no navegador <strong>Safari</strong> da Apple.
                    </li>
                    <li>
                      Toque no botão central de <strong>Compartilhar</strong> (o quadrado com uma seta apontando para cima ⎋ na barra inferior).
                    </li>
                    <li>
                      Role as opções e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                    </li>
                    <li>
                      Confirme tocando em <strong>&quot;Adicionar&quot;</strong> no canto superior direito.
                    </li>
                  </ol>
                </div>
              )}

              {/* Tab 3: Desktop Guide */}
              {activeTab === 'desktop' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-[#26332D] text-sm pb-1 border-b border-stone-200">
                    <Monitor size={18} className="text-[#355C4D]" />
                    <span>Instalar no Computador (Windows / Mac)</span>
                  </div>

                  <ol className="space-y-3 text-xs text-stone-600 list-decimal pl-4 leading-relaxed">
                    <li>
                      No Chrome ou Edge, clique no <strong>ícone de instalação (um monitor com uma seta para baixo)</strong> na barra de endereços (ao lado da estrela de favoritos).
                    </li>
                    <li>
                      Ou clique nos <strong>3 pontinhos (⋮) &gt; &quot;Transmitir, salvar e compartilhar&quot; &gt; &quot;Instalar ILEX CRM&quot;</strong>.
                    </li>
                    <li>
                      O sistema abrirá em uma janela própria de aplicativo independente da barra do navegador.
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-[#355C4D]" />
              App Seguro PWA Oficial
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
