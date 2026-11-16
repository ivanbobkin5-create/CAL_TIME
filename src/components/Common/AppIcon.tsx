import React from "react";

interface AppIconProps {
  className?: string;
  size?: number;
  showText?: boolean;
  showInnerFrame?: boolean;
}

export const AppIcon: React.FC<AppIconProps> = ({ 
  className = "w-8 h-8", 
  size, 
  showText = true,
  showInnerFrame = false 
}) => {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={className}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Blue Background */}
      <rect width="1000" height="1000" rx="220" fill="#155DFC" />

      {/* Outer White Frame - optional */}
      {showInnerFrame && (
        <rect x="87" y="87" width="826" height="826" rx="133" fill="none" stroke="#FFFFFF" strokeWidth="60" />
      )}

      {/* Left Cabinet Door (Tall) */}
      <rect x="250" y="270" width="125" height="460" rx="20" fill="#FFFFFF" />

      {/* Middle Cabinet Door (Short) */}
      <rect x="410" y="270" width="125" height="280" rx="20" fill="#FFFFFF" />

      {/* Right Cabinet Door (Short) */}
      <rect x="570" y="270" width="125" height="280" rx="20" fill="#FFFFFF" />

      {/* Text MP under Middle & Right Doors */}
      {showText && (
        <text
          x="410"
          y="705"
          fill="#FFFFFF"
          fontFamily="'Montserrat', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="130"
          letterSpacing="2"
        >
          МП
        </text>
      )}
    </svg>
  );
};
