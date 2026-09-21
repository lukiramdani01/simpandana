import React from 'react';

interface WalletLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function WalletLogo({ className = '', size = 'md' }: WalletLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-12 h-12 rounded-2xl',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const pxSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
  const containerPx = size === 'sm' ? 32 : size === 'md' ? 40 : 48;

  return (
    <div
      className={`${sizeClasses} apple-blue-gradient flex items-center justify-center text-white shadow-lg glow-blue relative overflow-hidden shrink-0 ${className}`}
      style={{ width: `${containerPx}px`, height: `${containerPx}px`, minWidth: `${containerPx}px`, minHeight: `${containerPx}px` }}
      title="SimpanUang FinTech"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/40 via-transparent to-white/25 pointer-events-none" />
      <svg
        width={pxSize}
        height={pxSize}
        style={{ width: `${pxSize}px`, height: `${pxSize}px`, maxWidth: '100%', maxHeight: '100%' }}
        className={`${iconSizes} text-white relative z-10 shrink-0`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 1-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 1 1 1v-4" />
        <circle cx="17.5" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
