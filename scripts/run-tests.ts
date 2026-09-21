/**
 * Automated Test Suite for ILEX CRM
 * 
 * Verifies:
 * 1. Business Logic & Calculations (Discounts, Reorder dates, Fiscal doc formats).
 * 2. Multi-tenancy & RLS Authorization Logic (Contract tests for roles: admin, partner, assistant).
 * 3. Clear distinction between isolated Mock Mode tests and Real Remote Supabase integration.
 * 
 * Exit code != 0 on failure for automated CI / execution pipelines.
 */

import {
  calculateCompoundDiscount,
  calculateNextReorderDate,
  validateCNPJ,
  validateRUC,
  normalizeDocument,
} from '../src/domain/validation';
import {
  canManageUsersAndSecurity,
  canManageCommercial,
  canManageFinancial,
  canWriteData,
  canViewCostsAndMargins,
  canExportReports,
  isRepresentadaUser,
  isAssociadoUser,
  isExternalUser,
} from '../src/types';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
  isMock: boolean;
}

const results: TestResult[] = [];

function test(suite: string, name: string, condition: boolean, message?: string, isMock = true) {
  results.push({ suite, name, passed: condition, message, isMock });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  const modeTag = isMock ? '[MOCK/CANONICAL]' : '[REAL/REMOTE]';
  console.log(`${symbol} ${modeTag} [${suite}] ${name}`);
  if (!condition && message) {
    console.error(`   Error: ${message}`);
  }
}

// -------------------------------------------------------------
// SUITE 1: CANONICAL BUSINESS CALCULATIONS & VALIDATION (MOCK)
// -------------------------------------------------------------

console.log('\n======================================================');
console.log('--- 1. REGRAS DE CÁLCULO E VALIDAÇÃO FISCAL (MOCK) ---');
console.log('======================================================');

// 1.1 Desconto composto 10% + 5% sobre 100 = 85.50 (Efetivo: 14.5%)
const discount = calculateCompoundDiscount(100, [10, 5]);
test(
  'Cálculos Comerciais',
  'Desconto composto em cascata 10% + 5% sobre R$ 100 = R$ 85,50 (efetivo 14.5%)',
  discount.finalPrice === 85.5 && discount.effectiveDiscountRate === 14.5,
  `Recebido: finalPrice=${discount.finalPrice}, effectiveRate=${discount.effectiveDiscountRate}%`
);

// 1.2 Três níveis de desconto em cascata
const tripleDiscount = calculateCompoundDiscount(1000, [10, 5, 2]);
// 1000 * 0.90 = 900; 900 * 0.95 = 855; 855 * 0.98 = 837.90; efetivo = 16.21%
test(
  'Cálculos Comerciais',
  'Desconto composto em 3 níveis (10% + 5% + 2%) sobre R$ 1.000 = R$ 837,90',
  tripleDiscount.finalPrice === 837.9 && tripleDiscount.effectiveDiscountRate === 16.21,
  `Recebido: finalPrice=${tripleDiscount.finalPrice}, effectiveRate=${tripleDiscount.effectiveDiscountRate}%`
);

// 1.3 Ciclo de Recompra com data informada: 01/09/2026 + 60 dias = 31/10/2026
const nextReorder = calculateNextReorderDate('2026-09-01', 60);
test(
  'Ciclo de Recompra',
  'Projeção de recompra: 01/09/2026 + 60 dias resulta em 31/10/2026',
  nextReorder === '2026-10-31',
  `Recebido: ${nextReorder}`
);

// 1.4 Ciclo de Recompra sem data de pedido: Não inventa data futura
const emptyReorder = calculateNextReorderDate('', 60);
test(
  'Ciclo de Recompra',
  'Sem data de último pedido anterior retorna null (não inventa data)',
  emptyReorder === null,
  `Recebido: ${emptyReorder}`
);

