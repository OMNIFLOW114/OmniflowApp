// src/pages/Currency.jsx
import React, { useEffect, useState } from "react";
import {
  doc, getDoc, setDoc, updateDoc, increment, collection, getDocs,
} from "firebase/firestore";
import { useAuth } from "@/AuthContext";
import { db } from "@/firebase";
import { motion } from "framer-motion";

const OmniIcon = () => (
  <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="45" stroke="#fbbf24" strokeWidth="8" fill="#fef3c7" />
    <text x="50%" y="55%" textAnchor="middle" fill="#92400e" fontSize="28" fontWeight="bold" dy=".3em">Ø</text>
  </svg>
);

const Currency = () => {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletPhone, setWalletPhone] = useState("");
  const [message, setMessage] = useState("");
  const [conversionRate] = useState(0.2997);
  const [transactions, setTransactions] = useState([]);

  const walletRef = currentUser && doc(db, "wallets", currentUser.uid);
  const userRef = currentUser && doc(db, "users", currentUser.uid);

  const logTransaction = async (type, amount, note = "") => {
    const txRef = doc(db, "users", currentUser.uid, "transactions", Date.now().toString());
    await setDoc(txRef, {
      type,
      amount,
      note,
      timestamp: new Date().toISOString(),
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!walletRef || !userRef) return;
      const [walletSnap, userSnap, txSnap] = await Promise.all([
        getDoc(walletRef),
        getDoc(userRef),
        getDocs(collection(db, "users", currentUser.uid, "transactions")),
      ]);

      if (!walletSnap.exists()) {
        await setDoc(walletRef, { balance: 10 });
        await updateDoc(userRef, { firstBonusGiven: true }, { merge: true });
        await logTransaction("bonus", 10, "🎉 First-time bonus");
        setBalance(10);
        setMessage("🎉 Welcome! You received 10 OmniCash.");
      } else {
        setBalance(walletSnap.data()?.balance || 0);
      }

      if (userSnap.exists()) {
        const data = userSnap.data();
        setWalletPhone(data.walletPhoneNumber || "");
      }

      const txList = txSnap.docs.map((doc) => doc.data()).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      setTransactions(txList);
    };
    fetchData();
  }, [walletRef, userRef]);

  const handleSavePhone = async () => {
    if (!walletPhone || !/^7\d{8}$/.test(walletPhone)) {
      return setMessage("⚠️ Enter a valid Safaricom number (e.g., 712345678).");
    }
    try {
      await setDoc(userRef, { walletPhoneNumber: walletPhone }, { merge: true });
      setMessage("✅ Phone number saved successfully.");
    } catch {
      setMessage("❌ Error saving number.");
    }
  };

  const handleDeposit = async () => {
    const kes = parseFloat(amount);
    if (isNaN(kes) || kes <= 0) return setMessage("⚠️ Enter a valid amount in KES.");
    const omniCash = parseFloat((kes * conversionRate).toFixed(2));
    try {
      setMessage(`📲 Initiating M-Pesa STK push to +254${walletPhone}...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await updateDoc(walletRef, { balance: increment(omniCash) });
      await logTransaction("deposit", omniCash, `Deposited KES ${kes}`);
      setBalance((prev) => prev + omniCash);
      setAmount("");
      setMessage(`✅ Deposit of KES ${kes} complete. +${omniCash} OmniCash.`);
    } catch (err) {
      setMessage("❌ Error during deposit.");
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return setMessage("⚠️ Enter a valid amount.");
    if (amount > balance) return setMessage("❌ Not enough OmniCash.");
    const fee = parseFloat((amount * 0.012).toFixed(2));
    const userReceives = amount - fee;

    try {
      await updateDoc(walletRef, { balance: increment(-amount) });
      await logTransaction("withdraw", -userReceives, `Withdrawn to +254${walletPhone}`);
      setBalance((prev) => Math.max(0, prev - amount));
      setWithdrawAmount("");
      setMessage(`💸 Withdraw of ${userReceives.toFixed(2)} OmniCash sent to +254${walletPhone}`);
    } catch (err) {
      setMessage("❌ Withdrawal failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white p-4 sm:p-8 md:p-12">
      <div className="max-w-xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-yellow-600 flex justify-center items-center gap-3">
            <OmniIcon /> OmniCash Wallet
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your secure digital wallet. Empower your lifestyle.</p>
        </div>

        {/* Balance Display */}
        <motion.div
          className="bg-yellow-100 p-6 rounded-3xl shadow-xl text-center space-y-1"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm text-gray-600">Available Balance</p>
          <h2 className="text-5xl font-extrabold text-yellow-700 flex justify-center items-center gap-2">
            {Math.max(0, balance).toLocaleString()} <OmniIcon />
          </h2>
          <p className="text-xs text-gray-500">📱 {walletPhone ? `+254${walletPhone}` : "No number saved"}</p>
        </motion.div>

        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
          {/* Mobile */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Mobile Number (+254)</label>
            <input
              type="tel"
              maxLength={9}
              value={walletPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 9) setWalletPhone(val);
              }}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-yellow-400"
              placeholder="e.g. 712345678"
            />
            <button
              onClick={handleSavePhone}
              className="mt-3 w-full bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600"
            >
              Save Number
            </button>
          </div>

          {/* Deposit */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Deposit (KES)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-yellow-400"
              placeholder="e.g. 500"
            />
            <p className="text-xs text-gray-400 mt-1">💱 1 KES = {conversionRate} OmniCash</p>
            <button
              onClick={handleDeposit}
              className="mt-3 w-full bg-yellow-500 text-white py-3 rounded-xl hover:bg-yellow-600"
            >
              Deposit Now
            </button>
          </div>

          {/* Withdraw */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Withdraw OmniCash</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-red-400"
              placeholder="e.g. 100"
            />
            <button
              onClick={handleWithdraw}
              className="mt-3 w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600"
            >
              Withdraw Now
            </button>
          </div>
        </div>

        {/* Transaction History */}
        {transactions.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold mb-3 text-gray-800">🧾 Transaction History</h3>
            <ul className="max-h-64 overflow-y-auto text-sm divide-y divide-gray-100">
              {transactions.map((tx, idx) => (
                <li key={idx} className="py-2">
                  <span className={`font-bold ${tx.type === "deposit" ? "text-green-600" : "text-red-500"}`}>
                    {tx.type.toUpperCase()}
                  </span>{" "}
                  {tx.note} •{" "}
                  <span className="text-gray-400">{new Date(tx.timestamp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Message */}
        {message && (
          <p className="text-center text-sm bg-white p-3 rounded-xl shadow text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
};

export default Currency;
