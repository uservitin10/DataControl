import pool from "@/lib/db";
import { addAuditLog } from "@/lib/audit";

export function normalizeString(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeString(name1);
  const n2 = normalizeString(name2);
  if (n1 === n2) return 1;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  const commonWords = words1.filter((w) => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  return totalWords > 0 ? commonWords / totalWords : 0;
}

export async function findUserCandidatesForLegacyData(
  allocatedUserName: string,
  minSimilarity = 0.7
) {
  if (!allocatedUserName || allocatedUserName.trim() === "") {
    return [];
  }

  try {
    const { rows: users } = await pool.query(
      `SELECT id, email, display_name FROM profiles WHERE display_name IS NOT NULL`
    );

    const candidates = users
      .map((user) => ({
        ...user,
        similarity: calculateNameSimilarity(allocatedUserName, user.display_name || ""),
      }))
      .filter((u) => u.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity);

    return candidates;
  } catch (err) {
    console.error("[Inventory Sync] Erro inesperado:", err);
    return [];
  }
}

export async function syncLegacyInventoryItem(
  itemId: number,
  userId: string,
  allocatedUserName: string
) {
  try {
    const notes = `[SINCRONIZADO] ${new Date().toLocaleDateString("pt-BR")} - De: "${allocatedUserName}"`;
    const { rowCount } = await pool.query(
      `UPDATE inventory_items SET allocated_user_id = $1, notes = $2 WHERE id = $3`,
      [userId, notes, itemId]
    );

    if (rowCount === 0) {
      console.error(`[Inventory Sync] Item ${itemId} não encontrado`);
      return { success: false, error: "Item não encontrado" };
    }

    return { success: true };
  } catch (err) {
    console.error("[Inventory Sync] Erro inesperado:", err);
    return { success: false, error: err };
  }
}

export async function logFallbackUsage(payload: {
  userId: string;
  displayName: string;
  allocatedUserName: string;
  equipmentCount: number;
  timestamp?: string;
}) {
  try {
    const result = await addAuditLog({
      user_id: payload.userId,
      action: "fallback_inventory_access",
      resource_type: "inventory_items",
      details: JSON.stringify({
        displayName: payload.displayName,
        allocatedUserName: payload.allocatedUserName,
        equipmentCount: payload.equipmentCount,
      }),
    });

    if (!result.success) {
      console.warn("[Fallback Logging] Erro ao registrar:", result.error || "skip");
      return { success: false };
    }

    return { success: true };
  } catch (err) {
    console.error("[Fallback Logging] Erro inesperado:", err);
    return { success: false };
  }
}

export async function getFallbackUsageStats() {
  try {
    const { rows: legacyItems } = await pool.query(
      `SELECT allocated_user FROM inventory_items WHERE allocated_user_id IS NULL`
    );

    const legacyByUser: { [key: string]: number } = {};
    legacyItems.forEach((item) => {
      const allocated = (item.allocated_user as string) || "";
      const name = normalizeString(allocated);
      legacyByUser[name] = (legacyByUser[name] || 0) + 1;
    });

    return {
      totalLegacyItems: legacyItems.length,
      legacyByUser,
    };
  } catch (err) {
    console.error("[Fallback Stats] Erro inesperado:", err);
    return { totalLegacyItems: 0, legacyByUser: {} };
  }
}

export async function getFallbackAuditLogs(limit = 50) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM audit_logs WHERE action = $1 ORDER BY created_at DESC LIMIT $2`,
      ["fallback_inventory_access", limit]
    );
    return rows;
  } catch (err) {
    console.error("[Fallback Audit] Erro inesperado:", err);
    return [];
  }
}