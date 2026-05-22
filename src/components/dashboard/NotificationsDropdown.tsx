import type { Notificacao } from "@/types/dashboard";
import type { RefObject } from "react";
import { tipoIcon } from "@/lib/dashboard";

type NotificationsDropdownProps = {
  notificacoes: Notificacao[];
  showNotif: boolean;
  onToggle: () => void;
  onMarkAllRead: () => void;
  formatarTempo: (dateStr: string) => string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
};

export function NotificationsDropdown({
  notificacoes,
  showNotif,
  onToggle,
  onMarkAllRead,
  formatarTempo,
  containerRef,
}: NotificationsDropdownProps) {
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className="relative rounded-md px-3 py-2 text-white/80 hover:bg-white/10"
        aria-label="Notificações"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {naoLidas > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: "#ef4444" }}
          >
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {showNotif && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-white shadow-2xl overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#f1f5f9", backgroundColor: "#f8fafc" }}>
            <p className="text-sm font-medium" style={{ color: "#1a2744" }}>Notificações</p>
            {notificacoes.length > 0 && (
              <button onClick={onMarkAllRead} className="text-xs text-blue-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Nenhuma notificação</p>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.id}
                  className="flex gap-3 px-4 py-3 border-b last:border-0 transition"
                  style={{ borderColor: "#f1f5f9", backgroundColor: n.lida ? "white" : "#eff6ff" }}
                >
                  <span className="text-base mt-0.5">
                    {tipoIcon[n.tipo] ? (
                      tipoIcon[n.tipo]
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                        />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-snug">{n.mensagem}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatarTempo(n.created_at)}</p>
                  </div>
                  {!n.lida && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
