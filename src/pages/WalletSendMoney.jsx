import React, { useState } from "react";

const WalletSendMoney = ({ balance, setBalance, onSend }) => {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  const handleSend = () => {
    if (!email || !amount || isNaN(amount)) {
      alert("Please fill in a valid email and amount.");
      return;
    }
    onSend(email, Number(amount));
    setEmail("");
    setAmount("");
  };

  return (
    <div className="wallet-send-container">
      <h3>Send OmniCash to Another User</h3>
      <input
        className="wallet-input"
        type="email"
        placeholder="Recipient Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="wallet-input"
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="wallet-buttons">
        <button className="wallet-btn-send" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
};

export default WalletSendMoney;
