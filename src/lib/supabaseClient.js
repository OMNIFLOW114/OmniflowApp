// supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kkxgrrcbyluhdfsoywvd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreGdycmNieWx1aGRmc295d3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjgxNTksImV4cCI6MjA2NDM0NDE1OX0.H_zvbQjyp34cwu5Z9spmTb0bA4B_hjRhHA6ns3M-9gs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
