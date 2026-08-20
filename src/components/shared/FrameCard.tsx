import type { FrameAnalysis } from "../../api/types";
import { mediaUrl } from "../../api/client";

export function FrameCard({ frame }: { frame: FrameAnalysis }) {
  return (
    <div className="shrink-0 w-32 rounded-lg bg-white border border-slate-200 shadow-sm p-2.5">
      {frame.image_path ? (
        <img
          src={mediaUrl(frame.image_path)}
          alt={`Frame em km ${frame.estimated_km.toFixed(2)}`}
          className="h-16 w-full rounded-md object-cover"
        />
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
  );
}
