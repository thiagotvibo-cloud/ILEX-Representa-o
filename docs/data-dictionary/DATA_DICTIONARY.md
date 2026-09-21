# ILEX CRM — Dicionário de Dados Canônico

### 1. `organizations`
- `id`: UUID (PK)
- `name`: Razão social da empresa ILEX
- `city`, `state`, `country`: São Mateus do Sul, PR, BRA
- `settings`: JSONB para preferências não-estruturais

### 2. `memberships`
- `organization_id`: UUID (FK organizations)
- `user_id`: UUID (FK auth.users)
- `role_code`: socio_admin | comercial | financeiro | parceiro | leitura
- `partner_percentage`: 50.00 para Julienne e 50.00 para Thiago

### 3. `customers`
- `id`: UUID (PK)
- `organization_id`: UUID (FK organizations)
- `country`: BRA, PRY, etc.
- `person_type`: PJ ou PF
- `legal_name`: Razão social
- `trade_name`: Nome fantasia
- `document`: Preservado sem máscara destrutiva (suporta CNPJ numérico, CNPJ alfanumérico RFB e RUC paraguaio)
- `document_normalized`: Versão em maiúsculas sem pontuação para busca
- `is_ie_exempt`: Booleano para isenção de IE
- `icms_taxpayer_type`: taxpayer | exempt | non_taxpayer
- `status`: active | incomplete | inactive | blocked

### 4. `customer_addresses`
- `id`: UUID (PK)
- `customer_id`: UUID (FK customers)
- `type`: billing | shipping | financial | other
- `street`, `number`, `complement`, `district`, `city`, `state`, `country`, `postal_code`

### 5. `customer_contacts`
- `id`: UUID (PK)
- `customer_id`: UUID (FK customers)
- `name`, `role`, `email`, `phone`, `whatsapp`
- `preferred_channel`: whatsapp | phone | email

### 6. `manufacturers`
- `id`: UUID (PK)
- `code`: TORRALF, BETEL, LETEL, MS
- `name`: Nome da indústria
- `initial_commission_rate`: Alíquota percentual base (ex: 0.05000000 para 5%)
- `commission_trigger`: billing (Torralf) | receipt (Betel) | contract
- `order_cutoff_day`: Dia de corte mensal (ex: 25)

### 7. `customer_manufacturers`
- `customer_id` + `manufacturer_id`: Unique constraint
- `external_code`: Código do cliente no ERP da indústria
- `reorder_cycle_days`: Ciclo contratado/esperado (padrão 60 dias)
- `credit_status`: approved | blocked | pending_review
