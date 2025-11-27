import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 font-bold text-2xl text-slate-800 ${className}`}>
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      {/* Royal Blue D Body */}
      <path 
        d="M20 12H34C45.0457 12 54 20.9543 54 32C54 43.0457 45.0457 52 34 52H20V12Z" 
        fill="#2563EB" 
      />
      {/* Cyan Geometric Insert/Arrow */}
      <path 
        d="M20 12L36 32L20 52V12Z" 
        fill="#06B6D4" 
      />
      {/* Inner White Space to define D shape better */}
      <path 
        d="M24 22H32C36 22 40 26 40 32C40 38 36 42 32 42H24V22Z" 
        fill="white"
        fillOpacity="0.15"
      />
    </svg>
    <span>Depack</span>
  </div>
);