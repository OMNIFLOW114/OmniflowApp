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

// ─────────────────────────────────────────────────────────────
// SINGLETON GUARD
// Prevents "Multiple GoTrueClient instances detected" when the
// module is imported from multiple chunks or Fast Refresh re-runs it.
// ─────────────────────────────────────────────────────────────
function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      // PKCE is required for native OAuth. The deep link returns ?code=...
      // which exchangeCodeForSession() trades for a real session.
      flowType: 'pkce',

      // On native, we handle the URL ourselves via @capacitor/app's appUrlOpen.
      // Letting Supabase also auto-parse the URL causes a race and the
      // "session saved but UI stuck on loading" symptom.
      detectSessionInUrl: !isNative,

      // Keep the user signed in across app restarts.
      persistSession: true,

      // Refresh the access token in the background before it expires.
      autoRefreshToken: true,

      // Use a single storage key across the app.
      storageKey: 'omniflow-auth-session',

      debug: false,
    },
  });
}

// Use a global reference so multiple imports never create a second client.
let supabaseInstance = globalThis.__OMNIFLOW_SUPABASE__;

if (!supabaseInstance) {
  supabaseInstance = createSupabaseClient();
  globalThis.__OMNIFLOW_SUPABASE__ = supabaseInstance;
  if (import.meta.env.MODE !== 'production') {
    console.log('[supabase] Client created (singleton)');
  }
} else if (import.meta.env.MODE !== 'production') {
  console.log('[supabase] Reusing existing singleton client');
}

export const supabase = supabaseInstance;