# ILEX CRM — Especificação Master e Lista de Aceite

Sistema Integrado de Representação e Assessoria Comercial B2B.
Empresa: ILEX Representação e Assessoria Comercial (São Mateus do Sul/PR).
Sócios: Julienne (Comercial / Vendas de Campo) e Thiago (Gestão / Finanças / Processos / Tecnologia).

---

## Critérios de Aceite das 6 Etapas

### [x] Etapa 1: Fundação
- [x] Arquitetura e repositório estruturados com TypeScript estrito, Vite, Tailwind CSS v4, Lucide e React Router.
- [x] Migrações SQL completas para Supabase (PostgreSQL) com RLS, multi-tenant por `organization_id`, triggers e idempotência.
- [x] Identidade visual oficial ILEX: Verde Floresta (#3E4A32), Dourado (#A78A63), Preto (#1C1A17), Neutros claros e Montserrat.
- [x] Navegação responsiva: Sidebar retrátil em Desktop com busca e Novo Pedido; Bottom Bar no Mobile (Início, Clientes, Pedidos, Agenda, Mais).
- [x] Sistema de Autenticação e Perfis (Sócio Administrador, Comercial, Financeiro, Parceiro, Leitura) com controle de escopo.
- [x] Módulo completo de Clientes:
  - Identificação: CNPJ numérico ou alfanumérico vigente da RFB, RUC estrangeiro (Paraguai), razão social, fantasia, IE/condição de contribuinte, matriz/filial, segmento.
  - Endereços múltiplos tipados (Faturamento, Entrega, Cobrança).
  - Contatos múltiplos sem limite com canal preferencial e WhatsApp.
  - Vínculos comerciais por fábrica (código na indústria, limite de crédito informado, prazo, tabela de preço, ciclo esperado).
  - Dados fiscais contextuais (contribuinte ICMS, IE isento, regime tributário informado).
  - Histórico e documentos.
  - Clientes conhecidos inicializados com cadastro incompleto: Tambasa (compradora Betel), Paragominas, Condutec, Engepar, Manhattam.
- [x] Módulo completo de Fábricas / Representadas:
  - Torralf (Atual, comissão 5% no faturamento).
  - Betel (Atual, comissão 5% proporcional ao recebimento da fábrica).
  - Letel (Planejada, pendente de parametrização contratual).
  - MS (Planejada, pendente de parametrização contratual).
  - Cadastro e edição com regras de comissão, territórios e contatos de fábrica.
- [x] Detecção e configuração de Supabase com modo de conexão segura ou Modo Demonstração isolado e explicitamente rotulado.
- [x] Testes unitários dos validadores (CNPJ numérico, CNPJ alfanumérico, RUC, descontos compostos e isolamento de tenant).

---

### [ ] Etapa 2: Venda (Próxima)
- [ ] Catálogo de produtos por fábrica com SKU único por indústria, NCM, CEST, múltiplos de embalagem e unidade.
- [ ] Tabelas de preços versionadas com moeda e precisão de 6 casas decimais.
- [ ] Políticas comerciais com cálculo de desconto composto (ex: 10% + 5% = 14,5% efetivo).
- [ ] Carrinho e orçamentos com autosave, separação de pedidos filhos por fábrica e geração de PDF profissional.

---

### [ ] Etapa 3: Relacionamento
- [ ] Funil Kanban de Representação (Lead, Qualificação, Cotação, Negociação, Ganho, Perdido) e Assessoria (Diagnóstico, Proposta, Negociação, Contratado, Perdido).
- [ ] Agenda de atividades (ligação, WhatsApp, e-mail, visita, reunião, cobrança, pós-venda).
- [ ] Gestão de recorrência e recompra baseada em ciclo real e cálculo de mediana.
- [ ] Gestão de regiões geográficas e localidades.

---

### [ ] Etapa 4: Receita
- [ ] Faturamento da indústria com itens faturados parcialmente e chaves de NF-e.
- [ ] Motor de conciliação de comissões:
  - Torralf: elegível com o faturamento.
  - Betel: liberada proporcionalmente a cada liquidação de parcela da indústria.
- [ ] Repasses a parceiros (ex: Paraguai com 5% da base de venda).
- [ ] Títulos canônicos a receber e liquidação financeira idempotente.

---

### [ ] Etapa 5: Gestão
- [ ] Planos de assessoria (Básico R$ 2.500, Profissional R$ 3.500 + 3%, Premium R$ 5.000 + 5%).
- [ ] Contas a pagar/receber, conciliação e centros de resultado.
- [ ] Fluxo de caixa de 13 semanas e 12 meses.
- [ ] Projeção e retiradas dos sócios (meta líquida de R$ 3.000 para Julienne e Thiago com controle de INSS/IRRF).
- [ ] Exportação contábil tipada.

---

### [ ] Etapa 6: Validação Final
- [ ] Motor tributário completo (IPI, ICMS próprio informativo, ICMS-ST, DIFAL, FCP).
- [ ] Armazenamento offline de rascunhos em IndexedDB com ressincronização idempotente.
- [ ] Suporte PWA com manifest e service worker de fallback.
- [ ] Validações de segurança, auditoria e pacote pronto para Vercel + Supabase.