// 1.5 Validação de CNPJ numérico válido conhecido
const cnpjValid = validateCNPJ('11.222.333/0001-81');
test(
  'Validação Cadastral',
  'CNPJ numérico válido é aprovado com formato aceito',
  cnpjValid.valid === true,
  cnpjValid.reason
);

// 1.6 Rejeição de CNPJ inválido
const cnpjInvalid = validateCNPJ('11.222.333/0001-00');
test(
  'Validação Cadastral',
  'CNPJ numérico com dígito verificador incorreto é rejeitado',
  cnpjInvalid.valid === false,
  'Deveria ter sido rejeitado'
);

// 1.7 Normalização de documento alfanumérico preserva caracteres
const normalizedAlnum = normalizeDocument('12.ABC.345/0001-99');
test(
  'Validação Cadastral',
  'Normalização de CNPJ Alfanumérico preserva letras maiúsculas e remove pontuação',
  normalizedAlnum === '12ABC345000199',
  `Recebido: ${normalizedAlnum}`
);

// 1.8 Validação de formato RUC paraguaio
const rucValid = validateRUC('80012345-6');
test(
  'Validação Cadastral',
  'RUC Paraguaio no formato 80012345-6 é validado sem máscara brasileira',
  rucValid.valid === true,
  rucValid.reason
);

// -------------------------------------------------------------
// SUITE 2: MATRIZ DE AUTORIZAÇÃO E RLS MULTI-TENANCY (MOCK/SPEC)
// -------------------------------------------------------------

console.log('\n======================================================');
console.log('--- 2. MATRIZ DE AUTORIZAÇÃO E POLÍTICAS RLS (MOCK) ---');
console.log('======================================================');

/**
 * Simula a verificação das regras RLS definidas em:
 * supabase/migrations/20260921000001_auth_bootstrap_fixes.sql
 */
interface MockSecurityContext {
  userId: string;
  orgId: string;
  role: 'admin' | 'partner' | 'sales_assistant' | 'external_partner' | 'none';
  isActive: boolean;
}

function evaluatePolicy(
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  recordOrgId: string,
  context: MockSecurityContext
): { allowed: boolean; reason: string } {
  // 1. O usuário precisa pertencer à organização do registro
  if (context.orgId !== recordOrgId) {
    return { allowed: false, reason: 'Isolamento multi-tenant: organização divergente' };
  }

  // 2. O usuário precisa ter membership ativo
  if (!context.isActive) {
    return { allowed: false, reason: 'Membership inativo' };
  }

  // 3. Regras por tabela e papel:
  if (table === 'memberships') {
    if (action === 'SELECT') {
      // Qualquer membro ativo da organização pode visualizar os membros
      return { allowed: true, reason: 'Leitura de membros da organização permitida' };
    }
    // Apenas admin pode inserir, atualizar ou remover membros
    if (context.role === 'admin') {
      return { allowed: true, reason: 'Admin possui gestão de membros' };
    }
    return { allowed: false, reason: 'Apenas sócios administradores podem alterar membros' };
  }

  if (table === 'customers' || table === 'manufacturers') {
    if (action === 'SELECT') {
      return { allowed: true, reason: 'Membro ativo pode consultar carteira' };
    }
    // Parceiro externo sem escopo explícito é negado por padrão
    if (context.role === 'external_partner') {
      return { allowed: false, reason: 'Parceiro externo negado por padrão para escrita sem escopo' };
    }
    // Sales assistant: apenas leitura em fabricantes, escrita controlada em clientes
    if (context.role === 'sales_assistant' && table === 'manufacturers') {
      return { allowed: false, reason: 'Assistente possui apenas leitura em fábricas' };
    }
    if (context.role === 'admin' || context.role === 'partner') {
      return { allowed: true, reason: 'Sócio possui permissão de escrita' };
    }
    return { allowed: false, reason: 'Papel sem permissão de escrita' };
  }

  if (table === 'regions' || table === 'region_locations') {
    if (action === 'SELECT') {
      return { allowed: true, reason: 'Leitura de regiões permitida para membros' };
    }
    if (context.role === 'admin') {
      return { allowed: true, reason: 'Apenas admin altera regiões' };
    }
    return { allowed: false, reason: 'Escrita de regiões restrita a admin' };
  }

  // Deny by default para qualquer outra tabela não implementada
  return { allowed: false, reason: 'Deny by default' };
}

