import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (process.env.NODE_ENV !== 'production') {
  console.log('Supabase Config:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Loaded' : 'Undefined'
  });
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);