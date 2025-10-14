import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { ToastContainer, toast } from "react-toastify";
import { FiLoader } from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";
import "./Premium.css";

const Spinner = ({ size = 24 }) => (
  <svg
    className="cs-spinner"
    width={size}
    height={size}
    viewBox="0 0 50 50"
    aria-hidden
  >
    <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" />
  </svg>
);

const plans = [
  {
    name: "Basic",
    price: 200, // KSH, for wallet deduction
    displayPrice: "KSH 200 / month",
    features: [
      "Create 1 store",
      "List up to 50 products",
      "Basic seller dashboard",
      "Standard customer support",
    ],
  },
  {
    name: "Pro",
    price: 500,
    displayPrice: "KSH 500 / month",
    features: [
      "Create up to 3 stores",
      "List up to 200 products",
      "Advanced analytics dashboard",
      "Priority customer support",
      "1 monthly promotional feature",
    ],
  },
  {
    name: "Elite",
    price: 1000,
    displayPrice: "KSH 1000 / month",
    features: [
      "Unlimited stores",
      "Unlimited product listings",
      "Premium analytics & insights",
      "24/7 dedicated support",
      "Weekly promotional features",
      "Exclusive badge on stores",
    ],
  },
];

const Premium = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [totalStores, setTotalStores] = useState(0);
  const [submitting, setSubmitting] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    console.log("User object:", user);
    if (!user?.id) {
      console.log("No user ID, checking Supabase session");
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error("Session fetch error:", error);
          toast.error("Please log in to access premium features.");
          setLoading(false);
          return;
        }
        if (!session?.user?.id) {
          console.log("No session user, setting loading false");
          setLoading(false);
          return;
        }
        fetchStatus(session.user.id);
      });
      return;
    }
    fetchStatus(user.id);
  }, [user]);

  const fetchStatus = async (userId) => {
    setLoading(true);
    try {
      const { count, error: storeError } = await supabase
        .from("stores")
        .select("*", { count: "exact", head: true });
      if (storeError) throw storeError;

      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("id, status, plan_name")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (subError) {
        console.error("Subscription fetch error:", subError);
        throw subError;
      }

      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (walletError && walletError.code !== "PGRST116") { // PGRST116: no rows found
        console.error("Wallet fetch error:", walletError);
        throw walletError;
      }

      console.log("Subscription data:", subscription);
      console.log("Wallet balance:", wallet?.balance);
      setTotalStores(count || 0);
      setIsPremium(!!subscription);
      setWalletBalance(wallet?.balance ?? 0);
    } catch (err) {
      console.error("fetchStatus error:", err.message);
      toast.error("Failed to load status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!user) {
      toast.info("Please log in to subscribe.");
      return;
    }
    setSubmitting(plan.name);
    try {
      // Check wallet balance
      if (walletBalance < plan.price) {
        toast.error("Insufficient wallet balance. Please top up your wallet.");
        return;
      }

      // Deduct balance and create subscription
      const { error: transactionError } = await supabase.rpc("subscribe_with_wallet", {
        p_user_id: user.id,
        p_plan_name: plan.name,
        p_amount: plan.price,
      });
      if (transactionError) {
        console.error("Transaction error:", transactionError);
        throw new Error(`Transaction failed: ${transactionError.message}`);
      }

      console.log(`Subscribed to ${plan.name} using wallet`);
      toast.success(`Successfully subscribed to ${plan.name}!`);
      setWalletBalance((prev) => prev - plan.price);
      setIsPremium(true);
      navigate("/store/create");
    } catch (err) {
      console.error("handleSubscribe error:", err);
      toast.error(`Failed to subscribe to ${plan.name}: ${err.message}`);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className={`premium-page ${darkMode ? "dark" : "light"}`}>
        <div className="cs-container cs-center">
          <Spinner size={40} />
          <div className="cs-loading-text">Checking status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`premium-page ${darkMode ? "dark" : "light"}`}>
      <div className="cs-container">
        <h2 className="cs-title">Become a Premium Seller</h2>
        {walletBalance !== null && (
          <p className="cs-wallet-balance">
            Wallet Balance: KSH {walletBalance.toFixed(2)}
          </p>
        )}
        {totalStores < 1000 ? (
          <p className="cs-offer-text">
            Limited Offer: Free store creation for the first 1000 stores! ({6 - totalStores} slots left)
          </p>
        ) : (
          <p className="cs-offer-text">
            The free store creation offer has ended. Choose a premium plan to create your store.
          </p>
        )}
        <div className="premium-plans-grid">
          {plans.map((plan) => (
            <div key={plan.name} className={`premium-card ${plan.name.toLowerCase()}`}>
              <h3>{plan.name} Plan</h3>
              <p className="premium-price">{plan.displayPrice}</p>
              <ul className="premium-features">
                {plan.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              <button
                className="cs-btn cs-btn-primary"
                onClick={
                  totalStores < 1000
                    ? () => {
                        console.log("Navigating to /store/create for", plan.name);
                        navigate("/store/create");
                      }
                    : () => {
                        console.log("Starting subscription for", plan.name);
                        handleSubscribe(plan);
                      }
                }
                disabled={submitting === plan.name || (totalStores >= 1000 && walletBalance < plan.price)}
                style={{ cursor: submitting === plan.name || (totalStores >= 1000 && walletBalance < plan.price) ? "not-allowed" : "pointer" }}
              >
                {submitting === plan.name ? (
                  <>
                    <Spinner size={18} /> Processing...
                  </>
                ) : totalStores < 1000 ? (
                  "Create Free Store"
                ) : (
                  `Subscribe to ${plan.name}`
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
      <ToastContainer position="bottom-center" />
    </div>
  );
};

export default Premium;