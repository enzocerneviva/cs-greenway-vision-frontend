import { useEffect } from "react";
import type { RefObject } from "react";

// Fecha um popover ao clicar fora do container ou apertar Esc.
export function useDismiss(ref: RefObject<HTMLElement>, active: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, active, onDismiss]);
}
