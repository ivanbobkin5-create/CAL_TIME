import { useEffect, useRef } from "react";

/**
 * Ensures modal dialogs inside Bitrix24 iframes and web views appear precisely 
 * in the user's current reading viewport (scroll position) without jumping to the top or far middle.
 */
export function useBitrixModalScroll(isOpen: boolean = true) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const b24 = (window as any).BX24;
    const scrollY = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;

    // 1. If BX24 scrollParent is available, ensure Bitrix24 iframe parent view is aligned
    if (b24 && typeof b24.scrollParent === "function") {
      try {
        b24.scrollParent(Math.max(0, scrollY - 40));
      } catch (_) {}
    }

    // 2. Center the modal in current view
    if (modalRef.current) {
      try {
        modalRef.current.scrollIntoView({ behavior: "instant" as any, block: "center" });
      } catch (_) {}
    }
  }, [isOpen]);

  return modalRef;
}
