// src/pages/student/Scholarships.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUniversity, FaMoneyCheckAlt } from "react-icons/fa";
import "./Scholarships.css";

const Scholarships = () => {
  const navigate = useNavigate();

  const programs = [
    {
      name: "Higher Ed Bursary Fund",
      provider: "Ministry of Education",
      description: "Financial aid for students in tertiary institutions.",
    },
    {
      name: "SmartScholar Loan",
      provider: "Student Loan Authority",
      description: "Low-interest loans for STEM students.",
    },
    {
      name: "CampusStars Grant",
      provider: "Global Edu Trust",
      description: "Merit-based scholarship for top-performing students.",
    },
  ];

  return (
    <div className="scholarship-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
      <h2>🎓 Scholarships & Student Loans</h2>
      <div className="scholarship-list">
        {programs.map((p, i) => (
          <div key={i} className="scholarship-card">
            <h3><FaUniversity /> {p.name}</h3>
            <p><strong>Provider:</strong> {p.provider}</p>
            <p>{p.description}</p>
            <button className="apply-button">
              <FaMoneyCheckAlt /> Apply Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scholarships;
