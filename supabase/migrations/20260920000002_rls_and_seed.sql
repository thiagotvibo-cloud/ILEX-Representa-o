-- ILEX CRM - RLS Policies and Initial Seeds
-- Migration 02: Row Level Security and Verified Domain Initial Data

-- Enable RLS on core tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_scopes ENABLE ROW LEVEL SECURITY;
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

-- Helper function to retrieve authenticated user's organization_id
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM memberships 
  WHERE user_id = auth.uid() AND is_active = true 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to check role permission
CREATE OR REPLACE FUNCTION user_has_permission(p_resource VARCHAR, p_action VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    JOIN role_permissions rp 
      ON rp.organization_id = m.organization_id 
      AND rp.role_code = m.role_code
    WHERE m.user_id = auth.uid()
      AND m.is_active = true
      AND rp.resource = p_resource
      AND (rp.action = p_action OR rp.action = 'all')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Standard tenant isolation policies
DO $$
BEGIN
  -- Organizations
  CREATE POLICY org_members_read ON organizations
    FOR SELECT USING (id = current_user_org_id());

  -- Memberships
  CREATE POLICY memberships_org_read ON memberships
    FOR SELECT USING (organization_id = current_user_org_id());

  -- Customers
  CREATE POLICY customers_org_all ON customers
    FOR ALL USING (organization_id = current_user_org_id())
    WITH CHECK (organization_id = current_user_org_id());

  -- Customer Addresses
  CREATE POLICY addresses_via_customer ON customer_addresses
    FOR ALL USING (
      EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_addresses.customer_id AND c.organization_id = current_user_org_id())
    );

  -- Customer Contacts
  CREATE POLICY contacts_via_customer ON customer_contacts
    FOR ALL USING (
      EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_contacts.customer_id AND c.organization_id = current_user_org_id())
    );

  -- Manufacturers
  CREATE POLICY manufacturers_org_all ON manufacturers
    FOR ALL USING (organization_id = current_user_org_id())
    WITH CHECK (organization_id = current_user_org_id());

  -- Customer Manufacturers
  CREATE POLICY cust_mfr_org_all ON customer_manufacturers
    FOR ALL USING (organization_id = current_user_org_id())
    WITH CHECK (organization_id = current_user_org_id());

  -- Representation Contracts
  CREATE POLICY rep_contracts_org_all ON representation_contracts
    FOR ALL USING (organization_id = current_user_org_id())
    WITH CHECK (organization_id = current_user_org_id());

  -- Advisory Plans & Contracts
  CREATE POLICY adv_plans_org_all ON advisory_plans
    FOR ALL USING (organization_id = current_user_org_id())
    WITH CHECK (organization_id = current_user_org_id());

  CREATE POLICY adv_contracts_org_all ON advisory_contracts
    FOR ALL USING (organization_id = current_user_org_id())
    WITH CHECK (organization_id = current_user_org_id());

EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
