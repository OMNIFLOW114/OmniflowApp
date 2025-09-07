import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import { toast } from "react-hot-toast";
import { CSVLink } from "react-csv";
import {
  FileDown,
  Wallet,
  Store,
  Crown,
  Percent,
  BarChart3,
  CircleDollarSign,
} from "lucide-react";
import "./AdminWallet.css";

const ADMIN_ID = "755ed9e9-69f6-459c-ad44-d1b93b80a4c6";

const formatOMC = (num) =>
  `${Number(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} OMC`;

export default function AdminWalletDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState({});
  const [selectedSource, setSelectedSource] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const fetchBalance = async () => {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", ADMIN_ID)
      .single();

    if (!error && data) setBalance(data.balance);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", ADMIN_ID)
      .eq("type", "commission")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransactions(data);

      // Group by known sources
      const grouped = data.reduce((acc, txn) => {
        const src = txn.source?.toLowerCase() || "uncategorized";
        acc[src] = (acc[src] || 0) + txn.amount;
        return acc;
      }, {});
      setTotals(grouped);
    } else {
      toast.error("❌ Failed to fetch transactions.");
    }

    setLoading(false);
  };

  const sources = [
    { key: "wallet", icon: <Wallet size={20} />, label: "Wallet Transfers" },
    { key: "marketplace", icon: <Store size={20} />, label: "Marketplace Sales" },
    { key: "premium", icon: <Crown size={20} />, label: "Premium Upgrades" },
  ];

  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);

  const csvData = transactions.map((txn) => ({
    Type: txn.type,
    Source: txn.source || "Uncategorized",
    Amount: `${txn.amount} OMC`,
    Message: txn.message || "-",
    Date: new Date(txn.created_at).toLocaleString(),
  }));

  const filteredTransactions =
    selectedSource === "all"
      ? transactions
      : transactions.filter(
          (txn) =>
            (txn.source?.toLowerCase() || "uncategorized") === selectedSource &&
            txn.type === "commission"
        );

  return (
    <div className="admin-wallet-container">
      {/* Header */}
      <div className="admin-wallet-header">
        <CircleDollarSign size={42} className="text-orange-400" />
        <h1>Admin OmniCash Vault</h1>
        <p className="admin-balance">{formatOMC(balance)}</p>
        <div className="admin-wallet-actions">
          <CSVLink
            data={csvData}
            filename="admin_commissions.csv"
            className="btn-glass orange-border"
          >
            <FileDown size={18} className="mr-1" />
            Export CSV
          </CSVLink>
        </div>
      </div>

      {/* Earnings Cards */}
      <div className="earning-cards-grid">
        {sources.map(({ key, icon, label }) => {
          const amount = totals[key] || 0;
          const percent =
            totalAll > 0 ? ((amount / totalAll) * 100).toFixed(2) : "0.00";

          return (
            <div
              key={key}
              className={`earning-card ${selectedSource === key ? "selected" : ""}`}
              onClick={() => setSelectedSource(key)}
            >
              <div className="icon-title">
                {icon}
                <h3>{label}</h3>
              </div>
              <p className="amount">{formatOMC(amount)}</p>
              <p className="percent">
                <Percent size={14} /> {percent}% of Total
              </p>
            </div>
          );
        })}

        <div
          className={`earning-card ${selectedSource === "all" ? "selected" : ""}`}
          onClick={() => setSelectedSource("all")}
        >
          <div className="icon-title">
            <BarChart3 size={20} />
            <h3>All Earnings</h3>
          </div>
          <p className="amount">{formatOMC(totalAll)}</p>
          <p className="percent text-green-400">100% Overview</p>
        </div>
      </div>

      {/* Transactions Section */}
      {selectedSource !== "all" && (
        <div className="transactions-table">
          <h2 className="txn-title">
            {selectedSource === "marketplace" && "🛒 Marketplace Commissions"}
            {selectedSource === "wallet" && "💳 Wallet Transfer Commissions"}
            {selectedSource === "premium" && "👑 Premium Upgrade Commissions"}
          </h2>

          {loading ? (
            <p className="loading-text">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="no-txns">No transactions found.</p>
          ) : (
            <table className="wallet-admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  {selectedSource === "marketplace" && <th>Order ID</th>}
                  {selectedSource === "marketplace" && <th>Seller</th>}
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((txn, i) => (
                  <tr key={i}>
                    <td>{new Date(txn.created_at).toLocaleDateString()}</td>
                    <td className="text-orange-400">{formatOMC(txn.amount)}</td>
                    {selectedSource === "marketplace" && (
                      <td>{txn.order_id || "—"}</td>
                    )}
                    {selectedSource === "marketplace" && (
                      <td>{txn.seller_id || "—"}</td>
                    )}
                    <td>{txn.message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedSource === "all" && (
        <div className="transactions-table">
          <h2 className="txn-title">📑 All Admin Commission Transactions</h2>
          {loading ? (
            <p className="loading-text">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="no-txns">No transactions found.</p>
          ) : (
            <table className="wallet-admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr key={i}>
                    <td>{new Date(txn.created_at).toLocaleDateString()}</td>
                    <td className="text-orange-400">{formatOMC(txn.amount)}</td>
                    <td>{txn.source || "Uncategorized"}</td>
                    <td>{txn.message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
