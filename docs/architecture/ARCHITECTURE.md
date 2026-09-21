# ILEX CRM — Arquitetura de Software

## 1. Visão Geral
O **ILEX CRM** é projetado especificamente para representação comercial B2B brasileira e assessoria empresarial.
- **Empresa:** ILEX Representação e Assessoria Comercial (São Mateus do Sul/PR)
- **Sócios:** Julienne (50% - Comercial e Vendas de Campo) e Thiago (50% - Gestão, Finanças, Processos e Tecnologia)
- **Fábricas Atuais:** Torralf (comissão no faturamento) e Betel (comissão no recebimento efetivo)
- **Fábricas Planejadas:** Letel e MS
- **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + Lucide Icons + Supabase (PostgreSQL 15+ com RLS e Auth).
- **Publicação:** Frontend exportável para Vercel; Backend mantido no Supabase com migrações em `supabase/migrations/`.

## 2. Isolamento e Segurança (Multi-tenant & RLS)
- Todas as tabelas de domínio possuem `organization_id` obrigatório.
- Row Level Security (RLS) habilitado em todas as tabelas expostas.
- Perfis de acesso configuráveis:
  - `socio_admin`: Acesso irrestrito executivo e gerencial.
  - `comercial`: Acesso a clientes, pedidos, propostas e catálogo de produtos.
  - `financeiro`: Acesso a comissões, faturamentos, conciliação e contas.
  - `parceiro`: Escopo estrito somente a clientes/pedidos explicitamente atribuídos, sem acesso à carteira global ou custos internos.
  - `leitura`: Visualização sem permissão de alteração.

## 3. Modo Demonstração vs. Produção
- Quando as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não estão configuradas, o sistema ativa o **Modo Demonstração Isolado**, devidamente rotulado por banner para garantir total segurança e transparência.
- Ao fornecer as credenciais reais do projeto Supabase, o cliente conecta-se de forma nativa e segura ao PostgreSQL em nuvem.
