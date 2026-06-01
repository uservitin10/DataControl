import { supabaseServer } from "@/lib/supabase-server";

/**
 * Normaliza strings para comparação
 * Remove acentos, converte para lowercase e remove espaços múltiplos
 */
export function normalizeString(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Calcula similaridade entre dois nomes (0 a 1)
 * 1 = match perfeito, 0 = sem match
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);

  if (n1 === n2) return 1; // Match exato

  // Verificar se um contém o outro
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;

  // Comparar palavras individuais
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  const commonWords = words1.filter((w) => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);

  return totalWords > 0 ? commonWords / totalWords : 0;
}

/**
 * Busca usuários candidatos para sincronização de dados legados
 * Retorna usuários com score de similaridade
 */
export async function findUserCandidatesForLegacyData(
  allocatedUserName: string,
  minSimilarity = 0.7
) {
  if (!allocatedUserName || allocatedUserName.trim() === "") {
    return [];
  }

  try {
    const { data: users, error } = await supabaseServer
      .from("profiles")
      .select("id, email, display_name")
      .neq("display_name", null);

    if (error || !users) {
      console.error("[Inventory Sync] Erro ao buscar usuários:", error);
      return [];
    }

    // Calcular similaridade com cada usuário
    const candidates = users
      .map((user) => ({
        ...user,
        similarity: calculateNameSimilarity(
          allocatedUserName,
          user.display_name || ""
        ),
      }))
      .filter((u) => u.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity);

    return candidates;
  } catch (err) {
    console.error("[Inventory Sync] Erro inesperado:", err);
    return [];
  }
}

/**
 * Sincroniza um item de inventário legado com seu allocated_user_id
 */
export async function syncLegacyInventoryItem(
  itemId: number,
  userId: string,
  allocatedUserName: string
) {
  try {
    const { error } = await supabaseServer
      .from("inventory_items")
      .update({
        allocated_user_id: userId,
        // Opcional: adicionar um campo para marcar como sincronizado
        notes: `[SINCRONIZADO] ${new Date().toLocaleDateString("pt-BR")} - De: "${allocatedUserName}"`,
      })
      .eq("id", itemId);

    if (error) {
      console.error(
        `[Inventory Sync] Erro ao sincronizar item ${itemId}:`,
        error
      );
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("[Inventory Sync] Erro inesperado:", err);
    return { success: false, error: err };
  }
}

/**
 * Notifica admins sobre uso de fallback
 */
export async function notifyAdminsAboutFallback(payload: {
  userId: string;
  userName: string;
  userEmail: string;
  allocatedUserName: string;
  equipmentCount: number;
}) {
  try {
    // Buscar todos os admins
    const { data: admins, error: adminsError } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (adminsError || !admins || admins.length === 0) {
      console.warn("[Fallback Notification] Nenhum admin encontrado");
      return { success: false, reason: "no_admins" };
    }

    // Criar notificações para cada admin
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      tipo: "fallback_usage",
      mensagem: `⚠️ ${payload.userName} (${payload.userEmail}) acessou inventário via fallback de nome. ${payload.equipmentCount} equipamentos encontrados. Nome no sistema: "${payload.allocatedUserName}". Considere sincronizar dados legados.`,
      lida: false,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabaseServer
      .from("notificacoes")
      .insert(notifications);

    if (error) {
      console.error("[Fallback Notification] Erro ao criar notificações:", error);
      return { success: false, error };
    }

    console.log(
      `[Fallback Notification] ${admins.length} admin(s) notificado(s)`
    );
    return { success: true, adminsNotified: admins.length };
  } catch (err) {
    console.error("[Fallback Notification] Erro inesperado:", err);
    return { success: false, error: err };
  }
}

/**
 * Registra uso de fallback para auditoria
 */
export async function logFallbackUsage(payload: {
  userId: string;
  displayName: string;
  allocatedUserName: string;
  equipmentCount: number;
  timestamp?: string;
}) {
  try {
    const { error } = await supabaseServer
      .from("audit_logs")
      .insert({
        user_id: payload.userId,
        action: "fallback_inventory_access",
        resource_type: "inventory_items",
        details: JSON.stringify({
          displayName: payload.displayName,
          allocatedUserName: payload.allocatedUserName,
          equipmentCount: payload.equipmentCount,
        }),
      });

    if (error) {
      console.warn("[Fallback Logging] Erro ao registrar:", error);
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error("[Fallback Logging] Erro inesperado:", err);
    return { success: false };
  }
}

/**
 * Obter estatísticas de uso de fallback
 */
export async function getFallbackUsageStats() {
  try {
    // Contar equipamentos com allocated_user_id nulo (dados legados)
    const { data: legacyItems, error: legacyError } = await supabaseServer
      .from("inventory_items")
      .select("allocated_user, count", { count: "exact" })
      .is("allocated_user_id", null);

    if (legacyError) {
      console.error("[Fallback Stats] Erro ao buscar dados legados:", legacyError);
      return { totalLegacyItems: 0, legacyByUser: {} };
    }

    // Agrupar por usuário
    const legacyByUser: { [key: string]: number } = {};
    (legacyItems || []).forEach((item: any) => {
      const name = normalizeString(item.allocated_user || "");
      legacyByUser[name] = (legacyByUser[name] || 0) + 1;
    });

    return {
      totalLegacyItems: legacyItems?.length || 0,
      legacyByUser,
    };
  } catch (err) {
    console.error("[Fallback Stats] Erro inesperado:", err);
    return { totalLegacyItems: 0, legacyByUser: {} };
  }
}

/**
 * Obter dados de auditoria de fallback
 */
export async function getFallbackAuditLogs(limit = 50) {
  try {
    const { data, error } = await supabaseServer
      .from("audit_logs")
      .select("*")
      .eq("action", "fallback_inventory_access")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Fallback Audit] Erro ao buscar logs:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[Fallback Audit] Erro inesperado:", err);
    return [];
  }
}
