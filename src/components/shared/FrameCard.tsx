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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={mediaUrl(imagePath)}
          alt={`Frame em km ${frame.estimated_km.toFixed(2)}`}
          className="w-full max-h-[70vh] object-contain bg-slate-900"
        />
        <div className="p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-900">
              km {frame.estimated_km.toFixed(2)}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              verde detectado: {frame.green_percent.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              frame #{frame.frame_index} · {frame.timestamp_seconds.toFixed(1)}s no vídeo
            </p>
          </div>
          <PriorityBadge priority={frame.priority} />
        </div>
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-slate-300 text-sm font-medium py-2 text-slate-600 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
