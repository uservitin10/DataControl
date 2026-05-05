"use client";

import { useEffect, useState } from "react";
import { useAudit, AuditLog, AuditAction } from "@/src/hooks/useAudit";
import { formatarTempo } from "@/src/lib/dashboard";

interface AuditLogsProps {
  userId?: string;
  action?: AuditAction;
  limit?: number;
}

export function AuditLogs({ userId, action, limit = 100 }: AuditLogsProps) {
  const { getAuditLogs } = useAudit();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const data = await getAuditLogs(limit, 0, userId, action);
        setLogs(data);
      } catch (err) {
        setError("Erro ao carregar logs de auditoria");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [getAuditLogs, limit, userId, action]);

  const getActionLabel = (action: AuditAction): string => {
    const labels: Record<AuditAction, string> = {
      login: "Login",
      logout: "Logout",
      view_document: "Visualizou documento",
      create_document: "Criou documento",
      update_document: "Atualizou documento",
      delete_document: "Excluiu documento",
      upload_file: "Fez upload de arquivo",
      download_file: "Baixou arquivo",
      create_notification: "Criou notificação",
      view_profile: "Visualizou perfil",
      update_profile: "Atualizou perfil",
      change_password: "Alterou senha",
      admin_action: "Ação administrativa",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: AuditAction): string => {
    if (action.includes("create") || action === "login") return "#10b981"; // verde
    if (action.includes("update")) return "#f59e0b"; // amarelo
    if (action.includes("delete") || action === "logout") return "#ef4444"; // vermelho
    return "#6b7280"; // cinza
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-slate-600">Carregando logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Nenhum log de auditoria encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-lg border bg-white p-4 shadow-soft hover:shadow-medium transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: getActionColor(log.action) }}
                >
                  {getActionLabel(log.action)}
                </span>
                <span className="text-sm text-slate-500">
                  {formatarTempo(log.created_at)}
                </span>
              </div>

              <div className="text-sm text-slate-700">
                <span className="font-medium">
                  {log.profiles?.display_name || "Usuário"}
                </span>
                {log.resource_type && (
                  <span className="text-slate-500">
                    {" "}• {log.resource_type}
                    {log.resource_id && ` (${log.resource_id.slice(0, 8)}...)`}
                  </span>
                )}
              </div>

              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded p-2">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}

              {log.ip_address && (
                <div className="mt-1 text-xs text-slate-400">
                  IP: {log.ip_address}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}