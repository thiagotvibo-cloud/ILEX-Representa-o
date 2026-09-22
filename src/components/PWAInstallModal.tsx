import React from 'react';
import { Download, Smartphone, Chrome, Apple, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, install, isIOS, isInstalled } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-[#E5E9E5] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#26332D] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/10 text-stone-300 transition-colors"
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
                Instalar Aplicativo Web (PWA)
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-300 mt-2 leading-relaxed">
            Instale o app diretamente no seu celular ou computador sem ocupar a memória de uma loja tradicional, com acesso rápido pela tela inicial.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-xs text-stone-700">
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Aplicativo já Instalado!</p>
                <p className="text-[11px] text-emerald-800">
                  O ILEX CRM já está funcionando como app na sua tela inicial.
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 border border-[#E5E9E5] rounded-2xl flex items-center gap-3">
                <Chrome size={28} className="text-[#355C4D] shrink-0" />
                <div>
                  <p className="font-bold text-sm text-[#26332D]">Google Chrome / Android</p>
                  <p className="text-[11px] text-stone-500">
                    Clique no botão abaixo para adicionar o app à sua tela inicial instantaneamente.
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  const success = await install();
                  if (success) onClose();
                }}
                className="w-full py-3 bg-[#355C4D] hover:bg-[#233D33] text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={18} className="text-[#B69A67]" />
                <span>Instalar no Dispositivo</span>
              </button>
            </div>
          ) : isIOS ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#26332D] text-sm pb-1 border-b border-stone-200">
                <Apple size={18} className="text-stone-800" />
                <span>Como instalar no iPhone / iPad (Safari)</span>
              </div>
              <ol className="space-y-2.5 text-xs text-stone-600 list-decimal pl-4">
                <li>
                  No navegador Safari, toque no ícone de <strong>Compartilhar</strong> (o quadrado com uma seta para cima na barra inferior).
                </li>
                <li>
                  Role as opções para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong> (ou <i>&quot;Add to Home Screen&quot;</i>).
                </li>
                <li>
                  Toque em <strong>&quot;Adicionar&quot;</strong> no canto superior direito.
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-[#26332D] text-sm pb-1 border-b border-stone-200">
                <Chrome size={18} className="text-[#355C4D]" />
                <span>Como instalar pelo Google Chrome</span>
              </div>
              <ol className="space-y-2.5 text-xs text-stone-600 list-decimal pl-4">
                <li>
                  Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito do Google Chrome.
                </li>
                <li>
                  Selecione a opção <strong>&quot;Adicionar à tela inicial&quot;</strong> ou <strong>&quot;Instalar aplicativo&quot;</strong>.
                </li>
                <li>
                  Confirme em <strong>&quot;Instalar&quot;</strong> para ter o ícone do ILEX no seu menu de apps.
                </li>
              </ol>
            </div>
          )}

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span>Versão Web PWA 2.0</span>
            <button
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
