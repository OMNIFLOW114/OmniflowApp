import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaBox,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaClock,
  FaStore,
  FaShippingFast,
  FaTruck,
  FaStar,
  FaWallet,
  FaKey,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "./BuyerOrders.css";

const BuyerOrders = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("all"); // all | installments | completed
  const [orders, setOrders] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // OTP modal state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpOrderId, setOtpOrderId] = useState(null);
  const [submittingOtp, setSubmittingOtp] = useState(false);

  // payment / escrow flags
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [releasingEscrowOrderId, setReleasingEscrowOrderId] = useState(null);

  // --- helpers ---
  const isUuid = (v) =>
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    );

  const showError = (err, fallback = "Something went wrong") => {
    const msg = err?.message || err?.hint || err?.details || fallback;
    toast.error(msg);
    console.error("[Error]", err);
  };

  // ---- Fetchers ----
  async function fetchWallet() {
    if (!user?.id) return 0;
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return 0;
    const balance = Number(data?.balance || 0);
    setWalletBalance(balance);
    return balance;
  }

  async function fetchOrders() {
    if (!user?.id) return [];
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(
        "*, product:products!orders_product_id_fkey(id, name, image_gallery, store_id, category, commission_rate)"
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      showError(error, "Failed to load orders");
      return [];
    }

    const storeIds = [
      ...new Set(ordersData.map((o) => o.product?.store_id).filter(Boolean)),
    ];

    let storesData = [];
    if (storeIds.length) {
      const { data, error: storesError } = await supabase
        .from("stores")
        .select("id, name, location")
        .in("id", storeIds);
      if (!storesError) storesData = data || [];
    }

    const enriched = (ordersData || []).map((o) => {
      const store = storesData?.find((s) => s.id === o.product?.store_id);
      return { ...o, store };
    });

    setOrders(enriched);
    return enriched;
  }

  async function fetchInstallments() {
    if (!user?.id) return [];
    const { data, error } = await supabase
      .from("installment_orders")
      .select(
        `
        *,
        products:product_id (id, name, image_gallery),
        seller:seller_id (id, full_name, email)
      `
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      showError(error, "Failed to load installment plans");
      return [];
    }
    setInstallments(data || []);
    return data || [];
  }

  async function refreshAll() {
    await Promise.all([fetchOrders(), fetchInstallments(), fetchWallet()]);
  }

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    refreshAll().finally(() => setLoading(false));
  }, [user]);

  // ---- Progress UI helpers ----
  const steps = [
    { label: "Pending", icon: <FaClock /> },
    { label: "Processing", icon: <FaBox /> },
    { label: "Shipped", icon: <FaShippingFast /> },
    { label: "Out for Delivery", icon: <FaTruck /> },
    { label: "Delivered", icon: <FaCheckCircle /> },
    { label: "Completed", icon: <FaCheckCircle /> },
  ];

  const getStatusStep = (status) => {
    if (!status) return -1;
    const normalized = status.toLowerCase().replace(/ /g, "_");
    return steps.findIndex(
      (step) => step.label.toLowerCase().replace(/ /g, "_") === normalized
    );
  };

  const renderProgressBar = (status, delivered, completed) => {
    let idx = getStatusStep(status);
    if (completed) idx = steps.length - 1;
    else if (delivered) idx = steps.findIndex((s) => s.label === "Delivered");

    return (
      <div className="order-progress-bar">
        {steps.map((step, i) => (
          <div key={i} className={`step ${i <= idx ? "active" : ""}`}>
            <div className="dot">{step.icon}</div>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    );
  };

  // ---- Rating ----
  async function handleSubmitRating(orderId, rating) {
    const numeric = Number(rating);
    if (!isUuid(String(orderId))) return;
    if (isNaN(numeric)) return;

    const { error } = await supabase
      .from("orders")
      .update({ rating: numeric, rating_submitted: true })
      .eq("id", orderId);

    if (error) {
      showError(error, "Failed to submit rating.");
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, rating: numeric, rating_submitted: true } : o
      )
    );
    toast.success("Rating submitted.");
  }

  // ---- OTP Delivery Confirmation ----
  // We DO NOT generate OTP on client anymore. It’s created server-side in create_order_with_deposit.
  function openOtpModal(order) {
    if (!order?.id) return;
    if (!order.delivery_otp) {
      toast.error("OTP not available yet for this order.");
      return;
    }
    setOtpValue(order.delivery_otp); // displaying it per your flow
    setOtpOrderId(order.id);
    setOtpOpen(true);
  }

  async function submitOtp() {
    if (!otpOrderId || !otpValue || otpValue.length !== 6) {
      toast.error("Invalid OTP.");
      return;
    }

    setSubmittingOtp(true);
    try {
      // Call SECURITY DEFINER RPC so RLS won't block non-admin users.
      const { data, error } = await supabase.rpc("mark_order_delivered", {
        p_order: otpOrderId,
        p_otp: otpValue,
      });
      if (error) throw error;

      await fetchOrders();
      toast.success("Delivery confirmed.");
      setOtpOpen(false);
      setOtpOrderId(null);
      setOtpValue("");
    } catch (err) {
      showError(err, "Failed to confirm delivery.");
    } finally {
      setSubmittingOtp(false);
    }
  }

  // ---- Escrow release (auto after pay + delivered) ----
  async function tryReleaseEscrow(order) {
    if (!order?.id) return;
    if (order.escrow_released) return;
    if (!order.delivered || !order.balance_paid) return;

    setReleasingEscrowOrderId(order.id);
    try {
      const { data, error } = await supabase.rpc("release_escrow_to_seller", {
        p_order: order.id,
      });
      if (error) {
        console.warn("Escrow release attempt failed:", error);
      } else {
        toast.success("Escrow released to seller.");
        await fetchOrders();
      }
    } catch (err) {
      console.warn("Escrow release error:", err);
    } finally {
      setReleasingEscrowOrderId(null);
    }
  }

  // ---- Pay Remaining Balance ----
  async function handlePayRemaining(order) {
    if (!order?.id || !user?.id) return;
    const amountToPay = Number(order.balance_due || 0);
    if (!amountToPay) {
      toast.error("No balance due.");
      return;
    }
    if (walletBalance < amountToPay) {
      toast.error("Insufficient wallet balance.");
      return;
    }

    setPayingOrderId(order.id);
    try {
      const { data, error } = await supabase.rpc("pay_remaining_balance", {
        p_order: order.id,
        p_buyer: user.id,
      });
      if (error) throw error;

      await fetchWallet();
      const updated = await fetchOrders();

      // After paying, if already delivered, auto-attempt escrow release.
      const fresh = updated.find((o) => o.id === order.id);
      if (fresh && fresh.delivered && fresh.balance_paid && !fresh.escrow_released) {
        tryReleaseEscrow(fresh);
      }

      toast.success("Remaining balance paid successfully.");
    } catch (err) {
      showError(err, "Failed to pay remaining balance.");
    } finally {
      setPayingOrderId(null);
    }
  }

  // All tab excludes completed (completed lives in Completed tab)
  const activeOrders = useMemo(
    () => orders.filter((o) => !(o.status === "completed" || o.escrow_released)),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "completed" || o.escrow_released),
    [orders]
  );

  if (loading) return <div className="loading">Loading your orders…</div>;

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h2 className="orders-title">My Orders</h2>
        <div className="wallet-chip">
          <FaWallet /> Wallet:{" "}
          <strong>OMC {Number(walletBalance).toLocaleString()}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={tab === "all" ? "active" : ""}
          onClick={() => setTab("all")}
        >
          All Orders
        </button>
        <button
          className={tab === "installments" ? "active" : ""}
          onClick={() => setTab("installments")}
        >
          Lipa Mdogo Mdogo
        </button>
        <button
          className={tab === "completed" ? "active" : ""}
          onClick={() => setTab("completed")}
        >
          Completed
        </button>
      </div>

      {/* Orders Tab */}
      {tab === "all" && (
        <div className="order-list">
          {activeOrders.length === 0 ? (
            <div className="no-orders">No purchases yet.</div>
          ) : (
            activeOrders.map((order) => {
              const sellerSaysDelivered =
                (order.status || "").toLowerCase() === "delivered";
              const buyerConfirmed = !!order.delivered;
              const isCompleted =
                order.status === "completed" || !!order.escrow_released;

              const canConfirmDelivery = sellerSaysDelivered && !buyerConfirmed;
              const canPayRemaining =
                Number(order.balance_due || 0) > 0 &&
                buyerConfirmed &&
                !order.balance_paid;

              return (
                <div className="order-card-glass" key={order.id}>
                  <img
                    src={
                      order.product?.image_gallery?.[0] || "/placeholder.png"
                    }
                    alt={order.product?.name}
                    className="order-product-image"
                  />
                  <div className="order-info">
                    <h3 className="product-title">{order.product?.name}</h3>

                    {renderProgressBar(order.status, buyerConfirmed, isCompleted)}

                    <p>
                      <FaClock className="icon" /> <strong>Ordered:</strong>{" "}
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    <p>
                      <FaMapMarkerAlt className="icon" />{" "}
                      <strong>Delivery:</strong> {order.delivery_location}
                    </p>
                    <p className="store">
                      <FaStore className="icon" /> <strong>From:</strong>{" "}
                      {order.store?.name || "Unknown Store"} (
                      {order.store?.location || "N/A"})
                    </p>

                    <div className="money-row">
                      <span>Deposit:</span>
                      <strong>
                        OMC {Number(order.deposit_amount || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="money-row">
                      <span>Balance Due:</span>
                      <strong>
                        OMC {Number(order.balance_due || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="money-row">
                      <span>Total:</span>
                      <strong>
                        OMC {Number(order.total_price || 0).toLocaleString()}
                      </strong>
                    </div>

                    <div className="actions">
                      {canConfirmDelivery && (
                        <button
                          className="otp-btn"
                          onClick={() => openOtpModal(order)}
                        >
                          <FaKey /> View & Confirm Delivery OTP
                        </button>
                      )}

                      {canPayRemaining && (
                        <button
                          className="pay-balance-btn"
                          onClick={() => handlePayRemaining(order)}
                          disabled={payingOrderId === order.id}
                        >
                          <FaWallet />
                          {payingOrderId === order.id
                            ? " Processing…"
                            : " Pay Remaining Balance"}
                        </button>
                      )}

                      {buyerConfirmed &&
                        order.balance_paid &&
                        !order.escrow_released && (
                          <div className="escrow-badge">
                            {releasingEscrowOrderId === order.id
                              ? "Releasing escrow…"
                              : "Waiting escrow release…"}
                          </div>
                        )}

                      {isCompleted && !order.rating_submitted && (
                        <div className="rating-box">
                          <span>Rate this order:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className="star"
                              onClick={() =>
                                handleSubmitRating(order.id, star)
                              }
                            >
                              <FaStar />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Installments Tab */}
      {tab === "installments" && (
        <div className="order-list">
          {installments.length === 0 ? (
            <div className="no-orders">No active installment plans.</div>
          ) : (
            installments.map((order) => {
              const paidPercent = Math.floor(
                (Number(order.amount_paid || 0) /
                  Number(order.total_price || 1)) *
                  100
              );
              return (
                <div key={order.id} className="installment-card glass">
                  <img
                    src={
                      order.products?.image_gallery?.[0] || "/placeholder.png"
                    }
                    alt={order.products?.name}
                    className="installment-image"
                  />
                  <div className="installment-info">
                    <h3>{order.products?.name}</h3>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(paidPercent, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="progress-text">
                      {Math.min(paidPercent, 100)}% paid
                    </p>

                    <p>
                      Total: OMC {Number(order.total_price).toLocaleString()}
                    </p>
                    <p>
                      Paid: OMC {Number(order.amount_paid).toLocaleString()}
                    </p>
                    <p>
                      Remaining: OMC{" "}
                      {Number(
                        (order.total_price || 0) - (order.amount_paid || 0)
                      ).toLocaleString()}
                    </p>
                    <p>Next Due: {order.next_due_date?.slice(0, 10) || "—"}</p>

                    <a className="installment-button" href="/my-installments">
                      Manage Installments
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Completed Tab */}
      {tab === "completed" && (
        <div className="order-list">
          {completedOrders.length === 0 ? (
            <div className="no-orders">No completed orders yet.</div>
          ) : (
            completedOrders.map((order) => (
              <div className="order-card-glass" key={order.id}>
                <div className="order-info">
                  <h3 className="product-title">{order.product?.name}</h3>
                  <p>
                    <FaCheckCircle className="icon" /> Completed on{" "}
                    {new Date(
                      order.updated_at || order.created_at
                    ).toLocaleDateString()}
                  </p>
                  <p>
                    <FaMapMarkerAlt className="icon" /> Delivery:{" "}
                    {order.delivery_location}
                  </p>
                  <div className="money-row">
                    <span>Total Paid:</span>
                    <strong>
                      OMC {Number(order.total_price).toLocaleString()}
                    </strong>
                  </div>

                  {!order.rating_submitted && (
                    <div className="rating-box">
                      <span>Rate this order:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className="star"
                          onClick={() => handleSubmitRating(order.id, star)}
                        >
                          <FaStar />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* OTP Modal */}
      {otpOpen && (
        <div className="otp-modal">
          <div className="otp-modal-content glass">
            <h3>Delivery OTP</h3>
            <input type="text" maxLength={6} value={otpValue} readOnly />
            <div className="modal-buttons">
              <button onClick={() => setOtpOpen(false)}>Close</button>
              <button onClick={submitOtp} disabled={submittingOtp}>
                {submittingOtp ? "Submitting…" : "Confirm Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerOrders;
