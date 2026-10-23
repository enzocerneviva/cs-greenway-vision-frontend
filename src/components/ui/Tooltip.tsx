import { cloneElement, useEffect, useRef, useState } from "react";
import type { FocusEvent, PointerEvent, ReactElement } from "react";
import { createPortal } from "react-dom";

interface ChildHandlers {
  onPointerEnter?: (e: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: PointerEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
}

interface TooltipProps {
  content: string;
  /** Um único elemento; ele recebe os handlers de hover e foco. */
  children: ReactElement<ChildHandlers>;
}

const SHOW_DELAY_MS = 120;

// Substitui o atributo `title`, cujo balão é desenhado pelo SO e ignora o tema.
export function Tooltip({ content, children }: TooltipProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function show(target: HTMLElement, immediate = false) {
    window.clearTimeout(timer.current);
    const reveal = () => setRect(target.getBoundingClientRect());
    if (immediate) reveal();
    else timer.current = window.setTimeout(reveal, SHOW_DELAY_MS);
  }

  function hide() {
    window.clearTimeout(timer.current);
    setRect(null);
  }

  const child = children;
  const trigger = cloneElement(child, {
    onPointerEnter: (e) => {
      child.props.onPointerEnter?.(e);
      if (e.pointerType === "mouse") show(e.currentTarget);
    },
    onPointerLeave: (e) => {
      child.props.onPointerLeave?.(e);
      hide();
    },
    onFocus: (e) => {
      child.props.onFocus?.(e);
      show(e.currentTarget, true);
    },
    onBlur: (e) => {
      child.props.onBlur?.(e);
      hide();
    },
  });

  // Abaixo do elemento quando não houver espaço em cima.
  const below = rect !== null && rect.top < 48;

  return (
    <>
      {trigger}
      {rect &&
        createPortal(
          <div
            role="tooltip"
            style={{
              left: rect.left + rect.width / 2,
              top: below ? rect.bottom + 8 : rect.top - 8,
              transform: below ? "translateX(-50%)" : "translate(-50%, -100%)",
            }}
            className="popover-enter pointer-events-none fixed z-[10000] max-w-xs rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg dark:text-slate-50"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
