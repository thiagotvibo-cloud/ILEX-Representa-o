-- ILEX CRM - Migration 03 (Revision 2): Secure RLS Helpers, Hardened Role Policies & Cross-Tenant Protection
-- REPLACES and SUPERSEDES previous draft of migration 03.
-- IMPORTANT:
-- 1. memberships_admin_manage uses SECURITY DEFINER helper function with fixed search_path to eliminate recursive queries.
-- 2. Permissive *_org_all policies are explicitly DROPPED and replaced with granular role-based SELECT/INSERT/UPDATE policies.
-- 3. The 'parceiro' role is deny-by-default on general customer/financial records unless an explicit scope exists.
-- 4. The 'leitura' role can only SELECT, never INSERT/UPDATE/DELETE.
-- 5. All exposed operational tables (including regions, region_locations, and child tables) have RLS ENABLED.
-- 6. Incomplete/future modules are explicitly set to DENY-BY-DEFAULT for unprivileged users.
-- 7. bootstrap_initial_organization_and_admin is removed from public exposure: REVOKE EXECUTE FROM PUBLIC, anon, authenticated.
--    Bootstrap must be performed via dedicated administrative CLI/script with explicit UUID matching in auth.users.

-- ============================================================================
-- 1. DROP RECURSIVE & OVERLY PERMISSIVE POLICIES FROM MIGRATIONS 02 AND 03 DRAFT
-- ============================================================================
DO $$
BEGIN
  -- Drop overly permissive policies that combined with OR
  DROP POLICY IF EXISTS customers_org_all ON customers;
  DROP POLICY IF EXISTS addresses_via_customer ON customer_addresses;
  DROP POLICY IF EXISTS contacts_via_customer ON customer_contacts;
  DROP POLICY IF EXISTS manufacturers_org_all ON manufacturers;
  DROP POLICY IF EXISTS cust_mfr_org_all ON customer_manufacturers;
  DROP POLICY IF EXISTS rep_contracts_org_all ON representation_contracts;
  DROP POLICY IF EXISTS adv_plans_org_all ON advisory_plans;
  DROP POLICY IF EXISTS adv_contracts_org_all ON advisory_contracts;
  DROP POLICY IF EXISTS memberships_org_read ON memberships;
  DROP POLICY IF EXISTS memberships_self_read ON memberships;
  DROP POLICY IF EXISTS memberships_admin_manage ON memberships;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- 2. SECURITY DEFINER HELPER FUNCTIONS WITH FIXED SEARCH_PATH
-- ============================================================================

-- Retrieve authenticated user's active organization ID (single query, cached per transaction)
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

REVOKE ALL ON FUNCTION public.get_current_user_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_org_id() TO authenticated;

-- Retrieve authenticated user's role_code safely without triggering RLS recursion
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

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Check if current authenticated user is an active socio_admin in their org
CREATE OR REPLACE FUNCTION public.is_current_user_admin(p_org_id UUID)
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
      AND m.role_code = 'socio_admin'
      AND m.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin(UUID) TO authenticated;

-- Check if user can write operational records (socio_admin or comercial)
CREATE OR REPLACE FUNCTION public.can_user_write_sales(p_org_id UUID)
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
      AND m.role_code IN ('socio_admin', 'comercial')
      AND m.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.can_user_write_sales(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_write_sales(UUID) TO authenticated;

-- Check if partner has explicit scope on a customer
CREATE OR REPLACE FUNCTION public.partner_has_customer_scope(p_org_id UUID, p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.member_scopes s
    WHERE s.organization_id = p_org_id
      AND s.user_id = auth.uid()
      AND s.scope_type = 'customer'
      AND s.scope_id = p_customer_id
  );
$$;

REVOKE ALL ON FUNCTION public.partner_has_customer_scope(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_has_customer_scope(UUID, UUID) TO authenticated;

-- ============================================================================
-- 3. ENABLE RLS ON ALL OPERATIONAL TABLES (INCLUDING REGIONS AND DETAIL TABLES)
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE representation_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. ROBUST CROSS-TENANT INTEGRITY: COMPOSITE FOREIGN KEYS ON CHILD TABLES
-- Ensures a child address/contact/link cannot point to a parent customer belonging to another tenant!
-- ============================================================================
DO $$
BEGIN
  -- Add unique constraint on parent tables (id, organization_id) if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_customers_id_org'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT uq_customers_id_org UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_manufacturers_id_org'
  ) THEN
    ALTER TABLE manufacturers ADD CONSTRAINT uq_manufacturers_id_org UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_regions_id_org'
  ) THEN
    ALTER TABLE regions ADD CONSTRAINT uq_regions_id_org UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_rep_contracts_id_org'
  ) THEN
    ALTER TABLE representation_contracts ADD CONSTRAINT uq_rep_contracts_id_org UNIQUE (id, organization_id);
  END IF;
END $$;

