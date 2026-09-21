import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

const ENV_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  isDemoMode: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const localUrl = localStorage.getItem('ilex_supabase_url');
  const localKey = localStorage.getItem('ilex_supabase_anon_key');
  // CRITICAL: Demo mode is ONLY active if explicitly requested by the user.
  // Never automatically fallback to demo on connection errors or missing configs.
  const explicitDemo = localStorage.getItem('ilex_explicit_demo_mode') === 'true';

  const url = (localUrl || ENV_URL || '').trim();
  const anonKey = (localKey || ENV_ANON || '').trim();
  const isConfigured = Boolean(url && anonKey && !url.includes('your-project-id'));

  return {
    url,
    anonKey,
    isConfigured,
    isDemoMode: explicitDemo,
  };
}

export function setCustomSupabaseCredentials(url: string, anonKey: string) {
  if (url && anonKey) {
    localStorage.setItem('ilex_supabase_url', url.trim());
    localStorage.setItem('ilex_supabase_anon_key', anonKey.trim());
    // Turning on real credentials explicitly turns off demo mode
    localStorage.setItem('ilex_explicit_demo_mode', 'false');
  } else {
    localStorage.removeItem('ilex_supabase_url');
    localStorage.removeItem('ilex_supabase_anon_key');
  }
  // Reset cached client instance
  supabaseInstance = null;
}

export function setExplicitDemoMode(active: boolean) {
  localStorage.setItem('ilex_explicit_demo_mode', active ? 'true' : 'false');
}

let supabaseInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!supabaseInstance || lastUrl !== config.url || lastKey !== config.anonKey) {
    lastUrl = config.url;
    lastKey = config.anonKey;
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseInstance;
}

export interface ConnectionTestResult {
  connected: boolean;
  authenticated: boolean;
  user: User | null;
  session: Session | null;
  organizationFound: boolean;
  orgName?: string;
  errorMessage?: string;
}

/**
 * Performs a real authenticated probe against the Supabase database.
 * Does not fake success and reports actual network/Postgres/Auth errors.
 */
export async function testSupabaseAuthConnection(): Promise<ConnectionTestResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      authenticated: false,
      user: null,
      session: null,
      organizationFound: false,
      errorMessage: 'Credenciais do Supabase (URL / Anon Key) não configuradas.',
    };
  }

  try {
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr) {
      return {
        connected: true,
        authenticated: false,
        user: null,
        session: null,
        organizationFound: false,
        errorMessage: `Erro de Sessão: ${sessionErr.message}`,
      };
    }

    const session = sessionData?.session ?? null;
    const user = session?.user ?? null;

    if (!session || !user) {
      return {
        connected: true,
        authenticated: false,
        user: null,
        session: null,
        organizationFound: false,
        errorMessage: 'Conexão HTTP ativa com Supabase, mas nenhuma sessão autenticada. Efetue login.',
      };
    }

    // Authenticated query test via RLS
    const { data: orgData, error: orgErr } = await client
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (orgErr) {
      return {
        connected: true,
        authenticated: true,
        user,
        session,
        organizationFound: false,
        errorMessage: `Erro de consulta RLS no PostgreSQL: ${orgErr.message}`,
      };
    }

    return {
      connected: true,
      authenticated: true,
      user,
      session,
      organizationFound: (orgData && orgData.length > 0) || false,
      orgName: orgData && orgData[0] ? orgData[0].name : undefined,
    };
  } catch (err: any) {
    return {
      connected: false,
      authenticated: false,
      user: null,
      session: null,
      organizationFound: false,
      errorMessage: err?.message || 'Falha de comunicação de rede com o endpoint Supabase.',
    };
  }
}
