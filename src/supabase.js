import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.MODE !== "production") {
  console.log("Supabase Config:", {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey ? "Loaded" : "Undefined",
    platform: Capacitor.isNativePlatform() ? "native" : "web",
  });
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase configuration. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env"
  );
}

const isNative = Capacitor.isNativePlatform();

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      // PKCE is REQUIRED for native OAuth deep links, and is preferred on web too.
      // This makes Supabase return ?code=... instead of #access_token=...
      flowType: "pkce",

      // On native we handle the deep link ourselves via appUrlOpen.
      // On web we let Supabase auto-parse the URL (handles both ?code= and #access_token=).
      detectSessionInUrl: !isNative,

      persistSession: true,
      autoRefreshToken: true,

      storageKey: "omniflow-auth-session",

      debug: false,
    },
  });
}

// Singleton guard — prevents "Multiple GoTrueClient instances" warnings.
let supabaseInstance = globalThis.__OMNIFLOW_SUPABASE__;

if (!supabaseInstance) {
  supabaseInstance = createSupabaseClient();
  globalThis.__OMNIFLOW_SUPABASE__ = supabaseInstance;
  if (import.meta.env.MODE !== "production") {
    console.log("[supabase] Client created (singleton)");
  }
} else if (import.meta.env.MODE !== "production") {
  console.log("[supabase] Reusing existing singleton client");
}

export const supabase = supabaseInstance;