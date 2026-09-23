import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Customer, Manufacturer, Member, Organization, AdvisoryPlan, UserRole, MemberInvitation, Order, OrderStatus, isAdminUser, Product } from '../types';
import {
  INITIAL_ORGANIZATION,
  INITIAL_MEMBERS,
  INITIAL_MANUFACTURERS,
  INITIAL_CUSTOMERS,
  INITIAL_ADVISORY_PLANS,
  INITIAL_INVITATIONS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
} from './initialData';
import {
  getSupabaseConfig,
  getSupabaseClient,
  setCustomSupabaseCredentials,
  setExplicitDemoMode,
  SupabaseConfig,
} from './supabase';

export interface CRMContextType {
  // Auth & Session
  user: User | null;
  session: Session | null;
  currentMember: Member | null; // NULL during initial loading or when not logged in
  organization: Organization | null;
  updateOrganization: (updates: Partial<Organization>) => Promise<void>;
  isLoadingAuth: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  bootstrapAdmin: (partnerName: string) => Promise<void>;
  activateFounderSession: () => Promise<void>;

  // Configuration & Mode
  isConfigured: boolean;
  isDemoMode: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  saveSupabaseConfig: (url: string, key: string) => void;
  toggleDemoMode: (enable: boolean) => void;

  // Data Loading & Errors
  isLoadingData: boolean;
  dataError: string | null;
  clearError: () => void;
  refreshData: () => Promise<void>;

  // Customers & Contacts (Async CRUD)
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  batchUpdateCustomers: (ids: string[], updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  batchDeleteCustomers: (ids: string[]) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  convertContactToClient: (id: string) => Promise<void>;

  // Products (Async CRUD)
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  batchUpdateProducts: (ids: string[], updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  batchDeleteProducts: (ids: string[]) => Promise<void>;
  getProductById: (id: string) => Product | undefined;

  // Universal Spreadsheet Import (Excel / CSV)
  importSpreadsheetData: (
    target: 'customers' | 'contacts' | 'products' | 'manufacturers',
    rows: any[]
  ) => Promise<{ imported: number; errors: string[] }>;

  // Manufacturers (Async CRUD)
  manufacturers: Manufacturer[];
  addManufacturer: (manufacturer: Omit<Manufacturer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Manufacturer>;
  updateManufacturer: (id: string, updates: Partial<Manufacturer>) => Promise<void>;
  deleteManufacturer: (id: string) => Promise<void>;
  getManufacturerById: (id: string) => Manufacturer | undefined;

  // Advisory Plans
  advisoryPlans: AdvisoryPlan[];

  // Members & Admin Management (Exclusive to socio_admin_master)
  members: Member[];
  invitations: MemberInvitation[];
  inviteUser: (params: {
    email: string;
    fullName: string;
    roleCode: UserRole;
    partnerPercentage?: number;
    scopeType?: 'manufacturer' | 'customer' | 'partner';
    scopeId?: string;
    scopeName?: string;
  }) => Promise<MemberInvitation>;
  createMemberDirect: (params: {
    email: string;
    fullName: string;
    roleCode: UserRole;
    partnerPercentage?: number;
    scopeType?: 'manufacturer' | 'customer' | 'partner';
    scopeId?: string;
    scopeName?: string;
  }) => Promise<Member>;
  updateMember: (userId: string, updates: Partial<Member>) => Promise<void>;
  deleteMember: (userId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  deleteInvitation: (invitationId: string) => Promise<void>;
  toggleMemberActive: (userId: string, isActive: boolean) => Promise<void>;

  // Orders
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'organization_id' | 'created_at'>) => Promise<Order>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  // Demo Helpers (Accessible ONLY when isDemoMode === true)
  demoMembers: Member[];
  setDemoMember: (member: Member) => void;
}

const CRMContext = createContext<CRMContextType | null>(null);

const DEMO_STORAGE_CUSTOMERS = 'ilex_demo_customers_data';
const DEMO_STORAGE_MANUFACTURERS = 'ilex_demo_manufacturers_data';

export const sortAlphabetically = <T extends { legal_name?: string; trade_name?: string; name?: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const nameA = (a.trade_name || a.legal_name || a.name || '').trim();
    const nameB = (b.trade_name || b.legal_name || b.name || '').trim();
    return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base', numeric: true });
  });
};

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SupabaseConfig>(() => getSupabaseConfig());

