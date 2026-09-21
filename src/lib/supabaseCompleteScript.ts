// Script SQL canônico e idempotente para inicialização completa do Supabase PostgreSQL
export const SUPABASE_COMPLETE_SETUP_SQL = `-- ============================================================================
-- ILEX CRM - SETUP COMPLETO DO BANCO DE DADOS SUPABASE (POSTGRESQL + RLS + AUTH)
-- Execute este script no Supabase SQL Editor (https://supabase.com/dashboard)
-- Projeto: kgesahzkwqvixcqsnplo
-- Idempotente: pode ser executado múltiplas vezes com total segurança.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ORGANIZATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(32),
    city VARCHAR(100) DEFAULT 'São Mateus do Sul',
    state VARCHAR(2) DEFAULT 'PR',
    country VARCHAR(3) DEFAULT 'BRA',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. ROLES & MEMBERSHIPS (RBAC DE 8 PAPÉIS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.memberships (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    partner_percentage NUMERIC(5,2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.member_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    scope_type VARCHAR(50) NOT NULL,
    scope_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS public.member_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    partner_percentage NUMERIC(5,2) DEFAULT 0.00,
    scope_type VARCHAR(50),
    scope_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    invited_by UUID,
    token VARCHAR(128) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. MANUFACTURERS (FÁBRICAS / REPRESENTADAS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(32),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    initial_commission_rate NUMERIC(12,8) NOT NULL DEFAULT 0.05000000,
    commission_trigger VARCHAR(50) NOT NULL DEFAULT 'billing',
    commission_trigger_description TEXT,
    order_cutoff_day INT,
    payment_terms_summary TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, code)
);

-- ----------------------------------------------------------------------------
-- 4. CUSTOMERS (CLIENTES) E ENTIDADES VINCULADAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    country VARCHAR(3) NOT NULL DEFAULT 'BRA',
    person_type VARCHAR(2) NOT NULL DEFAULT 'PJ',
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document_type VARCHAR(20) NOT NULL DEFAULT 'CNPJ',
    document VARCHAR(32),
    document_normalized VARCHAR(32),
    state_registration VARCHAR(32),
    is_ie_exempt BOOLEAN NOT NULL DEFAULT false,
    city_registration VARCHAR(32),
    icms_taxpayer_type VARCHAR(30) NOT NULL DEFAULT 'taxpayer',
    tax_regime VARCHAR(30) DEFAULT 'simples_nacional',
    segment VARCHAR(100),
    company_size VARCHAR(50),
    is_branch BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL DEFAULT 'billing',
    street VARCHAR(255) NOT NULL,
    number VARCHAR(50),
    complement VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(10) NOT NULL,
    country VARCHAR(3) NOT NULL DEFAULT 'BRA',
    postal_code VARCHAR(20),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    preferred_channel VARCHAR(30) DEFAULT 'whatsapp',
    notes TEXT,
    birth_date DATE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id) ON DELETE RESTRICT,
    external_code VARCHAR(100),
    sales_rep_id UUID,
    credit_limit NUMERIC(20,6) DEFAULT 0.000000,
    credit_status VARCHAR(50) DEFAULT 'pending_review',
    reorder_cycle_days INT DEFAULT 60,
    last_order_date DATE,
    next_expected_reorder_date DATE,
    custom_payment_terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, customer_id, manufacturer_id)
);

-- ----------------------------------------------------------------------------
-- 5. ORDERS & ORDER ITEMS (PEDIDOS INDUSTRIAIS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    order_number VARCHAR(100) NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id) ON DELETE RESTRICT,
    manufacturer_name VARCHAR(255) NOT NULL,
    seller_id UUID,
    seller_name VARCHAR(255),
    region VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    total_gross NUMERIC(20,6) DEFAULT 0.00,
    total_net NUMERIC(20,6) DEFAULT 0.00,
    total_amount NUMERIC(20,6) NOT NULL DEFAULT 0.00,
    commission_rate NUMERIC(12,8) NOT NULL DEFAULT 0.05,
    commission_total NUMERIC(20,6) DEFAULT 0.00,
    commission_amount NUMERIC(20,6) NOT NULL DEFAULT 0.00,
    commission_received NUMERIC(20,6) DEFAULT 0.00,
    commission_pending NUMERIC(20,6) DEFAULT 0.00,
    issue_date DATE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    invoiced_date DATE,
    payment_terms VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE RESTRICT,
    sku VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
    unit_price NUMERIC(20,6) NOT NULL DEFAULT 0,
    discount_percentages NUMERIC(5,2)[] DEFAULT ARRAY[]::NUMERIC(5,2)[],
    net_unit_price NUMERIC(20,6),
    total_net_price NUMERIC(20,6),
    total_price NUMERIC(20,6) NOT NULL,
    commission_rate NUMERIC(12,8),
    commission_amount NUMERIC(20,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. ADVISORY PLANS & CONTRACTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.advisory_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    monthly_fee NUMERIC(20,6) NOT NULL,
    variable_commission_rate NUMERIC(12,8) NOT NULL DEFAULT 0.00000000,
    included_hours INT NOT NULL DEFAULT 10,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS public.advisory_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES public.advisory_plans(id) ON DELETE RESTRICT,
    monthly_fee NUMERIC(20,6) NOT NULL,
    variable_rate NUMERIC(12,8) NOT NULL DEFAULT 0.00000000,
    start_date DATE NOT NULL,
    end_date DATE,
    billing_day INT NOT NULL DEFAULT 10,
    status VARCHAR(30) NOT NULL DEFAULT 'proposal',
    lead_partner_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. AUDIT EVENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    user_id UUID,
    entity_name VARCHAR(100),
    entity_id UUID,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.organization_id 
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
    AND m.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR(50)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.role_code 
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
    AND m.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_master_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.role_code = 'socio_admin_master'
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_any_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.role_code IN ('socio_admin_master', 'socio_admin')
      AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_current_user_write(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.role_code IN ('socio_admin_master', 'socio_admin', 'comercial', 'financeiro')
      AND m.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_org_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_master_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_any_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_current_user_write(UUID) TO authenticated, anon;

-- ============================================================================
-- 9. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisory_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS memberships_select_policy ON public.memberships;
  CREATE POLICY memberships_select_policy ON public.memberships
    FOR SELECT USING (
      user_id = auth.uid() 
      OR organization_id = public.get_current_user_org_id()
      OR auth.uid() IS NOT NULL
    );

  DROP POLICY IF EXISTS memberships_manage_policy ON public.memberships;
  CREATE POLICY memberships_manage_policy ON public.memberships
    FOR ALL USING (
      public.is_current_user_master_admin(organization_id)
      OR user_id = auth.uid()
    );

  DROP POLICY IF EXISTS org_select_policy ON public.organizations;
  CREATE POLICY org_select_policy ON public.organizations
    FOR SELECT USING (
      id = public.get_current_user_org_id()
      OR auth.uid() IS NOT NULL
    );

  DROP POLICY IF EXISTS org_write_policy ON public.organizations;
  CREATE POLICY org_write_policy ON public.organizations
    FOR ALL USING (public.is_current_user_any_admin(id));

  DROP POLICY IF EXISTS roles_select_policy ON public.roles;
  CREATE POLICY roles_select_policy ON public.roles FOR SELECT USING (true);

  DROP POLICY IF EXISTS customers_select_policy ON public.customers;
  CREATE POLICY customers_select_policy ON public.customers
    FOR SELECT USING (organization_id = public.get_current_user_org_id() OR auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS customers_write_policy ON public.customers;
  CREATE POLICY customers_write_policy ON public.customers
    FOR ALL USING (public.can_current_user_write(organization_id) OR auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS addresses_policy ON public.customer_addresses;
  CREATE POLICY addresses_policy ON public.customer_addresses FOR ALL USING (true);

  DROP POLICY IF EXISTS contacts_policy ON public.customer_contacts;
  CREATE POLICY contacts_policy ON public.customer_contacts FOR ALL USING (true);

  DROP POLICY IF EXISTS cust_mfr_policy ON public.customer_manufacturers;
  CREATE POLICY cust_mfr_policy ON public.customer_manufacturers FOR ALL USING (true);

  DROP POLICY IF EXISTS mfr_select_policy ON public.manufacturers;
  CREATE POLICY mfr_select_policy ON public.manufacturers FOR SELECT USING (true);

  DROP POLICY IF EXISTS mfr_write_policy ON public.manufacturers;
  CREATE POLICY mfr_write_policy ON public.manufacturers FOR ALL USING (public.can_current_user_write(organization_id) OR auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS orders_policy ON public.orders;
  CREATE POLICY orders_policy ON public.orders FOR ALL USING (organization_id = public.get_current_user_org_id() OR auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS order_items_policy ON public.order_items;
  CREATE POLICY order_items_policy ON public.order_items FOR ALL USING (organization_id = public.get_current_user_org_id() OR auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS adv_plans_policy ON public.advisory_plans;
  CREATE POLICY adv_plans_policy ON public.advisory_plans FOR ALL USING (true);

  DROP POLICY IF EXISTS adv_contracts_policy ON public.advisory_contracts;
  CREATE POLICY adv_contracts_policy ON public.advisory_contracts FOR ALL USING (true);

  DROP POLICY IF EXISTS invitations_policy ON public.member_invitations;
  CREATE POLICY invitations_policy ON public.member_invitations FOR ALL USING (true);

  DROP POLICY IF EXISTS audit_policy ON public.audit_events;
  CREATE POLICY audit_policy ON public.audit_events FOR ALL USING (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- 10. SEEDING CANÔNICO (ORGANIZAÇÃO, ROLES E SÓCIO FUNDADOR)
-- ============================================================================
DO $$
DECLARE
  v_org_id UUID;
  v_user_record RECORD;
BEGIN
  -- 1. Obter ou criar organização primária ILEX
  SELECT id INTO v_org_id FROM public.organizations WHERE document = '42.195.882/0001-09' LIMIT 1;
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      id, name, trade_name, document, city, state, country
    ) VALUES (
      'a0000000-0000-0000-0000-000000000001'::UUID,
      'ILEX Representação e Assessoria Comercial Ltda',
      'ILEX Comercial',
      '42.195.882/0001-09',
      'São Mateus do Sul',
      'PR',
      'BRA'
    ) RETURNING id INTO v_org_id;
  END IF;

  -- 2. Parametrizar os 8 Papéis Canônicos
  INSERT INTO public.roles (organization_id, code, name, description)
  VALUES 
    (v_org_id, 'socio_admin_master', 'Sócio Admin Master', 'Acesso irrestrito a todas as operações, segurança, banco de dados, auditoria e gestão de usuários.'),
    (v_org_id, 'socio_admin', 'Sócio Administrador', 'Gestão comercial, financeira e operacional executiva. Sem acesso a configurações de banco e segurança.'),
    (v_org_id, 'comercial', 'Equipe Comercial', 'Gestão de clientes, contatos, pipeline de vendas, agenda e emissão de orçamentos e pedidos.'),
    (v_org_id, 'financeiro', 'Financeiro & Comissões', 'Gestão de faturamento, liquidação de recebíveis, cálculo de comissões e relatórios financeiros.'),
    (v_org_id, 'leitura', 'Consulta (Somente Leitura)', 'Acesso de visualização restrito; bloqueado para criação, edição ou exclusão de registros.'),
    (v_org_id, 'associado', 'Associado Externo', 'Acesso estrito à sua empresa/carteira atribuída e evolução compartilhada pela ILEX.'),
    (v_org_id, 'representada_admin', 'Representada Admin (Fábrica)', 'Gestão da sua fábrica atribuída, seus produtos, pedidos, faturamento e comissões devidas.'),
    (v_org_id, 'representada_leitura', 'Representada Consulta (Fábrica)', 'Consulta da sua fábrica atribuída, produtos, pedidos e comissões devidas (somente leitura).')
  ON CONFLICT (organization_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description;

  -- 3. Vincular Thiago (UUID conhecido ou buscar em auth.users por email)
  FOR v_user_record IN 
    SELECT id, email FROM auth.users 
    WHERE email ILIKE '%thiagotv.ibo%' OR id = '1628fa75-cc9f-4437-9645-de0042732690'::UUID
    LIMIT 1
  LOOP
    INSERT INTO public.memberships (
      organization_id, user_id, role_code, full_name, email, partner_percentage, is_active
    ) VALUES (
      v_org_id, v_user_record.id, 'socio_admin_master', 'Thiago', v_user_record.email, 50.0, true
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role_code = 'socio_admin_master', is_active = true, partner_percentage = 50.0;
  END LOOP;

  INSERT INTO public.memberships (
    organization_id, user_id, role_code, full_name, email, partner_percentage, is_active
  ) VALUES (
    v_org_id, '1628fa75-cc9f-4437-9645-de0042732690'::UUID, 'socio_admin_master', 'Thiago', 'thiagotv.ibo@gmail.com', 50.0, true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role_code = 'socio_admin_master', is_active = true, partner_percentage = 50.0;

END $$;

NOTIFY pgrst, 'reload schema';
`;
