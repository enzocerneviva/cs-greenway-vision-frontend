import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { FrameAnalysis } from "../../api/types";
import { mediaUrl } from "../../api/client";
import { PriorityBadge } from "./PriorityBadge";

export function FrameCard({ frame }: { frame: FrameAnalysis }) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const clickable = Boolean(frame.image_path);

  function handleKeyDown(e: KeyboardEvent) {
    if (clickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <div
        ref={cardRef}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? () => setOpen(true) : undefined}
        onKeyDown={handleKeyDown}
        className={`group shrink-0 w-32 rounded-lg bg-white border border-slate-200 shadow-sm p-2.5 outline-none transition duration-200 ease-out motion-reduce:transition-none ${
          clickable
            ? "cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
            : ""
        }`}
      >
        {frame.image_path ? (
          <div className="relative h-16 w-full overflow-hidden rounded-md">
            <img
              src={mediaUrl(frame.image_path)}
              alt={`Frame em km ${frame.estimated_km.toFixed(2)}`}
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Ampliar
            </div>
          </div>
        ) : (
          <div className="h-16 w-full rounded-md bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
            sem imagem
          </div>
        )}
        <p className="text-[11px] text-slate-500 mt-1.5">km {frame.estimated_km.toFixed(2)}</p>
        <p className="text-[11px] text-slate-400">
          verde {frame.green_percent.toFixed(1)}% · {frame.priority}
        </p>
      </div>

      {open && frame.image_path && (
        <FrameLightbox
          frame={frame}
          imagePath={frame.image_path}
          getOriginRect={() => cardRef.current?.getBoundingClientRect() ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const OPEN_MS = 300;
const CLOSE_MS = 220;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const CLICK_ZOOM = 2.5;

type View = { scale: number; x: number; y: number };
const RESET_VIEW: View = { scale: 1, x: 0, y: 0 };

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Transform que leva o painel (já na posição final) de volta ao retângulo do card.
function originTransform(from: DOMRect | null, to: DOMRect) {
  if (!from) return "scale(0.92)";
  const scale = from.width / to.width;
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`;
}

function FrameLightbox({
  frame,
  imagePath,
  getOriginRect,
  onClose,
}: {
  frame: FrameAnalysis;
  imagePath: string;
  getOriginRect: () => DOMRect | null;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const [view, setView] = useState<View>(RESET_VIEW);
  const [dragging, setDragging] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  // Entrada: o painel "cresce" a partir do card e o fundo escurece.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop || prefersReducedMotion()) return;
    const from = getOriginRect();
    panel.animate(
      [
        { transform: originTransform(from, panel.getBoundingClientRect()), opacity: 0.4 },
        { transform: "none", opacity: 1 },
      ],
      { duration: OPEN_MS, easing: EASING }
    );
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: "ease-out" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Saída: faz o caminho inverso antes de desmontar.
  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop || prefersReducedMotion()) {
      onClose();
      return;
    }
    const panelAnim = panel.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: originTransform(getOriginRect(), panel.getBoundingClientRect()), opacity: 0 },
      ],
      { duration: CLOSE_MS, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
    );
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: "ease-in",
      fill: "forwards",
    });
    panelAnim.finished.then(onClose, onClose);
  }

  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Zoom da imagem ---
  function clampView(scale: number, x: number, y: number): View {
    const el = viewportRef.current;
    if (!el || scale <= MIN_ZOOM) return RESET_VIEW;
    const maxX = (el.clientWidth * (scale - 1)) / 2;
    const maxY = (el.clientHeight * (scale - 1)) / 2;
    return {
      scale,
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  // Muda o zoom mantendo fixo o ponto (px, py), relativo ao centro da imagem.
  function zoomTo(nextScale: number, px = 0, py = 0) {
    const { scale, x, y } = viewRef.current;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale));
    const ratio = next / scale;
    setView(clampView(next, px - (px - x) * ratio, py - (py - y) * ratio));
  }

  function pointerToCenter(clientX: number, clientY: number) {
    const rect = viewportRef.current!.getBoundingClientRect();
    return { px: clientX - rect.left - rect.width / 2, py: clientY - rect.top - rect.height / 2 };
  }

  // Listener nativo (não passivo) para poder impedir o scroll da página ao dar zoom.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { px, py } = pointerToCenter(e.clientX, e.clientY);
      zoomTo(viewRef.current.scale * Math.exp(-e.deltaY * 0.002), px, py);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    if (viewRef.current.scale > MIN_ZOOM) {
      setDragging(true);
      setView(clampView(viewRef.current.scale, d.originX + dx, d.originY + dy));
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    d.active = false;
    setDragging(false);
    if (d.moved) return;
    // Clique simples: alterna entre ajustado e ampliado no ponto clicado.
    if (viewRef.current.scale > MIN_ZOOM) {
      setView(RESET_VIEW);
    } else {
      const { px, py } = pointerToCenter(e.clientX, e.clientY);
      zoomTo(CLICK_ZOOM, px, py);
    }
  }

  const zoomed = view.scale > MIN_ZOOM;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      onClick={requestClose}
    >
      {/* z-[9999]: bem acima do que o Leaflet usa internamente (painéis do mapa chegam a z-index 700) */}
      <div ref={backdropRef} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Frame em km ${frame.estimated_km.toFixed(2)}`}
        style={{ transformOrigin: "top left" }}
        className="relative w-full max-w-3xl rounded-xl bg-white border border-slate-200 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none" }}
          className={`relative h-[min(58vh,36rem)] w-full select-none overflow-hidden rounded-md bg-black ${
            zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
          }`}
        >
          <img
            src={mediaUrl(imagePath)}
            alt={`Frame em km ${frame.estimated_km.toFixed(2)}`}
            draggable={false}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            className={`h-full w-full object-contain ${
              dragging ? "" : "transition-transform duration-150 ease-out"
            }`}
          />

          <div
            className="absolute bottom-2 right-2 flex items-center overflow-hidden rounded-md bg-black/60 text-white text-sm backdrop-blur"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Diminuir zoom"
              disabled={!zoomed}
              onClick={() => zoomTo(view.scale / 1.5)}
              className="h-8 w-8 hover:bg-white/20 disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              aria-label="Restaurar zoom"
              disabled={!zoomed}
              onClick={() => setView(RESET_VIEW)}
              className="h-8 min-w-12 px-1 text-xs tabular-nums hover:bg-white/20 disabled:opacity-100"
            >
              {Math.round(view.scale * 100)}%
            </button>
            <button
              type="button"
              aria-label="Aumentar zoom"
              disabled={view.scale >= MAX_ZOOM}
              onClick={() => zoomTo(view.scale * 1.5)}
              className="h-8 w-8 hover:bg-white/20 disabled:opacity-40"
            >
              +
            </button>
          </div>

          {!zoomed && (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/90">
              clique ou use o scroll para ampliar
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={requestClose}
          aria-label="Fechar"
          className="absolute top-9 right-9 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur hover:bg-black/80"
        >
          ✕
        </button>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-2xl font-semibold text-slate-900">km {frame.estimated_km.toFixed(2)}</p>
          <PriorityBadge priority={frame.priority} />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
          <div>
            <dt className="text-xs text-slate-400">Verde detectado</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {frame.green_percent.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Frame</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">#{frame.frame_index}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">No vídeo</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {frame.timestamp_seconds.toFixed(1)}s
            </dd>
          </div>
        </dl>
      </div>
    </div>,
    document.body
  );
}
