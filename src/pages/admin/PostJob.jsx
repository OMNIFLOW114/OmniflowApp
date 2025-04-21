import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { motion } from "framer-motion";

const PostJob = () => {
  const [job, setJob] = useState({
    title: "",
    description: "",
    courseRequired: "",
    company: "",
    location: "Remote",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setJob({ ...job, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("http://localhost:5000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(job),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ " + data.message);
        setJob({
          title: "",
          description: "",
          courseRequired: "",
          company: "",
          location: "Remote",
        });
      } else {
        setMessage("❌ " + data.error);
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setMessage("❌ Failed to post job.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-100 p-6 flex items-center justify-center">
      <motion.div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">📤 Post a Job</h2>

        <div className="space-y-4">
          {["title", "company", "courseRequired", "location", "description"].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-600 mb-1 capitalize">
                {field}
              </label>
              <input
                type={field === "description" ? "textarea" : "text"}
                name={field}
                value={job[field]}
                onChange={handleChange}
                placeholder={`Enter ${field}`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition"
        >
          Submit Job
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700 bg-blue-50 p-3 rounded-lg shadow-inner">
            {message}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default PostJob;