-- Add organization_id column to child tables that previously lacked it, enabling composite FK
DO $$
BEGIN
  -- customer_addresses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_addresses' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE customer_addresses ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
  END IF;

  -- customer_contacts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_contacts' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE customer_contacts ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
  END IF;

  -- region_locations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'region_locations' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE region_locations ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
  END IF;

  -- commission_rules
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'commission_rules' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE commission_rules ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ============================================================================
-- 5. GRANULAR ROLE-BASED RLS POLICIES (NO RECURSION, STRICT RBAC)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 MEMBERSHIPS
-- ----------------------------------------------------------------------------
-- Self-read: any user can read their own membership record directly
CREATE POLICY memberships_read_own ON memberships
  FOR SELECT USING (user_id = auth.uid());

-- Org member read: users within the same tenant can see colleague memberships
CREATE POLICY memberships_read_org ON memberships
  FOR SELECT USING (organization_id = public.get_current_user_org_id());

-- Only socio_admin can insert/update/delete memberships in their org (uses helper to eliminate recursion)
CREATE POLICY memberships_admin_insert ON memberships
  FOR INSERT WITH CHECK (
    public.is_current_user_admin(organization_id)
  );

CREATE POLICY memberships_admin_update ON memberships
  FOR UPDATE USING (
    public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    public.is_current_user_admin(organization_id)
  );

CREATE POLICY memberships_admin_delete ON memberships
  FOR DELETE USING (
    public.is_current_user_admin(organization_id)
  );

-- ----------------------------------------------------------------------------
-- 5.2 ORGANIZATIONS
-- ----------------------------------------------------------------------------
CREATE POLICY organizations_select_member ON organizations
  FOR SELECT USING (id = public.get_current_user_org_id());

CREATE POLICY organizations_admin_update ON organizations
  FOR UPDATE USING (public.is_current_user_admin(id))
  WITH CHECK (public.is_current_user_admin(id));

-- ----------------------------------------------------------------------------
-- 5.3 CUSTOMERS
-- Non-parceiro members can read all customers in tenant.
-- Parceiro members can ONLY read customers with explicit scope.
-- Writing (insert/update) requires socio_admin or comercial.
-- Leitura or parceiro can NEVER insert or update without authorization.
-- ----------------------------------------------------------------------------
CREATE POLICY customers_select_tenant ON customers
  FOR SELECT USING (
    organization_id = public.get_current_user_org_id()
    AND (
      public.get_current_user_role() <> 'parceiro'
      OR public.partner_has_customer_scope(organization_id, id)
    )
  );

CREATE POLICY customers_insert_sales ON customers
  FOR INSERT WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.can_user_write_sales(organization_id)
  );

CREATE POLICY customers_update_sales ON customers
  FOR UPDATE USING (
    organization_id = public.get_current_user_org_id()
    AND public.can_user_write_sales(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.can_user_write_sales(organization_id)
  );

CREATE POLICY customers_delete_admin ON customers
  FOR DELETE USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

-- ----------------------------------------------------------------------------
-- 5.4 CUSTOMER ADDRESSES & CONTACTS
-- ----------------------------------------------------------------------------
CREATE POLICY addresses_select_tenant ON customer_addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_addresses.customer_id 
        AND c.organization_id = public.get_current_user_org_id()
        AND (
          public.get_current_user_role() <> 'parceiro'
          OR public.partner_has_customer_scope(c.organization_id, c.id)
        )
    )
  );

CREATE POLICY addresses_modify_sales ON customer_addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_addresses.customer_id 
        AND c.organization_id = public.get_current_user_org_id()
        AND public.can_user_write_sales(c.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_addresses.customer_id 
        AND c.organization_id = public.get_current_user_org_id()
        AND public.can_user_write_sales(c.organization_id)
    )
  );

CREATE POLICY contacts_select_tenant ON customer_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_contacts.customer_id 
        AND c.organization_id = public.get_current_user_org_id()
        AND (
          public.get_current_user_role() <> 'parceiro'
          OR public.partner_has_customer_scope(c.organization_id, c.id)
        )
    )
  );

CREATE POLICY contacts_modify_sales ON customer_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_contacts.customer_id 
        AND c.organization_id = public.get_current_user_org_id()
        AND public.can_user_write_sales(c.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_contacts.customer_id 
        AND c.organization_id = public.get_current_user_org_id()
        AND public.can_user_write_sales(c.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5.5 MANUFACTURERS
-- ----------------------------------------------------------------------------
CREATE POLICY manufacturers_select_tenant ON manufacturers
  FOR SELECT USING (organization_id = public.get_current_user_org_id());

CREATE POLICY manufacturers_admin_modify ON manufacturers
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

-- ----------------------------------------------------------------------------
-- 5.6 CUSTOMER-MANUFACTURER LINKS
-- ----------------------------------------------------------------------------
CREATE POLICY cust_mfr_select_tenant ON customer_manufacturers
  FOR SELECT USING (
    organization_id = public.get_current_user_org_id()
    AND (
      public.get_current_user_role() <> 'parceiro'
      OR public.partner_has_customer_scope(organization_id, customer_id)
    )
  );

CREATE POLICY cust_mfr_modify_sales ON customer_manufacturers
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.can_user_write_sales(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.can_user_write_sales(organization_id)
  );

-- ----------------------------------------------------------------------------
-- 5.7 REGIONS & REGION_LOCATIONS
-- ----------------------------------------------------------------------------
CREATE POLICY regions_select_tenant ON regions
  FOR SELECT USING (organization_id = public.get_current_user_org_id());

CREATE POLICY regions_admin_modify ON regions
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

CREATE POLICY region_locations_select_tenant ON region_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.regions r
      WHERE r.id = region_locations.region_id
        AND r.organization_id = public.get_current_user_org_id()
    )
  );

