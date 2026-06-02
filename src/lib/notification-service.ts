import { supabaseServer } from "@/lib/supabase-server";

export async function getAdminIds(): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (error || !data) {
    console.warn("[Notification Service] Falha ao buscar admins:", error);
    return [];
  }

  return data.map((row) => String((row as Record<string, unknown>)?.id)).filter(Boolean);
}

export async function notifyAdmins(message: string, type = "system") {
  const adminIds = await getAdminIds();
  if (adminIds.length === 0) {
    console.warn("[Notification Service] Nenhum admin encontrado para notificar.");
    return { success: false, reason: "no_admins" };
  }

  const notifications = adminIds.map((adminId) => ({
    user_id: adminId,
    tipo: type,
    mensagem: message,
    lida: false,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabaseServer.from("notificacoes").insert(notifications);
  if (error) {
    console.error("[Notification Service] Erro ao criar notificações:", error);
    return { success: false, error };
  }

  return { success: true, count: adminIds.length };
}

export function buildEntityNotification(
  action: "criado" | "atualizado" | "excluído",
  entityName: string,
  entityLabel: string,
  userName: string
) {
  return `Usuário ${userName} ${action} ${entityName} ${entityLabel}.`;
}
