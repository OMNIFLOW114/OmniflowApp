// src/pages/MyInstallments.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-toastify";
import { useDarkMode } from "@/context/DarkModeContext";
import "./MyInstallments.css";

const POLL_INTERVAL_MS = 60_000;

export default function MyInstallments({ user }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [nextPayment, setNextPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [loadingOrderId, setLoadingOrderId] = useState(null);

  const { darkMode } = useDarkMode();
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    startUp();

    // polling (later we can move to supabase realtime)
    pollRef.current = setInterval(() => {
      fetchOrders();
      fetchWallet();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function startUp() {
    await Promise.all([fetchOrders(), fetchWallet()]);
    setTimeout(() => checkRemindersAndNotify(), 300);
  }

  async function fetchOrders() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("installment_orders")
      .select(`
        *,
        products:product_id (id, name, image_gallery, description),
        seller:seller_id (id, full_name, email)
      `)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchOrders error:", error);
      toast.error("Failed to load installment plans");
      setOrders([]);
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  }

  async function fetchWallet() {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!error && data) setWalletBalance(Number(data.balance));
  }

  function daysBetween(dateStr) {
    if (!dateStr) return null;
    const diff =
      (new Date(dateStr).setHours(0, 0, 0, 0) -
        new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24);
    return Math.ceil(diff);
  }

  function formatCurrency(n) {
    if (n == null) return "—";
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function shortId(uuid) {
    return uuid?.slice(0, 8);
  }

  // reminders
  async function checkRemindersAndNotify() {
    if (!orders?.length) return;
    for (const o of orders) {
      const days = daysBetween(o.next_due_date);
      const remaining = Number(o.total_price || 0) - Number(o.amount_paid || 0);

      if (o.status !== "completed" && days != null && days < 0) {
        toast.warn(
          `⚠️ Order ${shortId(o.id)} is overdue by ${Math.abs(days)} day(s).`
        );
      } else if (o.status !== "completed" && days != null && days <= 3) {
        toast.info(
          `⏳ Order ${shortId(o.id)} due in ${days} day(s). Next ~ OMC ${formatCurrency(
            o.installment_amount
          )}.`
        );
      }
    }
  }

  async function openModal(order) {
    setSelectedOrder(order);
    setModalOpen(true);
    setPaymentHistory([]);
    setNextPayment(null);

    const { data, error } = await supabase
      .from("installment_payments")
      .select("*")
      .eq("order_id", order.id)
      .eq("buyer_id", user.id)
      .order("due_date", { ascending: true });

    if (error) {
      console.error("fetch payments error", error);
      toast.error("Failed to load schedule");
      return;
    }

    setPaymentHistory(data || []);
    const next = (data || []).find((p) => p.status === "pending");
    setNextPayment(next ?? null);

    fetchWallet();
  }

  async function payNextInstallment(extra = false) {
    if (!selectedOrder) return;
    if (!nextPayment) {
      toast.error("No pending installment found for this order.");
      return;
    }

    const amount = Number(nextPayment.amount);

    if (paymentMethod === "wallet") {
      if (walletBalance == null) {
        toast.error("Wallet balance unknown. Try again.");
        return;
      }
      if (walletBalance < amount) {
        toast.error("Insufficient wallet balance. Please top up.");
        return;
      }
    }

    setLoadingOrderId(selectedOrder.id);
    const toastId = toast.loading("Processing payment…");

    try {
      const { error: rpcError } = await supabase.rpc(
        "record_installment_payment",
        {
          p_buyer: user.id,
          p_order_id: selectedOrder.id,
          p_payment_method: paymentMethod,
          p_extra: extra || false,
        }
      );

      if (rpcError) throw rpcError;

      toast.dismiss(toastId);
      toast.success("Payment successful ✅");

      await Promise.all([fetchOrders(), fetchWallet()]);
      await openModal(selectedOrder);
    } catch (err) {
      console.error("payNextInstallment error:", err);
      toast.dismiss(toastId);
      const message =
        err?.message ||
        err?.error_description ||
        "Payment failed. Please try again.";
      toast.error(message);
    } finally {
      setLoadingOrderId(null);
    }
  }

  return (
    <div className={`installment-dashboard ${darkMode ? "dark-mode" : ""}`}>
      {/* Header */}
      <header className="installment-header glass">
        <div>
          <h1 className="title">My Lipa Mdogo Mdogo Dashboard</h1>
          <p className="subtitle">
            Manage your installment plans. Every payment is secured in escrow until your product is fully paid.
          </p>
        </div>
        <WalletPanel walletBalance={walletBalance} formatCurrency={formatCurrency} />
      </header>

      <TrustPanel />

      {/* Main */}
      <main>
        {isLoading ? (
          <div className="loading">Loading your plans…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state glass">
            <h3>No active plans</h3>
            <p>Find a product and choose “Lipa Mdogo Mdogo” to start a plan.</p>
          </div>
        ) : (
          <section className="cards-grid">
            {orders.map((order) => (
              <InstallmentCard
                key={order.id}
                order={order}
                walletBalance={walletBalance}
                formatCurrency={formatCurrency}
                daysBetween={daysBetween}
                shortId={shortId}
                loadingOrderId={loadingOrderId}
                openModal={openModal}
                fetchOrders={fetchOrders}
              />
            ))}
          </section>
        )}
      </main>

      {/* Payment Modal */}
      {modalOpen && selectedOrder && (
        <PaymentModal
          selectedOrder={selectedOrder}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          walletBalance={walletBalance}
          formatCurrency={formatCurrency}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          payNextInstallment={payNextInstallment}
          loadingOrderId={loadingOrderId}
          paymentHistory={paymentHistory}
          nextPayment={nextPayment}
        />
      )}
    </div>
  );
}

/* --------------------------
   Sub Components
---------------------------*/
function WalletPanel({ walletBalance, formatCurrency }) {
  return (
    <div className="wallet-pill" aria-live="polite">
      <div className="wallet-label">Wallet</div>
      <div className="wallet-amount">
        OMC {walletBalance != null ? formatCurrency(walletBalance) : "..."}
      </div>
    </div>
  );
}

function TrustPanel() {
  return (
    <section className="trust-panel glass">
      <h3>🔒 Your Money is Safe</h3>
      <ul>
        <li>Funds stay in escrow until your plan completes.</li>
        <li>Every payment generates a digital receipt.</li>
        <li>Cancel anytime (refund policy applies).</li>
        <li>Need help? <a href="/support">Contact Support</a>.</li>
      </ul>
    </section>
  );
}

function InstallmentCard({
  order,
  walletBalance,
  formatCurrency,
  daysBetween,
  shortId,
  loadingOrderId,
  openModal,
  fetchOrders,
}) {
  const days = daysBetween(order.next_due_date);
  const paid = Number(order.amount_paid || 0);
  const total = Number(order.total_price || 0);
  const paidPercent = Math.floor((paid / Math.max(total, 1)) * 100);
  const remain = Math.max(total - paid, 0);
  const dueSoon =
    order.status !== "completed" && days != null && days <= 3 && days >= 0;
  const overdue =
    order.status !== "completed" && days != null && days < 0;

  return (
    <article
      className={`card glass elevation-3 ${
        overdue ? "overdue" : dueSoon ? "due-soon" : ""
      }`}
      aria-labelledby={`order-title-${order.id}`}
    >
      <div className="card-media">
        <img
          src={order.products?.image_gallery?.[0] || "/placeholder.png"}
          alt={order.products?.name || "Product"}
        />
      </div>

      <div className="card-body">
        <div className="card-top">
          <h2 id={`order-title-${order.id}`}>
            {order.products?.name || "Product"}
          </h2>
          <div className="tag-row">
            {overdue && <span className="tag tag-danger">Overdue</span>}
            {!overdue && dueSoon && (
              <span className="tag tag-warning">Due in {days}d</span>
            )}
            {order.status === "completed" && (
              <span className="tag tag-success">Completed</span>
            )}
          </div>
        </div>

        <p className="seller">
          Seller: <strong>{order.seller?.full_name || "Unknown"}</strong>
        </p>

        <div className="progress-outer" aria-hidden>
          <div
            className="progress-inner"
            style={{ width: `${Math.min(paidPercent, 100)}%` }}
            title={`${paidPercent}% paid`}
          />
        </div>
        <p className="progress-label">
          {Math.min(paidPercent, 100)}% paid • OMC {formatCurrency(paid)} / OMC{" "}
          {formatCurrency(total)}
        </p>

        <div className="financials">
          <div>
            Remaining: <strong>OMC {formatCurrency(remain)}</strong>
          </div>
          <div>
            Next Due:{" "}
            <strong>
              {order.next_due_date ? order.next_due_date.slice(0, 10) : "—"}
            </strong>
          </div>
        </div>

        <div className="card-actions">
          <button
            className="btn primary"
            onClick={() => openModal(order)}
            disabled={loadingOrderId === order.id || order.status === "completed"}
          >
            {loadingOrderId === order.id ? "Processing…" : "Pay Next"}
          </button>

          <button
            className="btn ghost"
            disabled={order.status === "completed"}
            onClick={async () => {
              if (!window.confirm("Cancel this plan?")) return;
              const toastId = toast.loading("Cancelling…");
              const { error } = await supabase
                .from("installment_orders")
                .update({ status: "cancelled" })
                .eq("id", order.id);
              toast.dismiss(toastId);
              if (error) toast.error(error.message);
              else {
                toast.success("Plan cancelled");
                fetchOrders();
              }
            }}
          >
            Cancel Plan
          </button>
        </div>

        <details className="details">
          <summary>View schedule & history</summary>
          <div className="schedule">
            <h4>Payment Timeline</h4>
            <ScheduleTable orderId={order.id} userId={order.buyer_id} />
          </div>
        </details>
      </div>
    </article>
  );
}

function PaymentModal({
  selectedOrder,
  modalOpen,
  setModalOpen,
  walletBalance,
  formatCurrency,
  paymentMethod,
  setPaymentMethod,
  payNextInstallment,
  loadingOrderId,
  paymentHistory,
  nextPayment,
}) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-box animate">
        <h3 id="modal-title">
          Pay Installment — {selectedOrder.products?.name}
        </h3>

        <div className="modal-grid">
          <div className="modal-left">
            <img
              src={selectedOrder.products?.image_gallery?.[0] || "/placeholder.png"}
              alt=""
            />
          </div>

          <div className="modal-right">
            <p>Next installment:</p>
            <p className="big-amount">
              OMC{" "}
              {formatCurrency(
                nextPayment ? nextPayment.amount : selectedOrder.installment_amount
              )}
            </p>
            <p>
              Wallet:{" "}
              <strong>
                OMC {walletBalance != null ? formatCurrency(walletBalance) : "..."}
              </strong>
            </p>

            <div
              className="payment-methods"
              role="radiogroup"
              aria-label="Payment Method"
            >
              <label>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="wallet"
                  checked={paymentMethod === "wallet"}
                  onChange={() => setPaymentMethod("wallet")}
                />
                Wallet (Balance OMC {formatCurrency(walletBalance)})
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mpesa"
                  checked={paymentMethod === "mpesa"}
                  onChange={() => setPaymentMethod("mpesa")}
                />
                M-Pesa
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paypal"
                  checked={paymentMethod === "paypal"}
                  onChange={() => setPaymentMethod("paypal")}
                />
                PayPal
              </label>
            </div>

            <div className="modal-actions">
              <button
                className="confirm-button"
                onClick={() => payNextInstallment(false)}
                disabled={!nextPayment || loadingOrderId === selectedOrder.id}
              >
                {loadingOrderId === selectedOrder.id ? "Processing…" : "Pay Now"}
              </button>
              <button
                className="confirm-button ghost"
                onClick={() => payNextInstallment(true)}
                disabled={!nextPayment || loadingOrderId === selectedOrder.id}
              >
                Pay Extra
              </button>
              <button
                className="cancel-button"
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="modal-schedule">
              <h4>Schedule</h4>
              {paymentHistory.length === 0 ? (
                <p>No schedule available</p>
              ) : (
                <ul className="history-list">
                  {paymentHistory.map((p) => (
                    <li
                      key={p.id}
                      className={p.status === "paid" ? "paid" : "pending"}
                    >
                      <span className="h-date">{p.due_date?.slice(0, 10)}</span>
                      <span className="h-amount">
                        OMC {formatCurrency(p.amount)}
                      </span>
                      <span className="h-status">
                        {p.status === "paid"
                          ? "Paid ✅"
                          : "Pending ⏳"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!nextPayment && (
                <p style={{ color: "#a00", marginTop: 8 }}>
                  No pending payment found. If this looks wrong, refresh or
                  contact support.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleTable({ orderId, userId }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("installment_payments")
        .select("id, due_date, amount, status, paid_date, payment_method")
        .eq("order_id", orderId)
        .eq("buyer_id", userId)
        .order("due_date", { ascending: true });
      if (!error && mounted) setRows(data || []);
    })();
    return () => {
      mounted = false;
    };
  }, [orderId, userId]);

  if (!rows.length)
    return (
      <table className="schedule-table" role="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="3">No schedule</td>
          </tr>
        </tbody>
      </table>
    );

  return (
    <table className="schedule-table" role="table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.due_date?.slice(0, 10)}</td>
            <td>
              OMC{" "}
              {Number(r.amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td>
              {r.status === "paid"
                ? `Paid (${r.paid_date?.slice(0, 10)}${
                    r.payment_method ? ` via ${r.payment_method}` : ""
                  })`
                : "Pending"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
