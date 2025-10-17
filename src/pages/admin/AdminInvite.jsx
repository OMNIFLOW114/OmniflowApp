import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/supabase";
import toast, { Toaster } from "react-hot-toast";

export default function AdminInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const verifyInvite = async () => {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (error || !data) return setStatus("invalid");
      if (data.accepted) return setStatus("used");
      if (new Date(data.expires_at) < new Date()) return setStatus("expired");

      setStatus("valid");
    };

    verifyInvite();
  }, [token]);

  const handleAccept = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please log in as the invited email before accepting.");
        navigate("/admin");
        return;
      }

      const userEmail = session.user.email;
      const { data: invite } = await supabase
        .from("admin_invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (!invite || invite.email !== userEmail) {
        toast.error("Invite does not match your account.");
        return;
      }

      // Add to admin_users
      await supabase.from("admin_users").insert({
        email: userEmail,
        user_id: session.user.id,
        role: invite.role,
        permissions: [],
        is_active: true,
        created_by: invite.invited_by,
      });

      // Mark invite used
      await supabase
        .from("admin_invitations")
        .update({ accepted: true })
        .eq("id", invite.id);

      toast.success("You are now an admin!");
      navigate("/admin-dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Error accepting invitation.");
    }
  };

  const states = {
    checking: <p>Verifying invitation…</p>,
    invalid: <p className="text-red-500">Invalid invitation token.</p>,
    expired: <p className="text-red-500">This invitation has expired.</p>,
    used: <p className="text-yellow-600">This invitation has already been used.</p>,
    valid: (
      <div>
        <p className="mb-3">Invitation verified ✅</p>
        <button onClick={handleAccept} className="btn btn-primary">Accept Invitation</button>
      </div>
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Toaster />
      {states[status]}
    </div>
  );
}
