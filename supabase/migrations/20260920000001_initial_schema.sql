-- ILEX CRM - Initial Database Schema Migration
-- Designed for PostgreSQL 15+ / Supabase
-- Multi-tenant by organization_id with Strict Referential Integrity

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(32), -- CNPJ da ILEX
    city VARCHAR(100) DEFAULT 'São Mateus do Sul',
    state VARCHAR(2) DEFAULT 'PR',
    country VARCHAR(3) DEFAULT 'BRA',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ROLES & MEMBERSHIPS
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS memberships (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL, -- references auth.users(id)
    role_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    partner_percentage NUMERIC(5,2) DEFAULT 0.00, -- 50% Julienne, 50% Thiago
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    role_code VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- read, create, update, delete, approve, export
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, role_code, resource, action)
);

CREATE TABLE IF NOT EXISTS member_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    scope_type VARCHAR(50) NOT NULL, -- 'manufacturer', 'region', 'customer'
    scope_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id, scope_type, scope_id)
);

-- 3. REGIONS & LOCALITIES
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(3) NOT NULL DEFAULT 'BRA',
    state VARCHAR(10),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS region_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(10) NOT NULL,
    country VARCHAR(3) NOT NULL DEFAULT 'BRA',
    postal_code_prefix VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CUSTOMERS (CLIENTES)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    country VARCHAR(3) NOT NULL DEFAULT 'BRA', -- 'BRA', 'PRY', etc.
    person_type VARCHAR(2) NOT NULL DEFAULT 'PJ', -- 'PJ', 'PF'
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document_type VARCHAR(20) NOT NULL DEFAULT 'CNPJ', -- 'CNPJ', 'CPF', 'RUC', 'OTHER'
    document VARCHAR(32), -- Preserves format and letters for alphanumeric CNPJ and RUC
    document_normalized VARCHAR(32), -- Uppercase, alphanumeric only
    state_registration VARCHAR(32), -- Inscrição Estadual
    is_ie_exempt BOOLEAN NOT NULL DEFAULT false,
    city_registration VARCHAR(32),
    icms_taxpayer_type VARCHAR(30) NOT NULL DEFAULT 'taxpayer', -- 'taxpayer', 'exempt', 'non_taxpayer'
    tax_regime VARCHAR(30) DEFAULT 'simples_nacional', -- 'simples_nacional', 'lucro_presumido', 'lucro_real'
    segment VARCHAR(100),
    company_size VARCHAR(50), -- 'MEI', 'ME', 'EPP', 'Médio', 'Grande'
    is_branch BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'incomplete', 'inactive', 'blocked'
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_doc ON customers(organization_id, document_normalized);
CREATE INDEX idx_customers_status ON customers(organization_id, status);

-- 5. CUSTOMER ADDRESSES & CONTACTS
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL DEFAULT 'billing', -- 'billing', 'shipping', 'financial', 'other'
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

CREATE TABLE IF NOT EXISTS customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100), -- 'Comprador', 'Diretor', 'Financeiro', 'Almoxarife'
    email VARCHAR(255),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    preferred_channel VARCHAR(30) DEFAULT 'whatsapp', -- 'whatsapp', 'phone', 'email'
    notes TEXT,
    birth_date DATE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. MANUFACTURERS (FÁBRICAS / REPRESENTADAS)
CREATE TABLE IF NOT EXISTS manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL, -- 'TORRALF', 'BETEL', 'LETEL', 'MS'
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(32),
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'planned', 'inactive'
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    initial_commission_rate NUMERIC(12,8) NOT NULL DEFAULT 0.05000000, -- e.g. 0.05 for 5%
    commission_trigger VARCHAR(50) NOT NULL DEFAULT 'billing', -- 'billing' (Torralf), 'receipt' (Betel), 'contract'
    commission_trigger_description TEXT,
    order_cutoff_day INT, -- dia de fechamento mensal
    payment_terms_summary TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, code)
);

-- 7. CUSTOMER-MANUFACTURER RELATION (REGRAS ESPECÍFICAS DE CLIENTE NA INDÚSTRIA)
CREATE TABLE IF NOT EXISTS customer_manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
    external_code VARCHAR(100), -- Código do cliente dentro do ERP da fábrica
    sales_rep_id UUID, -- Representante/vendedor responsável
    credit_limit NUMERIC(20,6) DEFAULT 0.000000,
    credit_status VARCHAR(50) DEFAULT 'pending_review', -- 'approved', 'blocked', 'pending_review'
    reorder_cycle_days INT DEFAULT 60, -- Ciclo contratado/esperado (60 dias padrão)
    last_order_date DATE,
    next_expected_reorder_date DATE,
    custom_payment_terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, customer_id, manufacturer_id)
);

-- 8. REPRESENTATION CONTRACTS & COMMISSION RULES
CREATE TABLE IF NOT EXISTS representation_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
    contract_number VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    is_exclusive BOOLEAN NOT NULL DEFAULT false,
    base_type VARCHAR(50) NOT NULL DEFAULT 'invoice_net_of_ipi_st', -- Base contratada
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'billing', -- 'billing' or 'receipt'
    payment_delay_days INT DEFAULT 30, -- Dias para repasse após o gatilho
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES representation_contracts(id) ON DELETE CASCADE,
    priority INT NOT NULL DEFAULT 100, -- Menor número = maior prioridade
    family_id UUID,
    product_id UUID,
    region_id UUID,
    customer_id UUID,
    rate NUMERIC(12,8) NOT NULL, -- e.g. 0.05000000
    valid_from DATE,
    valid_to DATE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. PARTNERS (PARCEIROS, EX: PARAGUAI)
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(3) NOT NULL DEFAULT 'PRY',
    document VARCHAR(50),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE RESTRICT,
    base_split_rate NUMERIC(12,8) NOT NULL DEFAULT 0.05000000, -- 5% da base de venda
    gross_commission_rate NUMERIC(12,8) NOT NULL DEFAULT 0.10000000, -- 10% comissão bruta
    trigger_condition VARCHAR(100) DEFAULT 'proportional_to_cleared_commission',
    is_active BOOLEAN NOT NULL DEFAULT false, -- Cenário proposto, não ativado por padrão
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. ADVISORY PLANS & CONTRACTS (ASSESSORIA COMERCIAL)
CREATE TABLE IF NOT EXISTS advisory_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL, -- 'BASIC', 'PRO', 'PREMIUM'
    name VARCHAR(100) NOT NULL,
    monthly_fee NUMERIC(20,6) NOT NULL, -- R$ 2.500, R$ 3.500, R$ 5.000
    variable_commission_rate NUMERIC(12,8) NOT NULL DEFAULT 0.00000000, -- 0%, 3%, 5%
    included_hours INT NOT NULL DEFAULT 10,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS advisory_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES advisory_plans(id) ON DELETE RESTRICT,
    monthly_fee NUMERIC(20,6) NOT NULL,
    variable_rate NUMERIC(12,8) NOT NULL DEFAULT 0.00000000,
    start_date DATE NOT NULL,
    end_date DATE,
    billing_day INT NOT NULL DEFAULT 10,
    status VARCHAR(30) NOT NULL DEFAULT 'proposal', -- 'proposal', 'active', 'suspended', 'cancelled'
    lead_partner_id UUID, -- Thiago ou Julienne
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. AUDIT EVENTS
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    user_id UUID,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'status_change', 'reconcile'
    changes_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
