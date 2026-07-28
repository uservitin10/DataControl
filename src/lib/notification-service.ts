import pool from "@/lib/db";

export async function getAdminIds(): Promise<string[]> {
  try {
    const result = await pool.query("SELECT id FROM profiles WHERE role = $1", ["admin"]);
    return result.rows.map((row) => String((row as Record<string, unknown>)?.id)).filter(Boolean);
  } catch (error) {
    console.warn("[Notification Service] Falha ao buscar admins:", error);
    return [];
  }
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

  try {
    await pool.query(
      `INSERT INTO notificacoes (user_id, tipo, mensagem, lida, created_at)
       VALUES ${notifications.map((_, index) => `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`).join(", ")}`,
      notifications.flatMap((notification) => [notification.user_id, notification.tipo, notification.mensagem, notification.lida, notification.created_at])
    );
  } catch (error) {
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
