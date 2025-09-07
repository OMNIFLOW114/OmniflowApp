import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import WalletActions from "./WalletActions";
import WalletSendMoney from "./WalletSendMoney";
import WalletTransactions from "./WalletTransactions";
import "./OmniCashWallet.css";
import { Send, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";

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
  const formatOMC = (num) => `${Number(num).toLocaleString("en-US", { minimumFractionDigits: 2 })} OMC`;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchWallet = async () => {
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
    };

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error) setTransactions(data || []);
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
    const newBalance = type === "add" ? balance + amount : balance - amount;
    await supabase.from("wallets").update({ balance: newBalance }).eq("user_id", user.id);
    setBalance(newBalance);
  };

  const creditAdminCommission = async (commission) => {
    if (!ADMIN_ID || commission <= 0) return;
    await supabase.rpc("increment_wallet_balance", {
      user_id: ADMIN_ID,
      amount: commission,
    });
  };

  const insertTransaction = async (txns) => {
    if (!Array.isArray(txns)) txns = [txns];
    await supabase.from("wallet_transactions").insert(txns);
  };

  const handleMarketplacePayment = async (sellerId, amount, buyerEmail, productName) => {
    if (!sellerId || !amount || amount <= 0 || !buyerEmail) return;

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
    } catch (err) {
      console.error("Marketplace payment error:", err);
    }
  };

  const resetDeposit = () => {
    setPaymentMethod(null);
    setDepositAmount("");
    setPhoneNumber("");
    setView("home");
  };

  const totalReceived = transactions
    .filter(t => t.type === "receive" && t.gross_amount)
    .reduce((sum, tx) => sum + (tx.gross_amount || tx.amount), 0);

  const totalCommission = transactions
    .filter(t => t.type === "receive" && t.commission_paid)
    .reduce((sum, tx) => sum + tx.commission_paid, 0);
  return (
    <div className="wallet-container full-screen-wallet">
      {/* Wallet Header */}
      <div className="wallet-card">
        <h2 className="wallet-balance-title">OmniCash Wallet Balance</h2>
        <div className="wallet-balance-wrapper">
          <div className="omnicoin-3d">
            <div className="omnicoin-ring">
              <span className="front">OMC</span>
              <span className="back">∞</span>
            </div>
          </div>
          <p className="wallet-balance">{formatOMC(balance)}</p>
        </div>

        <div className="wallet-actions">
          <button onClick={() => setView("deposit")} disabled={processing}>
            <ArrowDown size={16} className="inline mr-1" /> Deposit
          </button>
          <button onClick={() => setView("withdraw")} disabled={processing}>
            <ArrowUp size={16} className="inline mr-1" /> Withdraw
          </button>
          <button onClick={() => setView("send")} disabled={processing}>
            <Send size={16} className="inline mr-1" /> Send Money
          </button>
        </div>

        <button
          className="wallet-btn-currency mt-4"
          onClick={() => (window.location.href = "/currency/convert")}
        >
          <RefreshCw size={16} className="inline mr-1" /> Convert Currency
        </button>
      </div>

      {/* Deposit View */}
      {view === "deposit" && (
        <div className="deposit-methods">
          <h3>Choose Deposit Method</h3>
          <div>
            <button onClick={() => setPaymentMethod("PayPal")} disabled={processing}>PayPal</button>
            <button onClick={() => setPaymentMethod("Mpesa")} disabled={processing}>M-Pesa</button>
          </div>

          <input
            type="number"
            placeholder="Enter amount"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />

          {paymentMethod === "PayPal" && depositAmount && !isNaN(depositAmount) && (
            <PayPalScriptProvider options={{ "client-id": "YOUR_CLIENT_ID", currency: "USD", intent: "capture" }}>
              <PayPalButtons
                style={{ layout: "vertical", color: "gold", shape: "rect" }}
                createOrder={(data, actions) =>
                  actions.order.create({
                    purchase_units: [{ amount: { value: (Number(depositAmount) / 150).toFixed(2) } }],
                  })
                }
                onApprove={async (data, actions) => {
                  await actions.order.capture();
                  await updateBalance(Number(depositAmount));
                  await insertTransaction({
                    user_id: user.id,
                    type: "deposit",
                    amount: Number(depositAmount),
                    payment_method: "PayPal",
                    created_at: new Date().toISOString(),
                    status: "Completed",
                    message: `Deposit of ${formatOMC(depositAmount)} via PayPal successful.`,
                  });
                  resetDeposit();
                  toast.success("Deposit successful.");
                }}
                onError={(err) => {
                  console.error("PayPal Error:", err);
                  toast.error("PayPal payment failed.");
                }}
              />
            </PayPalScriptProvider>
          )}

          {paymentMethod === "Mpesa" && (
            <>
              <input
                type="tel"
                placeholder="Enter M-Pesa Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <button onClick={async () => {
                const amt = Number(depositAmount);
                if (!amt || amt <= 0) return toast.error("Enter a valid amount");
                await updateBalance(amt);
                await insertTransaction({
                  user_id: user.id,
                  type: "deposit",
                  amount: amt,
                  payment_method: "Mpesa",
                  created_at: new Date().toISOString(),
                  status: "Completed",
                  message: `Deposit of ${formatOMC(amt)} via Mpesa successful.`,
                });
                resetDeposit();
                toast.success("Deposit successful.");
              }} disabled={processing}>
                Confirm M-Pesa Payment
              </button>
            </>
          )}
        </div>
      )}

      {/* Withdraw View */}
      {view === "withdraw" && (
        <WalletActions
          balance={balance}
          setBalance={setBalance}
          type="withdraw"
          onWithdraw={async (amount, phone) => {
            const amt = Number(amount);
            const commission = +(amt * 0.014).toFixed(2);
            const net = +(amt - commission).toFixed(2);
            const method = phone.includes("@") ? "PayPal" : "Mpesa";
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
            toast.success("Withdrawal completed.");
            setView("home");
          }}
        />
      )}

      {/* Send View */}
      {view === "send" && (
        <WalletSendMoney
          balance={balance}
          setBalance={setBalance}
          onSend={async (recipientEmail, amount) => {
  const amt = Number(amount);
  if (!amt || amt <= 0) return toast.error("Invalid amount.");
  if (!recipientEmail || !recipientEmail.includes("@")) return toast.error("Invalid email.");

  const commission = +(amt * 0.014).toFixed(2);
  const net = +(amt - commission).toFixed(2);

  const { data: receiver, error: receiverErr } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", recipientEmail)
    .single();

  if (receiverErr || !receiver?.id) {
    toast.error("Receiver not found.");
    return;
  }

  try {

    // Credit receiver
    await supabase.rpc("increment_wallet_balance", {
      user_id: receiver.id,
      amount: net,
    });

    // Deduct sender
    await updateBalance(amt, "subtract");

    // Credit admin commission
    await creditAdminCommission(commission);

    // Log both transactions
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

    toast.success(`Sent ${formatOMC(net)} to ${receiver.email}`);
    setView("home");
  } catch (err) {
    console.error("Send failed:", err);
    toast.error("Transaction failed. Please try again.");
  }
}}
        />
      )}

      {/* Transactions */}
      <div className="mt-8">
        <WalletTransactions
          transactions={showAllTxns ? transactions : transactions.slice(0, 5)}
          loading={loading}
        />
        {transactions.length > 5 && (
          <button onClick={() => setShowAllTxns(!showAllTxns)} className="wallet-show-more">
            {showAllTxns ? "Show Less" : "Show More"}
          </button>
        )}
      </div>
    </div>
  );
};

export default OmniCashWallet;
