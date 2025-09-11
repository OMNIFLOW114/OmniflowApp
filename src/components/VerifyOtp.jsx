// src/components/VerifyOtp.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const emailOrPhone = state.emailOrPhone || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!emailOrPhone) {
      toast.error("No OTP session. Go back to login/signup.");
      navigate("/auth");
    }
  }, [emailOrPhone, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error("Enter the OTP code.");
      return;
    }
    setLoading(true);
    try {
      const payload = emailOrPhone.includes("@")
        ? { type: "email", email: emailOrPhone, token: otp }
        : { type: "sms", phone: emailOrPhone, token: otp };

      const { error } = await supabase.auth.verifyOtp(payload);
      if (error) throw error;

      // On success Supabase often signs the user in; check session and redirect
      const { data: { session } } = await supabase.auth.getSession();
      toast.success("Verified successfully!");
      navigate(session?.user ? "/home" : "/auth");
    } catch (err) {
      toast.error(err?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      if (emailOrPhone.includes("@")) {
        const { error } = await supabase.auth.resend({ type: "signup", email: emailOrPhone });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: emailOrPhone });
        if (error) throw error;
      }
      toast.success("OTP resent.");
    } catch (err) {
      toast.error(err?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">Verify OTP</h2>
        <p style={{ textAlign: "center", color: "#bbb" }}>Enter the code sent to <strong>{emailOrPhone}</strong></p>

        <form onSubmit={handleVerify} className="auth-form">
          <div className="auth-input-group">
            <label>OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} maxLength={6} className="otp-input" placeholder="123456" />
          </div>

          <Button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</Button>
        </form>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <button className="resend-btn" onClick={resendOtp} disabled={loading}>Resend code</button>
        </div>
      </div>
    </div>
  );
}
