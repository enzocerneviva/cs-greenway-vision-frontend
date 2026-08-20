import { useState } from "react";
import { createPortal } from "react-dom";
import type { FrameAnalysis } from "../../api/types";
import { mediaUrl } from "../../api/client";
import { PriorityBadge } from "./PriorityBadge";

export function FrameCard({ frame }: { frame: FrameAnalysis }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="shrink-0 w-32 rounded-lg bg-white border border-slate-200 shadow-sm p-2.5">
        {frame.image_path ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full cursor-zoom-in"
          >
            <img
              src={mediaUrl(frame.image_path)}
              alt={`Frame em km ${frame.estimated_km.toFixed(2)}`}
              className="h-16 w-full rounded-md object-cover"
            />
          </button>
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
        <FrameLightbox frame={frame} imagePath={frame.image_path} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function FrameLightbox({
  frame,
  imagePath,
  onClose,
}: {
  frame: FrameAnalysis;
  imagePath: string;
  onClose: () => void;
}) {
  return createPortal(
    <div
      // z-[9999]: bem acima do que o Leaflet usa internamente (painéis do
      // mapa chegam a z-index 700) — sem isso o mapa "vazava" por cima do
      // modal em telas que mostram os dois ao mesmo tempo (ex.: detalhe do trecho).
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 text-slate-600 shadow hover:bg-white flex items-center justify-center text-sm"
        >
          ✕
        </button>

        <img
          src={mediaUrl(imagePath)}
          alt={`Frame em km ${frame.estimated_km.toFixed(2)}`}
          className="w-full sm:w-56 h-56 object-cover bg-slate-900 shrink-0"
        />

        <div className="p-5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-slate-900">
              km {frame.estimated_km.toFixed(2)}
            </p>
            <PriorityBadge priority={frame.priority} />
          </div>
          <p className="text-sm text-slate-500">
            verde detectado: {frame.green_percent.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400">
            frame #{frame.frame_index} · {frame.timestamp_seconds.toFixed(1)}s no vídeo
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
