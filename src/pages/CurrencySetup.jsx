import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/AuthContext";

const CurrencySetup = () => {
  const { currentUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkWallet = async () => {
      if (!currentUser) return;

      const walletRef = doc(db, "wallets", currentUser.uid);
      const walletSnap = await getDoc(walletRef);

      if (walletSnap.exists()) {
        // Wallet already exists → redirect
        navigate("/currency/wallet");
      } else {
        setLoading(false); // Show form
      }
    };

    checkWallet();
  }, [currentUser, navigate]);

  const handleCreateWallet = async () => {
    if (!phone || phone.length < 8) {
      setMessage("📱 Enter a valid phone number.");
      return;
    }

    try {
      const walletRef = doc(db, "wallets", currentUser.uid);
      const userRef = doc(db, "users", currentUser.uid);

      // Create wallet with 0 balance
      await setDoc(walletRef, { balance: 0 });

      // Save phone number
      await setDoc(userRef, { walletPhoneNumber: phone }, { merge: true });

      navigate("/currency/wallet");
    } catch (err) {
      console.error(err.message);
      setMessage("❌ Failed to create wallet.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-700">
        Checking wallet status...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="max-w-md w-full bg-yellow-50 p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-yellow-700 mb-4 text-center">
          🎉 Create Your OmniWallet
        </h2>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Please enter your mobile number for M-Pesa or PayPal use.
        </p>
        <input
          type="tel"
          placeholder="e.g. 0712345678"
          className="w-full p-3 border rounded-lg mb-4"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button
          onClick={handleCreateWallet}
          className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 transition"
        >
          Create Wallet
        </button>
        {message && (
          <p className="text-sm text-red-500 text-center mt-4">{message}</p>
        )}
      </div>
    </div>
  );
};

export default CurrencySetup;
