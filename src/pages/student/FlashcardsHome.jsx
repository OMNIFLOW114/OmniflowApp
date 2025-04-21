import React from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaBook, FaChartLine } from "react-icons/fa";

const FlashcardsHome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-6">🧠 Flashcards Hub</h1>
        <p className="text-gray-600 mb-8 text-lg">
          Create, study, and track your learning through smart flashcards.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button
            onClick={() => navigate("/student/flashcards/create")}
            className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition text-purple-700 font-semibold flex flex-col items-center"
          >
            <FaPlus size={32} />
            <span className="mt-2">Create Flashcards</span>
          </button>

          <button
            onClick={() => navigate("/student/flashcards/study")}
            className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition text-blue-600 font-semibold flex flex-col items-center"
          >
            <FaBook size={32} />
            <span className="mt-2">Study Flashcards</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardsHome;
