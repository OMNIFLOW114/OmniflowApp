// src/pages/CurrencyConverter.jsx
import React, { useEffect, useState } from "react";
import { fetchExchangeRates } from "@/services/currencyService"; // Connected to your currencyService
import { toast } from "react-hot-toast";

export default function CurrencyConverter() {
  const [rates, setRates] = useState({});
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [converted, setConverted] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    setLoading(true);
    const data = await fetchExchangeRates();
    if (data) {
      setRates(data);
      toast.success("✅ Exchange rates loaded!");
    } else {
      toast.error("❌ Failed to load exchange rates.");
    }
    setLoading(false);
  };

  const handleConvert = () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return toast.error("Please enter a valid amount.");
    }
    const rate = rates[currency];
    if (!rate) {
      return toast.error("Invalid currency selected.");
    }
    const usdValue = Number(amount) / rate; // convert amount into USD
    const omniCash = usdValue * 100; // convert USD to OmniCash
    const commission = omniCash * 0.014; // 1.4% commission
    const finalAmount = omniCash - commission;
    setConverted(finalAmount.toFixed(2)); // final OmniCash after commission
  };

  return (
    <div className="wallet-container min-h-screen flex items-center justify-center p-6">
      <div className="bg-[#0c0c0c] p-8 rounded-2xl shadow-xl max-w-md w-full border border-gold">
        <h2 className="gold-text text-3xl text-center mb-8">🌎 Currency to OmniCash Converter</h2>

        {loading ? (
          <p className="text-center text-gray-400">⏳ Loading exchange rates...</p>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-6">
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="wallet-input"
                inputMode="numeric"
              />

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="wallet-input"
              >
                {Object.keys(rates).map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>

              <button onClick={handleConvert} className="wallet-btn-send">
                Convert to OmniCash
              </button>
            </div>

            {converted && (
              <div className="text-center">
                <h3 className="gold-text text-xl">
                  🪙 You will receive: <br /> 
                  <span className="text-3xl">{converted} OmniCash</span>
                </h3>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
