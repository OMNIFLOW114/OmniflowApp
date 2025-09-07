// src/pages/business/BusinessHub.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBriefcase, FaGlobeAfrica, FaRobot, FaHandshake, FaUsers
} from "react-icons/fa";
import "./BusinessHub.css";

const BusinessHub = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setJobs([
      { title: "Field Agent – Census", location: "Kisumu", type: "Contract", deadline: "July 25" },
      { title: "Digital Clerk – Government Program", location: "Nairobi", type: "Temporary", deadline: "July 30" },
    ]);

    setGigs([
      { title: "Data Entry – Health Survey", pay: "$0.15/form", deadline: "Ongoing" },
      { title: "Image Labeling for AI", pay: "$0.10/image", deadline: "Ongoing" },
    ]);

    const checkDark = () => setIsDark(document.body.classList.contains("dark"));
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`businesshub-container ${isDark ? 'dark' : ''}`}>
      <header className="hero">
        <h1>Business Hub</h1>
        <p>Connecting talent to opportunity across Africa and beyond.</p>
        <button onClick={() => navigate("/join")} className="cta">Join Now</button>
      </header>

      <section className="section jobs">
        <h2><FaBriefcase /> Government & NGO Jobs</h2>
        <div className="card-list">
          {jobs.map((job, index) => (
            <div className="card" key={index}>
              <h3>{job.title}</h3>
              <p>{job.location} • {job.type}</p>
              <small>Apply by: {job.deadline}</small>
              <button>Apply</button>
            </div>
          ))}
        </div>
      </section>

      <section className="section gigs">
        <h2><FaGlobeAfrica /> Remote Gigs & Tasks</h2>
        <div className="card-list">
          {gigs.map((gig, index) => (
            <div className="card" key={index}>
              <h3>{gig.title}</h3>
              <p>Pay: {gig.pay}</p>
              <small>{gig.deadline}</small>
              <button>Start</button>
            </div>
          ))}
        </div>
      </section>

      <section className="section ai">
        <h2><FaRobot /> Career AI Assistant</h2>
        <p>Ask anything: CV help, job ideas, interview practice — all from AI.</p>
        <button onClick={() => navigate("/ai-assistant")}>Ask AI</button>
      </section>

      <section className="section referrals">
        <h2><FaUsers /> Referral Program</h2>
        <p>Invite friends. Get rewarded when they earn or get hired.</p>
        <button onClick={() => navigate("/referrals")}>Start Referring</button>
      </section>

      <section className="section partner">
        <h2><FaHandshake /> For Employers & NGOs</h2>
        <p>Hire fast. Pay fairly. Reach talent across Africa with OP3N Market.</p>
        <button onClick={() => navigate("/business/post")}>Post a Job</button>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Business Hub • Built for the Next Billion</p>
      </footer>
    </div>
  );
};

export default BusinessHub;
