import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./InstallmentOrdersTab.css";
import { format } from "date-fns";
import { toast } from "react-toastify";

const InstallmentOrdersTab = ({ sellerId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sellerId) fetchOrders();
  }, [sellerId]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("installment_orders")
      .select(`*, products(name), installment_payments(*), buyers:buyer_id(email)`)
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders.");
      console.error(error);
    } else {
      setOrders(data);
    }
    setLoading(false);
  };

  const updateStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from("installment_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Update failed.");
    } else {
      toast.success(`Marked as ${newStatus}`);
      fetchOrders();
    }
  };

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <div className="installments-container">
      {orders.map((order) => {
        const progress = (order.amount_paid / order.total_price) * 100;

        return (
          <div className="installment-card" key={order.id}>
            <div className="order-info">
              <h3>{order.products?.name || "Unnamed Product"}</h3>
              <p><strong>Order ID:</strong> {order.id}</p>
              <p><strong>Buyer:</strong> {order.buyers?.email || "Unknown"}</p>
              <p><strong>Placed On:</strong> {format(new Date(order.created_at), "dd MMM yyyy")}</p>

              <div className="financial-details">
                <p>Total: <strong>Ksh {order.total_price}</strong></p>
                <p>Paid: <strong>Ksh {order.amount_paid}</strong></p>
                <p>Installments: {order.number_of_installments} • Every {order.frequency}</p>
                <p>Next Due: {order.next_due_date ? format(new Date(order.next_due_date), "dd MMM yyyy") : "N/A"}</p>
              </div>

              <div className="progress-bar">
                <div className="filled" style={{ width: `${progress}%` }}></div>
              </div>

              <p className="status-label">
                Status: <span className={`status ${order.status}`}>{order.status}</span>
              </p>

              <div className="action-buttons">
                <button onClick={() => updateStatus(order.id, "pending")}>Mark as Pending</button>
                <button onClick={() => updateStatus(order.id, "processing")}>Mark as Processing</button>
                <button onClick={() => updateStatus(order.id, "shipped")}>Mark as Shipped</button>
                <button onClick={() => updateStatus(order.id, "completed")}>Mark as Completed</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InstallmentOrdersTab;
