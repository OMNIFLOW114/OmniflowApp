// src/components/ui/card.jsx
import React from "react";

/**
 * Card: The outer container with shadow, rounded corners, background
 */
export const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * CardContent: Padding wrapper inside Card for content
 */
export const CardContent = ({ children, className = "" }) => {
  return <div className={`p-4 ${className}`}>{children}</div>;
};

/**
 * Optional: CardHeader or CardFooter can be added similarly if needed
 */