// 2.1 Multi-tenant: Isolamento estrito entre organizações
const org1Admin: MockSecurityContext = {
  userId: 'user-1',
  orgId: 'org-1',
  role: 'admin',
  isActive: true,
};
const resDiffOrg = evaluatePolicy('SELECT', 'customers', 'org-2', org1Admin);
test(
  'Políticas RLS & Multi-tenant',
  'Usuário de org-1 não acessa clientes de org-2',
  resDiffOrg.allowed === false,
  resDiffOrg.reason
);

// 2.2 Sócio Administrador pode gerenciar membros
const resAdminManage = evaluatePolicy('INSERT', 'memberships', 'org-1', org1Admin);
test(
  'Políticas RLS & Multi-tenant',
  'Sócio Administrador pode gerenciar memberships',
  resAdminManage.allowed === true,
  resAdminManage.reason
);

// 2.3 Sócio Operacional NÃO pode alterar membros de outros usuários
const org1Partner: MockSecurityContext = {
  userId: 'user-2',
  orgId: 'org-1',
  role: 'partner',
  isActive: true,
};
const resPartnerManage = evaluatePolicy('INSERT', 'memberships', 'org-1', org1Partner);
test(
  'Políticas RLS & Multi-tenant',
  'Sócio Operacional (não-admin) não pode criar ou alterar memberships',
  resPartnerManage.allowed === false,
  resPartnerManage.reason
);

// 2.4 Parceiro externo tem escrita negada por padrão (deny-by-default)
const org1External: MockSecurityContext = {
  userId: 'user-3',
  orgId: 'org-1',
  role: 'external_partner',
  isActive: true,
};
const resExtWrite = evaluatePolicy('INSERT', 'customers', 'org-1', org1External);
test(
  'Políticas RLS & Multi-tenant',
  'Parceiro externo é negado por padrão para escrita de clientes sem escopo',
  resExtWrite.allowed === false,
  resExtWrite.reason
);

// 2.5 Assistente comercial tem escrita negada em fabricantes
const org1Assistant: MockSecurityContext = {
  userId: 'user-4',
  orgId: 'org-1',
  role: 'sales_assistant',
  isActive: true,
};
const resAssistMfr = evaluatePolicy('INSERT', 'manufacturers', 'org-1', org1Assistant);
test(
  'Políticas RLS & Multi-tenant',
  'Assistente comercial não pode alterar regras de fabricantes (somente leitura)',
  resAssistMfr.allowed === false,
  resAssistMfr.reason
);

// 2.6 Membership inativo perde qualquer acesso imediatamente
const org1Inactive: MockSecurityContext = {
  userId: 'user-5',
  orgId: 'org-1',
  role: 'admin',
  isActive: false,
};
const resInactive = evaluatePolicy('SELECT', 'customers', 'org-1', org1Inactive);
test(
  'Políticas RLS & Multi-tenant',
  'Usuário com is_active = false tem acesso negado em consultas',
  resInactive.allowed === false,
  resInactive.reason
);

// 2.7 Validações da Hierarquia de 8 Papéis (RBAC Fase 2)
test(
  'RBAC 8 Papéis',
  'socio_admin_master possui permissão de segurança e gestão de usuários',
  canManageUsersAndSecurity('socio_admin_master') === true
);

test(
  'RBAC 8 Papéis',
  'socio_admin (Julienne) NÃO possui acesso a usuários/segurança de banco',
  canManageUsersAndSecurity('socio_admin') === false
);

