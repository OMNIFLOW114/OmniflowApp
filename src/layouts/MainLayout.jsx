// src/layouts/MainLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import BottomNavbar from "@/components/BottomNavbar";

export default function MainLayout() {
  return (
    <div className="main-layout">
      <Outlet />
      <BottomNavbar />
    </div>
  );
}
