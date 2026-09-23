// ILEX CRM - Core Domain Types (Admin, Representada, Representante)

export type UserRole =
  | 'admin'              // Administrador Geral (gestão total do sistema, equipe, pedidos, clientes)
  | 'representada'       // Representada (fábrica/indústria parceira vinculada)
  | 'representante'      // Representante Comercial (vendas, clientes e emissão de pedidos)
  | 'socio_admin_master' // Alias legado -> admin
  | 'socio_admin'        // Alias legado -> admin
  | 'comercial'          // Alias legado -> representante
  | 'financeiro'         // Alias legado -> admin
  | 'leitura'            // Alias legado -> representante
  | 'associado'          // Alias legado -> representante
  | 'representada_admin' // Alias legado -> representada
  | 'representada_leitura'; // Alias legado -> representada

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
  partner_percentage?: number;
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
  phone?: string;
  email?: string;
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
  partner_percentage?: number;
  is_active: boolean;
  scopes?: MemberScope[];
  scope_manufacturer_id?: string;
  scope_manufacturer_name?: string;
  scope_customer_id?: string;
  scope_customer_name?: string;
}

// RBAC Role Helpers (Admin, Representada, Representante)
export const ROLE_DEFINITIONS: Record<UserRole, { label: string; description: string; isExternal: boolean }> = {
  admin: {
    label: 'Administrador',
    description: 'Acesso completo à gestão de clientes, fábricas, pedidos, relatórios e equipe.',
    isExternal: false,
  },
  representada: {
    label: 'Representada (Fábrica)',
    description: 'Acesso aos produtos, pedidos e faturamento da indústria representada vinculada.',
    isExternal: true,
  },
  representante: {
    label: 'Representante Comercial',
    description: 'Acesso à carteira de clientes, pipeline de oportunidades e emissão de pedidos.',
    isExternal: false,
  },
  // Aliases para compatibilidade
  socio_admin_master: {
    label: 'Administrador',
    description: 'Acesso completo à gestão de clientes, fábricas, pedidos, relatórios e equipe.',
    isExternal: false,
  },
  socio_admin: {
    label: 'Administrador',
    description: 'Acesso completo à gestão de clientes, fábricas, pedidos, relatórios e equipe.',
    isExternal: false,
  },
  comercial: {
    label: 'Representante Comercial',
    description: 'Acesso à carteira de clientes, pipeline de oportunidades e emissão de pedidos.',
    isExternal: false,
  },
  financeiro: {
    label: 'Administrador',
    description: 'Acesso à gestão financeira, faturamento e pedidos.',
    isExternal: false,
  },
  leitura: {
    label: 'Representante Comercial',
    description: 'Consulta de pedidos e clientes.',
    isExternal: false,
  },
  associado: {
    label: 'Representante Comercial',
    description: 'Acesso à carteira de clientes e pedidos.',
    isExternal: true,
  },
  representada_admin: {
    label: 'Representada (Fábrica)',
    description: 'Acesso aos produtos, pedidos e faturamento da fábrica vinculada.',
    isExternal: true,
  },
  representada_leitura: {
    label: 'Representada (Fábrica)',
    description: 'Consulta aos produtos e pedidos da fábrica vinculada.',
    isExternal: true,
  },
};

export function isAdminUser(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'socio_admin_master' || role === 'socio_admin' || role === 'financeiro';
}

export function canManageUsersAndSecurity(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'socio_admin_master';
}

export function canManageCommercial(role?: UserRole): boolean {
  if (!role) return false;
  return isAdminUser(role) || role === 'representante' || role === 'comercial' || role === 'associado';
}

export function canManageFinancial(role?: UserRole): boolean {
  return isAdminUser(role);
}

export function canViewCommissions(role?: UserRole): boolean {
  if (!role) return false;
  return true;
}

export function canWriteData(role?: UserRole): boolean {
  if (!role) return false;
  return isAdminUser(role) || role === 'representante' || role === 'comercial' || role === 'representada' || role === 'representada_admin';
}

export function canViewCostsAndMargins(role?: UserRole): boolean {
  return isAdminUser(role);
}

export function canExportReports(role?: UserRole): boolean {
  return isAdminUser(role);
}

export function isExternalUser(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'representada' || role === 'representada_admin' || role === 'representada_leitura' || role === 'associado';
}

export function isRepresentadaUser(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'representada' || role === 'representada_admin' || role === 'representada_leitura';
}

export function isAssociadoUser(role?: UserRole): boolean {
  if (!role) return false;
  return role === 'associado';
}

export function isRepresentanteUser(role?: UserRole): boolean {
  if (!role) return false;
  return (
    role === 'representante' ||
    role === 'comercial' ||
    role === 'associado' ||
    role === 'leitura'
  );
}

export function canAccessContactsTab(role?: UserRole): boolean {
  if (!role) return false;
  // A aba de contatos só pode aparecer para Administrador ou login de Representante
  return isAdminUser(role) || isRepresentanteUser(role);
}

export function canDeleteProduct(role?: UserRole): boolean {
  if (!role) return false;
  // Exclusão de produtos permitida estritamente para Administradores
  return isAdminUser(role);
}

export function canDeleteOrder(role?: UserRole): boolean {
  if (!role) return false;
  return isAdminUser(role) || role === 'representante' || role === 'comercial';
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

export interface Product {
  id: string;
  organization_id: string;
  manufacturer_id: string;
  manufacturer_name?: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string; // UN, CX, FD, KG, TON, M2, PCT, SC
  unit_price: number;
  minimum_order_quantity?: number;
  ncm?: string;
  commission_percentage?: number; // Comissão específica ou herdada da fábrica
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
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
  entity_type?: 'client' | 'contact'; // 'client' = cliente ativo já atendido/vendido; 'contact' = lead/prospect que ainda não comprou
  contact_subtype?: 'person' | 'factory'; // para contatos: 'person' = comprador/pessoa física; 'factory' = fábrica/indústria em prospecção
  contact_person_name?: string; // Comprador ou decisor principal
  contact_phone?: string;
  contact_email?: string;
  contact_city?: string;
  contact_state?: string;
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