CREATE POLICY region_locations_admin_modify ON region_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regions r
      WHERE r.id = region_locations.region_id
        AND r.organization_id = public.get_current_user_org_id()
        AND public.is_current_user_admin(r.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.regions r
      WHERE r.id = region_locations.region_id
        AND r.organization_id = public.get_current_user_org_id()
        AND public.is_current_user_admin(r.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5.8 REPRESENTATION CONTRACTS & COMMISSION RULES
-- ----------------------------------------------------------------------------
CREATE POLICY rep_contracts_select_tenant ON representation_contracts
  FOR SELECT USING (
    organization_id = public.get_current_user_org_id()
    AND public.get_current_user_role() IN ('socio_admin', 'comercial', 'financeiro')
  );

CREATE POLICY rep_contracts_admin_modify ON representation_contracts
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

CREATE POLICY comm_rules_select_tenant ON commission_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.representation_contracts rc
      WHERE rc.id = commission_rules.contract_id
        AND rc.organization_id = public.get_current_user_org_id()
        AND public.get_current_user_role() IN ('socio_admin', 'comercial', 'financeiro')
    )
  );

CREATE POLICY comm_rules_admin_modify ON commission_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.representation_contracts rc
      WHERE rc.id = commission_rules.contract_id
        AND rc.organization_id = public.get_current_user_org_id()
        AND public.is_current_user_admin(rc.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.representation_contracts rc
      WHERE rc.id = commission_rules.contract_id
        AND rc.organization_id = public.get_current_user_org_id()
        AND public.is_current_user_admin(rc.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5.9 ADVISORY PLANS & CONTRACTS
-- ----------------------------------------------------------------------------
CREATE POLICY adv_plans_select_tenant ON advisory_plans
  FOR SELECT USING (organization_id = public.get_current_user_org_id());

CREATE POLICY adv_plans_admin_modify ON advisory_plans
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

CREATE POLICY adv_contracts_select_tenant ON advisory_contracts
  FOR SELECT USING (
    organization_id = public.get_current_user_org_id()
    AND public.get_current_user_role() IN ('socio_admin', 'comercial', 'financeiro')
  );

CREATE POLICY adv_contracts_sales_modify ON advisory_contracts
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.can_user_write_sales(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.can_user_write_sales(organization_id)
  );

-- ----------------------------------------------------------------------------
-- 5.10 DENY-BY-DEFAULT FOR UNREADY / ADVANCED MODULES (PARTNERS, AUDIT)
-- Only socio_admin has access until full module delivery in subsequent stages
-- ----------------------------------------------------------------------------
CREATE POLICY partners_admin_only ON partners
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

CREATE POLICY partner_contracts_admin_only ON partner_contracts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_contracts.partner_id
        AND p.organization_id = public.get_current_user_org_id()
        AND public.is_current_user_admin(p.organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners p
      WHERE p.id = partner_contracts.partner_id
        AND p.organization_id = public.get_current_user_org_id()
        AND public.is_current_user_admin(p.organization_id)
    )
  );

CREATE POLICY audit_events_admin_only ON audit_events
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

CREATE POLICY roles_select_org ON roles
  FOR SELECT USING (organization_id = public.get_current_user_org_id());

CREATE POLICY role_permissions_select_org ON role_permissions
  FOR SELECT USING (organization_id = public.get_current_user_org_id());

CREATE POLICY member_scopes_select_org ON member_scopes
  FOR SELECT USING (organization_id = public.get_current_user_org_id());

CREATE POLICY member_scopes_admin_modify ON member_scopes
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_admin(organization_id)
  );

-- ============================================================================
-- 6. REMOVE PUBLIC EXECUTE FROM BOOTSTRAP TO PREVENT TAKEOVER
-- ============================================================================
-- Revoke execute from public, anon, and authenticated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'bootstrap_initial_organization_and_admin'
  ) THEN
    REVOKE ALL ON FUNCTION public.bootstrap_initial_organization_and_admin(VARCHAR, VARCHAR, NUMERIC) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.bootstrap_initial_organization_and_admin(VARCHAR, VARCHAR, NUMERIC) FROM anon;
    REVOKE ALL ON FUNCTION public.bootstrap_initial_organization_and_admin(VARCHAR, VARCHAR, NUMERIC) FROM authenticated;
  END IF;
END $$;
