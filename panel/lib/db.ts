import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }

  client ??= createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  return client;
}

// Lazy server client so Next/Vercel can import route modules during build
// without requiring runtime secrets at module evaluation time.
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const activeClient = getSupabase();
    const value = Reflect.get(activeClient, prop, receiver);
    return typeof value === 'function' ? value.bind(activeClient) : value;
  },
});

export default supabase;
