-- ILEX CRM - Migration 04: Granular User Roles, Member Scopes, Invitations & Scoped Dashboards
-- Incremental Migration revisável sem quebra de compatibilidade e sem desativação de RLS.

-- ============================================================================
-- 1. SEED / UPDATE SYSTEM ROLES FOR TENANT
-- ============================================================================
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Percorre as organizações existentes para garantir que todas possuam os 8 papéis parametrizados
  FOR v_org_id IN SELECT id FROM public.organizations LOOP
    -- socio_admin_master (Thiago)
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'socio_admin_master',
      'Sócio Admin Master',
      'Acesso irrestrito a todas as operações, segurança, banco de dados, auditoria e gestão de usuários.'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;

    -- socio_admin (Julienne)
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'socio_admin',
      'Sócio Administrador',
      'Gestão comercial, financeira e operacional executiva. Sem acesso a configurações de banco e segurança.'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;

    -- comercial
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'comercial',
      'Equipe Comercial',
      'Gestão de clientes, contatos, pipeline de vendas, agenda e emissão de orçamentos e pedidos.'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;

    -- financeiro
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'financeiro',
      'Financeiro & Comissões',
      'Gestão de faturamento, liquidação de recebíveis, cálculo de comissões e relatórios financeiros.'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;

    -- leitura
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'leitura',
      'Consulta (Somente Leitura)',
      'Acesso de visualização restrito; bloqueado para criação, edição ou exclusão de registros.'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;

    -- associado (Externo)
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'associado',
      'Associado Externo',
      'Acesso estrito à sua empresa/carteira atribuída e evolução compartilhada pela ILEX.'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;

    -- representada_admin (Fábrica)
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'representada_admin',
      'Representada Admin (Fábrica)',
      'Gestão da sua fábrica atribuída, seus produtos, pedidos, faturamento e comissões devidas.'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;

    -- representada_leitura (Fábrica Consulta)
    INSERT INTO public.roles (organization_id, code, name, description)
    VALUES (
      v_org_id,
      'representada_leitura',
      'Representada Consulta (Fábrica)',
      'Consulta da sua fábrica atribuída, produtos, pedidos e comissões devidas (somente leitura).'
    ) ON CONFLICT (organization_id, code) DO UPDATE 
      SET name = EXCLUDED.name, description = EXCLUDED.description;
  END LOOP;
END $$;

