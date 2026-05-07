import { useCallback } from "react";
import { supabase } from "@/src/lib/supabase";

export type AuditAction =
  | "login"
  | "logout"
  | "view_document"
  | "create_document"
  | "update_document"
  | "delete_document"
  | "upload_file"
  | "download_file"
  | "create_notification"
  | "view_profile"
  | "update_profile"
  | "change_password"
  | "admin_action";

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
  profiles?: {
    display_name: string;
    role: string;
  };
}

export function useAudit() {
  const logAction = useCallback(async (
    action: AuditAction,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>
  ) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return;

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
        }),
      });

      if (!response.ok) {
        console.error("Erro ao registrar ação no audit log:", await response.text());
      }
    } catch (error) {
      console.error("Erro ao enviar log de auditoria:", error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }, []);

  const getAuditLogs = useCallback(async (
    limit = 50,
    offset = 0,
    userId?: string,
    action?: AuditAction
  ): Promise<AuditLog[]> => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (userId) params.set("user_id", userId);
      if (action) params.set("action", action);

      const response = await fetch(`/api/audit?${params}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar logs de auditoria");
      }

      return await response.json();
    } catch (error) {
      console.error("Erro ao buscar audit logs:", error);
      return [];
    }
  }, []);

  return { logAction, getAuditLogs };
}