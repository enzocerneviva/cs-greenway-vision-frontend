import { useEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";

interface FileInputProps {
  file: File | null;
  onChange: (file: File | null) => void;
  /** Mesmo formato do atributo `accept` (ex.: "video/*"). */
  accept: string;
  /** Texto do estado vazio. */
  prompt: string;
  ariaLabel?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function matchesAccept(file: File, accept: string): boolean {
  return accept
    .split(",")
    .map((t) => t.trim())
    .some((token) =>
      token.endsWith("/*") ? file.type.startsWith(token.slice(0, -1)) : file.type === token
    );
}

// Substitui <input type="file">: área de seleção com arrastar-e-soltar e pré-visualização do
// arquivo escolhido. O input nativo continua no DOM, escondido, só para abrir o seletor do SO.
export function FileInput({ file, onChange, accept, prompt, ariaLabel }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState(false);

  // Quando o pai limpa o arquivo, zera o input para permitir escolher o mesmo de novo.
  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);

  function pick(next: File | null) {
    if (next && !matchesAccept(next, accept)) {
      setRejected(true);
      return;
    }
    setRejected(false);
    onChange(next);
  }

  function openDialog() {
    inputRef.current?.click();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDialog();
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel ?? prompt}
        onClick={openDialog}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          dragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-5 w-5 shrink-0 text-slate-400"
          aria-hidden="true"
        >
          {file ? (
            <path d="M5 3h7l3 3v11H5zM12 3v3h3" strokeLinejoin="round" />
          ) : (
            <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 13v3h12v-3" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>

        {file ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)} · clique para trocar</p>
            </div>
            <button
              type="button"
              aria-label="Remover arquivo"
              onClick={(e) => {
                e.stopPropagation();
                setRejected(false);
                onChange(null);
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
              </svg>
            </button>
          </>
        ) : (
          <div className="min-w-0">
            <p className="text-sm text-slate-700">{prompt}</p>
            <p className="text-xs text-slate-400">clique ou arraste o arquivo para cá</p>
          </div>
        )}
      </div>

      {rejected && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          Esse tipo de arquivo não é aceito aqui.
        </p>
      )}
    </div>
  );
}
