import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useDismiss } from "../../hooks/useDismiss";

interface DatePickerProps {
  label: string;
  /** Data no formato YYYY-MM-DD, ou "" quando vazia. */
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const POPOVER_WIDTH = 288;

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Interpreta YYYY-MM-DD no fuso local (new Date("YYYY-MM-DD") seria UTC e voltaria um dia).
function fromKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDisplay(key: string): string {
  const date = fromKey(key);
  return date ? date.toLocaleDateString("pt-BR") : "";
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  // Limita ao último dia do mês de destino (31/jan + 1 mês => 28/fev, não 3/mar).
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

function monthTitle(date: Date): string {
  const text = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Substitui o <input type="date">, cujo calendário é desenhado pelo navegador e não segue o tema.
export function DatePicker({ label, value, min, max, onChange }: DatePickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  // Dia com foco do teclado; o mês exibido acompanha.
  const [focused, setFocused] = useState<Date>(() => new Date());

  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  const todayKey = toKey(new Date());

  function isDisabled(key: string) {
    return Boolean((min && key < min) || (max && key > max));
  }

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    setAlignRight(Boolean(rect && rect.left + POPOVER_WIDTH > window.innerWidth - 16));
    setFocused(fromKey(value) ?? new Date());
    setOpen(true);
  }

  function select(key: string) {
    if (isDisabled(key)) return;
    onChange(key);
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Leva o foco real para o dia ativo, para o teclado funcionar dentro da grade.
  const focusedKey = toKey(focused);
  useEffect(() => {
    if (!open) return;
    popoverRef.current?.querySelector<HTMLElement>(`[data-day="${focusedKey}"]`)?.focus();
  }, [open, focusedKey]);

  function onGridKeyDown(e: KeyboardEvent) {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () => addDays(focused, -focused.getDay()),
      End: () => addDays(focused, 6 - focused.getDay()),
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setFocused(move());
    }
  }

  // 6 semanas completas a partir do domingo anterior ao dia 1 (altura fixa, sem "pulo" entre meses).
  const firstOfMonth = new Date(focused.getFullYear(), focused.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const display = formatDisplay(value);

  return (
    <div className="block" ref={rootRef}>
      <span id={`${id}-label`} className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </span>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          onClick={() => (open ? close() : openPicker())}
          className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-1.5 text-left text-sm outline-none transition-colors hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            open ? "border-emerald-500" : "border-slate-300"
          } ${display ? "pr-14 text-slate-800" : "text-slate-400"}`}
        >
          <span className="truncate">{display || "dd/mm/aaaa"}</span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="absolute right-3 h-4 w-4 shrink-0 text-slate-400"
            aria-hidden="true"
          >
            <rect x="3" y="4.5" width="14" height="12" rx="2" />
            <path d="M3 8h14M7 3v3M13 3v3" strokeLinecap="round" />
          </svg>
        </button>

        {display && (
          <button
            type="button"
            aria-label={`Limpar ${label}`}
            onClick={() => onChange("")}
            className="absolute right-8 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {open && (
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`Escolher data: ${label}`}
            style={{ width: POPOVER_WIDTH }}
            className={`popover-enter absolute z-30 mt-1 rounded-lg border border-slate-200 bg-white p-3 shadow-lg ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <NavButton label="Mês anterior" onClick={() => setFocused(addMonths(focused, -1))}>
                <path d="m12 5-5 5 5 5" />
              </NavButton>
              <p className="text-sm font-medium text-slate-800" aria-live="polite">
                {monthTitle(focused)}
              </p>
              <NavButton label="Próximo mês" onClick={() => setFocused(addMonths(focused, 1))}>
                <path d="m8 5 5 5-5 5" />
              </NavButton>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
              {WEEKDAYS.map((d, i) => (
                <span key={i} className="py-1">
                  {d}
                </span>
              ))}
            </div>

            <div role="grid" className="grid grid-cols-7 gap-y-0.5" onKeyDown={onGridKeyDown}>
              {days.map((date) => {
                const key = toKey(date);
                const inMonth = date.getMonth() === focused.getMonth();
                const isSelected = key === value;
                const isToday = key === todayKey;
                const disabled = isDisabled(key);
                return (
                  <button
                    key={key}
                    type="button"
                    data-day={key}
                    tabIndex={key === focusedKey ? 0 : -1}
                    aria-selected={isSelected}
                    aria-disabled={disabled || undefined}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => select(key)}
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isSelected
                        ? "bg-emerald-600 font-medium text-white"
                        : disabled
                          ? "cursor-not-allowed text-slate-300"
                          : `hover:bg-slate-100 ${inMonth ? "text-slate-700" : "text-slate-400"} ${
                              isToday ? "font-semibold ring-1 ring-inset ring-emerald-500" : ""
                            }`
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
              <button
                type="button"
                onClick={() => select(todayKey)}
                disabled={isDisabled(todayKey)}
                className="rounded px-2 py-1 text-emerald-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                disabled={!value}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
