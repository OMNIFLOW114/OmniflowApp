import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast from "react-hot-toast";

export default function PayPalDeposit({ userId, onSuccess }) {
  const [amount, setAmount] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

  const initialOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency: "USD",
    intent: "capture",
  };

  const handleApprove = async (data, actions) => {
    setIsProcessing(true);
    try {
      const details = await actions.order.capture();
      const transaction = {
        amount: parseFloat(amount),
        method: "PayPal",
        transactionId: details.id,
        status: "completed",
        userId,
        timestamp: new Date().toISOString(),
      };

      // Optional: Save transaction to DB (you can adapt this endpoint)
      const res = await fetch("/api/save-paypal-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
      });

      if (!res.ok) throw new Error("Failed to save transaction");

      toast.success("Deposit successful!");
      if (onSuccess) onSuccess(transaction);
    } catch (err) {
      console.error(err);
      toast.error("Deposit failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center">Deposit via PayPal</h2>
      <input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900"
      />

      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtons
          style={{ layout: "vertical" }}
          disabled={isProcessing}
          forceReRender={[amount]}
          createOrder={(data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: amount.toString(),
                  },
                },
              ],
            });
          }}
          onApprove={handleApprove}
          onError={(err) => {
            console.error("PayPal error:", err);
            toast.error("Payment failed. Try again.");
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