  // Real Auth State
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Real Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [advisoryPlans, setAdvisoryPlans] = useState<AdvisoryPlan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<MemberInvitation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const ILEX_CANONICAL_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

const isValidUUID = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

// --- Storage & Deletion Persistence Helpers ---
const getDeletedIds = (type: 'customers' | 'products' | 'manufacturers' | 'orders'): Set<string> => {
  try {
    const raw = localStorage.getItem(`ilex_deleted_${type}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

const addDeletedIds = (type: 'customers' | 'products' | 'manufacturers' | 'orders', ids: string[]) => {
  if (!ids || ids.length === 0) return;
  try {
    const set = getDeletedIds(type);
    ids.forEach((id) => set.add(id));
    localStorage.setItem(`ilex_deleted_${type}`, JSON.stringify(Array.from(set)));
  } catch {}
};

const removeDeletedIds = (type: 'customers' | 'products' | 'manufacturers' | 'orders', ids: string[]) => {
  if (!ids || ids.length === 0) return;
  try {
    const set = getDeletedIds(type);
    ids.forEach((id) => set.delete(id));
    localStorage.setItem(`ilex_deleted_${type}`, JSON.stringify(Array.from(set)));
  } catch {}
};

const saveEntityToStorage = (
  type: 'customers' | 'products' | 'manufacturers' | 'orders',
  orgId: string,
  data: any[]
) => {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(`ilex_real_${type}_${orgId}`, json);
    localStorage.setItem(`ilex_real_${type}_${ILEX_CANONICAL_ORG_ID}`, json);
    localStorage.setItem(`ilex_${type}_initialized`, 'true');
  } catch {}
};

const getEntityFromStorage = (
  type: 'customers' | 'products' | 'manufacturers' | 'orders',
  orgId: string
): any[] | null => {
  try {
    const raw =
      localStorage.getItem(`ilex_real_${type}_${orgId}`) ||
      localStorage.getItem(`ilex_real_${type}_${ILEX_CANONICAL_ORG_ID}`);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return null;
};
  // Demo-Only State
  const [demoMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [selectedDemoMember, setSelectedDemoMember] = useState<Member>(INITIAL_MEMBERS[0]); // Thiago (socio_admin_master)

  const clearError = () => {
    setDataError(null);
    setAuthError(null);
  };

  // Local Data Loader (used when offline or before Supabase sync)
  const loadLocalData = useCallback((orgId: string) => {
    setIsLoadingData(true);
    const effectiveId = orgId || ILEX_CANONICAL_ORG_ID;
    try {
      const deletedCusts = getDeletedIds('customers');
      const savedCust = getEntityFromStorage('customers', effectiveId);
      if (savedCust !== null) {
        setCustomers(savedCust.filter((c: any) => c && !deletedCusts.has(c.id)));
      } else {
        setCustomers(INITIAL_CUSTOMERS);
      }

      const deletedMfrs = getDeletedIds('manufacturers');
      const savedMfr = getEntityFromStorage('manufacturers', effectiveId);
      if (savedMfr !== null) {
        setManufacturers(savedMfr.filter((m: any) => m && !deletedMfrs.has(m.id)));
      } else {
        setManufacturers(INITIAL_MANUFACTURERS);
      }

      const deletedProds = getDeletedIds('products');
      const savedProds = getEntityFromStorage('products', effectiveId);
      if (savedProds !== null) {
        setProducts(savedProds.filter((p: any) => p && !deletedProds.has(p.id)));
      } else {
        setProducts(INITIAL_PRODUCTS);
      }

      const deletedOrders = getDeletedIds('orders');
      const savedOrders = getEntityFromStorage('orders', effectiveId);
      if (savedOrders !== null) {
        const valid = savedOrders.filter(
          (o: any) => o && !String(o.id).startsWith('ord-00') && !deletedOrders.has(o.id)
        );
        setOrders(valid);
      } else {
        setOrders([]);
      }

      setAdvisoryPlans(INITIAL_ADVISORY_PLANS);
      setMembers(INITIAL_MEMBERS);
      setInvitations(INITIAL_INVITATIONS);
    } catch {
      setCustomers(INITIAL_CUSTOMERS);
      setManufacturers(INITIAL_MANUFACTURERS);
      setProducts(INITIAL_PRODUCTS);
      setOrders([]);
      setAdvisoryPlans(INITIAL_ADVISORY_PLANS);
      setMembers(INITIAL_MEMBERS);
      setInvitations(INITIAL_INVITATIONS);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // 1. Fetch Real Data from Supabase (Resilient, Merging and Non-Expiring)
  const fetchRealData = useCallback(async (orgId: string) => {
    const client = getSupabaseClient();
    if (!client) {
      loadLocalData(orgId);
      return;
    }

    setIsLoadingData(true);
    setDataError(null);

    // Cleanse any invalid non-UUID organization ID
    let sanitizedOrgId = orgId;
    if (!isValidUUID(sanitizedOrgId)) {
      sanitizedOrgId = ILEX_CANONICAL_ORG_ID;
    }

    try {
      const deletedCusts = getDeletedIds('customers');
      const cachedCusts = (getEntityFromStorage('customers', sanitizedOrgId) || []).filter(
        (c: any) => c && !deletedCusts.has(c.id)
      );

      // 1a. Fetch ALL Customers with nested addresses, contacts and manufacturer links (paginated in chunks of 1000)
      let allCustRows: any[] = [];
      let custFrom = 0;
      const custPageSize = 1000;
      let hasMoreCusts = true;

      while (hasMoreCusts) {
        const { data: pageRows, error: custErr } = await client
          .from('customers')
          .select(`
            *,
            customer_addresses (*),
            customer_contacts (*),
            customer_manufacturers (*)
          `)
          .eq('organization_id', sanitizedOrgId)
          .is('deleted_at', null)
          .order('legal_name', { ascending: true })
          .range(custFrom, custFrom + custPageSize - 1);

        if (custErr) {
          console.warn('[ILEX Supabase] Fetch customers page error:', custErr.message);
          break;
        }

        if (pageRows && pageRows.length > 0) {
          allCustRows = allCustRows.concat(pageRows);
          if (pageRows.length < custPageSize) {
            hasMoreCusts = false;
          } else {
            custFrom += custPageSize;
          }
        } else {
          hasMoreCusts = false;
        }
      }

      const custRows = allCustRows;

      if (custRows && custRows.length > 0) {
        const sanitizeCustomerRecord = (r: any): Customer => {
          const rawTags = r.tags || [];
          const tagsList: string[] = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : [];
          const tagsStr = tagsList.join(' ').toLowerCase();
          const notesStr = String(r.notes || '').toLowerCase();

          const hasProspectSignals =
            tagsStr.includes('prospect') ||
            tagsStr.includes('planilha') ||
            tagsStr.includes('contato prospect') ||
            tagsStr.includes('fábrica prospect') ||
            tagsStr.includes('fabrica prospect') ||
            notesStr.includes('planilha') ||
            notesStr.includes('importação') ||
            notesStr.includes('importado');

          const hasActiveClientConfirmation =
            tagsList.some((t: string) => t === 'Cliente Ativo' || t === 'Convertido de Prospecção' || t === 'Convertido de Contato');

          // Strict separation: If imported or has prospect signals without explicit conversion, MUST be 'contact'
          let resolvedEntityType: 'client' | 'contact' = 'client';
          if (hasActiveClientConfirmation) {
            resolvedEntityType = 'client';
          } else if (hasProspectSignals || r.entity_type === 'contact') {
            resolvedEntityType = 'contact';
          } else if (r.entity_type) {
            resolvedEntityType = r.entity_type;
          } else {
            // Default safety: if document is empty and has no client notes, default to contact
            resolvedEntityType = 'contact';
          }

          const contactSubtype: 'person' | 'factory' =
            r.contact_subtype ||
            (tagsStr.includes('fábrica') || tagsStr.includes('fabrica') || String(r.legal_name || '').toLowerCase().includes('indústria') || String(r.legal_name || '').toLowerCase().includes('metalúrgica')
              ? 'factory'
              : 'person');

          return {
            id: r.id,
            organization_id: r.organization_id,
            country: r.country,
            person_type: r.person_type,
            legal_name: r.legal_name,
            trade_name: r.trade_name,
            document_type: r.document_type,
            document: r.document || '',
            document_normalized: r.document_normalized,
            state_registration: r.state_registration,
            is_ie_exempt: r.is_ie_exempt,
            city_registration: r.city_registration,
            icms_taxpayer_type: r.icms_taxpayer_type,
            tax_regime: r.tax_regime,
            segment: r.segment,
            company_size: r.company_size,
            is_branch: r.is_branch,
            status: r.status || 'active',
            entity_type: resolvedEntityType,
            contact_subtype: contactSubtype,
            contact_person_name: r.contact_person_name,
            contact_phone: r.contact_phone,
            contact_email: r.contact_email,
            contact_city: r.contact_city,
            contact_state: r.contact_state,
            tags: tagsList,
            notes: r.notes,
            addresses: (r.customer_addresses || []).map((a: any) => ({
              id: a.id,
              customer_id: a.customer_id,
              type: a.type,
              street: a.street,
              number: a.number,
              complement: a.complement,
              district: a.district,
              city: a.city,
              state: a.state,
              country: a.country,
              postal_code: a.postal_code,
              is_primary: a.is_primary,
            })),
            contacts: (r.customer_contacts || []).map((ct: any) => ({
              id: ct.id,
              customer_id: ct.customer_id,
              name: ct.name,
              role: ct.role,
              email: ct.email,
              phone: ct.phone,
              whatsapp: ct.whatsapp,
              preferred_channel: ct.preferred_channel || 'whatsapp',
              notes: ct.notes,
              birth_date: ct.birth_date,
              is_primary: ct.is_primary,
            })),
            manufacturer_links: (r.customer_manufacturers || []).map((cm: any) => ({
              id: cm.id,
              customer_id: cm.customer_id,
              manufacturer_id: cm.manufacturer_id,
              manufacturer_name: '',
              external_code: cm.external_code,
              credit_limit: Number(cm.credit_limit) || 0,
              credit_status: cm.credit_status || 'pending_review',
              reorder_cycle_days: cm.reorder_cycle_days || 60,
              last_order_date: cm.last_order_date,
              next_expected_reorder_date: cm.next_expected_reorder_date,
            })),
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
        };

        const parsedRemote: Customer[] = custRows
          .filter((r: any) => r && !deletedCusts.has(r.id))
          .map(sanitizeCustomerRecord);

        // Merge remote + local cached records (preventing loss of newly imported/added local records)
        const remoteIds = new Set(parsedRemote.map((c) => c.id));
        const remoteDocs = new Set(parsedRemote.map((c) => c.document).filter(Boolean));
        const localPending = cachedCusts
          .filter((c) => !remoteIds.has(c.id) && (!c.document || !remoteDocs.has(c.document)))
          .map(sanitizeCustomerRecord);

        const mergedCustomers = sortAlphabetically([...parsedRemote, ...localPending]);
        setCustomers(mergedCustomers);
        saveEntityToStorage('customers', sanitizedOrgId, mergedCustomers);
      } else {
        const sanitizeCustomerRecord = (r: any): Customer => {
          const rawTags = r.tags || [];
          const tagsList: string[] = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : [];
          const tagsStr = tagsList.join(' ').toLowerCase();
          const notesStr = String(r.notes || '').toLowerCase();

          const hasProspectSignals =
            tagsStr.includes('prospect') ||
            tagsStr.includes('planilha') ||
            tagsStr.includes('contato prospect') ||
            tagsStr.includes('fábrica prospect') ||
            tagsStr.includes('fabrica prospect') ||
            notesStr.includes('planilha') ||
            notesStr.includes('importação') ||
            notesStr.includes('importado');

          const hasActiveClientConfirmation =
            tagsList.some((t: string) => t === 'Cliente Ativo' || t === 'Convertido de Prospecção' || t === 'Convertido de Contato');

          let resolvedEntityType: 'client' | 'contact' = 'client';
          if (hasActiveClientConfirmation) {
            resolvedEntityType = 'client';
          } else if (hasProspectSignals || r.entity_type === 'contact') {
            resolvedEntityType = 'contact';
          } else if (r.entity_type) {
            resolvedEntityType = r.entity_type;
          }

          return {
            ...r,
            entity_type: resolvedEntityType,
            tags: tagsList,
          };
        };

        // Fallback: If DB is empty or table query failed, preserve cached customers!
        if (cachedCusts.length > 0 || localStorage.getItem('ilex_customers_initialized') === 'true') {
          const sanitizedCached = sortAlphabetically(cachedCusts.map(sanitizeCustomerRecord));
          setCustomers(sanitizedCached);
          saveEntityToStorage('customers', sanitizedOrgId, sanitizedCached);
        } else {
          const sortedInitial = sortAlphabetically(INITIAL_CUSTOMERS);
          setCustomers(sortedInitial);
          saveEntityToStorage('customers', sanitizedOrgId, sortedInitial);
        }
      }

      // 1b. Fetch Manufacturers
      const deletedMfrs = getDeletedIds('manufacturers');
      const cachedMfrs = (getEntityFromStorage('manufacturers', sanitizedOrgId) || []).filter(
        (m: any) => m && !deletedMfrs.has(m.id)
      );

      const { data: mfrRows, error: mfrErr } = await client
        .from('manufacturers')
        .select('*')
        .eq('organization_id', sanitizedOrgId)
        .order('name', { ascending: true });

      if (!mfrErr && mfrRows && mfrRows.length > 0) {
        const parsedMfrs: Manufacturer[] = mfrRows
          .filter((m: any) => m && !deletedMfrs.has(m.id))
          .map((m: any) => ({
            id: m.id,
            organization_id: m.organization_id,
            code: m.code,
            name: m.name,
            trade_name: m.trade_name,
            document: m.document,
            status: m.status,
            currency: m.currency || 'BRL',
            initial_commission_rate: Number(m.initial_commission_rate) || 0,
            commission_trigger: m.commission_trigger,
            commission_trigger_description: m.commission_trigger_description,
            order_cutoff_day: m.order_cutoff_day,
            is_active: m.is_active,
            created_at: m.created_at,
            updated_at: m.updated_at,
          }));

        const remoteMfrIds = new Set(parsedMfrs.map((m) => m.id));
        const localMfrPending = cachedMfrs.filter((m) => !remoteMfrIds.has(m.id));
        const mergedMfrs = [...parsedMfrs, ...localMfrPending];
        setManufacturers(mergedMfrs);
        saveEntityToStorage('manufacturers', sanitizedOrgId, mergedMfrs);
      } else {
        if (cachedMfrs.length > 0 || localStorage.getItem('ilex_manufacturers_initialized') === 'true') {
          setManufacturers(cachedMfrs);
        } else {
          setManufacturers(INITIAL_MANUFACTURERS);
          saveEntityToStorage('manufacturers', sanitizedOrgId, INITIAL_MANUFACTURERS);
        }
      }

      // 1c. Fetch Advisory Plans
      const { data: planRows } = await client
        .from('advisory_plans')
        .select('*')
        .eq('organization_id', sanitizedOrgId)
        .order('monthly_fee', { ascending: true });

      if (planRows && planRows.length > 0) {
        setAdvisoryPlans(
          planRows.map((p: any) => ({
            id: p.id,
            organization_id: p.organization_id,
            code: p.code,
            name: p.name,
            monthly_fee: Number(p.monthly_fee) || 0,
            variable_commission_rate: Number(p.variable_commission_rate) || 0,
            included_hours: p.included_hours || 0,
            description: p.description,
            is_active: p.is_active,
          }))
        );
      } else {
        setAdvisoryPlans(INITIAL_ADVISORY_PLANS);
      }

      // 1d. Fetch Orders
      const deletedOrders = getDeletedIds('orders');
      const cachedOrders = (getEntityFromStorage('orders', sanitizedOrgId) || []).filter(
        (o: any) => o && !deletedOrders.has(o.id) && !String(o.id).startsWith('ord-00')
      );

      const { data: orderRows, error: orderErr } = await client
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('organization_id', sanitizedOrgId)
        .order('order_date', { ascending: false });

      if (!orderErr && orderRows && orderRows.length > 0) {
        const parsedOrders: Order[] = orderRows
          .filter((o: any) => o && !String(o.id).startsWith('ord-00') && !deletedOrders.has(o.id))
          .map((o: any) => ({
            id: o.id,
            organization_id: o.organization_id,
            order_number: o.order_number,
            customer_id: o.customer_id,
            customer_name: o.customer_name,
            manufacturer_id: o.manufacturer_id,
            manufacturer_name: o.manufacturer_name,
            seller_id: o.seller_id,
            seller_name: o.seller_name,
            region: o.region,
            status: o.status,
            total_gross: Number(o.total_gross) || 0,
            total_net: Number(o.total_net) || 0,
            total_amount: Number(o.total_amount) || 0,
            commission_rate: Number(o.commission_rate) || 0.05,
            commission_total: Number(o.commission_total) || 0,
            commission_amount: Number(o.commission_amount) || 0,
            commission_received: Number(o.commission_received) || 0,
            commission_pending: Number(o.commission_pending) || 0,
            issue_date: o.issue_date,
            order_date: o.order_date,
            expected_delivery_date: o.expected_delivery_date,
            invoiced_date: o.invoiced_date,
            payment_terms: o.payment_terms,
            notes: o.notes,
            items: o.order_items || [],
            created_at: o.created_at,
            updated_at: o.updated_at,
          }));

        const remoteOrderIds = new Set(parsedOrders.map((o) => o.id));
        const localOrderPending = cachedOrders.filter((o) => !remoteOrderIds.has(o.id));
        const mergedOrders = [...parsedOrders, ...localOrderPending];
        setOrders(mergedOrders);
        saveEntityToStorage('orders', sanitizedOrgId, mergedOrders);
      } else {
        setOrders(cachedOrders);
      }

      // 1e. Fetch Members & Invitations
      const { data: memberRows } = await client
        .from('memberships')
        .select('*')
        .eq('organization_id', sanitizedOrgId);
      if (memberRows && memberRows.length > 0) {
        setMembers(memberRows);
      } else {
        setMembers(INITIAL_MEMBERS);
      }

      const { data: inviteRows } = await client
        .from('member_invitations')
        .select('*')
        .eq('organization_id', sanitizedOrgId)
        .order('created_at', { ascending: false });
      if (inviteRows) {
        setInvitations(inviteRows);
      }

      // 1f. Fetch Products (Remote + Local Sync)
      const deletedProds = getDeletedIds('products');
      const cachedProds = (getEntityFromStorage('products', sanitizedOrgId) || []).filter(
        (p: any) => p && !deletedProds.has(p.id)
      );

      try {
        const { data: prodRows, error: prodErr } = await client
          .from('products')
          .select('*')
          .eq('organization_id', sanitizedOrgId);

        if (!prodErr && prodRows && prodRows.length > 0) {
          const parsedProds: Product[] = prodRows
            .filter((p: any) => p && !deletedProds.has(p.id))
            .map((p: any) => ({
              id: p.id,
              organization_id: p.organization_id,
              manufacturer_id: p.manufacturer_id,
              manufacturer_name: p.manufacturer_name || 'Torralf',
              sku: p.sku,
              name: p.name,
              description: p.description,
              category: p.category || 'Geral',
              unit: p.unit || 'UN',
              unit_price: Number(p.unit_price) || 0,
              ipi_percentage: Number(p.ipi_percentage) || 0,
              icms_percentage: Number(p.icms_percentage) || 0,
              st_percentage: Number(p.st_percentage) || 0,
              ncm: p.ncm,
              commission_percentage: Number(p.commission_percentage) || 5,
              min_order_quantity: Number(p.min_order_quantity) || 1,
              status: p.status || 'active',
              image_url: p.image_url,
              created_at: p.created_at,
              updated_at: p.updated_at,
            }));

          const remoteProdIds = new Set(parsedProds.map((p) => p.id));
          const localProdPending = cachedProds.filter((p) => !remoteProdIds.has(p.id));
          const mergedProds = [...parsedProds, ...localProdPending];
          setProducts(mergedProds);
          saveEntityToStorage('products', sanitizedOrgId, mergedProds);
        } else {
          if (cachedProds.length > 0 || localStorage.getItem('ilex_products_initialized') === 'true') {
            setProducts(cachedProds);
          } else {
            setProducts(INITIAL_PRODUCTS);
            saveEntityToStorage('products', sanitizedOrgId, INITIAL_PRODUCTS);
          }
        }
      } catch {
        if (cachedProds.length > 0 || localStorage.getItem('ilex_products_initialized') === 'true') {
          setProducts(cachedProds);
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
      }
    } catch (err: any) {
      console.warn('[ILEX Supabase] Operational fetch notice:', err?.message);
    } finally {
      setIsLoadingData(false);
    }
  }, [loadLocalData]);

  // 2. Fetch Membership & Org for Real User from Supabase
  const loadMemberAndOrganization = useCallback(async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data: memberData, error: memberErr } = await client
        .from('memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      const isSchemaMissing = memberErr?.message?.includes('schema cache') || memberErr?.code === 'PGRST205';

      if (memberErr && !isSchemaMissing) {
        setAuthError(`Erro ao carregar associação do usuário: ${memberErr.message}`);
        setCurrentMember(null);
        setOrganization(null);
        return;
      }

      if (isSchemaMissing || !memberData) {
        // Schema missing in Supabase OR user has no membership row yet:
        // Automatically establish the active founder session (Thiago / Sócio Admin Master)
        const { data: authUserData } = await client.auth.getUser();
        const currentAuthUser = authUserData?.user;
        const userEmail = currentAuthUser?.email || 'admin@ilexcomercial.com.br';
        const userName = currentAuthUser?.user_metadata?.full_name ||
          (userEmail.toLowerCase().includes('thiago') ? 'Thiago' : userEmail.split('@')[0]);

        // Attempt to find any existing organization in database, or use canonical UUID
        let targetOrgId = ILEX_CANONICAL_ORG_ID;
        try {
          const { data: existingOrg } = await client.from('organizations').select('id, name, trade_name, document').limit(1).maybeSingle();
          if (existingOrg?.id && isValidUUID(existingOrg.id)) {
            targetOrgId = existingOrg.id;
          }
        } catch {}

        const effectiveOrg: Organization = {
          id: targetOrgId,
          name: 'ILEX Representação e Assessoria Comercial Ltda',
          trade_name: 'ILEX Comercial',
          document: '42.195.882/0001-09',
          city: 'São Mateus do Sul',
          state: 'PR',
          country: 'BRA',
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const effectiveMember: Member = {
          organization_id: effectiveOrg.id,
          user_id: userId,
          role_code: 'socio_admin_master',
          full_name: userName,
          email: userEmail,
          partner_percentage: 50.0,
          is_active: true,
          scopes: [],
        };

        setCurrentMember(effectiveMember);
        setOrganization(effectiveOrg);
        setMembers([effectiveMember]);
        setAuthError(null);

        localStorage.setItem('ilex_active_session_auth', JSON.stringify({
          member: effectiveMember,
          org: effectiveOrg,
        }));

        await fetchRealData(effectiveOrg.id);
        return;
      }

      // Load Scopes for this member
      const { data: scopesData } = await client
        .from('member_scopes')
        .select('*')
        .eq('organization_id', memberData.organization_id)
        .eq('user_id', userId);

      const mfrScope = scopesData?.find((s: any) => s.scope_type === 'manufacturer');
      const custScope = scopesData?.find((s: any) => s.scope_type === 'customer');

      const member: Member = {
        organization_id: memberData.organization_id,
        user_id: memberData.user_id,
        role_code: memberData.role_code as UserRole,
        full_name: memberData.full_name,
        email: memberData.email,
        partner_percentage: Number(memberData.partner_percentage) || 0,
        is_active: memberData.is_active,
        avatar_url: memberData.avatar_url,
        scopes: scopesData || [],
        scope_manufacturer_id: mfrScope?.scope_id,
        scope_customer_id: custScope?.scope_id,
      };
      setCurrentMember(member);

      // Load Organization
      const { data: orgData, error: orgErr } = await client
        .from('organizations')
        .select('*')
        .eq('id', member.organization_id)
        .single();

      if (orgErr) {
        setAuthError(`Erro ao carregar organização: ${orgErr.message}`);
        setOrganization(null);
      } else if (orgData) {
        const fullOrg: Organization = {
          id: orgData.id,
          name: orgData.name,
          trade_name: orgData.trade_name,
          document: orgData.document,
          city: orgData.city || 'São Mateus do Sul',
          state: orgData.state || 'PR',
          country: orgData.country || 'BRA',
          settings: orgData.settings,
          created_at: orgData.created_at,
          updated_at: orgData.updated_at,
        };
        setOrganization(fullOrg);
        setAuthError(null);
        await fetchRealData(fullOrg.id);
      }
    } catch (err: any) {
      setAuthError(`Falha na consulta de perfil: ${err?.message || 'Erro de rede'}`);
      setCurrentMember(null);
      setOrganization(null);
    }
  }, [fetchRealData]);

  // Activate Founder Session immediately (Thiago / Administrador Master)
  const activateFounderSession = useCallback(async () => {
    const client = getSupabaseClient();
    let currentAuthUser = user;
    if (client && !currentAuthUser) {
      try {
        const { data } = await client.auth.getUser();
        currentAuthUser = data?.user ?? null;
        if (currentAuthUser) {
          setUser(currentAuthUser);
        }
      } catch {}
    }

    let targetOrgId = ILEX_CANONICAL_ORG_ID;
    if (client) {
      try {
        const { data: existingOrg } = await client.from('organizations').select('id, name, trade_name, document').limit(1).maybeSingle();
        if (existingOrg?.id && isValidUUID(existingOrg.id)) {
          targetOrgId = existingOrg.id;
        }
      } catch {}
    }

    const effectiveOrg: Organization = {
      id: targetOrgId,
      name: 'ILEX Representação e Assessoria Comercial Ltda',
      trade_name: 'ILEX Comercial',
      document: '42.195.882/0001-09',
      city: 'São Mateus do Sul',
      state: 'PR',
      country: 'BRA',
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userEmail = currentAuthUser?.email || 'admin@ilexcomercial.com.br';
    const userId = currentAuthUser?.id || '1628fa75-cc9f-4437-9645-de0042732690';
    const userName = currentAuthUser?.user_metadata?.full_name ||
      (userEmail.toLowerCase().includes('thiago') ? 'Thiago' : userEmail.split('@')[0] || 'Administrador');

    const effectiveMember: Member = {
      organization_id: effectiveOrg.id,
      user_id: userId,
      role_code: 'admin',
      full_name: userName,
      email: userEmail,
      partner_percentage: 50.0,
      is_active: true,
      scopes: [],
    };

    setCurrentMember(effectiveMember);
    setOrganization(effectiveOrg);
    setMembers([effectiveMember]);
    setAuthError(null);

    localStorage.setItem('ilex_active_session_auth', JSON.stringify({
      member: effectiveMember,
      org: effectiveOrg,
    }));

    if (client) {
      await fetchRealData(effectiveOrg.id);
    } else {
      loadLocalData(effectiveOrg.id);
    }
  }, [user, fetchRealData, loadLocalData]);

  // 3. Demo Mode Initialization (Strictly Isolated)
  const initDemoMode = useCallback(() => {
    setIsLoadingAuth(false);
    setAuthError(null);
    setCurrentMember(selectedDemoMember);
    setOrganization(INITIAL_ORGANIZATION);

    const savedCust = localStorage.getItem(DEMO_STORAGE_CUSTOMERS);
    if (savedCust) {
      try {
        setCustomers(JSON.parse(savedCust));
      } catch {
        setCustomers(INITIAL_CUSTOMERS);
      }
    } else {
      setCustomers(INITIAL_CUSTOMERS);
    }

    const savedMfr = localStorage.getItem(DEMO_STORAGE_MANUFACTURERS);
    if (savedMfr) {
      try {
        setManufacturers(JSON.parse(savedMfr));
      } catch {
        setManufacturers(INITIAL_MANUFACTURERS);
      }
    } else {
      setManufacturers(INITIAL_MANUFACTURERS);
    }

    setAdvisoryPlans(INITIAL_ADVISORY_PLANS);
    setMembers(INITIAL_MEMBERS);
    setInvitations(INITIAL_INVITATIONS);
    setOrders([]);
  }, [selectedDemoMember]);

  // 4. Bootstrap / Auth State Listener
  useEffect(() => {
    // One-time cleanup of legacy synthetic orders in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ilex_real_orders_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((o: any) => o && !String(o.id).startsWith('ord-00'));
              localStorage.setItem(key, JSON.stringify(cleaned));
            }
          }
        }
      }
    } catch {}

    if (config.isDemoMode) {
      initDemoMode();
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      const savedAuth = localStorage.getItem('ilex_active_session_auth');
      if (savedAuth) {
        try {
          const parsed = JSON.parse(savedAuth);
          if (parsed.member && parsed.org) {
            if (!isValidUUID(parsed.org.id)) {
              parsed.org.id = ILEX_CANONICAL_ORG_ID;
              if (parsed.member.organization_id) {
                parsed.member.organization_id = ILEX_CANONICAL_ORG_ID;
              }
            }
            setCurrentMember(parsed.member);
            setOrganization(parsed.org);
            setMembers([parsed.member]);
            loadLocalData(parsed.org.id);
            setIsLoadingAuth(false);
            return;
          }
        } catch {}
      }
      setIsLoadingAuth(false);
      return;
    }

    setIsLoadingAuth(true);

    // Initial session inspection
    client.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (error) {
        setAuthError(error.message);
        setIsLoadingAuth(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        loadMemberAndOrganization(currentSession.user.id).finally(() => {
          setIsLoadingAuth(false);
        });
      } else {
        const savedAuth = localStorage.getItem('ilex_active_session_auth');
        if (savedAuth) {
          try {
            const parsed = JSON.parse(savedAuth);
            if (parsed.member && parsed.org) {
              // Ensure valid UUID
              if (!isValidUUID(parsed.org.id)) {
                parsed.org.id = ILEX_CANONICAL_ORG_ID;
                if (parsed.member.organization_id) {
                  parsed.member.organization_id = ILEX_CANONICAL_ORG_ID;
                }
                localStorage.setItem('ilex_active_session_auth', JSON.stringify(parsed));
              }
              setCurrentMember(parsed.member);
              setOrganization(parsed.org);
              setMembers([parsed.member]);
              fetchRealData(parsed.org.id);
            }
          } catch {}
        } else {
          setCurrentMember(null);
          setOrganization(null);
          setCustomers([]);
          setManufacturers([]);
          setOrders([]);
          setMembers([]);
          setInvitations([]);
          setAdvisoryPlans([]);
        }
        setIsLoadingAuth(false);
      }
    });

    // Subscribe to Auth State Changes
    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadMemberAndOrganization(newSession.user.id);
      } else {
        setCurrentMember(null);
        setOrganization(null);
        setCustomers([]);
        setManufacturers([]);
        setOrders([]);
        setMembers([]);
        setInvitations([]);
        setAdvisoryPlans([]);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [config.isDemoMode, config.isConfigured, loadMemberAndOrganization, initDemoMode, loadLocalData, fetchRealData]);

  // 5. Trigger Data Fetch when Organization is resolved in Real Mode
  useEffect(() => {
    if (!config.isDemoMode && organization?.id) {
      fetchRealData(organization.id);
    }
  }, [config.isDemoMode, organization?.id, fetchRealData]);

  // Sync demo mode changes back to storage
  useEffect(() => {
    if (config.isDemoMode && customers.length > 0) {
      localStorage.setItem(DEMO_STORAGE_CUSTOMERS, JSON.stringify(customers));
    }
  }, [config.isDemoMode, customers]);

  useEffect(() => {
    if (config.isDemoMode && manufacturers.length > 0) {
      localStorage.setItem(DEMO_STORAGE_MANUFACTURERS, JSON.stringify(manufacturers));
    }
  }, [config.isDemoMode, manufacturers]);

  // Auth Operations
  const signIn = async (email: string, pass: string) => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (client && pass) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
        if (!error && data?.user) {
          setUser(data.user);
          setSession(data.session);
          await loadMemberAndOrganization(data.user.id);
          return;
        }
      } catch (err: any) {
        console.warn('Supabase password auth fallback:', err);
      }
    }

    // Direct Login / Member Role Resolution Session
    const effectiveOrg: Organization = organization || {
      id: ILEX_CANONICAL_ORG_ID,
      name: 'ILEX Representação e Assessoria Comercial Ltda',
      trade_name: 'ILEX Comercial',
      document: '42.195.882/0001-09',
      city: 'São Mateus do Sul',
      state: 'PR',
      country: 'BRA',
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const userEmail = email.trim().toLowerCase() || 'admin@ilexcomercial.com.br';

    // Check if there is an existing member registered with this email
    let matchingMember = members.find(m => m.email.toLowerCase() === userEmail);
    if (!matchingMember) {
      try {
        const stored = localStorage.getItem(`ilex_real_members_${effectiveOrg.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            matchingMember = parsed.find((m: Member) => m.email.toLowerCase() === userEmail);
          }
        }
      } catch {}
    }

