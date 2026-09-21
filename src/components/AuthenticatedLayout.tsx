import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useCRM } from '../lib/store';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { DemoBanner } from './DemoBanner';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardView } from '../features/dashboard/DashboardView';
import { CustomersView } from '../features/customers/CustomersView';
import { ManufacturersView } from '../features/manufacturers/ManufacturersView';
import { SupabaseSettingsView } from '../features/settings/SupabaseSettingsView';
import { ValidationTestsView } from '../features/tests/ValidationTestsView';
import { UsersView } from '../features/admin/UsersView';
import { OrdersView, PipelineAgendaView, CommissionsView, FinanceAdvisoryView } from '../features/placeholders/StageViews';
import { canManageUsersAndSecurity, canManageCommercial, canViewCommissions } from '../types';

export const AuthenticatedLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F7F8F6] text-[#26332D] font-sans">
        {/* Desktop Left Sidebar (Collapsible) */}
        <div className="hidden md:flex shrink-0">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <DemoBanner />
          <Header />

          <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
            <Routes>
              {/* Unified / Role-Dispatched Dashboard */}
              <Route path="/" element={<DashboardView />} />

              {/* Customers */}
              <Route path="/clientes" element={<CustomersView />} />

              {/* Manufacturers */}
              <Route path="/fabricas" element={<ManufacturersView />} />

              {/* Orders */}
              <Route path="/pedidos" element={<OrdersView />} />
              <Route path="/pedidos/novo" element={<OrdersView />} />

              {/* Funnel & Agenda */}
              <Route
                path="/agenda"
                element={
                  <ProtectedRoute
                    checkPermission={canManageCommercial}
                    requiredModuleTitle="Funil Comercial & Agenda"
                  >
                    <PipelineAgendaView />
                  </ProtectedRoute>
                }
              />

              {/* Commissions */}
              <Route
                path="/comissoes"
                element={
                  <ProtectedRoute
                    checkPermission={canViewCommissions}
                    requiredModuleTitle="Comissões & Faturamentos"
                  >
                    <CommissionsView />
                  </ProtectedRoute>
                }
              />

              {/* Advisory Plans */}
              <Route path="/assessoria" element={<FinanceAdvisoryView />} />

              {/* Admin > Users & Accesses (Exclusive to socio_admin_master) */}
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute
                    checkPermission={canManageUsersAndSecurity}
                    requiredModuleTitle="Admin: Usuários e Acessos"
                  >
                    <UsersView />
                  </ProtectedRoute>
                }
              />

              {/* Database Settings & Security (Exclusive to socio_admin_master) */}
              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute
                    checkPermission={canManageUsersAndSecurity}
                    requiredModuleTitle="Configurações do Supabase & Segurança"
                  >
                    <SupabaseSettingsView />
                  </ProtectedRoute>
                }
              />

              {/* Validation Tests (Exclusive to socio_admin_master) */}
              <Route
                path="/testes"
                element={
                  <ProtectedRoute
                    checkPermission={canManageUsersAndSecurity}
                    requiredModuleTitle="Testes Sintéticos de Regras"
                  >
                    <ValidationTestsView />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </div>
      </div>
    </BrowserRouter>
  );
};
