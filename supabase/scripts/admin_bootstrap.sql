-- ============================================================================
-- ILEX CRM - Administrative Bootstrap Script (Admin Only)
-- DO NOT RUN VIA CLIENT UI / BROWSER
-- This script must be executed by a database administrator via Supabase SQL Editor
-- or supabase db execute.
--
-- SECURITY CONSTRAINTS:
-- 1. Explicitly checks that the target user exists in auth.users by UUID.
-- 2. No email fallback or self-service takeover by arbitrary authenticated users.
-- 3. Sets up initial Organization 'ILEX Representação e Assessoria Comercial'.
-- 4. Creates primary socio_admin membership with 50% quota.
-- ============================================================================

DO $$
DECLARE
  -- CONFIGURE THE EXACT AUTH.USERS UUID OF THE INITIAL FOUNDING PARTNER:
  -- Run: SELECT id, email FROM auth.users; to obtain the exact UUID.
  v_admin_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- <-- REPLACE WITH REAL AUTH.USERS UUID
  
  v_org_id UUID;
  v_user_email TEXT;
BEGIN
  -- 1. Validate that the target UUID exists in auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_admin_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'ERRO DE SEGURANÇA: O UUID % não existe em auth.users. Crie o usuário primeiro pelo painel Supabase Auth antes de executar o bootstrap.', v_admin_user_id;
  END IF;

  -- 2. Check if an organization already exists
  SELECT id INTO v_org_id FROM public.organizations LIMIT 1;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (
      name,
      trade_name,
      city,
      state,
      country
    ) VALUES (
      'ILEX Representação e Assessoria Comercial',
      'ILEX Comercial',
      'São Mateus do Sul',
      'PR',
      'BRA'
    ) RETURNING id INTO v_org_id;
    
    RAISE NOTICE 'Organização ILEX criada com ID: %', v_org_id;
  ELSE
    RAISE NOTICE 'Utilizando organização existente com ID: %', v_org_id;
  END IF;

  -- 3. Seed canonical roles for this organization if missing
  INSERT INTO public.roles (organization_id, code, name, description)
  VALUES 
    (v_org_id, 'socio_admin_master', 'Sócio Admin Master', 'Acesso irrestrito a todas as operações, segurança, banco de dados, auditoria e gestão de usuários.'),
    (v_org_id, 'socio_admin', 'Sócio Administrador', 'Gestão comercial, financeira e operacional executiva. Sem acesso a configurações de banco e segurança.'),
    (v_org_id, 'comercial', 'Equipe Comercial', 'Gestão de clientes, contatos, pipeline de vendas, agenda e emissão de orçamentos e pedidos.'),
    (v_org_id, 'financeiro', 'Financeiro & Comissões', 'Gestão de faturamento, liquidação de recebíveis, cálculo de comissões e relatórios financeiros.'),
    (v_org_id, 'leitura', 'Consulta (Somente Leitura)', 'Acesso de visualização restrito; bloqueado para criação, edição ou exclusão de registros.'),
    (v_org_id, 'associado', 'Associado Comercial', 'Acesso restrito estritamente à sua carteira de clientes vinculada.'),
    (v_org_id, 'representada_admin', 'Representada (Gestão Indústria)', 'Acesso restrito aos pedidos, regras de comissão e clientes da sua própria fábrica.'),
    (v_org_id, 'representada_leitura', 'Representada (Consulta Indústria)', 'Acesso somente leitura aos pedidos e relatórios da sua fábrica.')
  ON CONFLICT (organization_id, code) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description;

  -- 4. Create or update the socio_admin_master membership for the verified UUID
  INSERT INTO public.memberships (
    organization_id,
    user_id,
    role_code,
    full_name,
    email,
    partner_percentage,
    is_active
  ) VALUES (
    v_org_id,
    v_admin_user_id,
    'socio_admin_master',
    'Thiago',
    v_user_email,
    50.0,
    true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role_code = 'socio_admin_master',
      is_active = true,
      partner_percentage = 50.0;

  RAISE NOTICE 'Sócio Admin Master (%) vinculado com sucesso à organização % com 50%%.', v_user_email, v_org_id;
END $$;
