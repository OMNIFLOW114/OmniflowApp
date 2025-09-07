import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaHome, FaBrain, FaRobot, FaBookOpen, FaCalendarCheck,
  FaUserGraduate, FaHandsHelping, FaBriefcase, FaComments
} from "react-icons/fa";
import "./StudentSidebar.css";

const StudentSidebar = () => {
  const links = [
    { label: "Dashboard", icon: <FaHome />, path: "/student" },
    { label: "AI Exams", icon: <FaRobot />, path: "/student/exam-generator" },
    { label: "Flashcards", icon: <FaBrain />, path: "/student/flashcards" },
    { label: "Past Papers", icon: <FaBookOpen />, path: "/student/past-papers" },
    { label: "Planner", icon: <FaCalendarCheck />, path: "/student/planner" },
    { label: "Careers", icon: <FaUserGraduate />, path: "/student/careers" },
    { label: "Opportunities", icon: <FaBriefcase />, path: "/student/opportunities" },
    { label: "Ask Help", icon: <FaHandsHelping />, path: "/student/help" },
    { label: "StudyBuddy", icon: <FaComments />, path: "/student/studybuddy" },
  ];

  return (
    <nav className="student-sidebar">
      <ul>
        {links.map((link, i) => (
          <li key={i}>
            <NavLink to={link.path} className="student-nav-link">
              <span className="icon">{link.icon}</span>
              <span className="label">{link.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default StudentSidebar;
