import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

interface NumberInputProps {
  /** Valor como texto, para permitir estados intermediários como "-" ou "12.". */
  value: string | number;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  /** Passo das setas do teclado e dos botões − / +. */
  step?: number;
  min?: number;
  max?: number;
  /** Mostra os botões − e + nas laterais. */
  stepper?: boolean;
  disabled?: boolean;
  /** Classes do container (largura, margens). */
  className?: string;
  size?: "sm" | "md";
}

function decimalsOf(step: number): number {
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function sanitize(raw: string, allowNegative: boolean): string {
  let text = raw.replace(",", ".").replace(/[^0-9.-]/g, "");
  const negative = allowNegative && text.startsWith("-");
  text = text.replace(/-/g, "");
  const firstDot = text.indexOf(".");
  if (firstDot !== -1) {
    text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, "");
  }
  return negative ? `-${text}` : text;
}

// Substitui <input type="number">, cujas setas e validação são desenhadas pelo navegador.
export function NumberInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  step = 1,
  min,
  max,
  stepper,
  disabled,
  className,
  size = "md",
}: NumberInputProps) {
  const [text, setText] = useState(String(value));

  // Sincroniza com mudanças vindas de fora (ex.: clique no mapa), sem apagar um
  // texto parcial que o usuário ainda está digitando ("-", "12.").
  useEffect(() => {
    const external = String(value);
    const a = text === "" ? NaN : Number(text);
    const b = external === "" ? NaN : Number(external);
    if (!Object.is(a, b)) setText(external);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(next: string) {
    setText(next);
    onChange(next);
  }

  function stepBy(direction: 1 | -1) {
    const current = text === "" || Number.isNaN(Number(text)) ? 0 : Number(text);
    let next = Number((current + direction * step).toFixed(decimalsOf(step)));
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    commit(String(next));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepBy(-1);
    }
  }

  const padding = size === "sm" ? "py-1 text-xs" : "py-2 text-sm";
  const buttonClass =
    "flex shrink-0 items-center justify-center border border-slate-300 bg-white px-2.5 text-slate-500 outline-none transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={`flex ${className ?? ""}`}>
      {stepper && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Diminuir"
          disabled={disabled}
          onClick={() => stepBy(-1)}
          className={`${buttonClass} rounded-l-md border-r-0`}
        >
          −
        </button>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => commit(sanitize(e.target.value, min === undefined || min < 0))}
        onKeyDown={onKeyDown}
        className={`min-w-0 w-full border border-slate-300 bg-white px-3 text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${padding} ${
          stepper ? "text-center" : "rounded-md"
        }`}
      />
      {stepper && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Aumentar"
          disabled={disabled}
          onClick={() => stepBy(1)}
          className={`${buttonClass} rounded-r-md border-l-0`}
        >
          +
        </button>
      )}
    </div>
  );
}
