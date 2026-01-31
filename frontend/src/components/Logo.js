import React from 'react';

export function LogoIcon({ className = "w-10 h-10" }) {
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D5C4D" />
          <stop offset="100%" stopColor="#1A7A6A" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="50" cy="50" r="48" fill="url(#logoIconGrad)"/>
      {/* M Letter */}
      <text x="50" y="62" fontFamily="Arial, sans-serif" fontSize="42" fontWeight="bold" fill="white" textAnchor="middle">M</text>
      {/* 360 rotating arrow */}
      <path d="M 75 25 A 30 30 0 1 1 45 20" fill="none" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round"/>
      <polygon points="75,17 82,25 75,33" fill="#D4AF37"/>
    </svg>
  );
}

export function LogoFull({ className = "h-10" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon className="w-10 h-10" />
      <span className="font-heading text-xl font-semibold text-primary">mekan360</span>
    </div>
  );
}

export default LogoIcon;
