import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import WalletActions from "./WalletActions";
import WalletSendMoney from "./WalletSendMoney";
import WalletTransactions from "./WalletTransactions";
import "./OmniCashWallet.css";
import { Send, ArrowDown, ArrowUp, RefreshCw, ChevronLeft, Loader2 } from "lucide-react";

const OmniCashWallet = () => {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);

  const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";
  const formatOMC = (num) => `${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} OMC`;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
        } else {
          toast.error("Please log in to access your wallet.", { duration: 4000 });
          setLoading(false);
        }
      } catch (err) {
        toast.error("Failed to authenticate user.", { duration: 4000 });
        console.error("Auth error:", err);
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchWallet = async () => {
      try {
        const { data, error } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        if (error && error.code === "PGRST116") {
          await supabase.from("wallets").insert({ user_id: user.id, balance: 0 });
          setBalance(0);
        } else if (data) {
          setBalance(data.balance || 0);
        }
      } catch (err) {
        toast.error("Failed to load wallet data.", { duration: 4000 });
        console.error("Fetch wallet error:", err);
      }
    };

    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50); // Limit to prevent excessive data fetching

        if (!error) setTransactions(data || []);
      } catch (err) {
        toast.error("Failed to load transactions.", { duration: 4000 });
        console.error("Fetch transactions error:", err);
      }
      setLoading(false);
    };

    fetchWallet();
    fetchTransactions();

    const channel = supabase
      .channel("wallet_txn_channel")
      .on("postgres_changes", {
        event: "*",
        table: "wallet_transactions",
        filter: `user_id=eq.${user.id}`,
      }, fetchTransactions)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const updateBalance = async (amount, type = "add") => {
    try {
      const newBalance = type === "add" ? balance + amount : balance - amount;
      if (newBalance < 0) throw new Error("Insufficient balance.");
      const { error } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      if (error) throw error;
      setBalance(newBalance);
    } catch (err) {
      toast.error("Balance update failed: " + err.message, { duration: 4000 });
      console.error("Update balance error:", err);
      throw err;
    }
  };

  const creditAdminCommission = async (commission) => {
    if (!ADMIN_ID || commission <= 0) return;
    try {
      await supabase.rpc("increment_wallet_balance", {
        user_id: ADMIN_ID,
        amount: commission,
      });
    } catch (err) {
      console.error("Admin commission error:", err);
    }
  };

  const insertTransaction = async (txns) => {
    try {
      if (!Array.isArray(txns)) txns = [txns];
      const { error } = await supabase.from("wallet_transactions").insert(txns);
      if (error) throw error;
    } catch (err) {
      toast.error("Transaction logging failed.", { duration: 4000 });
      console.error("Insert transaction error:", err);
      throw err;
    }
  };

  const handleMarketplacePayment = async (sellerId, amount, buyerEmail, productName) => {
    if (!sellerId || !amount || amount <= 0 || !buyerEmail) {
      toast.error("Invalid marketplace payment details.", { duration: 4000 });
      return;
    }

    const commission = +(amount * 0.05).toFixed(2);
    const net = +(amount - commission).toFixed(2);

    try {
      await supabase.rpc("increment_wallet_balance", {
        user_id: sellerId,
        amount: net,
      });

      await creditAdminCommission(commission);

      await insertTransaction([
        {
          user_id: sellerId,
          type: "receive",
          gross_amount: amount,
          amount: net,
          commission_paid: commission,
          sender_email: buyerEmail,
          created_at: new Date().toISOString(),
          status: "Completed",
          message: `You received ${formatOMC(net)} from ${buyerEmail} for product "${productName}". Admin took ${formatOMC(commission)}.`,
        },
        {
          user_id: ADMIN_ID,
          type: "commission",
          amount: commission,
          sender_email: buyerEmail,
          receiver_id: sellerId,
          created_at: new Date().toISOString(),
          status: "Completed",
          message: `Commission of ${formatOMC(commission)} from sale of "${productName}" by seller ID ${sellerId}.`,
        },
      ]);
      toast.success("Marketplace payment processed successfully!", { duration: 4000 });
    } catch (err) {
      toast.error("Marketplace payment failed.", { duration: 4000 });
      console.error("Marketplace payment error:", err);
    }
  };

  const resetDeposit = () => {
    setPaymentMethod(null);
    setDepositAmount("");
    setPhoneNumber("");
    setView("home");
  };

  return (
    <div className="wallet-container" aria-busy={loading || processing}>
      <div className="wallet-header">
        <h1 className="wallet-title">OmniCash Wallet</h1>
        {view !== "home" && (
          <button
            className="wallet-back-btn"
            onClick={() => setView("home")}
            disabled={processing}
            aria-label="Back to main wallet view"
          >
            <ChevronLeft size={20} /> Back
          </button>
        )}
      </div>

      {/* Balance Card */}
      <div className="wallet-balance-card">
        <div className="wallet-balance-header">
          <span className="wallet-balance-label">Available Balance</span>
          <button
            className="wallet-refresh-btn"
            onClick={() => setLoading(true)}
            disabled={loading || processing}
            aria-label="Refresh wallet balance"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="wallet-balance-amount" aria-live="polite">{formatOMC(balance)}</p>
        <div className="wallet-balance-actions">
          <button
            className="wallet-action-btn"
            onClick={() => setView("deposit")}
            disabled={processing}
            aria-label="Deposit funds"
          >
            <ArrowDown size={20} /> Deposit
          </button>
          <button
            className="wallet-action-btn"
            onClick={() => setView("withdraw")}
            disabled={processing}
            aria-label="Withdraw funds"
          >
            <ArrowUp size={20} /> Withdraw
          </button>
          <button
            className="wallet-action-btn"
            onClick={() => setView("send")}
            disabled={processing}
            aria-label="Send money"
          >
            <Send size={20} /> Send
          </button>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="wallet-secondary-actions">
        <button
          className="wallet-convert-btn"
          onClick={() => (window.location.href = "/currency/convert")}
          disabled={processing}
          aria-label="Convert currency"
        >
          <RefreshCw size={20} /> Convert Currency
        </button>
      </div>

      {/* View Content */}
      {view !== "home" && (
        <div className="wallet-view-content">
          {view === "deposit" && (
            <div className="wallet-deposit-view">
              <h2 className="wallet-view-title">Deposit Funds</h2>
              <p className="wallet-view-subtitle">Add funds to your OmniCash wallet securely.</p>
              <div className="wallet-method-buttons">
                <button
                  className="wallet-method-btn"
                  onClick={() => setPaymentMethod("PayPal")}
                  disabled={processing}
                  aria-label="Deposit with PayPal"
                >
                  PayPal
                </button>
                <button
                  className="wallet-method-btn"
                  onClick={() => setPaymentMethod("Mpesa")}
                  disabled={processing}
                  aria-label="Deposit with M-Pesa"
                >
                  M-Pesa
                </button>
              </div>

              {paymentMethod && (
                <>
                  <input
                    type="number"
                    placeholder="Enter amount in OMC"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="wallet-input"
                    min="0.01"
                    step="0.01"
                    disabled={processing}
                    aria-label="Deposit amount"
                  />

                  {paymentMethod === "PayPal" && depositAmount && !isNaN(depositAmount) && Number(depositAmount) > 0 && (
                    <PayPalScriptProvider options={{ "client-id": "YOUR_CLIENT_ID", currency: "USD", intent: "capture" }}>
                      <PayPalButtons
                        style={{ layout: "vertical", color: "blue", shape: "pill", label: "pay" }}
                        createOrder={(data, actions) =>
                          actions.order.create({
                            purchase_units: [{ amount: { value: (Number(depositAmount) / 150).toFixed(2) } }],
                          })
                        }
                        onApprove={async (data, actions) => {
                          setProcessing(true);
                          try {
                            await actions.order.capture();
                            const amount = Number(depositAmount);
                            await updateBalance(amount);
                            await insertTransaction({
                              user_id: user.id,
                              type: "deposit",
                              amount,
                              payment_method: "PayPal",
                              created_at: new Date().toISOString(),
                              status: "Completed",
                              message: `Deposit of ${formatOMC(amount)} via PayPal successful.`,
                            });
                            toast.success("Deposit successful!", { duration: 4000 });
                          } catch (err) {
                            toast.error("PayPal payment failed. Please try again.", { duration: 4000 });
                            console.error("PayPal Error:", err);
                          } finally {
                            setProcessing(false);
                            resetDeposit();
                          }
                        }}
                        onError={(err) => {
                          toast.error("PayPal payment failed. Please try again.", { duration: 4000 });
                          console.error("PayPal Error:", err);
                          setProcessing(false);
                        }}
                      />
                    </PayPalScriptProvider>
                  )}

                  {paymentMethod === "Mpesa" && (
                    <>
                      <input
                        type="tel"
                        placeholder="Enter M-Pesa Phone Number (e.g., +2547XXXXXXXX)"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="wallet-input"
                        disabled={processing}
                        aria-label="M-Pesa phone number"
                      />
                      <button
                        className="wallet-confirm-btn"
                        onClick={async () => {
                          setProcessing(true);
                          const amount = Number(depositAmount);
                          if (!amount || amount <= 0) {
                            toast.error("Please enter a valid amount greater than 0.", { duration: 4000 });
                            setProcessing(false);
                            return;
                          }
                          if (!phoneNumber || !/^\+2547\d{8}$/.test(phoneNumber)) {
                            toast.error("Please enter a valid M-Pesa phone number (e.g., +2547XXXXXXXX).", { duration: 4000 });
                            setProcessing(false);
                            return;
                          }
                          try {
                            await updateBalance(amount);
                            await insertTransaction({
                              user_id: user.id,
                              type: "deposit",
                              amount,
                              payment_method: "Mpesa",
                              created_at: new Date().toISOString(),
                              status: "Completed",
                              message: `Deposit of ${formatOMC(amount)} via M-Pesa successful.`,
                            });
                            toast.success("Deposit successful!", { duration: 4000 });
                          } catch (err) {
                            toast.error("Deposit failed. Please try again.", { duration: 4000 });
                            console.error("M-Pesa Deposit Error:", err);
                          } finally {
                            setProcessing(false);
                            resetDeposit();
                          }
                        }}
                        disabled={processing}
                        aria-label="Confirm M-Pesa deposit"
                      >
                        {processing ? (
                          <>
                            <Loader2 size={20} className="animate-spin inline mr-2" />
                            Processing...
                          </>
                        ) : (
                          "Confirm Deposit"
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {view === "withdraw" && (
            <div className="wallet-withdraw-view">
              <h2 className="wallet-view-title">Withdraw Funds</h2>
              <p className="wallet-view-subtitle">Withdraw funds from your OmniCash wallet.</p>
              <WalletActions
                balance={balance}
                setBalance={setBalance}
                type="withdraw"
                onWithdraw={async (amount, phone) => {
                  setProcessing(true);
                  const amt = Number(amount);
                  if (!amt || amt <= 0 || amt > balance) {
                    toast.error("Invalid amount or insufficient balance.", { duration: 4000 });
                    setProcessing(false);
                    return;
                  }
                  if (!phone || (!phone.includes("@") && !/^\+2547\d{8}$/.test(phone))) {
                    toast.error("Please enter a valid PayPal email or M-Pesa phone number.", { duration: 4000 });
                    setProcessing(false);
                    return;
                  }
                  const commission = +(amt * 0.014).toFixed(2);
                  const net = +(amt - commission).toFixed(2);
                  const method = phone.includes("@") ? "PayPal" : "Mpesa";
                  try {
                    await updateBalance(amt, "subtract");
                    await creditAdminCommission(commission);
                    await insertTransaction({
                      user_id: user.id,
                      type: "withdraw",
                      gross_amount: amt,
                      amount: net,
                      commission_paid: commission,
                      payment_method: method,
                      phone,
                      status: "Completed",
                      created_at: new Date().toISOString(),
                      message: `You withdrew ${formatOMC(net)} to ${phone}. Transaction costs: ${formatOMC(commission)}.`,
                    });
                    toast.success(`Withdrew ${formatOMC(net)} successfully!`, { duration: 4000 });
                  } catch (err) {
                    toast.error("Withdrawal failed. Please try again.", { duration: 4000 });
                    console.error("Withdraw Error:", err);
                  } finally {
                    setProcessing(false);
                    setView("home");
                  }
                }}
              />
            </div>
          )}

          {view === "send" && (
            <div className="wallet-send-view">
              <h2 className="wallet-view-title">Send Money</h2>
              <p className="wallet-view-subtitle">Send OMC to another user securely.</p>
              <WalletSendMoney
                balance={balance}
                setBalance={setBalance}
                onSend={async (recipientEmail, amount) => {
                  setProcessing(true);
                  const amt = Number(amount);
                  if (!amt || amt <= 0 || amt > balance) {
                    toast.error("Invalid amount or insufficient balance.", { duration: 4000 });
                    setProcessing(false);
                    return;
                  }
                  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
                    toast.error("Please enter a valid email address.", { duration: 4000 });
                    setProcessing(false);
                    return;
                  }

                  const commission = +(amt * 0.014).toFixed(2);
                  const net = +(amt - commission).toFixed(2);

                  const { data: receiver, error: receiverErr } = await supabase
                    .from("users")
                    .select("id, email")
                    .eq("email", recipientEmail)
                    .single();

                  if (receiverErr || !receiver?.id) {
                    toast.error("Receiver not found.", { duration: 4000 });
                    setProcessing(false);
                    return;
                  }

                  try {
                    await supabase.rpc("increment_wallet_balance", {
                      user_id: receiver.id,
                      amount: net,
                    });

                    await updateBalance(amt, "subtract");
                    await creditAdminCommission(commission);

                    await insertTransaction([
                      {
                        user_id: user.id,
                        type: "send",
                        gross_amount: amt,
                        amount: net,
                        commission_paid: commission,
                        receiver_id: receiver.id,
                        sender_email: user.email,
                        status: "Completed",
                        created_at: new Date().toISOString(),
                        message: `You sent ${formatOMC(net)} to ${receiver.email}. Admin fee: ${formatOMC(commission)}.`,
                      },
                      {
                        user_id: receiver.id,
                        type: "receive",
                        amount: net,
                        sender_id: user.id,
                        sender_email: user.email,
                        receiver_id: receiver.id,
                        status: "Completed",
                        created_at: new Date().toISOString(),
                        message: `You received ${formatOMC(net)} from ${user.email}.`,
                      },
                      {
                        user_id: ADMIN_ID,
                        type: "commission",
                        amount: commission,
                        sender_email: user.email,
                        receiver_id: receiver.id,
                        status: "Completed",
                        created_at: new Date().toISOString(),
                        message: `Commission of ${formatOMC(commission)} from ${user.email} for sending OMC.`,
                      },
                    ]);

                    toast.success(`Sent ${formatOMC(net)} to ${receiver.email}!`, { duration: 4000 });
                  } catch (err) {
                    toast.error("Transaction failed. Please try again.", { duration: 4000 });
                    console.error("Send failed:", err);
                  } finally {
                    setProcessing(false);
                    setView("home");
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Transactions Section */}
      <div className="wallet-transactions-section">
        <h2 className="wallet-section-title">Recent Transactions</h2>
        {loading ? (
          <div className="wallet-loading-placeholder" aria-live="polite">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading transactions...</span>
          </div>
        ) : (
          <>
            <WalletTransactions
              transactions={showAllTxns ? transactions : transactions.slice(0, 5)}
              loading={loading}
            />
            {transactions.length > 5 && (
              <button
                onClick={() => setShowAllTxns(!showAllTxns)}
                className="wallet-show-more-btn"
                aria-label={showAllTxns ? "Show fewer transactions" : "Show more transactions"}
              >
                {showAllTxns ? "Show Less" : "Show More"}
              </button>
            )}
          </>
        )}
      </div>

      {processing && (
        <div className="wallet-loading-overlay" aria-live="polite">
          <Loader2 size={32} className="animate-spin" />
          <span>Processing Transaction...</span>
        </div>
      )}
    </div>
  );
};

export default OmniCashWallet;