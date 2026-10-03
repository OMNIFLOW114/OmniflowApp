import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.MODE !== 'production') {
  console.log('Supabase Config:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Loaded' : 'Undefined',
    platform: Capacitor.isNativePlatform() ? 'native' : 'web',
  });
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env'
  );
}

const isNative = Capacitor.isNativePlatform();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Web keeps the default (implicit) flow that works today.
    // Native needs PKCE because the deep link returns ?code=...
    flowType: isNative ? 'pkce' : 'implicit',

    // Web: let the SDK auto-parse the URL.
    // Native: we handle the deep link ourselves in App.jsx (below).
    detectSessionInUrl: !isNative,

    persistSession: true,
    autoRefreshToken: true,
  },
});

// Export a helper so App.jsx can know which platform we're on.
export const isNativeApp = () => isNative;