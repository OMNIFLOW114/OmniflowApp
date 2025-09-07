// components/MainLayout.jsx
import React from "react";

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout" style={{ paddingBottom: "70px" }}>
      {children}
    </div>
  );
};

export default MainLayout;
