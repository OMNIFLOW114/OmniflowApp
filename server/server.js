import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/reset-password
// { email: string, newPassword: string }
app.post("/api/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and newPassword required" });
  }

  // Validate password strength
  if (
    !/[a-z]/.test(newPassword) ||
    !/[A-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword) ||
    newPassword.length < 8
  ) {
    return res.status(400).json({
      error: "Password must include uppercase, lowercase, number, 8+ chars",
    });
  }

  try {
    // Check if user exists
    const { data: userData, error: getUserError } = await supabase.auth.admin.listUsers({
      filter: `email=eq.${email}`,
    });

    if (getUserError) throw getUserError;
    if (!userData || userData.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userData[0].id;

    // Update password
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    return res.json({ message: "Password successfully updated!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
