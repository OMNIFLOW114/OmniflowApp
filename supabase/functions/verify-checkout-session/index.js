import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@10.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2022-11-15",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { session_id, plan_name } = await req.json();
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });

    if (session.subscription && session.subscription.status === "active") {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.customer_email)
        .single();

      if (!userData) {
        throw new Error("User not found");
      }

      const { error } = await supabase.from("subscriptions").upsert({
        user_id: userData.id,
        status: "active",
        stripe_sub_id: session.subscription.id,
        plan_name: plan_name || "Unknown",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    }

    return new Response(JSON.stringify({ 
      subscription: session.subscription ? session.subscription.status : null,
      plan_name: plan_name
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});