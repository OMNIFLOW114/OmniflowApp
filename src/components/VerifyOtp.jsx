// src/components/VerifyOtp.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import "./Auth.css";
import toast from "react-hot-toast";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const emailOrPhone = location.state?.emailOrPhone || "";

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      let result;
      if (emailOrPhone.includes("@")) {
        result = await supabase.auth.verifyOtp({
          type: "email",
          email: emailOrPhone,
          token: otp,
        });
      } else {
        result = await supabase.auth.verifyOtp({
          type: "sms",
          phone: emailOrPhone,
          token: otp,
        });
      }

      if (result.error) throw result.error;

      setMessage("✅ Verification successful. Redirecting...");
      setTimeout(() => navigate("/home"), 1500);
    } catch (err) {
      setError(err.message || "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (emailOrPhone.includes("@")) {
        const { error } = await supabase.auth.resend({ type: "signup", email: emailOrPhone });
        if (error) throw error;
      } else {
        await supabase.auth.signInWithOtp({ phone: emailOrPhone });
      }
      setMessage("📩 OTP resent successfully!");
    } catch (err) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="auth-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div
        className="auth-form-container glass-card"
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <h2 className="auth-title">Verify Your Account</h2>
        <p style={{ textAlign: "center", marginBottom: "1rem", color: "#aaa" }}>
          Enter the 6-digit code sent to <strong>{emailOrPhone}</strong>
        </p>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleVerifyOtp} className="otp-form">
          <input
            type="text"
            maxLength={6}
            className="otp-input"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
          />
          <Button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button onClick={handleResendOtp} className="forgot-btn" disabled={loading}>
            Resend Code
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
