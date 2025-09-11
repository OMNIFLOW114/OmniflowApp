// src/components/VerifyOtp.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import "./Auth.css";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { emailOrPhone, type = "email" } = location.state || {};

  // If accessed directly without state, redirect
  useEffect(() => {
    if (!emailOrPhone) {
      toast.error("Session expired. Please log in again.");
      navigate("/auth");
    }
  }, [emailOrPhone, navigate]);

  // Handle OTP verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp || otp.length < 4) {
      toast.error("Please enter the full OTP code.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        type: type === "phone" ? "sms" : "email",
        token: otp,
        [type]: emailOrPhone,
      });

      if (error) throw error;

      if (data?.session) {
        toast.success("✅ OTP verified successfully!");
        navigate("/home"); // or your dashboard route
      } else {
        toast.error("Verification failed. Please try again.");
      }
    } catch (err) {
      toast.error(err.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container glass-card">
        <h2 className="auth-title">Verify OTP</h2>
        <p style={{ textAlign: "center", color: "#bbb", marginBottom: "20px" }}>
          Enter the one-time code sent to{" "}
          <strong>{emailOrPhone}</strong>.
        </p>

        <form onSubmit={handleVerifyOtp} className="auth-form">
          <div className="auth-input-group">
            <label>OTP Code</label>
            <input
              type="text"
              placeholder="Enter your code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="otp-input"
            />
          </div>

          <Button type="submit" disabled={loading} className="auth-button">
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>

        <div className="auth-footer">
          <Button
            variant="link"
            onClick={() => navigate("/auth")}
            style={{ marginTop: "12px" }}
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
