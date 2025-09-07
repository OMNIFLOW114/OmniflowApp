import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import { Button } from "@/components/ui/button";
import "./Auth.css";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    inviteCode: "",
  });

  const navigate = useNavigate();

useEffect(() => {
  const handleRedirectLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { id, email, user_metadata } = user;
    const name = user_metadata?.full_name || "No Name";
    const phone = user_metadata?.phone || "";

    const inviteCode = localStorage.getItem("inviteCode") || generateInviteCode();

    // ✅ Corrected RPC param names
    const { error: insertError } = await supabase.rpc("insert_user_if_not_exists", {
      p_user_id: id,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_invite_code: inviteCode,
    });

    if (insertError) {
      console.error("Insert user RPC failed:", insertError);
    } else {
      console.log("✅ Google user synced to `users` table");
    }

    navigate("/home");
  };

  handleRedirectLogin();

  const { data: listener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        navigate("/home");
      }
    }
  );

  return () => {
    listener?.subscription?.unsubscribe();
  };
}, []);


  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMode = () => {
    setError("");
    setShowModal(false);
    setIsSignUp((prev) => !prev);
  };

  const isValidPassword = (pwd) => {
    return /[a-z]/.test(pwd) &&
      /[A-Z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      pwd.length >= 8;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { name, phone, email, password, inviteCode } = formData;

    try {
      if (isSignUp) {
        if (!isValidPassword(password)) {
          throw new Error("Password must include uppercase, lowercase, number, and 8+ characters.");
        }

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, phone },
          },
        });

        if (signUpErr?.message?.includes("already registered")) {
          setShowModal(true);
          return;
        }

        if (signUpErr) throw signUpErr;
        if (!data.user) throw new Error("Sign up failed.");

        const userId = data.user.id;
        const newInviteCode = generateInviteCode();

        await supabase.from("users").insert([{
          id: userId,
          name,
          email,
          phone,
          profile_completed: false,
          invite_code: newInviteCode,
        }]);

        // Handle invite tracking
        if (inviteCode) {
          const { data: inviter } = await supabase
            .from("users")
            .select("id")
            .eq("invite_code", inviteCode)
            .maybeSingle();

          if (inviter) {
            await supabase.from("referrals").insert([{
              inviter_id: inviter.id,
              invitee_id: userId,
            }]);
          }
        }

        // Ensure session
        if (!data.session) {
          const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
          if (loginErr) throw loginErr;
        }

        alert("🎉 Account created successfully!");
        navigate("/profile");

      } else {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginErr) throw loginErr;

        alert("✅ Logged in!");
        navigate("/home");
      }

    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Enter your email to reset password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      setError(error.message);
    } else {
      alert("📧 Password reset link sent to your email.");
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
        <h2 className="auth-title">{isSignUp ? "Create an Account" : "Welcome Back"}</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <>
              <div className="auth-input-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="+254712345678"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label htmlFor="inviteCode">Invite Code (optional)</label>
                <input
                  type="text"
                  id="inviteCode"
                  name="inviteCode"
                  placeholder="ABC123"
                  value={formData.inviteCode}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="auth-input-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {!isSignUp && (
            <div className="forgot-password">
              <button type="button" className="forgot-btn" onClick={handleForgotPassword}>
                Forgot Password?
              </button>
            </div>
          )}

          <Button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Log In"}
          </Button>
        </form>

        <div className="auth-divider">or</div>

        <button onClick={handleGoogleSignIn} className="google-signin-btn" disabled={loading}>
          {loading ? "Please wait..." : "Sign In with Google"}
        </button>

        <div className="toggle-form-text">
          <p>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={toggleMode} className="toggle-btn">
              {isSignUp ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>
      </motion.div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Account Already Exists</h3>
            <p>An account with this email already exists. Please log in.</p>
            <Button onClick={toggleMode}>Proceed to Login</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
