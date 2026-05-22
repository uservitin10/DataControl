"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

type AuditLog = {
  id: number;
  user_id: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at?: string | null;
  profiles?: {
    display_name?: string | null;
    role?: string | null;
  };
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedDetails, setSelectedDetails] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/audit?limit=200");
      if (!res.ok) {
        throw new Error(`Erro ao buscar logs (${res.status})`);
      }

      const data = await res.json();
      setMissingTable(Boolean(data?.missingTable));
      setLogs(Array.isArray(data?.data) ? data.data : data ?? []);
    } catch (fetchError) {
      setError((fetchError as Error).message || "Não foi possível carregar os logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();

    const refreshOnFocus = () => {
      void fetchLogs();
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchLogs();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();
    if (!normalizedFilter) return logs;

    return logs.filter((log) => {
      const userName = log.profiles?.display_name ?? log.user_id;
      const action = log.action;
      const resource = `${log.resource_type ?? ""} ${log.resource_id ?? ""}`;
      const details = log.details ?? "";
      const ip = log.ip_address ?? "";
      const createdAt = log.created_at ?? "";

      return [userName, action, resource, details, ip, createdAt]
        .join(" ")
        .toLowerCase()
        .includes(normalizedFilter);
    });
  }, [filter, logs]);

  return (
    <main className="gov-page-bg min-h-screen">
      <nav className="gov-header px-6 py-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.65)] bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 border-b border-slate-800/20">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-4 rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
            aria-label="Voltar para o Dashboard"
          >
            <Logo className="h-10 w-auto hover-scale" width={40} height={40} alt="Data Control" />
            <div>
              <h1 className="text-lg font-semibold text-white">Data Control</h1>
              <p className="text-xs text-white/80">Painel de Auditoria</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="gov-button-secondary-dark rounded-2xl px-4 py-2 text-sm font-medium bg-white/10 shadow-lg shadow-slate-950/10 hover:bg-white/15"
            >
              Voltar ao dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="gov-card rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.18)]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gov-muted">Auditoria</p>
              <h1 className="mt-3 text-3xl font-bold text-gov-heading">Logs de acesso e alterações</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Veja quem fez login, logout, falhas de login e edição de tabelas, com hora, IP, recurso e detalhes da ação.
              </p>
            </div>

            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
              <div className="w-full sm:w-80">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Filtrar logs
                </label>
                <input
                  type="search"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Usuário, ação, recurso, IP..."
                  className="gov-input w-full bg-white border-slate-300 text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => void fetchLogs()}
                className="gov-button-secondary-dark rounded-2xl px-4 py-3 text-sm font-medium bg-white/10 shadow-lg shadow-slate-950/10 hover:bg-white/15"
              >
                Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="gov-status-info rounded-3xl p-6 text-center text-sm text-slate-700">
              Carregando logs...
            </div>
          ) : error ? (
            <div className="gov-status-error rounded-3xl p-6 text-sm">
              {error}
            </div>
          ) : missingTable ? (
            <div className="gov-status-warning rounded-3xl p-6 text-sm text-slate-700">
              A tabela <strong>audit_logs</strong> não foi encontrada no banco de dados. Crie a tabela no Supabase para começar a gravar e visualizar logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.24em] text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Ação</th>
                    <th className="px-4 py-3">Recurso</th>
                    <th className="px-4 py-3">Detalhes</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        Nenhum registro encontrado para o filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className={`transition-colors ${log.action === "login_failed" ? "bg-rose-50 text-rose-900" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-4 align-top text-slate-700">
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "-"}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="font-semibold text-slate-900">
                            {log.profiles?.display_name || log.user_id || "Não identificado"}
                          </div>
                          <div className="text-xs text-slate-500">{log.profiles?.role ?? "Sem role"}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700 font-semibold">{log.action}</td>
                        <td className="px-4 py-4 align-top text-slate-700">
                          <div>{log.resource_type || "auth"}</div>
                          <div className="text-xs text-slate-500">{log.resource_id || "-"}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700">
                          {log.details ? (
                            <div className="max-w-[280px]">
                              <div className="text-sm text-slate-700 break-words whitespace-pre-line">
                                {log.details.length > 140 ? `${log.details.slice(0, 140)}...` : log.details}
                              </div>
                              {log.details.length > 140 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetails(log.details ?? null)}
                                  className="mt-2 text-xs text-indigo-600 hover:underline"
                                >
                                  Ver
                                </button>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-700">{log.ip_address || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-3xl w-full rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Detalhes completos</h2>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="text-slate-500 hover:text-slate-800"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-auto text-sm text-slate-800 whitespace-pre-wrap">
              {(() => {
                try {
                  const parsed = JSON.parse(selectedDetails as string);
                  return JSON.stringify(parsed, null, 2);
                } catch {
                  return selectedDetails;
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
