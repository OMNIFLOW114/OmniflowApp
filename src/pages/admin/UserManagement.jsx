import React, { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import "./UserManagement.css";

const USERS_PER_PAGE = 10;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const from = (page - 1) * USERS_PER_PAGE;
    const to = from + USERS_PER_PAGE - 1;

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        stores:stores!stores_owner_id_fkey(id, is_verified)
      `)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const toggleField = async (userId, field, value) => {
    const { error } = await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", userId);

    if (error) {
      console.error(`Failed to update ${field}:`, error);
      alert(`Failed to update ${field}`);
    } else {
      fetchUsers();
    }
  };

  const toggleStoreVerification = async (storeId, value) => {
    const { error } = await supabase
      .from("stores")
      .update({ is_verified: value, verified_at: value ? new Date() : null })
      .eq("id", storeId);

    if (error) {
      console.error("Failed to update store verification:", error);
      alert("Failed to verify/unverify store");
    } else {
      fetchUsers();
    }
  };

  return (
    <div className="user-management-container">
      <h2>👥 User Management Dashboard</h2>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="user-list">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-info">
                <h4>{user.name || "Unnamed User"}</h4>
                <p>Email: {user.email || "N/A"}</p>
                <p>Phone: {user.phone || "N/A"}</p>
                <p>User ID: {user.id}</p>
                <p>
                  Store Owner:{" "}
                  <strong style={{ color: user.stores?.id ? "green" : "crimson" }}>
                    {user.stores?.id ? "Yes" : "No"}
                  </strong>
                </p>
                {user.stores?.id && (
                  <p>
                    Store Verified:{" "}
                    <strong style={{ color: user.stores.is_verified ? "#40c057" : "#aaa" }}>
                      {user.stores.is_verified ? "✔ Verified" : "✖ Not Verified"}
                    </strong>
                  </p>
                )}
                <p>
                  Premium:{" "}
                  <strong style={{ color: user.is_premium ? "gold" : "#aaa" }}>
                    {user.is_premium ? "✔ Premium" : "✖ Free"}
                  </strong>
                </p>
              </div>

              <div className="user-actions">
                <button
                  className={user.is_banned ? "unban" : "ban"}
                  onClick={() => toggleField(user.id, "is_banned", !user.is_banned)}
                >
                  {user.is_banned ? "Unban" : "Ban"}
                </button>

                <button
                  className={user.can_create_store ? "revoke" : "grant"}
                  onClick={() => toggleField(user.id, "can_create_store", !user.can_create_store)}
                >
                  {user.can_create_store ? "Revoke Store Access" : "Grant Store Access"}
                </button>

                <button
                  className={user.is_premium ? "revoke-premium" : "grant-premium"}
                  onClick={() => toggleField(user.id, "is_premium", !user.is_premium)}
                >
                  {user.is_premium ? "Revoke Premium" : "Grant Premium"}
                </button>

                {user.stores?.id && (
                  <button
                    className={user.stores.is_verified ? "revoke-verify" : "grant-verify"}
                    onClick={() =>
                      toggleStoreVerification(user.stores.id, !user.stores.is_verified)
                    }
                  >
                    {user.stores.is_verified ? "Unverify Store" : "Verify Store"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
          ← Prev
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>
    </div>
  );
};

export default UserManagement;
