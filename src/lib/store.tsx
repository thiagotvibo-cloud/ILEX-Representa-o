import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Customer, Manufacturer, Member, Organization, AdvisoryPlan, UserRole, MemberInvitation, Order, OrderStatus, isAdminUser } from '../types';
import {
  INITIAL_ORGANIZATION,
  INITIAL_MEMBERS,
  INITIAL_MANUFACTURERS,
  INITIAL_CUSTOMERS,
  INITIAL_ADVISORY_PLANS,
  INITIAL_INVITATIONS,
  INITIAL_ORDERS,
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

  // Customers (Async CRUD)
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;

  // Manufacturers (Async CRUD)
  manufacturers: Manufacturer[];
  addManufacturer: (manufacturer: Omit<Manufacturer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => Promise<Manufacturer>;
  updateManufacturer: (id: string, updates: Partial<Manufacturer>) => Promise<void>;
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

  // Demo Helpers (Accessible ONLY when isDemoMode === true)
  demoMembers: Member[];
  setDemoMember: (member: Member) => void;
}

const CRMContext = createContext<CRMContextType | null>(null);

const DEMO_STORAGE_CUSTOMERS = 'ilex_demo_customers_data';
const DEMO_STORAGE_MANUFACTURERS = 'ilex_demo_manufacturers_data';

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
    try {
      const savedCust = localStorage.getItem(`ilex_real_customers_${orgId}`);
      if (savedCust) {
        try { setCustomers(JSON.parse(savedCust)); } catch { setCustomers(INITIAL_CUSTOMERS); }
      } else {
        setCustomers(INITIAL_CUSTOMERS);
      }

      const savedMfr = localStorage.getItem(`ilex_real_manufacturers_${orgId}`);
      if (savedMfr) {
        try { setManufacturers(JSON.parse(savedMfr)); } catch { setManufacturers(INITIAL_MANUFACTURERS); }
      } else {
        setManufacturers(INITIAL_MANUFACTURERS);
      }

      const savedOrders = localStorage.getItem(`ilex_real_orders_${orgId}`);
      if (savedOrders) {
        try { setOrders(JSON.parse(savedOrders)); } catch { setOrders(INITIAL_ORDERS); }
      } else {
        setOrders(INITIAL_ORDERS);
      }

      setAdvisoryPlans(INITIAL_ADVISORY_PLANS);
      setMembers(INITIAL_MEMBERS);
      setInvitations(INITIAL_INVITATIONS);
    } catch {
      setCustomers(INITIAL_CUSTOMERS);
      setManufacturers(INITIAL_MANUFACTURERS);
      setOrders(INITIAL_ORDERS);
      setAdvisoryPlans(INITIAL_ADVISORY_PLANS);
      setMembers(INITIAL_MEMBERS);
      setInvitations(INITIAL_INVITATIONS);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // 1. Fetch Real Data from Supabase (Resilient to uninitialized remote tables)
  const fetchRealData = useCallback(async (orgId: string) => {
    const client = getSupabaseClient();
    if (!client) {
      loadLocalData(orgId);
      return;
    }

    setIsLoadingData(true);
    setDataError(null);

    // Cleanse any invalid non-UUID organization ID (e.g. from previous local state)
    let sanitizedOrgId = orgId;
    if (!isValidUUID(sanitizedOrgId)) {
      sanitizedOrgId = ILEX_CANONICAL_ORG_ID;
    }

    try {
      // 1a. Fetch Customers with nested addresses, contacts and manufacturer links
      const { data: custRows, error: custErr } = await client
        .from('customers')
        .select(`
          *,
          customer_addresses (*),
          customer_contacts (*),
          customer_manufacturers (*)
        `)
        .eq('organization_id', sanitizedOrgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (custErr) {
        if (custErr.message?.includes('schema cache') || custErr.code === 'PGRST205' || custErr.message?.includes('invalid input syntax for type uuid')) {
          const cached = localStorage.getItem(`ilex_real_customers_${sanitizedOrgId}`);
          if (cached) {
            try { setCustomers(JSON.parse(cached)); } catch { setCustomers([]); }
          } else {
            setCustomers([]);
          }
        } else {
          setDataError(`Erro ao carregar clientes: ${custErr.message}`);
        }
      } else if (custRows) {
        const parsedCustomers: Customer[] = custRows.map((r: any) => ({
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
          status: r.status,
          tags: r.tags || [],
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
        }));
        setCustomers(parsedCustomers);
        try {
          localStorage.setItem(`ilex_real_customers_${sanitizedOrgId}`, JSON.stringify(parsedCustomers));
        } catch {}
      }

      // 1b. Fetch Manufacturers
      const { data: mfrRows, error: mfrErr } = await client
        .from('manufacturers')
        .select('*')
        .eq('organization_id', sanitizedOrgId)
        .order('name', { ascending: true });

      if (mfrErr) {
        if (mfrErr.message?.includes('schema cache') || mfrErr.code === 'PGRST205' || mfrErr.message?.includes('invalid input syntax for type uuid')) {
          const cached = localStorage.getItem(`ilex_real_manufacturers_${sanitizedOrgId}`);
          if (cached) {
            try { setManufacturers(JSON.parse(cached)); } catch { setManufacturers([]); }
          } else {
            setManufacturers([]);
          }
        }
      } else if (mfrRows) {
        const parsedMfrs: Manufacturer[] = mfrRows.map((m: any) => ({
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
        setManufacturers(parsedMfrs);
        try {
          localStorage.setItem(`ilex_real_manufacturers_${sanitizedOrgId}`, JSON.stringify(parsedMfrs));
        } catch {}
      }

      // 1c. Fetch Advisory Plans
      const { data: planRows } = await client
        .from('advisory_plans')
        .select('*')
        .eq('organization_id', sanitizedOrgId)
        .order('monthly_fee', { ascending: true });

      if (planRows && planRows.length > 0) {
        setAdvisoryPlans(planRows.map((p: any) => ({
          id: p.id,
          organization_id: p.organization_id,
          code: p.code,
          name: p.name,
          monthly_fee: Number(p.monthly_fee) || 0,
          variable_commission_rate: Number(p.variable_commission_rate) || 0,
          included_hours: p.included_hours || 0,
          description: p.description,
          is_active: p.is_active,
        })));
      }

      // 1d. Fetch Orders
      const { data: orderRows, error: orderErr } = await client
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('organization_id', sanitizedOrgId)
        .order('order_date', { ascending: false });

      if (orderErr) {
        if (orderErr.message?.includes('schema cache') || orderErr.code === 'PGRST205' || orderErr.message?.includes('invalid input syntax for type uuid')) {
          const cached = localStorage.getItem(`ilex_real_orders_${sanitizedOrgId}`);
          if (cached) {
            try { setOrders(JSON.parse(cached)); } catch { setOrders([]); }
          } else {
            setOrders([]);
          }
        }
      } else if (orderRows) {
        const parsedOrders: Order[] = orderRows.map((o: any) => ({
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
        setOrders(parsedOrders);
        try {
          localStorage.setItem(`ilex_real_orders_${sanitizedOrgId}`, JSON.stringify(parsedOrders));
        } catch {}
      }

      // 1e. Fetch Members & Invitations
      const { data: memberRows } = await client
        .from('memberships')
        .select('*')
        .eq('organization_id', sanitizedOrgId);
      if (memberRows && memberRows.length > 0) {
        setMembers(memberRows);
      }

      const { data: inviteRows } = await client
        .from('member_invitations')
        .select('*')
        .eq('organization_id', sanitizedOrgId)
        .order('created_at', { ascending: false });
      if (inviteRows) {
        setInvitations(inviteRows);
      }
    } catch (err: any) {
      if (!err?.message?.includes('schema cache')) {
        setDataError(`Exceção ao buscar dados: ${err?.message || 'Falha desconhecida'}`);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

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
        const userEmail = currentAuthUser?.email || 'thiagotv.ibo@gmail.com';
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

    const userEmail = currentAuthUser?.email || 'thiagotv.ibo@gmail.com';
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
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
        await loadMemberAndOrganization(data.user.id);
        return;
      }
    }

    // Direct Login / Local Admin Workspace Session
    const effectiveOrg: Organization = {
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

    const userEmail = email.trim().toLowerCase() || 'thiagotv.ibo@gmail.com';
    const userName = userEmail.toLowerCase().includes('thiago') ? 'Thiago' : userEmail.split('@')[0] || 'Administrador';

    const effectiveMember: Member = {
      organization_id: effectiveOrg.id,
      user_id: '1628fa75-cc9f-4437-9645-de0042732690',
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

    if (insertErr) {
      if (insertErr.message?.includes('schema cache') || insertErr.code === 'PGRST205') {
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
      throw new Error(`Erro ao salvar cliente no Supabase: ${insertErr.message}`);
    }

    // Insert addresses if present
    if (data.addresses && data.addresses.length > 0) {
      const addressRows = data.addresses.map(a => ({
        id: crypto.randomUUID(),
        organization_id: organization.id,
        customer_id: newId,
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
      await client.from('customer_addresses').insert(addressRows);
    }

    // Insert contacts if present
    if (data.contacts && data.contacts.length > 0) {
      const contactRows = data.contacts.map(ct => ({
        id: crypto.randomUUID(),
        organization_id: organization.id,
        customer_id: newId,
        name: ct.name,
        role: ct.role,
        email: ct.email,
        phone: ct.phone,
        whatsapp: ct.whatsapp,
        preferred_channel: ct.preferred_channel || 'whatsapp',
        notes: ct.notes,
        is_primary: ct.is_primary ?? false,
      }));
      await client.from('customer_contacts').insert(contactRows);
    }

    // Insert manufacturer links if present
    if (data.manufacturer_links && data.manufacturer_links.length > 0) {
      const linkRows = data.manufacturer_links.map(ml => ({
        id: crypto.randomUUID(),
        organization_id: organization.id,
        customer_id: newId,
        manufacturer_id: ml.manufacturer_id,
        external_code: ml.external_code,
        credit_limit: ml.credit_limit || 0,
        credit_status: ml.credit_status || 'pending_review',
        reorder_cycle_days: ml.reorder_cycle_days || 60,
      }));
      await client.from('customer_manufacturers').insert(linkRows);
    }

    const createdCustomer: Customer = {
      ...data,
      id: inserted.id,
      organization_id: inserted.organization_id,
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
    };

    setCustomers(prev => {
      const next = [createdCustomer, ...prev];
      try { localStorage.setItem(`ilex_real_customers_${organization.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
    return createdCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<void> => {
    const now = new Date().toISOString();

    if (config.isDemoMode) {
      setCustomers(prev =>
        prev.map(c => (c.id === id ? { ...c, ...updates, updated_at: now } : c))
      );
      return;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) {
      setCustomers(prev => {
        const next = prev.map(c => (c.id === id ? ({ ...c, ...updates, updated_at: now } as Customer) : c));
        try { localStorage.setItem(`ilex_real_customers_${organization.id}`, JSON.stringify(next)); } catch {}
        return next;
      });
      return;
    }

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

    const { error } = await client
      .from('customers')
      .update(cleanUpdates)
      .eq('id', id)
      .eq('organization_id', organization.id);

    if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
      throw new Error(`Falha ao atualizar cliente no Supabase: ${error.message}`);
    }

    setCustomers(prev => {
      const next = prev.map(c => (c.id === id ? ({ ...c, ...updates, updated_at: now } as Customer) : c));
      try { localStorage.setItem(`ilex_real_customers_${organization.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    const now = new Date().toISOString();

    if (config.isDemoMode) {
      setCustomers(prev =>
        prev.map(c => (c.id === id ? ({ ...c, status: 'inactive' as const, updated_at: now } as Customer) : c))
      );
      return;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) {
      setCustomers(prev => {
        const next = prev.map(c => (c.id === id ? ({ ...c, status: 'inactive' as const, updated_at: now } as Customer) : c));
        try { localStorage.setItem(`ilex_real_customers_${organization.id}`, JSON.stringify(next)); } catch {}
        return next;
      });
      return;
    }

    const { error } = await client
      .from('customers')
      .update({ deleted_at: now, status: 'inactive' })
      .eq('id', id)
      .eq('organization_id', organization.id);

    if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
      throw new Error(`Falha ao inativar cliente: ${error.message}`);
    }

    setCustomers(prev => {
      const next = prev.map(c => (c.id === id ? ({ ...c, status: 'inactive' as const, updated_at: now } as Customer) : c));
      try { localStorage.setItem(`ilex_real_customers_${organization.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const getCustomerById = (id: string) => {
    return customers.find(c => c.id === id);
  };

  // CRUD: Manufacturers
  const addManufacturer = async (
    data: Omit<Manufacturer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<Manufacturer> => {
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    if (config.isDemoMode) {
      const newMfr: Manufacturer = {
        ...data,
        id: newId,
        organization_id: organization?.id || INITIAL_ORGANIZATION.id,
        created_at: now,
        updated_at: now,
      };
      setManufacturers(prev => [...prev, newMfr]);
      return newMfr;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) {
      const createdMfr: Manufacturer = {
        ...data,
        id: newId,
        organization_id: organization.id,
        created_at: now,
        updated_at: now,
      };
      setManufacturers(prev => {
        const next = [...prev, createdMfr];
        try { localStorage.setItem(`ilex_real_manufacturers_${organization.id}`, JSON.stringify(next)); } catch {}
        return next;
      });
      return createdMfr;
    }

    const { data: inserted, error } = await client
      .from('manufacturers')
      .insert({
        id: newId,
        organization_id: organization.id,
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

    let createdMfr: Manufacturer;
    if (error) {
      if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
        createdMfr = {
          ...data,
          id: newId,
          organization_id: organization.id,
          created_at: now,
          updated_at: now,
        };
      } else {
        throw new Error(`Erro ao cadastrar fábrica no Supabase: ${error.message}`);
      }
    } else {
      createdMfr = {
        ...data,
        id: inserted.id,
        organization_id: inserted.organization_id,
        created_at: inserted.created_at,
        updated_at: inserted.updated_at,
      };
    }

    setManufacturers(prev => {
      const next = [...prev, createdMfr];
      try { localStorage.setItem(`ilex_real_manufacturers_${organization.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
    return createdMfr;
  };

  const updateManufacturer = async (id: string, updates: Partial<Manufacturer>): Promise<void> => {
    const now = new Date().toISOString();

    if (config.isDemoMode) {
      setManufacturers(prev =>
        prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: now } : m))
      );
      return;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) {
      setManufacturers(prev => {
        const next = prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: now } : m));
        try { localStorage.setItem(`ilex_real_manufacturers_${organization.id}`, JSON.stringify(next)); } catch {}
        return next;
      });
      return;
    }

    const cleanUpdates: Record<string, any> = { updated_at: now };
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.trade_name !== undefined) cleanUpdates.trade_name = updates.trade_name;
    if (updates.code !== undefined) cleanUpdates.code = updates.code.toUpperCase();
    if (updates.status !== undefined) cleanUpdates.status = updates.status;
    if (updates.initial_commission_rate !== undefined) cleanUpdates.initial_commission_rate = updates.initial_commission_rate;
    if (updates.commission_trigger !== undefined) cleanUpdates.commission_trigger = updates.commission_trigger;
    if (updates.commission_trigger_description !== undefined) cleanUpdates.commission_trigger_description = updates.commission_trigger_description;
    if (updates.order_cutoff_day !== undefined) cleanUpdates.order_cutoff_day = updates.order_cutoff_day;

    const { error } = await client
      .from('manufacturers')
      .update(cleanUpdates)
      .eq('id', id)
      .eq('organization_id', organization.id);

    if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
      throw new Error(`Erro ao atualizar fábrica: ${error.message}`);
    }

    setManufacturers(prev => {
      const next = prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: now } : m));
      try { localStorage.setItem(`ilex_real_manufacturers_${organization.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const getManufacturerById = (id: string) => {
    return manufacturers.find(m => m.id === id);
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
    const newOrder: Order = {
      ...orderData,
      id: crypto.randomUUID(),
      organization_id: organization?.id || INITIAL_ORGANIZATION.id,
      created_at: now,
    };

    if (config.isDemoMode) {
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) {
      setOrders(prev => {
        const next = [newOrder, ...prev];
        try { localStorage.setItem(`ilex_real_orders_${organization.id}`, JSON.stringify(next)); } catch {}
        return next;
      });
      return newOrder;
    }

    const { data: inserted, error } = await client
      .from('orders')
      .insert({
        ...newOrder,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
        setOrders(prev => {
          const next = [newOrder, ...prev];
          try { localStorage.setItem(`ilex_real_orders_${organization.id}`, JSON.stringify(next)); } catch {}
          return next;
        });
        return newOrder;
      }
      throw new Error(`Erro ao registrar pedido: ${error.message}`);
    }

    setOrders(prev => {
      const next = [inserted, ...prev];
      try { localStorage.setItem(`ilex_real_orders_${organization.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
    return inserted;
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    if (config.isDemoMode) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      return;
    }

    if (!organization?.id) throw new Error('Sessão real sem organização ativa.');

    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organization.id);

    if (error && !error.message?.includes('schema cache') && error.code !== 'PGRST205') {
      throw new Error(`Erro ao atualizar pedido: ${error.message}`);
    }

    setOrders(prev => {
      const next = prev.map(o => o.id === id ? { ...o, status } : o);
      try { localStorage.setItem(`ilex_real_orders_${organization.id}`, JSON.stringify(next)); } catch {}
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
        deleteCustomer,
        getCustomerById,
        manufacturers,
        addManufacturer,
        updateManufacturer,
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
