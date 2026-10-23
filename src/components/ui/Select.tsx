import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useDismiss } from "../../hooks/useDismiss";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  /** Rótulo visível acima do campo. Sem ele, informe `ariaLabel`. */
  label?: string;
  ariaLabel?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Texto exibido quando `value` não corresponde a nenhuma opção. */
  placeholder?: string;
  disabled?: boolean;
  /** Classes do container (largura, margens). */
  className?: string;
}

// Substitui o <select> nativo, cuja lista aberta é desenhada pelo SO e não segue o tema.
export function Select({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className,
}: SelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback(() => setOpen(false), []);
  useDismiss(rootRef, open, close);

  // Se o campo ficar desabilitado com a lista aberta, fecha.
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function openList() {
    if (disabled) return;
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
  }

  // Mantém a opção ativa visível quando a lista rola.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList();
        else setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else openList();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div className={className ?? "block"} ref={rootRef}>
      {label && (
        <span id={`${id}-label`} className="block text-xs font-medium text-slate-500 mb-1">
          {label}
        </span>
      )}
      <div className="relative">
        <button
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openList())}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm outline-none transition-colors hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 ${
            open ? "border-emerald-500" : "border-slate-300"
          } ${selected ? "text-slate-800" : "text-slate-400"}`}
        >
          <span className="truncate">{selected?.label ?? placeholder ?? ""}</span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={label ? `${id}-label` : undefined}
            aria-label={label ? undefined : ariaLabel}
            className="popover-enter absolute left-0 right-0 z-30 mt-1 max-h-60 min-w-max overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
            {options.length === 0 && (
              <li className="px-2.5 py-1.5 text-sm text-slate-400">Nenhuma opção</li>
            )}
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm ${
                    index === active ? "bg-slate-100" : ""
                  } ${isSelected ? "font-medium text-emerald-700" : "text-slate-700"}`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 shrink-0"
                      aria-hidden="true"
                    >
                      <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
