import { useEffect, useRef, useState } from "react";

/**
 * Ensures modal dialogs inside Bitrix24 iframes and web views appear precisely 
 * in the user's current reading viewport (where scroll is stopped) without jumping to the top.
 */
export function useBitrixModalScroll(isOpen: boolean = true) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [paddingTop, setPaddingTop] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const b24 = (window as any).BX24;

    const updatePosition = () => {
      let st = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;

      if (b24 && typeof b24.getScrollSize === "function") {
        try {
          b24.getScrollSize((data: any) => {
            if (data && typeof data.scrollTop === "number") {
              const calcTop = Math.max(16, data.scrollTop - 40);
              setPaddingTop(calcTop);
            } else if (st > 0) {
              setPaddingTop(Math.max(16, st - 40));
            }
          });
          return;
        } catch (_) {}
      }

      if (st > 0) {
        setPaddingTop(Math.max(16, st - 40));
      }
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return { modalRef, paddingTop };
}
