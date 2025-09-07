// src/pages/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  FaBrain, FaBook, FaCalendarAlt, FaRobot, FaMoneyBillWave,
  FaUserGraduate, FaComments, FaHandsHelping, FaTrophy, FaFire, FaStar
} from "react-icons/fa";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ level: 1, xp: 0, quests: 0 });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: stu } = await supabase
        .from("student_stats")
        .select("level,xp,quests_completed")
        .eq("user_id", user.id)
        .single();
      if (stu) setStats({
        level: stu.level,
        xp: stu.xp,
        quests: stu.quests_completed
      });

      const { data: acts } = await supabase
        .from("student_activity")
        .select("activity,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (acts) setActivities(acts);
    })();
  }, [user]);

  const tiles = [
    { title: "AI Exam Generator", icon: <FaRobot />, link: "/student/exam-generator", desc: "Create smart quizzes" },
    { title: "Flashcards", icon: <FaBrain />, link: "/student/flashcards", desc: "Memorize with power" },
    { title: "Past Papers", icon: <FaBook />, link: "/student/past-papers", desc: "Practice & prepare" },
    { title: "Study Planner", icon: <FaCalendarAlt />, link: "/student/planner", desc: "Manage your schedule" },
    { title: "StudyBuddy AI", icon: <FaComments />, link: "/student/studybuddy", desc: "24/7 study support" },
    { title: "Career Guidance", icon: <FaUserGraduate />, link: "/student/careers", desc: "Explore career paths" },
    { title: "Scholarships & Loans", icon: <FaMoneyBillWave />, link: "/student/finance", desc: "Get financial help" },
    { title: "Request Help", icon: <FaHandsHelping />, link: "/student/request-help", desc: "Need support?" }
  ];

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h1>🎓 Student Hub</h1>
        <p>Welcome back, {user?.user_metadata?.full_name || "Scholar"}!</p>
      </header>

      <section className="stats-row">
        <div className="stat-box"><FaTrophy /> Level <span>{stats.level}</span></div>
        <div className="stat-box"><FaFire /> XP <span>{stats.xp}</span></div>
        <div className="stat-box"><FaStar /> Quests <span>{stats.quests}</span></div>
      </section>

      <section className="activity-log">
        <h2>🧾 Recent Activity</h2>
        {activities.length === 0 ? (
          <p className="empty-log">No activity yet. Start your learning journey!</p>
        ) : (
          <ul>
            {activities.map((a, i) => (
              <li key={i}>{a.activity} — {new Date(a.created_at).toLocaleDateString()}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="tiles-grid">
        {tiles.map((tile, i) => (
          <motion.div
            key={i}
            className="tile-card"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(tile.link)}
          >
            <div className="tile-icon">{tile.icon}</div>
            <div className="tile-body">
              <h3>{tile.title}</h3>
              <p>{tile.desc}</p>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default StudentDashboard;
