import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import {
  apiSuccess,
  apiInternalError,
  apiForbidden,
} from "@/lib/api-response";
import { getFallbackUsageStats, getFallbackAuditLogs } from "@/lib/inventory-sync";

/**
 * GET /api/inventario/fallback-monitoring
 * Dashboard de monitoramento de uso de fallback
 * Requer role: admin
 * 
 * Query params:
 * - limit=50 (padrão) - número de logs a retornar
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      // Apenas admins podem acessar
      if (user.role !== "admin") {
        return apiForbidden(
          "Apenas administradores podem acessar monitoramento"
        );
      }

      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get("limit") || "50");

      // Obter estatísticas de dados legados
      const stats = await getFallbackUsageStats();

      // Obter logs de auditoria de fallback
      const auditLogs = await getFallbackAuditLogs(limit);

      // Agrupar logs por usuário para obter resumo
      const usageByUser: {
        [userId: string]: {
          userName: string;
          userEmail: string;
          accessCount: number;
          lastAccess: string;
          totalEquipmentAccessed: number;
          messages: string[];
        };
      } = {};

      auditLogs.forEach((log) => {
        const l = log as Record<string, unknown>;
        const userId = (l.user_id as string) || "unknown";
        if (!usageByUser[userId]) {
          usageByUser[userId] = {
            userName: "",
            userEmail: "",
            accessCount: 0,
            lastAccess: "",
            totalEquipmentAccessed: 0,
            messages: [],
          };
        }

        usageByUser[userId].accessCount++;
        usageByUser[userId].lastAccess = log.created_at;

        if (log.details) {
          try {
            const details = JSON.parse(log.details);
            usageByUser[userId].totalEquipmentAccessed += details.equipmentCount || 0;
            usageByUser[userId].messages.push(
              `[${new Date(log.created_at).toLocaleDateString("pt-BR")}] ${details.displayName} acessou ${details.equipmentCount} equipamentos alocados a "${details.allocatedUserName}"`
            );
            } catch {
              // Ignore parse errors
            }
        }
      });

      // Buscar detalhes dos usuários
      const userIds = Object.keys(usageByUser);
      let userDetails: Record<string, unknown>[] = [];

      if (userIds.length > 0) {
        const { data, error } = await supabaseServer
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);

        if (!error && data) {
          userDetails = data;
        }
      }

      // Enriquecer dados de usuário
      userDetails.forEach((userDetail) => {
        const ud = userDetail as Record<string, unknown>;
        const id = ud.id as string;
        if (usageByUser[id]) {
          usageByUser[id].userName = (ud.display_name as string) || "";
          usageByUser[id].userEmail = (ud.email as string) || "";
        }
      });

      return apiSuccess({
        // Estatísticas gerais
        stats,

        // Uso de fallback por usuário
        fallbackUsageByUser: usageByUser,
        totalUsersUsingFallback: Object.keys(usageByUser).length,

        // Últimos logs
        recentLogs: auditLogs.slice(0, 10),

        // Data de geração do relatório
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

/**
 * DELETE /api/inventario/fallback-monitoring
 * Limpa notificações de fallback já lidas
 * Requer role: admin
 */
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      // Apenas admins podem deletar
      if (user.role !== "admin") {
        return apiForbidden(
          "Apenas administradores podem limpar notificações"
        );
      }

      // Deletar notificações de fallback já lidas
      const { error } = await supabaseServer
        .from("notificacoes")
        .delete()
        .eq("tipo", "fallback_usage")
        .eq("lida", true);

      if (error) {
        return apiInternalError(error.message);
      }

      // Registrar em auditoria
      await addAuditLog({
        user_id: user.id,
        action: "clear_fallback_notifications",
        resource_type: "notificacoes",
        details: "Notificações de fallback já lidas foram removidas",
      });

      return apiSuccess({
        success: true,
        message: "Notificações limpas com sucesso",
      });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
