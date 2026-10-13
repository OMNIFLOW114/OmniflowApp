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
    flowType: isNative ? 'pkce' : 'implicit',
    detectSessionInUrl: !isNative,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isNativeApp = () => isNative;

// ================================================================
// PKCE VERIFIER CAPTURE
//
// Supabase writes the PKCE verifier to a key it derives internally.
// On native (Android WebView, Transsion especially) that write can
// land in a different storage bucket than the read, causing
// "bad_code_verifier" on the /auth/v1/token call.
//
// Solution: right after signInWithOAuth starts, we read whatever
// verifier Supabase wrote (from any candidate key) and stash it
// under OUR OWN key. The deep-link handler then reads it from
// OUR key so the read is deterministic.
// ================================================================
export const OUR_VERIFIER_KEY = '__omniflow_pkce_verifier__';

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

// Candidate keys Supabase might use depending on version/flags
const SUPABASE_VERIFIER_KEYS = [
  `sb-${projectRef}-auth-token-code-verifier`,
  `sb-${projectRef}-pkce-code-verifier`,
  `supabase.auth.token-code-verifier`,
  `${projectRef}-auth-token-code-verifier`,
];

export function captureSupabasePkceVerifier() {
  try {
    for (const k of SUPABASE_VERIFIER_KEYS) {
      const v = localStorage.getItem(k);
      if (v) {
        // Supabase stores it possibly JSON-wrapped; unwrap if needed
        let verifier = v;
        try {
          const parsed = JSON.parse(v);
          if (typeof parsed === 'string') verifier = parsed;
        } catch {
          /* keep as-is */
        }
        if (verifier && typeof verifier === 'string' && verifier.length > 20) {
          localStorage.setItem(OUR_VERIFIER_KEY, verifier);
          if (import.meta.env.MODE !== 'production') {
            console.log('[supabase] captured PKCE verifier from', k);
          }
          return verifier;
        }
      }
    }
    // Fallback: dump all sb- keys so we can see what Supabase wrote
    const dump = {};
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('sb-') || k.includes('verifier')) {
        dump[k] = (localStorage.getItem(k) || '').slice(0, 40);
      }
    }
    if (import.meta.env.MODE !== 'production') {
      console.warn('[supabase] could not capture PKCE verifier. Available keys:', dump);
    }
  } catch (err) {
    console.error('[supabase] captureSupabasePkceVerifier error:', err);
  }
  return null;
}

export function readOurPkceVerifier() {
  try {
    return localStorage.getItem(OUR_VERIFIER_KEY);
  } catch {
    return null;
  }
}

export function clearOurPkceVerifier() {
  try {
    localStorage.removeItem(OUR_VERIFIER_KEY);
  } catch {
    /* ignore */
  }
}