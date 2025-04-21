// src/pages/CurrencyWrapper.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/AuthContext";
import { db } from "@/firebase";

const CurrencyWrapper = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const walletRef = currentUser && doc(db, "wallets", currentUser.uid);
  const userRef = currentUser && doc(db, "users", currentUser.uid);

  useEffect(() => {
    const checkWallet = async () => {
      if (!walletRef) return;
      try {
        const docSnap = await getDoc(walletRef);
        if (docSnap.exists()) {
          navigate("/currency/wallet");
        } else {
          setShowSetup(true);
        }
      } catch (err) {
        console.error("Wallet check failed:", err.message);
        setError("Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    checkWallet();
  }, [walletRef, navigate]);

  const handleCreateWallet = async () => {
    if (!phone || phone.length < 8) {
      setError("Please enter a valid mobile number.");
      return;
    }

    try {
      await setDoc(walletRef, { balance: 10 }); // First-time bonus
      await setDoc(userRef, { walletPhoneNumber: phone }, { merge: true });
      navigate("/currency/wallet");
    } catch (err) {
      console.error("Failed to create wallet:", err.message);
      setError("Failed to create wallet.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 text-lg">
        Checking OmniWallet...
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-yellow-50">
        <h2 className="text-2xl font-bold text-yellow-700 mb-4">
          🪙 Set Up Your OmniWallet
        </h2>
        <p className="text-gray-600 mb-4">Enter your mobile number to start using OmniCurrency and get 10 OmniCash as a bonus!</p>
        <input
          type="tel"
          placeholder="e.g. 0712345678"
          className="w-full max-w-xs border p-3 rounded mb-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button
          onClick={handleCreateWallet}
          className="bg-yellow-500 text-white font-semibold py-2 px-6 rounded hover:bg-yellow-600"
        >
          Create Wallet
        </button>
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      </div>
    );
  }

  return null;
};

export default CurrencyWrapper;
