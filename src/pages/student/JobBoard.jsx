import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const JobBoard = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/jobs");
        const data = await res.json();
        setJobs(data || []); // Ensure fallback
      } catch (error) {
        console.error("❌ Failed to fetch jobs:", error);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const matchSearch =
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.company?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || job.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-blue-100 p-5 sm:p-10">
      {/* Title */}
      <div className="max-w-5xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-bold text-blue-700 mb-2">💼 Job Matching</h1>
        <p className="text-gray-600 text-md">Find internships & job opportunities tailored to your course.</p>
      </div>

      {/* Search + Filter */}
      <div className="max-w-4xl mx-auto bg-white p-4 rounded-2xl shadow flex flex-col sm:flex-row gap-4 mb-10">
        <input
          type="text"
          placeholder="🔍 Search by title or company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option>All</option>
          <option>Internship</option>
          <option>Remote</option>
          <option>Full-time</option>
        </select>
      </div>

      {/* Job Listings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto pb-10">
        {filteredJobs.length === 0 ? (
          <motion.div
            className="col-span-full text-center text-gray-500 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            😕 No jobs found matching your criteria.
          </motion.div>
        ) : (
          filteredJobs.map((job, i) => (
            <motion.div
              key={i}
              className="bg-white p-5 rounded-2xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition"
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex flex-col gap-1 mb-2">
                <h3 className="text-lg font-bold text-blue-700">{job.title}</h3>
                <p className="text-sm text-gray-600">{job.company}</p>
                <p className="text-xs text-gray-500">{job.location} • {job.type || "General"}</p>
              </div>
              <p className="text-sm text-gray-700 mb-4 line-clamp-4">{job.description}</p>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg">
                Apply Now
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobBoard;
