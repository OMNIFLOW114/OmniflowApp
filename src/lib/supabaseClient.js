// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js"

// Pull values from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Safety check: throw helpful error if env vars are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Did you set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env and Vercel dashboard?"
  )
}

// Export a single shared Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
