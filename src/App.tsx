import React from 'react';
import { CRMProvider, useCRM } from './lib/store';
import { AuthenticatedLayout } from './components/AuthenticatedLayout';
import { LoginPage } from './features/auth/LoginPage';
import { ShieldCheck } from 'lucide-react';

const AppGate: React.FC = () => {
  const { session, currentMember, user, isDemoMode, isLoadingAuth } = useCRM();

  // Show a clean, branded loading spinner while Supabase checks the active session
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#F7F8F6] text-[#26332D]">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-[#2C3524] flex items-center justify-center text-white border border-[#A78A63]/40 shadow-sm">
            <span className="font-extrabold text-xl text-[#E8DCC9]">IX</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <div className="w-3.5 h-3.5 border-2 border-[#3E4A32] border-t-transparent rounded-full animate-spin"></div>
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

