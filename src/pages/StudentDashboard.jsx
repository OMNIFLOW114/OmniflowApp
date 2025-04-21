// src/pages/student/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBrain,
  FaBook,
  FaCalendarAlt,
  FaRobot,
  FaComments,
  FaBriefcase,
  FaPlus,
} from "react-icons/fa";

const tiles = [
  {
    title: "AI Exam Generator",
    icon: <FaRobot size={22} />,
    desc: "Create custom quizzes instantly with AI.",
    link: "/student/exam-generator",
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Flashcards",
    icon: <FaBrain size={22} />,
    desc: "Create, review, and master flashcards.",
    link: "/student/flashcards",
    color: "from-yellow-400 to-orange-500",
  },
  {
    title: "Past Papers",
    icon: <FaBook size={22} />,
    desc: "Access thousands of organized past exams.",
    link: "/student/past-papers",
    color: "from-indigo-500 to-blue-500",
  },
  {
    title: "Study Planner",
    icon: <FaCalendarAlt size={22} />,
    desc: "Build your ideal weekly study schedule.",
    link: "/student/planner",
    color: "from-green-400 to-emerald-600",
  },
  {
    title: "StudyBuddy AI",
    icon: <FaComments size={22} />,
    desc: "Ask questions, get explained like a friend.",
    link: "/student/studybuddy",
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "Job Matching",
    icon: <FaBriefcase size={22} />,
    desc: "Find jobs tailored to your course & skills.",
    link: "/student/jobs",
    color: "from-blue-700 to-cyan-500",
  },
];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [recentUpdates, setRecentUpdates] = useState([]);

  useEffect(() => {
    setRecentUpdates([
      "You earned 50 XP in the last study session!",
      "Your recent flashcard set was successfully uploaded.",
      "New AI-generated quiz available for your next exam!",
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 p-5 sm:p-10">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-700 mb-2">
          🎓 Student Assistant
        </h1>
        <p className="text-gray-600 text-md sm:text-lg">
          Your AI-powered academic toolkit. Explore, learn, and achieve more!
        </p>
      </div>

      {/* 🔔 Recent Updates */}
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-md mb-12">
        <h2 className="text-xl font-bold text-blue-600 mb-4">🔔 Recent Updates</h2>
        <ul className="space-y-3 text-gray-700">
          {recentUpdates.map((update, i) => (
            <motion.li
              key={i}
              className="bg-blue-100 p-3 rounded-xl text-sm"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              {update}
            </motion.li>
          ))}
        </ul>
      </div>

      {/* ⚙️ Main Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
        {tiles.map((tile, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className={`p-5 rounded-2xl shadow-lg text-white cursor-pointer bg-gradient-to-br ${tile.color}`}
            onClick={() => navigate(tile.link)}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-center gap-3 mb-2">
              {tile.icon}
              <h3 className="text-lg font-bold">{tile.title}</h3>
            </div>
            <p className="text-white/90 text-sm">{tile.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* 📤 Post Job CTA */}
      <div className="flex justify-center mb-12">
        <button
          onClick={() => navigate("/admin/post-job")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all"
        >
          <FaPlus size={14} /> Post a Job
        </button>
      </div>

      {/* 💡 Motivation Section */}
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl shadow-md text-center">
        <h2 className="text-xl font-bold text-green-600 mb-2">💡 Keep Going!</h2>
        <p className="text-gray-700">
          "Success is the sum of small efforts, repeated day in and day out."
        </p>
        <p className="text-md text-gray-500 mt-1">Stay consistent. You're doing great!</p>
      </div>
    </div>
  );
};

export default StudentDashboard;
