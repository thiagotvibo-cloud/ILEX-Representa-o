import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'subtle';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running in standalone PWA, don't clutter the header
  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (variant === 'subtle') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`flex items-center gap-2 text-stone-300 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition-colors text-xs cursor-pointer ${className}`}
          title="Instalar App no Celular / Computador"
        >
          <Download size={16} className="text-[#B69A67]" />
          <span>Instalar App</span>
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (variant === 'full') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#B69A67] hover:bg-[#967D50] text-[#1C1A17] text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${className}`}
          id="btn-instalar-pwa-full"
        >
          <Smartphone size={16} />
          <span>Baixar App no Celular</span>
        </button>
        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-[#B69A67]/15 hover:bg-[#B69A67]/25 text-[#7A643A] dark:text-[#E2C792] border border-[#B69A67]/30 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer ${className}`}
        title="Instalar aplicativo na tela inicial"
        id="btn-instalar-pwa"
      >
        <Download size={13} className="text-[#967D50] dark:text-[#E2C792]" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