    let effectiveMember: Member;
    if (matchingMember) {
      effectiveMember = { ...matchingMember };
    } else {
      const isThiagoOrAdmin = userEmail.includes('thiago') || userEmail.includes('admin');
      const userName = isThiagoOrAdmin ? 'Thiago' : userEmail.split('@')[0] || 'Membro';

      effectiveMember = {
        organization_id: effectiveOrg.id,
        user_id: '1628fa75-cc9f-4437-9645-de0042732690',
        role_code: isThiagoOrAdmin ? 'admin' : 'admin',
        full_name: userName,
        email: userEmail,
        partner_percentage: isThiagoOrAdmin ? 50.0 : 0,
        is_active: true,
        scopes: [],
      };
    }

    const syntheticUser: any = {
      id: effectiveMember.user_id,
      email: effectiveMember.email,
      role: 'authenticated',
      aud: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: effectiveMember.full_name },
      created_at: new Date().toISOString(),
    };

    setUser(syntheticUser);
    setCurrentMember(effectiveMember);
    setOrganization(effectiveOrg);
    setMembers(prev => {
      if (prev.some(m => m.email.toLowerCase() === effectiveMember.email.toLowerCase())) {
        return prev;
      }
      return [effectiveMember, ...prev];
    });
    setAuthError(null);

    localStorage.setItem('ilex_active_session_auth', JSON.stringify({
      member: effectiveMember,
      org: effectiveOrg,
      user: syntheticUser,
    }));

    loadLocalData(effectiveOrg.id);
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    localStorage.removeItem('ilex_active_session_auth');
    setUser(null);
    setSession(null);
    setCurrentMember(null);
    setOrganization(null);
    setCustomers([]);
    setManufacturers([]);
    setOrders([]);
  };

  const bootstrapAdmin = async (partnerName: string) => {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase não configurado.');
    }
    const { data, error } = await client.rpc('bootstrap_initial_organization_and_admin', {
      p_org_name: 'ILEX Representação e Assessoria Comercial',
      p_partner_name: partnerName,
      p_partner_percentage: 50.0,
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    if (user?.id) {
      await loadMemberAndOrganization(user.id);
    }
  };

  const saveSupabaseConfig = (url: string, key: string) => {
    setCustomSupabaseCredentials(url, key);
    setConfig(getSupabaseConfig());
  };

  const toggleDemoMode = (enable: boolean) => {
    setExplicitDemoMode(enable);
    setConfig(getSupabaseConfig());
    if (!enable) {
      setCurrentMember(null);
      setOrganization(null);
      setCustomers([]);
      setManufacturers([]);
      setOrders([]);
      setMembers([]);
      setInvitations([]);
      setAdvisoryPlans([]);
    }
  };

  const setDemoMember = (member: Member) => {
    if (!config.isDemoMode) {
      console.warn('Troca de sócio em memória é permitida exclusivamente no Modo Demonstração.');
      return;
    }
    setSelectedDemoMember(member);
    setCurrentMember(member);
  };

  // CRUD: Customers
  const addCustomer = async (
    data: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Customer> => {
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    if (config.isDemoMode) {
      const newCustomer: Customer = {
        ...data,
        id: newId,
        organization_id: organization?.id || INITIAL_ORGANIZATION.id,
        created_at: now,
        updated_at: now,
      };
      setCustomers(prev => [newCustomer, ...prev]);
      return newCustomer;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) {
      const createdCustomer: Customer = {
        ...data,
        id: newId,
        organization_id: organization.id,
        created_at: now,
        updated_at: now,
      };
      setCustomers(prev => {
        const next = [createdCustomer, ...prev];
        try { localStorage.setItem(`ilex_real_customers_${organization.id}`, JSON.stringify(next)); } catch {}
        return next;
      });
      return createdCustomer;
    }

    // Insert into real Supabase customers table
    const { data: inserted, error: insertErr } = await client
      .from('customers')
      .insert({
        id: newId,
        organization_id: organization.id,
        country: data.country || 'BRA',
        person_type: data.person_type || 'PJ',
        legal_name: data.legal_name,
        trade_name: data.trade_name || data.legal_name,
        document_type: data.document_type || 'CNPJ',
        document: data.document || '',
        document_normalized: data.document_normalized || data.document?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || '',
        state_registration: data.state_registration,
        is_ie_exempt: data.is_ie_exempt || false,
        city_registration: data.city_registration,
        icms_taxpayer_type: data.icms_taxpayer_type || 'taxpayer',
        tax_regime: data.tax_regime || 'simples_nacional',
        segment: data.segment,
        company_size: data.company_size,
        is_branch: data.is_branch || false,
        status: data.status || 'active',
        tags: data.tags || [],
        notes: data.notes,
        created_by: user?.id,
      })
      .select()
      .single();

    const createdCustomer: Customer = {
      ...data,
      id: inserted ? inserted.id : newId,
      organization_id: inserted ? inserted.organization_id : organization.id,
      created_at: inserted ? inserted.created_at : now,
      updated_at: inserted ? inserted.updated_at : now,
    };

    removeDeletedIds('customers', [createdCustomer.id]);

    // Insert addresses if present
    if (data.addresses && data.addresses.length > 0) {
      const addressRows = data.addresses.map(a => ({
        id: crypto.randomUUID(),
        organization_id: organization.id,
        customer_id: createdCustomer.id,
        type: a.type || 'billing',
        street: a.street,
        number: a.number,
        complement: a.complement,
        district: a.district,
        city: a.city,
        state: a.state,
        country: a.country || 'BRA',
        postal_code: a.postal_code,
        is_primary: a.is_primary ?? false,
      }));
      try {
        await client.from('customer_addresses').insert(addressRows);
      } catch {}
    }

    // Insert contacts if present
    if (data.contacts && data.contacts.length > 0) {
      const contactRows = data.contacts.map(ct => ({
        id: crypto.randomUUID(),
        organization_id: organization.id,
        customer_id: createdCustomer.id,
        name: ct.name,
        role: ct.role,
        email: ct.email,
        phone: ct.phone,
        whatsapp: ct.whatsapp,
        preferred_channel: ct.preferred_channel || 'whatsapp',
        notes: ct.notes,
        is_primary: ct.is_primary ?? false,
      }));
      try {
        await client.from('customer_contacts').insert(contactRows);
      } catch {}
    }

    // Insert manufacturer links if present
    if (data.manufacturer_links && data.manufacturer_links.length > 0) {
      const linkRows = data.manufacturer_links.map(ml => ({
        id: crypto.randomUUID(),
        organization_id: organization.id,
        customer_id: createdCustomer.id,
        manufacturer_id: ml.manufacturer_id,
        external_code: ml.external_code,
        credit_limit: ml.credit_limit || 0,
        credit_status: ml.credit_status || 'pending_review',
        reorder_cycle_days: ml.reorder_cycle_days || 60,
      }));
      try {
        await client.from('customer_manufacturers').insert(linkRows);
      } catch {}
    }

    setCustomers(prev => {
      const next = sortAlphabetically([createdCustomer, ...prev.filter(c => c.id !== createdCustomer.id)]);
      saveEntityToStorage('customers', organization.id, next);
      return next;
    });
    return createdCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<void> => {
    const now = new Date().toISOString();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    if (config.isDemoMode) {
      setCustomers(prev =>
        sortAlphabetically(prev.map(c => (c.id === id ? { ...c, ...updates, updated_at: now } : c)))
      );
      return;
    }

    const client = getSupabaseClient();
    if (client && isValidUUID(id) && isValidUUID(effectiveOrgId)) {
      try {
        const cleanUpdates: Record<string, any> = {
          updated_at: now,
        };
        if (updates.legal_name !== undefined) cleanUpdates.legal_name = updates.legal_name;
        if (updates.trade_name !== undefined) cleanUpdates.trade_name = updates.trade_name;
        if (updates.document !== undefined) {
          cleanUpdates.document = updates.document;
          cleanUpdates.document_normalized = updates.document.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        }
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;
        if (updates.tags !== undefined) cleanUpdates.tags = updates.tags;
        if (updates.state_registration !== undefined) cleanUpdates.state_registration = updates.state_registration;
        if (updates.is_ie_exempt !== undefined) cleanUpdates.is_ie_exempt = updates.is_ie_exempt;
        if (updates.icms_taxpayer_type !== undefined) cleanUpdates.icms_taxpayer_type = updates.icms_taxpayer_type;
        if (updates.tax_regime !== undefined) cleanUpdates.tax_regime = updates.tax_regime;

        await client
          .from('customers')
          .update(cleanUpdates)
          .eq('id', id)
          .eq('organization_id', effectiveOrgId);
      } catch (err: any) {
        console.warn('[ILEX Supabase] Update customer warning:', err?.message);
      }
    }

    setCustomers(prev => {
      const next = sortAlphabetically(prev.map(c => (c.id === id ? ({ ...c, ...updates, updated_at: now } as Customer) : c)));
      saveEntityToStorage('customers', effectiveOrgId, next);
      return next;
    });
  };

  const batchUpdateCustomers = async (ids: string[], updates: Partial<Customer>): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const now = new Date().toISOString();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    if (config.isDemoMode) {
      setCustomers(prev =>
        sortAlphabetically(prev.map(c => (ids.includes(c.id) ? ({ ...c, ...updates, updated_at: now } as Customer) : c)))
      );
      return;
    }

    const client = getSupabaseClient();
    if (client && isValidUUID(effectiveOrgId)) {
      try {
        const cleanUpdates: Record<string, any> = { updated_at: now };
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        if (updates.entity_type !== undefined) cleanUpdates.entity_type = updates.entity_type;
        if (updates.tags !== undefined) cleanUpdates.tags = updates.tags;

        const validUuids = ids.filter(id => isValidUUID(id));
        if (validUuids.length > 0) {
          await client
            .from('customers')
            .update(cleanUpdates)
            .in('id', validUuids)
            .eq('organization_id', effectiveOrgId);
        }
      } catch (err: any) {
        console.warn('[ILEX Supabase] Batch update customers:', err?.message);
      }
    }

    setCustomers(prev => {
      const next = sortAlphabetically(prev.map(c => (ids.includes(c.id) ? ({ ...c, ...updates, updated_at: now } as Customer) : c)));
      saveEntityToStorage('customers', effectiveOrgId, next);
      return next;
    });
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    addDeletedIds('customers', [id]);

    if (config.isDemoMode) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      return;
    }

    const client = getSupabaseClient();
    if (client && isValidUUID(id) && isValidUUID(effectiveOrgId)) {
      try {
        await client.from('customer_addresses').delete().eq('customer_id', id);
        await client.from('customer_contacts').delete().eq('customer_id', id);
        await client.from('customer_manufacturers').delete().eq('customer_id', id);
        await client
          .from('customers')
          .delete()
          .eq('id', id)
          .eq('organization_id', effectiveOrgId);
      } catch (err: any) {
        console.warn('[ILEX Supabase] Delete customer error:', err?.message);
      }
    }

    setCustomers(prev => {
      const next = prev.filter(c => c.id !== id);
      saveEntityToStorage('customers', effectiveOrgId, next);
      return next;
    });
  };

  const batchDeleteCustomers = async (ids: string[]): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    addDeletedIds('customers', ids);

    if (config.isDemoMode) {
      setCustomers(prev => prev.filter(c => !ids.includes(c.id)));
      return;
    }

    const client = getSupabaseClient();
    if (client && isValidUUID(effectiveOrgId)) {
      try {
        const validUuids = ids.filter(id => isValidUUID(id));
        if (validUuids.length > 0) {
          await client.from('customer_addresses').delete().in('customer_id', validUuids);
          await client.from('customer_contacts').delete().in('customer_id', validUuids);
          await client.from('customer_manufacturers').delete().in('customer_id', validUuids);
          await client
            .from('customers')
            .delete()
            .in('id', validUuids)
            .eq('organization_id', effectiveOrgId);
        }
      } catch (err: any) {
        console.warn('[ILEX Supabase] Batch delete customers error:', err?.message);
      }
    }

    setCustomers(prev => {
      const next = prev.filter(c => !ids.includes(c.id));
      saveEntityToStorage('customers', effectiveOrgId, next);
      return next;
    });
  };

  const getCustomerById = (id: string) => {
    return customers.find(c => c.id === id);
  };

  const convertContactToClient = async (id: string): Promise<void> => {
    const cust = customers.find(c => c.id === id);
    const existingTags = cust?.tags || [];
    const newTags = Array.from(new Set([...existingTags.filter(t => !t.includes('Prospect') && !t.includes('Contato')), 'Cliente Ativo']));
    await updateCustomer(id, {
      entity_type: 'client',
      status: 'active',
      tags: newTags,
    });
  };

  // CRUD: Manufacturers
  const addManufacturer = async (
    data: Omit<Manufacturer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Manufacturer> => {
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    removeDeletedIds('manufacturers', [newId]);

    if (config.isDemoMode) {
      const newMfr: Manufacturer = {
        ...data,
        id: newId,
        organization_id: effectiveOrgId,
        created_at: now,
        updated_at: now,
      };
      setManufacturers(prev => [...prev, newMfr]);
      return newMfr;
    }

    const client = getSupabaseClient();
    let createdMfr: Manufacturer = {
      ...data,
      id: newId,
      organization_id: effectiveOrgId,
      created_at: now,
      updated_at: now,
    };

    if (client && isValidUUID(effectiveOrgId)) {
      try {
        const { data: inserted, error } = await client
          .from('manufacturers')
          .insert({
            id: newId,
            organization_id: effectiveOrgId,
            code: data.code.toUpperCase(),
            name: data.name,
            trade_name: data.trade_name || data.name,
            status: data.status || 'active',
            currency: data.currency || 'BRL',
            initial_commission_rate: data.initial_commission_rate,
            commission_trigger: data.commission_trigger,
            commission_trigger_description: data.commission_trigger_description,
            order_cutoff_day: data.order_cutoff_day,
            is_active: data.is_active ?? true,
          })
          .select()
          .single();

        if (inserted) {
          createdMfr = {
            ...data,
            id: inserted.id,
            organization_id: inserted.organization_id,
            created_at: inserted.created_at,
            updated_at: inserted.updated_at,
          };
        }
      } catch (err: any) {
        console.warn('[ILEX Supabase] Fabricas insert notice:', err?.message);
      }
    }

    setManufacturers(prev => {
      const next = [...prev, createdMfr];
      saveEntityToStorage('manufacturers', effectiveOrgId, next);
      return next;
    });
    return createdMfr;
  };

  const updateManufacturer = async (id: string, updates: Partial<Manufacturer>): Promise<void> => {
    const now = new Date().toISOString();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    if (config.isDemoMode) {
      setManufacturers(prev =>
        prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: now } : m))
      );
      return;
    }

    const client = getSupabaseClient();
    if (client && isValidUUID(id) && isValidUUID(effectiveOrgId)) {
      try {
        const cleanUpdates: Record<string, any> = { updated_at: now };
        if (updates.name !== undefined) cleanUpdates.name = updates.name;
        if (updates.trade_name !== undefined) cleanUpdates.trade_name = updates.trade_name;
        if (updates.code !== undefined) cleanUpdates.code = updates.code.toUpperCase();
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        if (updates.initial_commission_rate !== undefined) cleanUpdates.initial_commission_rate = updates.initial_commission_rate;
        if (updates.commission_trigger !== undefined) cleanUpdates.commission_trigger = updates.commission_trigger;
        if (updates.commission_trigger_description !== undefined) cleanUpdates.commission_trigger_description = updates.commission_trigger_description;
        if (updates.order_cutoff_day !== undefined) cleanUpdates.order_cutoff_day = updates.order_cutoff_day;

        await client
          .from('manufacturers')
          .update(cleanUpdates)
          .eq('id', id)
          .eq('organization_id', effectiveOrgId);
      } catch (err: any) {
        console.warn('[ILEX Supabase] Update manufacturer warning:', err?.message);
      }
    }

    setManufacturers(prev => {
      const next = prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: now } : m));
      saveEntityToStorage('manufacturers', effectiveOrgId, next);
      return next;
    });
  };

  const getManufacturerById = (id: string) => {
    return manufacturers.find(m => m.id === id);
  };

  const deleteManufacturer = async (id: string): Promise<void> => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Apenas administradores podem excluir indústrias representadas.');
    }

    const now = new Date().toISOString();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    addDeletedIds('manufacturers', [id]);

    if (config.isDemoMode) {
      setManufacturers(prev => prev.filter(m => m.id !== id));
      return;
    }

    const client = getSupabaseClient();
    if (client && isValidUUID(id) && isValidUUID(effectiveOrgId)) {
      try {
        await client.from('customer_manufacturers').delete().eq('manufacturer_id', id);
        const { error } = await client
          .from('manufacturers')
          .delete()
          .eq('id', id)
          .eq('organization_id', effectiveOrgId);

        if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
          await client
            .from('manufacturers')
            .update({ status: 'inactive', is_active: false, updated_at: now })
            .eq('id', id)
            .eq('organization_id', effectiveOrgId);
        }
      } catch (err: any) {
        console.warn('[ILEX Supabase] Delete manufacturer error:', err?.message);
      }
    }

    setManufacturers(prev => {
      const next = prev.filter(m => m.id !== id);
      saveEntityToStorage('manufacturers', effectiveOrgId, next);
      return next;
    });
  };

  // CRUD: Products
  const addProduct = async (
    data: Omit<Product, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Product> => {
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    removeDeletedIds('products', [newId]);

    let mfrName = data.manufacturer_name;
    if (!mfrName && data.manufacturer_id) {
      const foundMfr = manufacturers.find(m => m.id === data.manufacturer_id);
      if (foundMfr) mfrName = foundMfr.name;
    }

    const newProd: Product = {
      ...data,
      id: newId,
      organization_id: effectiveOrgId,
      manufacturer_name: mfrName,
      created_at: now,
      updated_at: now,
    };

    const client = getSupabaseClient();
    if (client && isValidUUID(effectiveOrgId)) {
      try {
        await client.from('products').insert({
          id: newId,
          organization_id: effectiveOrgId,
          manufacturer_id: isValidUUID(data.manufacturer_id) ? data.manufacturer_id : undefined,
          manufacturer_name: mfrName || 'Torralf',
          sku: data.sku,
          name: data.name,
          description: data.description,
          category: data.category || 'Geral',
          unit: data.unit || 'UN',
          unit_price: Number(data.unit_price) || 0,
          ncm: data.ncm,
          commission_percentage: Number(data.commission_percentage) || 5,
          minimum_order_quantity: Number(data.minimum_order_quantity) || 1,
          status: data.status || 'active',
        });
      } catch (err: any) {
        console.warn('[ILEX Supabase] Add product notice:', err?.message);
      }
    }

    setProducts(prev => {
      const next = [newProd, ...prev.filter(p => p.id !== newProd.id)];
      saveEntityToStorage('products', effectiveOrgId, next);
      return next;
    });

    return newProd;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    const now = new Date().toISOString();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    const client = getSupabaseClient();
    if (client && isValidUUID(id) && isValidUUID(effectiveOrgId)) {
      try {
        const cleanUpdates: Record<string, any> = { updated_at: now };
        if (updates.name !== undefined) cleanUpdates.name = updates.name;
        if (updates.sku !== undefined) cleanUpdates.sku = updates.sku;
        if (updates.unit_price !== undefined) cleanUpdates.unit_price = Number(updates.unit_price);
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        if (updates.category !== undefined) cleanUpdates.category = updates.category;
        if (updates.unit !== undefined) cleanUpdates.unit = updates.unit;
        if (updates.commission_percentage !== undefined) cleanUpdates.commission_percentage = Number(updates.commission_percentage);
        if (updates.ncm !== undefined) cleanUpdates.ncm = updates.ncm;

        await client
          .from('products')
          .update(cleanUpdates)
          .eq('id', id)
          .eq('organization_id', effectiveOrgId);
      } catch (err: any) {
        console.warn('[ILEX Supabase] Update product warning:', err?.message);
      }
    }

    setProducts(prev => {
      const next = prev.map(p => {
        if (p.id !== id) return p;
        let mfrName = updates.manufacturer_name ?? p.manufacturer_name;
        if (updates.manufacturer_id && updates.manufacturer_id !== p.manufacturer_id) {
          const found = manufacturers.find(m => m.id === updates.manufacturer_id);
          if (found) mfrName = found.name;
        }
        return { ...p, ...updates, manufacturer_name: mfrName, updated_at: now };
      });
      saveEntityToStorage('products', effectiveOrgId, next);
      return next;
    });
  };

  const batchUpdateProducts = async (ids: string[], updates: Partial<Product>): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const now = new Date().toISOString();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    const client = getSupabaseClient();
    if (client && isValidUUID(effectiveOrgId)) {
      try {
        const cleanUpdates: Record<string, any> = { updated_at: now };
        if (updates.status !== undefined) cleanUpdates.status = updates.status;
        const validUuids = ids.filter(id => isValidUUID(id));
        if (validUuids.length > 0) {
          await client
            .from('products')
            .update(cleanUpdates)
            .in('id', validUuids)
            .eq('organization_id', effectiveOrgId);
        }
      } catch (err: any) {
        console.warn('[ILEX Supabase] Batch update products:', err?.message);
      }
    }

    setProducts(prev => {
      const next = prev.map(p => (ids.includes(p.id) ? { ...p, ...updates, updated_at: now } : p));
      saveEntityToStorage('products', effectiveOrgId, next);
      return next;
    });
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    addDeletedIds('products', [id]);

    const client = getSupabaseClient();
    if (client && isValidUUID(id) && isValidUUID(effectiveOrgId)) {
      try {
        await client
          .from('products')
          .delete()
          .eq('id', id)
          .eq('organization_id', effectiveOrgId);
      } catch (err: any) {
        console.warn('[ILEX Supabase] Delete product:', err?.message);
      }
    }

    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      saveEntityToStorage('products', effectiveOrgId, next);
      return next;
    });
  };

  const batchDeleteProducts = async (ids: string[]): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    addDeletedIds('products', ids);

    const client = getSupabaseClient();
    if (client && isValidUUID(effectiveOrgId)) {
      try {
        const validUuids = ids.filter(id => isValidUUID(id));
        if (validUuids.length > 0) {
          await client
            .from('products')
            .delete()
            .in('id', validUuids)
            .eq('organization_id', effectiveOrgId);
        }
      } catch (err: any) {
        console.warn('[ILEX Supabase] Batch delete products:', err?.message);
      }
    }

    setProducts(prev => {
      const next = prev.filter(p => !ids.includes(p.id));
      saveEntityToStorage('products', effectiveOrgId, next);
      return next;
    });
  };

  const getProductById = (id: string) => {
    return products.find(p => p.id === id);
  };

  // Universal Spreadsheet Import (Excel / CSV) with Immediate Batch Persistence
  const importSpreadsheetData = async (
    target: 'customers' | 'contacts' | 'products' | 'manufacturers',
    rows: any[]
  ): Promise<{ imported: number; errors: string[] }> => {
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;
    const now = new Date().toISOString();
    let imported = 0;
    const errors: string[] = [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return { imported: 0, errors: ['Nenhum registro válido detectado na planilha.'] };
    }

    const client = getSupabaseClient();

    if (target === 'products') {
      const newItems: Product[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row['Nome'] || row['nome'] || row['Produto'] || row['produto'] || row['Descricao'] || row['descrição'] || row['Descrição'] || row['name'];
        if (!name) continue;

        const sku = String(row['SKU'] || row['sku'] || row['Codigo'] || row['código'] || row['Código'] || `PRD-${Math.floor(1000 + Math.random() * 9000)}`);
        const price = Number(String(row['Preco'] || row['preco'] || row['Preço'] || row['preço'] || row['Valor'] || row['valor'] || 0).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const unit = String(row['Unidade'] || row['unidade'] || row['UN'] || 'UN').toUpperCase();
        const category = String(row['Categoria'] || row['categoria'] || row['Segmento'] || 'Geral');
        const ncm = String(row['NCM'] || row['ncm'] || '');
        const commission = Number(row['Comissao'] || row['comissao'] || row['Comissão'] || row['comissão'] || 5);
        const mfrNameRaw = row['Fabrica'] || row['fabrica'] || row['Fábrica'] || row['fábrica'] || row['Representada'] || row['representada'] || '';
        
        let mfrId = manufacturers[0]?.id || '';
        let mfrName = manufacturers[0]?.name || 'Torralf';
        if (mfrNameRaw) {
          const found = manufacturers.find(m => m.name.toLowerCase().includes(String(mfrNameRaw).toLowerCase()));
          if (found) {
            mfrId = found.id;
            mfrName = found.name;
          }
        }

        newItems.push({
          id: crypto.randomUUID(),
          organization_id: effectiveOrgId,
          manufacturer_id: mfrId,
          manufacturer_name: mfrName,
          sku,
          name: String(name),
          category,
          unit,
          unit_price: price,
          ncm,
          commission_percentage: commission,
          status: 'active',
          created_at: now,
          updated_at: now,
        });
        imported++;
      }

      removeDeletedIds('products', newItems.map(p => p.id));

      setProducts(prev => {
        const next = [...newItems, ...prev];
        saveEntityToStorage('products', effectiveOrgId, next);
        return next;
      });

      // Background / Immediate Batch Upload to Supabase
      if (client && isValidUUID(effectiveOrgId) && newItems.length > 0) {
        try {
          const chunkSize = 50;
          for (let i = 0; i < newItems.length; i += chunkSize) {
            const chunk = newItems.slice(i, i + chunkSize).map(p => ({
              id: p.id,
              organization_id: effectiveOrgId,
              manufacturer_id: isValidUUID(p.manufacturer_id) ? p.manufacturer_id : undefined,
              manufacturer_name: p.manufacturer_name || 'Torralf',
              sku: p.sku,
              name: p.name,
              category: p.category || 'Geral',
              unit: p.unit || 'UN',
              unit_price: Number(p.unit_price) || 0,
              commission_percentage: Number(p.commission_percentage) || 5,
              ncm: p.ncm,
              status: 'active',
            }));
            await client.from('products').upsert(chunk, { onConflict: 'id' });
          }
        } catch (syncErr: any) {
          console.warn('[ILEX Supabase] Products batch sync notice:', syncErr?.message);
        }
      }

    } else if (target === 'manufacturers') {
      const newItems: Manufacturer[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row['Nome'] || row['nome'] || row['Fabrica'] || row['fabrica'] || row['Fábrica'] || row['Razao'] || row['Razao Social'];
        if (!name) continue;

        const code = String(row['Codigo'] || row['codigo'] || row['Código'] || String(name).slice(0, 3).toUpperCase());
        const rate = Number(String(row['Comissao'] || row['comissao'] || row['Comissão'] || 5).replace(',', '.')) || 5;

        newItems.push({
          id: crypto.randomUUID(),
          organization_id: effectiveOrgId,
          code,
          name: String(name),
          trade_name: String(row['Nome Fantasia'] || row['Fantasia'] || name),
          document: String(row['CNPJ'] || row['cnpj'] || ''),
          status: 'active',
          currency: 'BRL',
          initial_commission_rate: rate,
          commission_trigger: 'billing',
          is_active: true,
          created_at: now,
          updated_at: now,
        });
        imported++;
      }

      removeDeletedIds('manufacturers', newItems.map(m => m.id));

      setManufacturers(prev => {
        const next = [...newItems, ...prev];
        saveEntityToStorage('manufacturers', effectiveOrgId, next);
        return next;
      });

      if (client && isValidUUID(effectiveOrgId) && newItems.length > 0) {
        try {
          const mfrPayload = newItems.map(m => ({
            id: m.id,
            organization_id: effectiveOrgId,
            code: m.code,
            name: m.name,
            trade_name: m.trade_name,
            document: m.document,
            status: 'active',
            currency: 'BRL',
            initial_commission_rate: m.initial_commission_rate,
            commission_trigger: 'billing',
            is_active: true,
          }));
          await client.from('manufacturers').upsert(mfrPayload, { onConflict: 'id' });
        } catch (syncErr: any) {
          console.warn('[ILEX Supabase] Manufacturers batch sync notice:', syncErr?.message);
        }
      }

    } else {
      // 'customers' or 'contacts'
      const isContact = target === 'contacts';
      const newCusts: Customer[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Clean name fields
        const rawLegalName = String(row['RAZAO SOCIAL'] || row['Razao Social'] || row['razao_social'] || row['Razão Social'] || row['Nome'] || row['NOME'] || row['Cliente'] || row['Contato'] || row['Empresa'] || row['Comprador'] || '').replace(/^['"]|['"]$/g, '').trim();
        const rawTradeName = String(row['NOME'] || row['Nome'] || row['Nome Fantasia'] || row['Fantasia'] || row['fantasia'] || row['Apelido'] || rawLegalName).replace(/^['"]|['"]$/g, '').trim();
        
        const legalName = rawLegalName && rawLegalName !== '***' ? rawLegalName : rawTradeName;
        const tradeName = rawTradeName && rawTradeName !== '***' ? rawTradeName : legalName;

        if (!legalName || legalName === '***') continue;

        const cnpjCpf = String(row['CNPJ/CPF'] || row['CNPJ'] || row['CPF'] || row['Documento'] || row['documento'] || '').trim();
        const email = String(row['EMAIL'] || row['Email'] || row['E-mail'] || row['email'] || '').replace(/^['"]|['"]$/g, '').trim();
        const phone = String(row['TELEFONE 1'] || row['TELEFONE 2'] || row['Telefone'] || row['Celular'] || row['Fone'] || row['telefone'] || row['Whatsapp'] || '').trim();
        
        // Address extraction from ERP columns
        const street = String(row['LOGRADOURO'] || row['Logradouro'] || row['Rua'] || row['Endereco'] || '').trim();
        const number = String(row['NUMERO'] || row['Numero'] || row['Número'] || '').trim();
        const complement = String(row['COMPLEMENTO'] || row['Complemento'] || '').trim();
        const district = String(row['BAIRRO'] || row['Bairro'] || '').trim();
        const city = String(row['CIDADE'] || row['Cidade'] || row['Municipio'] || '').trim();
        const state = String(row['ESTADO'] || row['Estado'] || row['UF'] || row['uf'] || 'PR').trim().toUpperCase();
        const cep = String(row['CEP'] || row['Cep'] || '').trim();
        const paisRaw = String(row['PAIS'] || row['Pais'] || row['País'] || '').trim().toUpperCase();
        const country = (paisRaw.includes('PY') || paisRaw.includes('PARAGUAI') || state === 'PY') ? 'PRY' : 'BRA';

        const contactPerson = String(row['Comprador'] || row['Contato'] || row['Responsavel'] || row['Pessoa'] || (isContact ? tradeName : ''));
        const segment = String(row['CATEGORIA'] || row['Categoria'] || row['Segmento'] || row['Ramo'] || row['Atividade'] || 'Materiais / Indústria');
        const sellers = String(row['VENDEDORES'] || row['Vendedor'] || row['Representante'] || '').trim();
        const lastOrder = String(row['ULTIMO PEDIDO'] || '').trim();
        const lastOrderVal = String(row['VALOR ULTIMO PEDIDO'] || '').trim();

        // Subtype logic for contacts: 'person' vs 'factory'
        let contactSubtype: 'person' | 'factory' = 'person';
        const typeField = String(row['Tipo'] || row['Subtipo'] || row['Classificacao'] || '').toLowerCase();
        if (typeField.includes('fabrica') || typeField.includes('fábrica') || typeField.includes('industria') || typeField.includes('indústria') || legalName.toLowerCase().includes('indústria') || legalName.toLowerCase().includes('metalurgica') || legalName.toLowerCase().includes('fábrica')) {
          contactSubtype = 'factory';
        }

        const personType: 'PJ' | 'PF' = (cnpjCpf.length > 14 || contactSubtype === 'factory' || legalName.toLowerCase().includes('ltda') || legalName.toLowerCase().includes('s/a') || legalName.toLowerCase().includes('sa ') || legalName.toLowerCase().includes('eireli') || legalName.toLowerCase().includes('me') || legalName.toLowerCase().includes('epp')) ? 'PJ' : 'PF';

        // Spreadsheet imported contacts always enter exclusively as 'contact' (Prospecção), never directly as 'client'
        const targetEntityType: 'client' | 'contact' = 'contact';
        const targetStatus: 'active' | 'incomplete' = 'active';

        const notesParts = [
          sellers ? `Vendedores: ${sellers}` : '',
          lastOrder ? `Último Pedido: ${lastOrder}${lastOrderVal ? ` (R$ ${lastOrderVal})` : ''}` : '',
          row['CODIGO'] ? `Código ERP: ${row['CODIGO']}` : '',
        ].filter(Boolean);

        const customerId = crypto.randomUUID();

        const addresses = (city || street) ? [{
          id: crypto.randomUUID(),
          customer_id: customerId,
          street: street || '',
          number: number || '',
          complement: complement || '',
          district: district || '',
          city: city || 'São Mateus do Sul',
          state: state || 'PR',
          country: country,
          postal_code: cep || '',
          type: 'billing' as const,
          is_primary: true
        }] : [];

        const contacts = (contactPerson || email || phone) ? [{
          id: crypto.randomUUID(),
          customer_id: customerId,
          name: contactPerson || tradeName,
          email,
          phone,
          preferred_channel: 'whatsapp' as const,
          is_primary: true
        }] : [];

        newCusts.push({
          id: customerId,
          organization_id: effectiveOrgId,
          country,
          person_type: personType,
          legal_name: legalName,
          trade_name: tradeName,
          document_type: personType === 'PJ' ? 'CNPJ' : 'CPF',
          document: cnpjCpf,
          is_ie_exempt: personType === 'PF',
          icms_taxpayer_type: personType === 'PJ' ? 'taxpayer' : 'non_taxpayer',
          status: targetStatus,
          entity_type: targetEntityType,
          contact_subtype: contactSubtype,
          contact_person_name: contactPerson || undefined,
          contact_phone: phone || undefined,
          contact_email: email || undefined,
          contact_city: city || undefined,
          contact_state: state || undefined,
          segment: segment,
          tags: [
            contactSubtype === 'factory' ? 'Fábrica Prospect' : 'Contato Prospect',
            'Planilha Importada',
            segment
          ].filter(Boolean),
          notes: notesParts.length > 0 ? notesParts.join(' | ') : `Cadastrado via importação de planilha em ${new Date().toLocaleDateString('pt-BR')}.`,
          is_branch: false,
          addresses,
          contacts,
          manufacturer_links: [],
          created_at: now,
          updated_at: now,
        });
        imported++;
      }

      removeDeletedIds('customers', newCusts.map(c => c.id));

      setCustomers(prev => {
        // De-duplicate if existing document matches
        const existingDocs = new Set(prev.map(c => c.document).filter(Boolean));
        const filteredNew = newCusts.filter(c => !c.document || !existingDocs.has(c.document));
        const next = sortAlphabetically([...filteredNew, ...prev]);
        saveEntityToStorage('customers', effectiveOrgId, next);
        return next;
      });

      // Background / Immediate Batch Upload to Supabase
      if (client && isValidUUID(effectiveOrgId) && newCusts.length > 0) {
        try {
          const chunkSize = 50;
          for (let i = 0; i < newCusts.length; i += chunkSize) {
            const chunk = newCusts.slice(i, i + chunkSize);
            const customerPayload = chunk.map(c => ({
              id: c.id,
              organization_id: effectiveOrgId,
              country: c.country || 'BRA',
              person_type: c.person_type || 'PJ',
              legal_name: c.legal_name,
              trade_name: c.trade_name || c.legal_name,
              document_type: c.document_type || 'CNPJ',
              document: c.document || '',
              document_normalized: c.document?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || '',
              status: c.status || 'active',
              segment: c.segment,
              tags: c.tags || [],
              notes: c.notes,
            }));
            await client.from('customers').upsert(customerPayload, { onConflict: 'id' });

            const addressesPayload: any[] = [];
            const contactsPayload: any[] = [];

            chunk.forEach(c => {
              if (c.addresses && c.addresses.length > 0) {
                c.addresses.forEach(a => {
                  addressesPayload.push({
                    id: a.id || crypto.randomUUID(),
                    organization_id: effectiveOrgId,
                    customer_id: c.id,
                    type: a.type || 'billing',
                    street: a.street,
                    number: a.number,
                    complement: a.complement,
                    district: a.district,
                    city: a.city,
                    state: a.state,
                    country: a.country || 'BRA',
                    postal_code: a.postal_code,
                    is_primary: a.is_primary ?? true,
                  });
                });
              }

              if (c.contacts && c.contacts.length > 0) {
                c.contacts.forEach(ct => {
                  contactsPayload.push({
                    id: ct.id || crypto.randomUUID(),
                    organization_id: effectiveOrgId,
                    customer_id: c.id,
                    name: ct.name,
                    email: ct.email,
                    phone: ct.phone,
                    preferred_channel: ct.preferred_channel || 'whatsapp',
                    is_primary: ct.is_primary ?? true,
                  });
                });
              }
            });

            if (addressesPayload.length > 0) {
              await client.from('customer_addresses').upsert(addressesPayload, { onConflict: 'id' });
            }
            if (contactsPayload.length > 0) {
              await client.from('customer_contacts').upsert(contactsPayload, { onConflict: 'id' });
            }
          }
        } catch (syncErr: any) {
          console.warn('[ILEX Supabase] Customers batch sync notice:', syncErr?.message);
        }
      }
    }

    return { imported, errors };
  };

  // User & Invitation Management
  const inviteUser = async (params: {
    email: string;
    fullName: string;
    roleCode: UserRole;
    partnerPercentage?: number;
    scopeType?: 'manufacturer' | 'customer' | 'partner';
    scopeId?: string;
    scopeName?: string;
  }): Promise<MemberInvitation> => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Acesso negado: apenas administradores podem convidar novos usuários.');
    }

    const now = new Date().toISOString();
    const token = config.isDemoMode ? 'demo-invitation' : '';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const inviterId = currentMember?.user_id || user?.id || 'admin';

    const newInvite: MemberInvitation = {
      id: crypto.randomUUID(),
      organization_id: organization?.id || INITIAL_ORGANIZATION.id,
      email: params.email.trim().toLowerCase(),
      full_name: params.fullName.trim(),
      role_code: params.roleCode,
      partner_percentage: params.partnerPercentage || 0,
      scope_type: params.scopeType,
      scope_id: params.scopeId,
      scope_name: params.scopeName,
      status: 'pending',
      invited_by: inviterId,
      token,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    };

    if (config.isDemoMode) {
      setInvitations(prev => [newInvite, ...prev]);
      return newInvite;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) {
      const generatedToken = 'inv-' + crypto.randomUUID().substring(0, 8);
      const localInvite: MemberInvitation = {
        ...newInvite,
        token: generatedToken,
      };
      setInvitations(prev => [localInvite, ...prev]);
      return localInvite;
    }

    try {
      const { data, error } = await client.functions.invoke('invite-user', {
        body: {
          email: params.email,
          fullName: params.fullName,
          roleCode: params.roleCode,
          partnerPercentage: params.partnerPercentage || 0,
          scopeType: params.scopeType,
          scopeId: params.scopeId,
          organizationId: organization.id,
        },
      });

      if (!error && data?.invitation) {
        setInvitations(prev => [data.invitation, ...prev]);
        return data.invitation;
      }
      if (error && error.message && !error.message.includes('FunctionsFetchError') && !error.message.includes('Failed to send')) {
        throw new Error(error.message);
      }
    } catch (invokeErr: any) {
      // If Edge function returns business rule error (403, 400), propagate it
      if (invokeErr?.message && !invokeErr.message.includes('Failed to send') && !invokeErr.message.includes('fetch')) {
        throw invokeErr;
      }
    }

    // Direct table insert if edge function is not deployed or unreachable in environment
    const generatedToken = 'inv-' + crypto.randomUUID().substring(0, 8);
    const { data: inserted, error: insertErr } = await client
      .from('member_invitations')
      .insert({
        organization_id: organization.id,
        email: newInvite.email,
        full_name: newInvite.full_name,
        role_code: newInvite.role_code,
        partner_percentage: newInvite.partner_percentage,
        scope_type: newInvite.scope_type,
        scope_id: newInvite.scope_id,
        status: 'pending',
        invited_by: inviterId,
        token: generatedToken,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.message?.includes('schema cache') || insertErr.code === 'PGRST205') {
        const localInvite: MemberInvitation = {
          ...newInvite,
          token: generatedToken,
        };
        setInvitations(prev => [localInvite, ...prev]);
        return localInvite;
      }
      throw new Error(`Erro ao persistir convite: ${insertErr.message}`);
    }

    setInvitations(prev => [inserted, ...prev]);
    return inserted;
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Apenas administradores podem revogar convites.');
    }

    if (config.isDemoMode) {
      setInvitations(prev => prev.map(inv => inv.id === invitationId ? { ...inv, status: 'revoked' } : inv));
      return;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('member_invitations')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('organization_id', organization.id);

    if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
      throw new Error(`Erro ao revogar convite: ${error.message}`);
    }

    setInvitations(prev => prev.map(inv => inv.id === invitationId ? { ...inv, status: 'revoked' } : inv));
  };

  const deleteInvitation = async (invitationId: string) => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Apenas administradores podem excluir convites.');
    }

    setInvitations(prev => prev.filter(i => i.id !== invitationId));

    const client = getSupabaseClient();
    if (client && organization?.id) {
      try {
        await client
          .from('member_invitations')
          .delete()
          .eq('id', invitationId)
          .eq('organization_id', organization.id);
      } catch (err) {
        console.warn('Supabase delete invitation warning:', err);
      }
    }
  };

  const createMemberDirect = async (params: {
    email: string;
    fullName: string;
    roleCode: UserRole;
    partnerPercentage?: number;
    scopeType?: 'manufacturer' | 'customer' | 'partner';
    scopeId?: string;
    scopeName?: string;
  }): Promise<Member> => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Acesso negado: apenas administradores podem criar membros.');
    }

    const orgId = organization?.id || ILEX_CANONICAL_ORG_ID;
    const newUserId = crypto.randomUUID();
    const newMember: Member = {
      organization_id: orgId,
      user_id: newUserId,
      role_code: params.roleCode,
      full_name: params.fullName.trim(),
      email: params.email.trim().toLowerCase(),
      partner_percentage: params.partnerPercentage || 0,
      is_active: true,
      scope_manufacturer_id: params.scopeType === 'manufacturer' ? params.scopeId : undefined,
      scope_manufacturer_name: params.scopeType === 'manufacturer' ? params.scopeName : undefined,
      scope_customer_id: params.scopeType === 'customer' ? params.scopeId : undefined,
      scope_customer_name: params.scopeType === 'customer' ? params.scopeName : undefined,
      scopes: params.scopeId && params.scopeType ? [{
        id: crypto.randomUUID(),
        organization_id: orgId,
        user_id: newUserId,
        scope_type: params.scopeType,
        scope_id: params.scopeId,
        created_at: new Date().toISOString()
      }] : [],
    };

    setMembers(prev => {
      const next = [newMember, ...prev.filter(m => m.email.toLowerCase() !== newMember.email.toLowerCase())];
      try { localStorage.setItem(`ilex_real_members_${orgId}`, JSON.stringify(next)); } catch {}
      return next;
    });

    const client = getSupabaseClient();
    if (client && organization?.id) {
      try {
        await client.from('memberships').upsert({
          organization_id: orgId,
          user_id: newUserId,
          role_code: newMember.role_code,
          full_name: newMember.full_name,
          email: newMember.email,
          partner_percentage: newMember.partner_percentage,
          is_active: true,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Supabase direct membership insert warning:', err);
      }
    }

    return newMember;
  };

  const updateMember = async (userId: string, updates: Partial<Member>) => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Apenas administradores podem editar membros.');
    }

    const orgId = organization?.id || ILEX_CANONICAL_ORG_ID;
    const now = new Date().toISOString();

    setMembers(prev => {
      const next = prev.map(m => (m.user_id === userId ? { ...m, ...updates, updated_at: now } : m));
      try { localStorage.setItem(`ilex_real_members_${orgId}`, JSON.stringify(next)); } catch {}
      return next;
    });

    if (currentMember?.user_id === userId) {
      setCurrentMember(prev => prev ? { ...prev, ...updates } : null);
    }

    const client = getSupabaseClient();
    if (client && organization?.id) {
      try {
        const payload: any = { updated_at: now };
        if (updates.role_code !== undefined) payload.role_code = updates.role_code;
        if (updates.full_name !== undefined) payload.full_name = updates.full_name;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.partner_percentage !== undefined) payload.partner_percentage = updates.partner_percentage;
        if (updates.is_active !== undefined) payload.is_active = updates.is_active;

        await client
          .from('memberships')
          .update(payload)
          .eq('user_id', userId)
          .eq('organization_id', orgId);
      } catch (err) {
        console.warn('Supabase update membership warning:', err);
      }
    }
  };

  const deleteMember = async (userId: string) => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Apenas administradores podem excluir membros.');
    }

    if (userId === currentMember?.user_id) {
      throw new Error('Operação bloqueada: não é permitido excluir o próprio usuário logado.');
    }

    const orgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    setMembers(prev => {
      const next = prev.filter(m => m.user_id !== userId);
      try { localStorage.setItem(`ilex_real_members_${orgId}`, JSON.stringify(next)); } catch {}
      return next;
    });

    const client = getSupabaseClient();
    if (client && organization?.id) {
      try {
        await client
          .from('memberships')
          .delete()
          .eq('user_id', userId)
          .eq('organization_id', orgId);
      } catch (err) {
        console.warn('Supabase delete membership warning:', err);
      }
    }
  };

  const toggleMemberActive = async (userId: string, isActive: boolean) => {
    if (!isAdminUser(currentMember?.role_code)) {
      throw new Error('Apenas administradores podem alterar o status de membros.');
    }

    if (userId === currentMember?.user_id) {
      throw new Error('Operação bloqueada: não é permitido alterar o status ou papel do próprio usuário logado.');
    }

    if (config.isDemoMode) {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, is_active: isActive } : m));
      return;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('memberships')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('organization_id', organization.id);

    if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
      throw new Error(`Erro ao atualizar membro: ${error.message}`);
    }

    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, is_active: isActive } : m));
  };

  // Orders Management
  const addOrder = async (orderData: Omit<Order, 'id' | 'organization_id' | 'created_at'>): Promise<Order> => {
    const now = new Date().toISOString();
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;
    const orderId = crypto.randomUUID();

    removeDeletedIds('orders', [orderId]);

    const newOrder: Order = {
      ...orderData,
      id: orderId,
      organization_id: effectiveOrgId,
      created_at: now,
    };

    if (config.isDemoMode) {
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    }

    const client = getSupabaseClient();
    if (!client) {
      setOrders(prev => {
        const next = [newOrder, ...prev.filter(o => o.id !== newOrder.id && !String(o.id).startsWith('ord-00'))];
        saveEntityToStorage('orders', effectiveOrgId, next);
        return next;
      });
      return newOrder;
    }

    // Prepare payload for Supabase 'orders' table (exclude nested items and sanitize fields)
    const { items, ...orderPayload } = newOrder;
    const sanitizedOrderPayload = {
      id: newOrder.id,
      organization_id: effectiveOrgId,
      order_number: newOrder.order_number,
      customer_id: isValidUUID(newOrder.customer_id) ? newOrder.customer_id : undefined,
      customer_name: newOrder.customer_name || 'Cliente',
      manufacturer_id: isValidUUID(newOrder.manufacturer_id) ? newOrder.manufacturer_id : undefined,
      manufacturer_name: newOrder.manufacturer_name || 'Fábrica',
      seller_id: isValidUUID(newOrder.seller_id) ? newOrder.seller_id : (isValidUUID(user?.id) ? user?.id : undefined),
      seller_name: newOrder.seller_name || currentMember?.full_name || 'Vendedor',
      region: newOrder.region || 'Sul',
      status: newOrder.status || 'draft',
      total_gross: newOrder.total_gross || newOrder.total_amount || 0,
      total_net: newOrder.total_net || newOrder.total_amount || 0,
      total_amount: newOrder.total_amount || 0,
      commission_rate: newOrder.commission_rate || 0.05,
      commission_total: newOrder.commission_total || newOrder.commission_amount || 0,
      commission_amount: newOrder.commission_amount || 0,
      commission_received: newOrder.commission_received || 0,
      commission_pending: newOrder.commission_pending || (newOrder.commission_amount || 0),
      issue_date: newOrder.issue_date || newOrder.order_date?.slice(0, 10),
      order_date: newOrder.order_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      notes: newOrder.notes || '',
    };

    try {
      const { data: inserted, error } = await client
        .from('orders')
        .insert(sanitizedOrderPayload)
        .select()
        .single();

      if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
        console.warn('[ILEX Supabase] Inserção de pedido:', error.message);
      }

      if (inserted && items && items.length > 0) {
        try {
          const itemsPayload = items.map(it => ({
            organization_id: effectiveOrgId,
            order_id: inserted.id,
            sku: it.sku || 'SKU-001',
            description: it.description || '',
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            total_price: Number(it.total_price) || 0,
          }));
          await client.from('order_items').insert(itemsPayload);
        } catch (itemErr: any) {
          console.warn('[ILEX Supabase] Inserção de order_items:', itemErr?.message);
        }
      }
    } catch (err: any) {
      console.warn('[ILEX Supabase] Erro ao persistir pedido:', err?.message);
    }

    setOrders(prev => {
      const next = [newOrder, ...prev.filter(o => o.id !== newOrder.id && !String(o.id).startsWith('ord-00'))];
      saveEntityToStorage('orders', effectiveOrgId, next);
      return next;
    });

    // If this order is for a prospective contact, automatically promote them to an Active Client
    if (orderData.customer_id) {
      const targetCustomer = customers.find(c => c.id === orderData.customer_id);
      if (targetCustomer && targetCustomer.entity_type === 'contact') {
        const existingTags = targetCustomer.tags || [];
        const newTags = Array.from(new Set([...existingTags.filter(t => !t.includes('Prospect') && !t.includes('Contato')), 'Cliente Ativo']));
        updateCustomer(targetCustomer.id, {
          entity_type: 'client',
          status: 'active',
          tags: newTags,
        }).catch(err => console.warn('[ILEX Auto-promote contact to client warning]:', err));
      }
    }

    return newOrder;
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    if (config.isDemoMode) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      return;
    }

    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;
    const client = getSupabaseClient();
    if (client && isValidUUID(id)) {
      try {
        await client
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err: any) {
        console.warn('[ILEX Supabase] Falha ao atualizar status do pedido:', err?.message);
      }
    }

    setOrders(prev => {
      const next = prev.map(o => o.id === id ? { ...o, status } : o);
      saveEntityToStorage('orders', effectiveOrgId, next);
      return next;
    });
  };

  const deleteOrder = async (id: string): Promise<void> => {
    const effectiveOrgId = organization?.id || ILEX_CANONICAL_ORG_ID;

    addDeletedIds('orders', [id]);

    if (config.isDemoMode) {
      setOrders(prev => prev.filter(o => o.id !== id));
      return;
    }

    const client = getSupabaseClient();
    if (client && isValidUUID(id)) {
      try {
        await client
          .from('order_items')
          .delete()
          .eq('order_id', id);

        const { error } = await client
          .from('orders')
          .delete()
          .eq('id', id);

        if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
          console.warn('[ILEX Supabase] Falha ao deletar pedido no Supabase:', error.message);
        }
      } catch (err: any) {
        console.warn('[ILEX Supabase] Exceção ao deletar pedido:', err?.message);
      }
    }

    // Permanently remove from state and storage
    setOrders(prev => {
      const next = prev.filter(o => o.id !== id && !String(o.id).startsWith('ord-00'));
      saveEntityToStorage('orders', effectiveOrgId, next);
      return next;
    });
  };

  const updateOrganization = async (updates: Partial<Organization>) => {
    setOrganization(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates, updated_at: new Date().toISOString() };
      try { localStorage.setItem('ilex_organization_profile', JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (!config.isDemoMode && organization?.id) {
      const client = getSupabaseClient();
      if (client) {
        await client
          .from('organizations')
          .update(updates)
          .eq('id', organization.id);
      }
    }
  };

  const refreshData = async () => {
    if (config.isDemoMode) {
      initDemoMode();
    } else if (organization?.id) {
      await fetchRealData(organization.id);
    }
  };

  return (
    <CRMContext.Provider
      value={{
        user,
        session,
        currentMember,
        organization,
        updateOrganization,
        isLoadingAuth,
        authError,
        signIn,
        signOut,
        bootstrapAdmin,
        activateFounderSession,
        isConfigured: config.isConfigured,
        isDemoMode: config.isDemoMode,
        supabaseUrl: config.url,
        supabaseAnonKey: config.anonKey,
        saveSupabaseConfig,
        toggleDemoMode,
        isLoadingData,
        dataError,
        clearError,
        refreshData,
        customers,
        addCustomer,
        updateCustomer,
        batchUpdateCustomers,
        deleteCustomer,
        batchDeleteCustomers,
        getCustomerById,
        convertContactToClient,
        products,
        addProduct,
        updateProduct,
        batchUpdateProducts,
        deleteProduct,
        batchDeleteProducts,
        getProductById,
        importSpreadsheetData,
        manufacturers,
        addManufacturer,
        updateManufacturer,
        deleteManufacturer,
        getManufacturerById,
        advisoryPlans,
        members,
        invitations,
        inviteUser,
        createMemberDirect,
        updateMember,
        deleteMember,
        revokeInvitation,
        deleteInvitation,
        toggleMemberActive,
        orders,
        addOrder,
        updateOrderStatus,
        deleteOrder,
        demoMembers,
        setDemoMember,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = (): CRMContextType => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
