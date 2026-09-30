import React from "react";

interface AppIconProps {
  className?: string;
  size?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({ className = "w-8 h-8", size }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="20" fill="#2563eb" />
      <path d="M25 25h50v50H25z" fill="none" stroke="white" strokeWidth="8" />
      <rect x="35" y="35" width="12" height="30" fill="white" />
      <rect x="53" y="35" width="12" height="18" fill="white" />
    </svg>
  );
};
