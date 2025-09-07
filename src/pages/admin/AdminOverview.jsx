import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useDarkMode } from "@/context/DarkModeContext";
import { supabase } from "@/lib/supabaseClient";
import "./AdminOverview.css";

const userData = [
  { day: "Mon", users: 120, sales: 210 },
  { day: "Tue", users: 200, sales: 330 },
  { day: "Wed", users: 150, sales: 280 },
  { day: "Thu", users: 180, sales: 390 },
  { day: "Fri", users: 230, sales: 410 },
  { day: "Sat", users: 250, sales: 450 },
  { day: "Sun", users: 300, sales: 480 },
];

const productData = [
  { category: "Electronics", count: 120 },
  { category: "Clothing", count: 98 },
  { category: "Books", count: 65 },
  { category: "Beauty", count: 80 },
  { category: "Sports", count: 45 },
];

const AdminOverview = () => {
  const { darkMode } = useDarkMode();
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data, error } = await supabase.rpc("get_admin_metrics");
      if (error) {
        console.error("Error fetching metrics:", error.message);
      } else {
        setMetrics(data[0]);
      }
    };

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) {
        console.error("Error fetching logs:", error.message);
      } else {
        setLogs(data);
      }
    };

    fetchMetrics();
    fetchLogs();
  }, []);

  return (
    <div className={`overview-page ${darkMode ? "dark-mode" : ""}`}>
      <h2 className="overview-title">📊 Weekly KPIs & Metrics</h2>

      {metrics && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <h5>Total Users</h5>
            <p>{metrics.total_users}</p>
          </div>
          <div className="kpi-card">
            <h5>Total Products</h5>
            <p>{metrics.total_products}</p>
          </div>
          <div className="kpi-card">
            <h5>Active Stores</h5>
            <p>{metrics.total_stores}</p>
          </div>
          <div className="kpi-card">
            <h5>Total Messages</h5>
            <p>{metrics.total_messages}</p>
          </div>
          <div className="kpi-card">
            <h5>Wallet Value (OMC)</h5>
            <p>{metrics.total_wallet_balance?.toLocaleString() ?? 0} OMC</p>
          </div>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <h4>User Growth vs Sales</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userData}>
              <Line type="monotone" dataKey="users" stroke="#10b981" />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" />
              <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4>Product Category Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="activity-feed">
        <h4>🧾 Recent Activity Logs</h4>
        <ul>
          {logs.length === 0 && <li>No recent logs found.</li>}
          {logs.map((log) => (
            <li key={log.id}>
              <span className="log-type">{log.event_type}</span>
              <span className="log-desc">{log.description}</span>
              <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminOverview;
