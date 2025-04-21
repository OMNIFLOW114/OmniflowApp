import React from 'react';

export const Button = ({ variant, onClick, children }) => {
  const variantClass = variant === 'outline' ? 'border border-gray-500' : 'bg-blue-500 text-white';

  return (
    <button onClick={onClick} className={`px-4 py-2 rounded ${variantClass}`}>
      {children}
    </button>
  );
};
