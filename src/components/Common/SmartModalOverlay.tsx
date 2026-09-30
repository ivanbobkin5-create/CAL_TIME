import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

interface SmartModalOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  zIndex?: string;
  backdropClassName?: string;
}

export const SmartModalOverlay: React.FC<SmartModalOverlayProps> = ({
  isOpen = true,
  onClose,
  children,
  className = "",
  zIndex = "z-[9999]",
  backdropClassName = "bg-black/60 backdrop-blur-sm"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const b24 = (window as any).BX24;
    const scrollY = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;

    if (b24 && typeof b24.scrollParent === "function") {
      try {
        b24.scrollParent(Math.max(0, scrollY - 40));
      } catch (_) {}
    }

    if (containerRef.current) {
      try {
        containerRef.current.scrollIntoView({ behavior: "instant" as any, block: "center" });
      } catch (_) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200",
        zIndex,
        backdropClassName,
        className
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
};
