import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDarkMode } from "@/context/DarkModeContext";
import { ToastContainer, toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  FaCrown,
  FaGem,
  FaRocket,
  FaCheck,
  FaStore,
  FaWallet,
  FaArrowLeft,
  FaBolt,
} from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import "./Premium.css";

const Spinner = ({ size = 20 }) => (
  <svg
    className="premium-spinner"
    width={size}
    height={size}
    viewBox="0 0 50 50"
    aria-hidden
  >
    <circle
      cx="25"
      cy="25"
      r="20"
      stroke="currentColor"
      strokeWidth="5"
      fill="none"
    />
  </svg>
);

const plans = [
  {
    name: "Basic",
    price: 200,
    displayPrice: "KSH 200",
    per: "/month",
    tagline: "Everything you need to start selling",
    icon: <FaStore />,
    accent: "basic",
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
    displayPrice: "KSH 500",
    per: "/month",
    tagline: "For growing sellers who want more reach",
    icon: <FaRocket />,
    accent: "pro",
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
    displayPrice: "KSH 1000",
    per: "/month",
    tagline: "Unlimited power for serious businesses",
    icon: <FaGem />,
    accent: "elite",
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

const FREE_STORE_LIMIT = 1000;

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
    if (!user?.id) {
      supabase.auth
        .getSession()
        .then(({ data: { session }, error }) => {
          if (error) {
            console.error("Session fetch error:", error);
            toast.error("Please log in to access premium features.");
            setLoading(false);
            return;
          }
          if (!session?.user?.id) {
            setLoading(false);
            return;
          }
          fetchStatus(session.user.id);
        });
      return;
    }
    fetchStatus(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (subError) throw subError;

      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (walletError && walletError.code !== "PGRST116") throw walletError;

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
      if (walletBalance < plan.price) {
        toast.error("Insufficient wallet balance. Please top up your wallet.");
        return;
      }

      const { error: transactionError } = await supabase.rpc(
        "subscribe_with_wallet",
        {
          p_user_id: user.id,
          p_plan_name: plan.name,
          p_amount: plan.price,
        }
      );

      if (transactionError) throw new Error(transactionError.message);

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

  const freeSlotsLeft = Math.max(0, FREE_STORE_LIMIT - totalStores);
  const isFreeTier = totalStores < FREE_STORE_LIMIT;

  const handlePlanAction = (plan) => {
    if (isFreeTier) {
      navigate("/store/create");
    } else {
      handleSubscribe(plan);
    }
  };

  if (loading) {
    return (
      <div className={`premium-page ${darkMode ? "dark" : "light"}`}>
        <div className="premium-loading">
          <Spinner size={44} />
          <p>Checking your seller status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`premium-page ${darkMode ? "dark" : "light"}`}>
      {/* Header */}
      <header className="premium-header">
        <motion.button
          className="premium-back"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Go back"
        >
          <FaArrowLeft size={14} />
        </motion.button>

        <div className="premium-header-text">
          <h1 className="premium-title">
            {isPremium ? "You're a Seller" : "Become a Seller"}
          </h1>
          <p className="premium-subtitle">
            {isFreeTier
              ? `🎉 Free store creation open — ${freeSlotsLeft} slot${
                  freeSlotsLeft === 1 ? "" : "s"
                } left!`
              : "Choose a plan that fits your hustle"}
          </p>
        </div>

        <div className="premium-header-spacer" aria-hidden />
      </header>

      {/* Wallet pill */}
      {walletBalance !== null && (
        <motion.div
          className="premium-wallet-pill"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FaWallet size={14} />
          <span>
            Wallet:{" "}
            <strong>KSH {Number(walletBalance).toLocaleString("en-KE")}</strong>
          </span>
        </motion.div>
      )}

      {/* Plans */}
      <div className="premium-plans-grid">
        {plans.map((plan, index) => {
          const isThisSubmitting = submitting === plan.name;
          const canAfford = walletBalance >= plan.price;
          const disabled = isThisSubmitting || (!isFreeTier && !canAfford);

          return (
            <motion.div
              key={plan.name}
              className={`premium-card ${plan.accent} ${
                plan.accent === "pro" ? "featured" : ""
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              whileHover={{ y: -4 }}
            >
              {plan.accent === "pro" && (
                <span className="premium-ribbon">Most Popular</span>
              )}
              {plan.accent === "elite" && (
                <span className="premium-ribbon elite-ribbon">Best Value</span>
              )}

              <div className={`premium-card-icon ${plan.accent}`}>
                {plan.icon}
              </div>

              <h3 className="premium-card-title">{plan.name}</h3>
              <p className="premium-card-tagline">{plan.tagline}</p>

              <div className="premium-card-price">
                <span className="premium-price-value">{plan.displayPrice}</span>
                <span className="premium-price-per">{plan.per}</span>
              </div>

              <ul className="premium-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <span className="premium-feature-check">
                      <FaCheck size={10} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                className="premium-action-btn"
                onClick={() => handlePlanAction(plan)}
                disabled={disabled}
                whileHover={!disabled ? { scale: 1.02 } : {}}
                whileTap={!disabled ? { scale: 0.98 } : {}}
              >
                {isThisSubmitting ? (
                  <>
                    <Spinner size={16} />
                    <span>Processing...</span>
                  </>
                ) : isFreeTier ? (
                  <>
                    <FaBolt size={12} />
                    <span>Create Free Store</span>
                  </>
                ) : !canAfford ? (
                  <>
                    <FaWallet size={12} />
                    <span>Top up wallet</span>
                  </>
                ) : (
                  <>
                    <FaCrown size={12} />
                    <span>Subscribe to {plan.name}</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="premium-footer-note">
        {isFreeTier
          ? "Free stores are limited. Once the offer ends, premium plans unlock unlimited access."
          : "Cancel anytime. Your subscription renews monthly from your OmniPay wallet."}
      </p>

      <ToastContainer position="bottom-center" />
    </div>
  );
};

export default Premium;