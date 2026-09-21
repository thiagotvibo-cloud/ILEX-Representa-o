// ILEX CRM - Core Domain Types

export type UserRole =
  | 'socio_admin_master' // Thiago (administração total, usuários, banco, auditoria)
  | 'socio_admin'        // Julienne (gestão comercial e operacional, sem banco/configuração de segurança)
  | 'comercial'          // Comercial (clientes, contatos, agenda, pipeline e pedidos)
  | 'financeiro'         // Financeiro (faturamento, recebimentos, comissões, títulos e relatórios)
  | 'leitura'            // Somente leitura (não grava, não edita)
  | 'associado'          // Externo: acesso somente à sua empresa/carteira
  | 'representada_admin' // Externo: gestão da fábrica representada vinculada
  | 'representada_leitura'; // Externo: consulta da fábrica representada vinculada

export interface MemberScope {
  id: string;
  organization_id: string;
  user_id: string;
  scope_type: 'manufacturer' | 'customer' | 'partner';
  scope_id: string;
  scope_name?: string;
  created_at?: string;
}

export interface MemberInvitation {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role_code: UserRole;
  partner_percentage: number;
  scope_type?: 'manufacturer' | 'customer' | 'partner';
  scope_id?: string;
  scope_name?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  trade_name?: string;
  document?: string;
  city: string;
  state: string;
  country: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Member {
  organization_id: string;
  user_id: string;
  role_code: UserRole;
  full_name: string;
  email: string;
  avatar_url?: string;
  partner_percentage: number;
  is_active: boolean;
  scopes?: MemberScope[];
  scope_manufacturer_id?: string;
  scope_manufacturer_name?: string;
  scope_customer_id?: string;
  scope_customer_name?: string;
}

// RBAC Role Helpers
export const ROLE_DEFINITIONS: Record<UserRole, { label: string; description: string; isExternal: boolean }> = {
  socio_admin_master: {
    label: 'Sócio Admin Master (Thiago)',
    description: 'Acesso irrestrito a todas as operações, segurança, banco de dados, auditoria e gestão de usuários.',
    isExternal: false,
  },
  socio_admin: {
    label: 'Sócio Administrador (Julienne)',
    description: 'Gestão comercial, financeira e operacional executiva. Sem acesso a configurações de banco e segurança.',
    isExternal: false,
  },
  comercial: {
    label: 'Equipe Comercial',
    description: 'Gestão de clientes, contatos, pipeline de vendas, agenda e emissão de orçamentos e pedidos.',
    isExternal: false,
  },
  financeiro: {
    label: 'Financeiro & Comissões',
    description: 'Gestão de faturamento, liquidação de recebíveis, cálculo de comissões e relatórios financeiros.',
    isExternal: false,
  },
  leitura: {
    label: 'Consulta (Somente Leitura)',
    description: 'Acesso de visualização restrito; bloqueado para criação, edição ou exclusão de registros.',
    isExternal: false,
  },
  associado: {
    label: 'Associado Externo',
    description: 'Acesso estrito à sua empresa/carteira atribuída e evolução compartilhada pela ILEX.',
    isExternal: true,
  },
  representada_admin: {
    label: 'Representada Admin (Fábrica)',
    description: 'Gestão da sua fábrica atribuída, seus produtos, pedidos, faturamento e comissões devidas.',
    isExternal: true,
  },
  representada_leitura: {
    label: 'Representada Consulta (Fábrica)',
    description: 'Consulta da sua fábrica atribuída, produtos, pedidos e comissões devidas (somente leitura).',
    isExternal: true,
  },
};

export function canManageUsersAndSecurity(role?: UserRole): boolean {
  return role === 'socio_admin_master';
}

export function canManageCommercial(role?: UserRole): boolean {
  return role === 'socio_admin_master' || role === 'socio_admin' || role === 'comercial';
}

export function canManageFinancial(role?: UserRole): boolean {
  return role === 'socio_admin_master' || role === 'socio_admin' || role === 'financeiro';
}

export function canViewCommissions(role?: UserRole): boolean {
  if (!role) return false;
  return ['socio_admin_master', 'socio_admin', 'financeiro', 'representada_admin', 'representada_leitura'].includes(role);
}

export function canWriteData(role?: UserRole): boolean {
  if (!role) return false;
  return ['socio_admin_master', 'socio_admin', 'comercial', 'financeiro', 'representada_admin'].includes(role);
}

export function canViewCostsAndMargins(role?: UserRole): boolean {
  if (!role) return false;
  return ['socio_admin_master', 'socio_admin', 'financeiro'].includes(role);
}

export function canExportReports(role?: UserRole): boolean {
  if (!role) return false;
  return ['socio_admin_master', 'socio_admin', 'financeiro'].includes(role);
}

export function isExternalUser(role?: UserRole): boolean {
  if (!role) return false;
  return ['associado', 'representada_admin', 'representada_leitura'].includes(role);
}

export function isRepresentadaUser(role?: UserRole): boolean {
  if (!role) return false;
  return ['representada_admin', 'representada_leitura'].includes(role);
}

export function isAssociadoUser(role?: UserRole): boolean {
  return role === 'associado';
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  type: 'billing' | 'shipping' | 'financial' | 'other';
  street: string;
  number?: string;
  complement?: string;
  district?: string;
  city: string;
  state: string;
  country: string; // 'BRA', 'PRY', etc.
  postal_code?: string;
  is_primary: boolean;
  created_at?: string;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  preferred_channel: 'whatsapp' | 'phone' | 'email';
  notes?: string;
  birth_date?: string;
  is_primary: boolean;
  created_at?: string;
}

export interface CustomerManufacturerLink {
  id: string;
  customer_id: string;
  manufacturer_id: string;
  manufacturer_name?: string;
  external_code?: string;
  credit_limit: number;
  credit_status: 'approved' | 'blocked' | 'pending_review';
  reorder_cycle_days: number;
  last_order_date?: string;
  next_expected_reorder_date?: string;
  custom_payment_terms?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  country: string;
  person_type: 'PJ' | 'PF';
  legal_name: string;
  trade_name?: string;
  document_type: 'CNPJ' | 'CPF' | 'RUC' | 'OTHER';
  document?: string;
  document_normalized?: string;
  state_registration?: string;
  is_ie_exempt: boolean;
  city_registration?: string;
  icms_taxpayer_type: 'taxpayer' | 'exempt' | 'non_taxpayer';
  tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
  segment?: string;
  company_size?: string;
  is_branch: boolean;
  status: 'active' | 'incomplete' | 'inactive' | 'blocked';
  tags: string[];
  notes?: string;
  addresses?: CustomerAddress[];
  contacts?: CustomerContact[];
  manufacturer_links?: CustomerManufacturerLink[];
  created_at: string;
  updated_at: string;
}

export type CommissionTrigger = 'billing' | 'receipt' | 'contract';

export interface Manufacturer {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  trade_name?: string;
  document?: string;
  status: 'active' | 'planned' | 'inactive';
  currency: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  initial_commission_rate: number; // e.g., 0.05 for 5%
  commission_trigger: CommissionTrigger;
  commission_trigger_description?: string;
  order_cutoff_day?: number;
  payment_terms_summary?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RepresentationContract {
  id: string;
  organization_id: string;
  manufacturer_id: string;
  manufacturer_name?: string;
  contract_number?: string;
  start_date: string;
  end_date?: string;
  is_exclusive: boolean;
  base_type: string;
  trigger_type: CommissionTrigger;
  payment_delay_days: number;
  notes?: string;
  is_active: boolean;
}

export interface AdvisoryPlan {
  id: string;
  organization_id: string;
  code: 'BASIC' | 'PRO' | 'PREMIUM';
  name: string;
  monthly_fee: number;
  variable_commission_rate: number;
  included_hours: number;
  description: string;
  is_active: boolean;
}

export interface AdvisoryContract {
  id: string;
  organization_id: string;
  customer_id: string;
  customer_name?: string;
  plan_id: string;
  plan_name?: string;
  monthly_fee: number;
  variable_rate: number;
  start_date: string;
  end_date?: string;
  billing_day: number;
  status: 'proposal' | 'active' | 'suspended' | 'cancelled';
  lead_partner_id?: string;
  notes?: string;
}

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'invoiced'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface OrderItem {
  id?: string;
  order_id?: string;
  manufacturer_id?: string;
  sku: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentages?: number[]; // e.g. [10, 5]
  net_unit_price?: number;
  total_net_price?: number;
  total_price?: number;
  commission_rate?: number;
  commission_amount?: number;
}

export interface Order {
  id: string;
  organization_id?: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  manufacturer_id: string;
  manufacturer_name: string;
  seller_id?: string;
  seller_name?: string;
  region?: string;
  status: OrderStatus;
  total_gross?: number;
  total_net?: number; // Volume faturado / vendido pela indústria
  total_amount: number; // Volume total da transação
  commission_rate: number;
  commission_total?: number; // Receita ILEX
  commission_amount: number; // Receita da comissão
  commission_received?: number; // Liquidado
  commission_pending?: number; // A receber
  issue_date?: string;
  order_date: string;
  expected_delivery_date?: string;
  invoiced_date?: string;
  payment_terms?: string;
  notes?: string;
  items?: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

export type PeriodFilter = 'hoje' | '7d' | 'mes_atual' | 'mes_anterior' | 'trimestre' | 'custom';

export interface DashboardFilterState {
  period: PeriodFilter;
  customStartDate?: string;
  customEndDate?: string;
  manufacturerId?: string; // 'all' or UUID
  region?: string;         // 'all' or state/region
  customerId?: string;     // 'all' or UUID
  sellerId?: string;       // 'all' or UUID
  status?: string;         // 'all' or OrderStatus
}

export interface ExecutiveDashboardMetrics {
  totalSalesVolume: number;      // Faturamento total das indústrias
  ilexRevenue: number;           // Total de comissões geradas para a assessoria
  commissionReceivable: number;  // Comissões a faturar / parcelas vincendas
  commissionReceived: number;    // Comissões efetivamente recebidas/liquidadas
  totalOrdersCount: number;
  activeCustomersCount: number;
  averageTicket: number;
  upcomingReordersCount: number;
  funnelConversionRate: number;  // Ex: 28%
  topCustomers: { customerId: string; customerName: string; totalVolume: number; orderCount: number }[];
  topProducts: { sku: string; description: string; manufacturerName: string; quantity: number; totalVolume: number }[];
  comparisonPreviousPeriod?: {
    volumeGrowthRate: number;
    ordersGrowthRate: number;
    hasData: boolean;
  };
}

export interface RepresentadaDashboardMetrics {
  manufacturerId: string;
  manufacturerName: string;
  currency: string;
  totalVolume: number;
  unitsSold: number;
  ordersCount: number;
  commissionDue: number;      // Elegível / A faturar
  commissionPaid: number;     // Liquidada
  pendingOrdersCount: number;
  commissionTrigger: CommissionTrigger;
  commissionTriggerDescription?: string;
  buyers: { customerId: string; customerName: string; totalBought: number; orderCount: number; lastOrderDate: string }[];
  products: { sku: string; description: string; units: number; totalRevenue: number }[];
}

export interface AssociadoDashboardMetrics {
  partnerId?: string;
  customerId?: string;
  targetName: string;
  totalOrders: number;
  totalVolume: number;
  walletEvolutionRate: number;
  upcomingActions: { id: string; title: string; date: string; type: 'visit' | 'order_review' | 'proposal' }[];
  sharedProducts: { sku: string; description: string; manufacturerName: string }[];
  availableReports: { id: string; title: string; date: string; format: 'PDF' | 'CSV' }[];
}

