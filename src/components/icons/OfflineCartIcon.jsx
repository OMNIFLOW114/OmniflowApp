// src/components/icons/OfflineCartIcon.jsx
import React from "react";

const OfflineCartIcon = ({ size = 200 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', margin: '0 auto' }}
    >
      {/* Shopping Cart Body */}
      <g transform="rotate(-15, 100, 100)">
        {/* Cart Base/Body */}
        <rect 
          x="40" 
          y="70" 
          width="100" 
          height="60" 
          rx="8" 
          fill="currentColor" 
          opacity="0.15"
        />
        
        {/* Cart Top Edge */}
        <rect 
          x="35" 
          y="65" 
          width="110" 
          height="10" 
          rx="3" 
          fill="currentColor" 
          opacity="0.3"
        />
        
        {/* Cart Handle */}
        <path 
          d="M70 65 L70 40 C70 30 80 25 90 25 L110 25 C120 25 130 30 130 40 L130 65" 
          stroke="currentColor" 
          strokeWidth="6" 
          fill="none" 
          opacity="0.4"
          strokeLinecap="round"
        />
        
        {/* Broken Wheel Left */}
        <circle 
          cx="60" 
          cy="135" 
          r="18" 
          stroke="currentColor" 
          strokeWidth="5" 
          fill="none" 
          opacity="0.5"
        />
        <circle 
          cx="60" 
          cy="135" 
          r="6" 
          fill="currentColor" 
          opacity="0.3"
        />
        {/* Broken spokes - left wheel */}
        <line 
          x1="60" 
          y1="117" 
          x2="60" 
          y2="125" 
          stroke="#EF4444" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <line 
          x1="72" 
          y1="135" 
          x2="66" 
          y2="135" 
          stroke="#EF4444" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        
        {/* Broken Wheel Right */}
        <circle 
          cx="120" 
          cy="135" 
          r="18" 
          stroke="currentColor" 
          strokeWidth="5" 
          fill="none" 
          opacity="0.5"
        />
        <circle 
          cx="120" 
          cy="135" 
          r="6" 
          fill="currentColor" 
          opacity="0.3"
        />
        {/* Cracked/broken wheel */}
        <path 
          d="M120 135 L128 128 M120 135 L115 142 M120 135 L130 140" 
          stroke="#EF4444" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          opacity="0.8"
        />
        
        {/* Cart Falling Effect - Items falling out */}
        <rect 
          x="45" 
          y="130" 
          width="20" 
          height="15" 
          rx="2" 
          fill="#EF4444" 
          opacity="0.6"
          transform="rotate(30, 55, 137)"
        />
        <rect 
          x="135" 
          y="125" 
          width="15" 
          height="20" 
          rx="2" 
          fill="#EF4444" 
          opacity="0.5"
          transform="rotate(-20, 142, 135)"
        />
        <circle 
          cx="38" 
          cy="120" 
          r="6" 
          fill="#EF4444" 
          opacity="0.4"
        />
      </g>
      
      {/* Wi-Fi Symbol with Red Diagonal Stroke */}
      <g transform="translate(140, 30)">
        {/* Wi-Fi arcs */}
        <path 
          d="M-10 15 C-5 10, 5 10, 10 15" 
          stroke="currentColor" 
          strokeWidth="3" 
          fill="none" 
          opacity="0.4"
          strokeLinecap="round"
        />
        <path 
          d="M-18 7 C-10 -2, 10 -2, 18 7" 
          stroke="currentColor" 
          strokeWidth="3" 
          fill="none" 
          opacity="0.3"
          strokeLinecap="round"
        />
        <path 
          d="M-25 0 C-15 -12, 15 -12, 25 0" 
          stroke="currentColor" 
          strokeWidth="3" 
          fill="none" 
          opacity="0.2"
          strokeLinecap="round"
        />
        
        {/* Red Diagonal Stroke */}
        <line 
          x1="-28" 
          y1="-8" 
          x2="28" 
          y2="28" 
          stroke="#EF4444" 
          strokeWidth="4" 
          strokeLinecap="round"
        />
        
        {/* Red X mark at the end */}
        <circle cx="28" cy="28" r="4" fill="#EF4444" />
      </g>
      
      {/* Sad face / frowning on the cart */}
      <g transform="translate(100, 95)" opacity="0.6">
        <path 
          d="M-15 5 C-10 10, 10 10, 15 5" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          fill="none" 
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default OfflineCartIcon;