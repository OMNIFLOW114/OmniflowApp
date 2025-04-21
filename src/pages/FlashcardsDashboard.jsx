// src/pages/student/FlashcardsDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaPlusSquare, FaPlay, FaChartBar, FaBrain } from "react-icons/fa";

const features = [
  {
    title: "Create Flashcards",
    icon: <FaPlusSquare size={28} />,
    link: "/student/flashcards/create",
    bg: "bg-indigo-500",
  },
  {
    title: "Study Mode",
    icon: <FaPlay size={28} />,
    link: "/student/flashcards/study",
    bg: "bg-green-500",
  },
  {
    title: "Track Progress",
    icon: <FaChartBar size={28} />,
    link: "/student/flashcards/progress",
    bg: "bg-blue-500",
  },
  {
    title: "AI Smart Review",
    icon: <FaBrain size={28} />,
    link: "/student/flashcards/ai-review",
    bg: "bg-pink-500",
  },
];

const FlashcardsDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-indigo-50 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-extrabold text-indigo-700 mb-6 text-center">
        🧠 Flashcards Zone
      </h1>
      <div className="flex flex-col gap-6 w-full max-w-md">
        {features.map((f, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className={`flex items-center gap-4 p-5 rounded-xl text-white cursor-pointer ${f.bg}`}
            onClick={() => navigate(f.link)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {f.icon}
            <span className="text-lg font-semibold">{f.title}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardsDashboard;
