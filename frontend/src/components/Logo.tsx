import React from 'react';

export function Logo({ className = "h-8 w-8", brandText = "CELO" }: { className?: string; brandText?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 800"
      className={className}
      width="100%"
      height="100%"
    >
      <defs>
        {/* Background Gradients */}
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#121F17" />
          <stop offset="60%" stopColor="#080C0A" />
          <stop offset="100%" stopColor="#030504" />
        </radialGradient>

        {/* Celo Accent Gradients */}
        <linearGradient id="celoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#35D07F" />
          <stop offset="100%" stopColor="#119955" />
        </linearGradient>

        <linearGradient id="celoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBCC5C" />
          <stop offset="100%" stopColor="#D99B14" />
        </linearGradient>

        <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF4500" stopOpacity="0" />
          <stop offset="40%" stopColor="#FBCC5C" />
          <stop offset="100%" stopColor="#35D07F" />
        </linearGradient>

        {/* Glow Filters */}
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Dark Tech Background */}
      <rect width="800" height="800" rx="160" fill="url(#bgGlow)" />

      {/* Background Ambient Glow Ring */}
      <circle cx="400" cy="380" r="230" fill="none" stroke="url(#celoGreen)" strokeWidth="2" opacity="0.15" />
      <circle cx="400" cy="380" r="270" fill="none" stroke="url(#celoGold)" strokeWidth="1" strokeDasharray="8 12" opacity="0.2" />

      {/* MAIN EMBLEM GROUP */}
      <g id="logo-mark" filter="url(#subtleShadow)">

        {/* Dynamic Rocket / Pump Beam Thruster */}
        <path d="M 370 510 L 400 640 L 430 510 Z" fill="url(#flameGradient)" opacity="0.85" filter="url(#neonGlow)" />
        <polygon points="385,510 400,600 415,510" fill="#FBCC5C" opacity="0.9" />

        {/* Outer / Upper Ring Segment (Celo Green) */}
        <path d="M 280 340
                 C 280 230, 370 170, 470 190
                 C 550 206, 600 270, 580 350
                 C 565 410, 510 450, 440 450
                 C 420 450, 400 445, 385 435"
              fill="none"
              stroke="url(#celoGreen)"
              strokeWidth="48"
              strokeLinecap="round"
              filter="url(#neonGlow)" />

        {/* Lower / Interlocking Ring Segment (Celo Gold) */}
        <path d="M 520 420
                 C 520 520, 430 570, 330 550
                 C 250 534, 200 470, 220 390
                 C 235 330, 290 290, 360 290
                 C 380 290, 400 295, 415 305"
              fill="none"
              stroke="url(#celoGold)"
              strokeWidth="48"
              strokeLinecap="round" />

        {/* Sharp Upward Arrow Cutout / Rocket Centerpiece (Representing 'Pump') */}
        <path d="M 400 190
                 L 490 320
                 L 440 320
                 L 440 470
                 L 360 470
                 L 360 320
                 L 310 320 Z"
              fill="#FFFFFF"
              filter="url(#neonGlow)" />

        {/* Accent Thrust Fins */}
        <path d="M 360 420 L 310 480 L 360 470 Z" fill="url(#celoGold)" />
        <path d="M 440 420 L 490 480 L 440 470 Z" fill="url(#celoGreen)" />

      </g>

      {/* TYPOGRAPHY */}
      <g id="brand-text" textAnchor="middle">
        {/* Dynamic Text */}
        <text x="400" y="695"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Roboto', sans-serif"
              fontWeight="900"
              fontSize="52"
              letterSpacing="12"
              fill="#FFFFFF">
          {brandText}
        </text>

        {/* PUMP Text */}
        <text x="400" y="745"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Roboto', sans-serif"
              fontWeight="800"
              fontSize="34"
              letterSpacing="22"
              fill="#35D07F">
          PUMP
        </text>
      </g>
    </svg>
  );
}