test(
  'RBAC 8 Papéis',
  'comercial NÃO pode acessar custos e margens de lucro',
  canViewCostsAndMargins('comercial') === false
);

test(
  'RBAC 8 Papéis',
  'leitura NÃO possui permissão de gravação/edição de dados',
  canWriteData('leitura') === false
);

test(
  'RBAC 8 Papéis',
  'representada_admin e representada_leitura são identificados como usuários de indústria',
  isRepresentadaUser('representada_admin') && isRepresentadaUser('representada_leitura')
);

test(
  'RBAC 8 Papéis',
  'associado é identificado como usuário externo restrito à sua carteira',
  isAssociadoUser('associado') && isExternalUser('associado')
);

// -------------------------------------------------------------
// SUITE 3: INTEGRIDADE DE DADOS REAIS & ESTADO VAZIO
// -------------------------------------------------------------

console.log('\n======================================================');
console.log('--- 3. INTEGRIDADE DE DADOS REAIS & ESTADO VAZIO ---');
console.log('======================================================');

import { INITIAL_ORDERS, INITIAL_CUSTOMERS } from '../src/lib/initialData';

test(
  'Fatos Reais e Zero Estado',
  'INITIAL_ORDERS é estritamente vazio (0 pedidos sintéticos no modo real)',
  INITIAL_ORDERS.length === 0,
  `Recebido: ${INITIAL_ORDERS.length} pedidos em INITIAL_ORDERS`
);

const simulatedVolume = INITIAL_ORDERS.reduce((acc, o) => acc + o.total_amount, 0);
test(
  'Fatos Reais e Zero Estado',
  'Cálculo inicial de faturamento resulta em exatamente R$ 0,00 e 0 pedidos',
  simulatedVolume === 0 && INITIAL_ORDERS.length === 0,
  `Recebido volume: ${simulatedVolume}`
);

const customerOrdersCount = INITIAL_ORDERS.filter(o => o.customer_id).length;
test(
  'Fatos Reais e Zero Estado',
  'Nenhum cliente possui pedidos ou produtos faturados sinteticamente',
  customerOrdersCount === 0,
  `Recebido: ${customerOrdersCount} pedidos vinculados a clientes`
);

// -------------------------------------------------------------
// SUITE 4: DIAGNÓSTICO DE INTEGRAÇÃO REMOTA SUPABASE (REAL/LIVE)
// -------------------------------------------------------------

console.log('\n======================================================');
console.log('--- 4. STATUS DA CONEXÃO REMOTA SUPABASE (REAL/LIVE) --');
console.log('======================================================');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('ℹ️  Credenciais remotas do Supabase não configuradas no ambiente de testes.');
  console.log('   (Os testes canônicos e matriz RLS foram validados em modo isolado).');
} else {
  console.log(`ℹ️  Ambiente configurado com URL: ${supabaseUrl}`);
  console.log('   Diretiva ativa: NÃO executar bootstrap automático ou migrações SQL remotas.');
  console.log('   Conexões e tabelas devem ser auditadas respeitando o banco de dados remoto.');
}

// -------------------------------------------------------------
// SUMMARY & EXIT CODE
// -------------------------------------------------------------

console.log('\n======================================================');
console.log('--- RESUMO DA EXECUÇÃO DA SUITE DE TESTES ---');
console.log('======================================================');

const failedTests = results.filter(r => !r.passed);
const passedTests = results.filter(r => r.passed);

console.log(`Total de testes: ${results.length}`);
console.log(`Sucessos: ${passedTests.length}`);
console.log(`Falhas:   ${failedTests.length}`);

if (failedTests.length > 0) {
  console.error('\n❌ A suite de testes encontrou falhas:');
  failedTests.forEach(f => {
    console.error(`- [${f.suite}] ${f.name}: ${f.message}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ Todos os testes canônicos e de autorização foram aprovados com sucesso!');
  process.exit(0);
}
