import React, { useState } from "react";
import { ArrowUpCircle } from "lucide-react";

const WalletActions = ({ balance, setBalance, onWithdraw }) => {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");

  const handleWithdraw = () => {
    const amt = Number(amount);
    if (!amt || isNaN(amt) || !phone.trim()) {
      alert("Please enter a valid amount and recipient contact.");
      return;
    }
    if (amt > balance) {
      alert("Insufficient OmniCash balance.");
      return;
    }
    onWithdraw(amt, phone.trim());
    setAmount("");
    setPhone("");
  };

  return (
    <div className="wallet-actions-glass">
      <h2 className="text-xl font-bold text-center text-gold-400 mb-4">
        Withdraw from OmniCash Wallet
      </h2>

      <input
        type="number"
        className="wallet-input-glass"
        placeholder="Enter amount to withdraw (OMC)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        type="text"
        className="wallet-input-glass"
        placeholder="Enter M-Pesa Number or PayPal Email"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        className="wallet-button-primary mt-4"
        onClick={handleWithdraw}
      >
        <ArrowUpCircle size={18} className="inline mr-1" />
        Confirm Withdrawal
      </button>

      <p className="text-xs text-center mt-2 text-gray-400 dark:text-gray-500">
      
      </p>
    </div>
  );
};

export default WalletActions;
