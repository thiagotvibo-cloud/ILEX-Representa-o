import React from 'react';
import { CRMProvider, useCRM } from './lib/store';
import { AuthenticatedLayout } from './components/AuthenticatedLayout';
import { LoginPage } from './features/auth/LoginPage';
import { IlexLogo } from './components/IlexLogo';
import { ShieldCheck } from 'lucide-react';

const AppGate: React.FC = () => {
  const { session, currentMember, user, isDemoMode, isLoadingAuth } = useCRM();

  // Show a clean, branded loading spinner while Supabase checks the active session
  // Background is light (#F7F8F6) -> Use Logo 06 (Verde)
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#F7F8F6] text-[#26332D]">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <div className="w-16 h-16 p-2 rounded-2xl bg-white flex items-center justify-center border border-[#A18557]/20 shadow-md">
            <IlexLogo variant="green" size={48} title="ILEX Logo Verde (Logo 06)" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <div className="w-3.5 h-3.5 border-2 border-[#384633] border-t-transparent rounded-full animate-spin"></div>
            <span>Verificando sessão segura Supabase...</span>
          </div>
        </div>
      </div>
    );
  }

  // Active session exists: either Supabase session / member or explicit demo mode
  const hasActiveSession = Boolean(session || currentMember || user || isDemoMode);

  if (!hasActiveSession) {
    return <LoginPage />;
  }

  return <AuthenticatedLayout />;
};

export default function App() {
  return (
    <CRMProvider>
      <AppGate />
    </CRMProvider>
  );
}

