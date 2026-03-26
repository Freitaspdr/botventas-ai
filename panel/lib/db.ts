import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.SUPABASE_URL!;
const supabaseKey  = process.env.SUPABASE_SERVICE_KEY!;

// Cliente con service role key — solo servidor, nunca exponer al cliente
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export default supabase;
