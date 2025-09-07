import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useDarkMode } from "@/context/DarkModeContext";
import "./AdminInstallments.css";

const AdminInstallments = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { darkMode } = useDarkMode();

  useEffect(() => {
    fetchInstallments();
  }, []);

  const fetchInstallments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("installment_orders")
      .select(`
        *,
        users:buyer_id(full_name, email),
        sellers:seller_id(full_name, email),
        products(name),
        installment_payments(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch installment orders.");
      console.error(error);
    } else {
      setOrders(data);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase
      .from("installment_orders")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success("Status updated.");
      fetchInstallments();
    }
  };

  const updateDeliveryStatus = async (id, delivery_status) => {
    const { error } = await supabase
      .from("installment_orders")
      .update({ delivery_status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update delivery status.");
    } else {
      toast.success("Delivery status updated.");
      fetchInstallments();
    }
  };

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  return (
    <div className={`admin-installments-page ${darkMode ? "dark-mode" : ""}`}>
      <header className="admin-installments-header">
        <h2>Installment Oversight</h2>
        <select onChange={(e) => setFilter(e.target.value)} value={filter}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </header>

      {loading ? (
        <div className="loading">Loading installment data...</div>
      ) : (
        <div className="installment-list">
          {filteredOrders.map((order) => {
            const progress =
              (order.amount_paid / order.total_price) * 100;

            return (
              <div className="installment-admin-card" key={order.id}>
                <div className="info">
                  <h4>{order.products?.name || "Unknown Product"}</h4>
                  <p><strong>Buyer:</strong> {order.users?.full_name} ({order.users?.email})</p>
                  <p><strong>Seller:</strong> {order.sellers?.full_name} ({order.sellers?.email})</p>
                  <p><strong>Total:</strong> Ksh {order.total_price}</p>
                  <p><strong>Paid:</strong> Ksh {order.amount_paid}</p>
                  <p><strong>Installment Amount:</strong> Ksh {order.installment_amount}</p>
                  <p><strong>Installments:</strong> {order.number_of_installments} ({order.frequency})</p>
                  <p><strong>Missed Payments:</strong> {order.missed_payments}</p>
                  <p><strong>Next Due:</strong> {order.next_due_date ? format(new Date(order.next_due_date), "dd MMM yyyy") : "N/A"}</p>
                  <p><strong>Last Payment:</strong> {order.last_payment_at ? format(new Date(order.last_payment_at), "dd MMM yyyy") : "N/A"}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={`status ${order.status}`}>{order.status}</span>
                  </p>
                  <p>
                    <strong>Delivery:</strong>{" "}
                    <span className={`status ${order.delivery_status}`}>{order.delivery_status}</span>
                  </p>

                  <div className="progress-bar">
                    <div
                      className="progress"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="actions">
                    <label>Update Order Status:</label>
                    <div className="status-actions">
                      <button onClick={() => updateOrderStatus(order.id, "active")}>Active</button>
                      <button onClick={() => updateOrderStatus(order.id, "completed")}>Completed</button>
                      <button onClick={() => updateOrderStatus(order.id, "cancelled")}>Cancelled</button>
                    </div>

                    <label>Update Delivery Status:</label>
                    <div className="status-actions">
                      <button onClick={() => updateDeliveryStatus(order.id, "processed")}>Processed</button>
                      <button onClick={() => updateDeliveryStatus(order.id, "shipped")}>Shipped</button>
                      <button onClick={() => updateDeliveryStatus(order.id, "out_for_delivery")}>Out for Delivery</button>
                      <button onClick={() => updateDeliveryStatus(order.id, "delivered")}>Delivered</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminInstallments;
