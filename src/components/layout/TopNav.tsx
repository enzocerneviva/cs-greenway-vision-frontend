export function TopNav() {
  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        <span className="text-sm text-slate-500">Operacional</span>
        <div className="h-8 w-8 rounded-full bg-slate-200" aria-hidden />
      </div>
    </header>
  );
}
