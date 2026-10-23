import type { KeyboardEvent, ReactNode } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Rótulo acessível (use quando não houver <label> visível). */
  ariaLabel?: string;
  placeholder?: string;
  /** Ícone à esquerda (decorativo). */
  icon?: ReactNode;
  /** Mostra um × para limpar quando há texto. */
  clearable?: boolean;
  disabled?: boolean;
  onEnter?: () => void;
  /** Classes do container (largura, margens). */
  className?: string;
}

// Campo de texto com o visual do projeto (foco, hover e tema escuro consistentes).
export function TextInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  icon,
  clearable,
  disabled,
  onEnter,
  className,
}: TextInputProps) {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`w-full rounded-md border border-slate-300 bg-white py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          icon ? "pl-9" : "pl-3"
        } ${clearable ? "pr-9" : "pr-3"}`}
      />
      {clearable && value && !disabled && (
        <button
          type="button"
          aria-label="Limpar"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
