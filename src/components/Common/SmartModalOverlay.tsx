import React from "react";
import { cn } from "../../lib/utils";
import { useBitrixModalScroll } from "../../hooks/useBitrixModalScroll";

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
  const { modalRef, paddingTop } = useBitrixModalScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      style={{ paddingTop: paddingTop > 0 ? `${paddingTop}px` : undefined }}
      className={cn(
        "fixed inset-0 flex items-start justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200",
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