-- ============================================================================
-- 2. MEMBER INVITATIONS TABLE (CONVITES COM SERVICE_ROLE NO SERVIDOR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.member_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    partner_percentage NUMERIC(5,2) DEFAULT 0.00,
    scope_type VARCHAR(50), -- 'manufacturer', 'customer', 'partner'
    scope_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'revoked', 'expired'
    invited_by UUID NOT NULL, -- references auth.users(id)
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. SECURITY DEFINER HELPER FUNCTIONS WITH FIXED SEARCH_PATH
-- ============================================================================

-- Verifica se o usuário atual autenticado é socio_admin_master na sua organização
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

REVOKE ALL ON FUNCTION public.is_current_user_master_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_master_admin(UUID) TO authenticated;

-- Verifica se o usuário possui escopo explícito em uma representada (fábrica)
CREATE OR REPLACE FUNCTION public.user_has_manufacturer_scope(p_org_id UUID, p_manufacturer_id UUID)
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
      AND s.scope_type = 'manufacturer'
      AND s.scope_id = p_manufacturer_id
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_manufacturer_scope(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_manufacturer_scope(UUID, UUID) TO authenticated;

-- Verifica se o usuário possui escopo explícito em um cliente/empresa (associado)
CREATE OR REPLACE FUNCTION public.user_has_customer_scope(p_org_id UUID, p_customer_id UUID)
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

REVOKE ALL ON FUNCTION public.user_has_customer_scope(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_customer_scope(UUID, UUID) TO authenticated;

-- ============================================================================
-- 4. RLS POLICIES FOR INVITATIONS AND MEMBERSHIPS
-- ============================================================================

-- Invitations: Apenas Sócio Admin Master pode consultar, emitir ou revogar convites
DROP POLICY IF EXISTS member_invitations_master_manage ON public.member_invitations;
CREATE POLICY member_invitations_master_manage ON public.member_invitations
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_master_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_master_admin(organization_id)
  );

-- Memberships Update: Nenhum usuário pode alterar seu próprio papel.
-- Apenas Sócio Admin Master pode gerenciar papéis e membros.
DROP POLICY IF EXISTS memberships_admin_update ON public.memberships;
CREATE POLICY memberships_admin_update ON public.memberships
  FOR UPDATE USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_master_admin(organization_id)
    -- Impede que o próprio usuário altere seu próprio papel
    AND user_id <> auth.uid()
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_master_admin(organization_id)
    AND user_id <> auth.uid()
  );

-- Member Scopes: Leitura para o próprio usuário e gestão pelo master
DROP POLICY IF EXISTS member_scopes_read_own ON public.member_scopes;
CREATE POLICY member_scopes_read_own ON public.member_scopes
  FOR SELECT USING (
    organization_id = public.get_current_user_org_id()
    AND (
      user_id = auth.uid()
      OR public.is_current_user_master_admin(organization_id)
    )
  );

DROP POLICY IF EXISTS member_scopes_master_modify ON public.member_scopes;
CREATE POLICY member_scopes_master_modify ON public.member_scopes
  FOR ALL USING (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_master_admin(organization_id)
  ) WITH CHECK (
    organization_id = public.get_current_user_org_id()
    AND public.is_current_user_master_admin(organization_id)
  );

-- ============================================================================
-- 5. REFINEMENT OF MANUFACTURERS & CUSTOMERS RLS WITH STRICT SCOPES
-- ============================================================================

-- Fabricas:
-- Representadas só veem a fábrica vinculada no escopo.
-- Perfis internos veem todas as fábricas da organização.
DROP POLICY IF EXISTS manufacturers_select_tenant ON public.manufacturers;
CREATE POLICY manufacturers_select_tenant ON public.manufacturers
  FOR SELECT USING (
    organization_id = public.get_current_user_org_id()
    AND (
      -- Usuários internos
      public.get_current_user_role() IN ('socio_admin_master', 'socio_admin', 'comercial', 'financeiro', 'leitura')
      -- Representada com escopo restrito na fábrica
      OR (
        public.get_current_user_role() IN ('representada_admin', 'representada_leitura')
        AND public.user_has_manufacturer_scope(organization_id, id)
      )
    )
  );

-- Clientes:
-- Associados só veem seu cliente com escopo atribuído.
-- Representadas só veem clientes que possuem vínculo formal com a sua fábrica.
DROP POLICY IF EXISTS customers_select_tenant ON public.customers;
CREATE POLICY customers_select_tenant ON public.customers
  FOR SELECT USING (
    organization_id = public.get_current_user_org_id()
    AND (
      -- Usuários internos
      public.get_current_user_role() IN ('socio_admin_master', 'socio_admin', 'comercial', 'financeiro', 'leitura')
      -- Associado com escopo explícito
      OR (
        public.get_current_user_role() = 'associado'
        AND public.user_has_customer_scope(organization_id, id)
      )
      -- Representada só enxerga clientes que possuem vínculo com sua fábrica
      OR (
        public.get_current_user_role() IN ('representada_admin', 'representada_leitura')
        AND EXISTS (
          SELECT 1 FROM public.customer_manufacturers cm
          JOIN public.member_scopes ms ON ms.scope_id = cm.manufacturer_id AND ms.scope_type = 'manufacturer'
          WHERE cm.customer_id = customers.id
            AND ms.user_id = auth.uid()
            AND ms.organization_id = customers.organization_id
        )
      )
    )
  );
