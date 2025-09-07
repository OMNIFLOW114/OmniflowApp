import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";


const CareerAdvisor = () => {
  const { currentUser } = useAuth();
  const [careerInput, setCareerInput] = useState("");
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);

  const getAdvice = async () => {
    setLoading(true);
    const prompt = `Act as a career advisor for a student studying ${currentUser?.course || "Computer Science"}.
    They are interested in: ${careerInput}.
    Suggest practical career paths, future trends, job markets, and resources to get started.`;
    const response = await callGroq(prompt);
    setAdvice(response);
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-white via-blue-50 to-purple-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-700 mb-4">🎯 Career AI Advisor</h1>
        <input
          value={careerInput}
          onChange={(e) => setCareerInput(e.target.value)}
          className="w-full p-4 rounded border mb-4"
          placeholder="What are your interests? (e.g., AI, cybersecurity, business...)"
        />
        <button
          onClick={getAdvice}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Get Career Guidance
        </button>

        {loading && <p className="mt-4 text-blue-500 animate-pulse">Thinking about your future...</p>}

        {advice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 bg-white p-6 rounded-xl shadow"
          >
            <p className="whitespace-pre-wrap">{advice}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CareerAdvisor;
