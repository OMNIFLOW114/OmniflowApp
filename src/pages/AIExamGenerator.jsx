import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FaRocket, FaSearch, FaFileAlt, FaMicrophone, FaBolt
} from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabase";
import Tesseract from "tesseract.js";

const AIExamGenerator = () => {
  const { currentUser } = useAuth();
  const userCourse = currentUser?.course || "Computer Science";

  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [boostTopic, setBoostTopic] = useState("");
  const [boostResult, setBoostResult] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const callGroq = async (prompt, type = "general") => {
    try {
      setLoading(true);
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const aiContent = data?.choices?.[0]?.message?.content?.trim() || "❌ No response from AI.";

      if (currentUser) {
        await supabase.from("ai_logs").insert({
          user_id: currentUser.id,
          type,
          prompt,
          response: aiContent,
        });
      }

      return aiContent;
    } catch (err) {
      console.error("Groq API Error:", err);
      return "❌ Failed to connect to AI.";
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateExam = async () => {
    const prompt = `Generate 3 university-level exam questions only (no answers), based on the course: ${userCourse}. Number them.`;
    const result = await callGroq(prompt, "exam-generator");
    const parsed = result.split(/\n\d+[.)]?\s/).filter((q) => q.trim() !== "");
    setQuestions(parsed.map((q, i) => ({ id: i + 1, q })));
  };

  const handleSearch = async () => {
    const prompt = `As an expert ${userCourse} tutor, explain this in detail: "${searchQuery}"`;
    setSearchResult(await callGroq(prompt, "academic-search"));
  };

  const handleBoost = async () => {
    const prompt = `I'm struggling with "${boostTopic}" in ${userCourse}. Help me understand it with tips, simplified breakdowns, and steps to improve.`;
    setBoostResult(await callGroq(prompt, "boost-mode"));
  };

  const handleVoiceExplain = async () => {
    const prompt = `Act as an encouraging AI tutor. Give a short 2-sentence motivation to a ${userCourse} student before exams.`;
    setVoiceResponse(await callGroq(prompt, "voice-motivation"));
  };

  const handleAssignmentScan = async () => {
    if (!assignmentFile) return;
    setLoading(true);
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(assignmentFile, "eng");
      const prompt = `Solve this scanned assignment for a ${userCourse} student:\n${text}`;
      setSearchResult(await callGroq(prompt, "assignment-scan"));
    } catch (err) {
      console.error("OCR Error:", err);
      setSearchResult("❌ Could not read the file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-blue-50 p-6 text-gray-800">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto text-center mb-10"
      >
        <h1 className="text-4xl font-extrabold text-blue-700 mb-2">🎓 AI Exam Generator</h1>
        <p className="text-lg text-gray-600">
          Study smarter: Course-specific questions, assignment scanner, AI search, motivation & boost mode.
        </p>
      </motion.div>

      <FeatureCard icon={<FaRocket />} title="Course-Aware Exam Generator" color="purple" onClick={handleGenerateExam} loading={loading}>
        {questions.map((q) => (
          <div key={q.id} className="bg-purple-50 p-4 border rounded-xl mt-4">
            <p className="font-semibold mb-2">{q.q}</p>
            <textarea rows={3} placeholder="Type your answer..." className="w-full p-3 border rounded" />
          </div>
        ))}
      </FeatureCard>

      <FeatureCard icon={<FaSearch />} title="StudyGPT: Ask Anything" color="blue" onClick={handleSearch}
        inputValue={searchQuery} onInputChange={(e) => setSearchQuery(e.target.value)} placeholder={`Ask something in ${userCourse}`}>
        {searchResult && <p className="mt-4 whitespace-pre-wrap text-gray-700">{searchResult}</p>}
      </FeatureCard>

      <FeatureCard icon={<FaBolt />} title="Boost My Grade" color="amber" onClick={handleBoost}
        inputValue={boostTopic} onInputChange={(e) => setBoostTopic(e.target.value)} placeholder="Topic you're struggling with...">
        {boostResult && <p className="mt-4 whitespace-pre-wrap text-gray-700">{boostResult}</p>}
      </FeatureCard>

      <FeatureCard icon={<FaFileAlt />} title="Assignment Scanner (PDF/Image)" color="green" onClick={handleAssignmentScan}>
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setAssignmentFile(e.target.files[0])} className="mb-3" />
        {searchResult && <p className="mt-4 whitespace-pre-wrap text-gray-700">{searchResult}</p>}
      </FeatureCard>

      <FeatureCard icon={<FaMicrophone />} title="Interactive Voice AI Tutor" color="pink" onClick={handleVoiceExplain}>
        {voiceResponse && <p className="mt-4 whitespace-pre-wrap text-gray-700">{voiceResponse}</p>}
      </FeatureCard>
    </div>
  );
};

const FeatureCard = ({ icon, title, color, onClick, inputValue, onInputChange, placeholder, children, loading }) => (
  <motion.div className="bg-white p-6 rounded-xl shadow-xl mb-10" whileHover={{ scale: 1.01 }}>
    <h2 className={`text-xl font-bold text-${color}-600 mb-4 flex items-center gap-2`}>{icon} {title}</h2>
    {onInputChange && (
      <input value={inputValue} onChange={onInputChange} placeholder={placeholder}
        className="w-full p-3 border rounded mb-3" />
    )}
    <button onClick={onClick} className={`bg-${color}-500 text-white py-2 px-6 rounded hover:bg-${color}-600`}>
      {title.includes("Scan") ? "Scan & Solve" : title.includes("Tutor") ? "Inspire Me" : title.includes("Boost") ? "Boost Me" : "Ask AI"}
    </button>
    {loading && <p className={`text-sm text-${color}-400 mt-2`}>Loading...</p>}
    {children}
  </motion.div>
);

export default AIExamGenerator;
