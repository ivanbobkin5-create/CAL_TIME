import React from "react";

interface AppIconProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const AppIcon: React.FC<AppIconProps> = ({ className = "w-8 h-8", size, showText = true }) => {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Blue Background */}
      <rect width="1000" height="1000" rx="180" fill="#155DFC" />

      {/* Outer White Frame */}
      <rect x="87" y="87" width="826" height="826" rx="133" fill="none" stroke="#FFFFFF" strokeWidth="70" />

      {/* Left Cabinet Door (Tall) */}
      <rect x="281" y="273" width="195" height="454" rx="22" fill="#FFFFFF" />

      {/* Right Cabinet Door (Short) */}
      <rect x="524" y="273" width="195" height="314" rx="22" fill="#FFFFFF" />

      {/* Right Text MP */}
      {showText && (
        <text
          x="523"
          y="722"
          fill="#FFFFFF"
          fontFamily="'Montserrat', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="112"
          letterSpacing="1"
        >
          МП
        </text>
      )}
    </svg>
  );
};
