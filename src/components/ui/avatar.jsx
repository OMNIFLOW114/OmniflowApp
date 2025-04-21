import React from "react";

export const Avatar = ({ src, alt = "Avatar", className = "" }) => {
  return (
    <div className={`w-12 h-12 rounded-full overflow-hidden bg-gray-200 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-gray-500">
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};
