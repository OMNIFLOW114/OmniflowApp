// server/server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Enable CORS for your frontend domain only
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*", // e.g., https://omniflowapp.co.ke
  })
);
app.use(bodyParser.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to validate strong password
const isStrongPassword = (pwd) =>
  /[a-z]/.test(pwd) &&
  /[A-Z]/.test(pwd) &&
  /[0-9]/.test(pwd) &&
  pwd.length >= 8;

// POST /api/reset-password
// Body: { email: string, newPassword: string }
app.post("/api/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and newPassword required." });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      error: "Password must include uppercase, lowercase, number, and be 8+ chars.",
    });
  }

  try {
    // Check if user exists
    const { data: userData, error: listError } = await supabase.auth.admin.listUsers({
      filter: `email=eq.${email}`,
    });

    if (listError) throw listError;
    if (!userData || userData.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const userId = userData[0].id;

    // Update password
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    return res.json({ message: "Password successfully updated!" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: err.message || "Server error." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
