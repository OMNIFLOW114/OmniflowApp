import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaBriefcase, FaComments } from "react-icons/fa";

const StudyBuddyAI = () => {
  const cards = [
    {
      icon: <FaBriefcase className="text-4xl text-blue-600" />,
      title: "Career AI",
      description: "Get smart AI-guided career advice tailored to your course and passion.",
      to: "/student/studybuddy/career"
    },
    {
      icon: <FaComments className="text-4xl text-pink-600" />,
      title: "AI Buddy",
      description: "Talk to your AI friend about life, stress, or anything on your mind.",
      to: "/student/studybuddy/buddy"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-purple-50 p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-purple-700 mb-2">🤖 StudyBuddy AI</h1>
        <p className="text-lg text-gray-600">Meet your new virtual companion. Always here. Always learning.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className="bg-white rounded-xl p-6 shadow-lg text-center"
          >
            <div className="mb-4">{card.icon}</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{card.title}</h2>
            <p className="text-gray-600 mb-4">{card.description}</p>
            <Link to={card.to} className="text-white bg-purple-600 px-4 py-2 rounded hover:bg-purple-700">
              Open
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default StudyBuddyAI;
