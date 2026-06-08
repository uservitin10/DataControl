import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import {
  apiSuccess,
  apiInternalError,
  apiForbidden,
} from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import { syncLegacyInventoryItem } from "@/lib/inventory-sync";
import { sanitizeText } from "@/lib/text";

/**
 * GET /api/inventario/sync-legacy-data
 * Retorna estatísticas de dados legados pendentes de sincronização
 * Requer role: admin
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      // Apenas admins podem acessar
      if (user.role !== "admin") {
        return apiForbidden(
          "Apenas administradores podem acessar sincronização de dados"
        );
      }

      // Buscar todos os itens legados (sem allocated_user_id)
      const { data: legacyItems, error } = await supabaseServer
        .from("inventory_items")
        .select("id, allocated_user, type, model, sector")
        .is("allocated_user_id", null)
        .order("allocated_user", { ascending: true });

      if (error) {
        return apiInternalError(error.message);
      }

      // Agrupar por usuário
      const itemsByUser: {
        [key: string]: Array<{
          id: number;
          type: string;
          model: string;
          sector: string;
        }>;
      } = {};

      (legacyItems || []).forEach((item) => {
        const it = item as Record<string, unknown>;
        const user = sanitizeText((it.allocated_user as string) || "SEM NOME");
        if (!itemsByUser[user]) {
          itemsByUser[user] = [];
        }
        itemsByUser[user].push({
          id: it.id as number,
          type: (it.type as string) || "",
          model: (it.model as string) || "",
          sector: (it.sector as string) || "",
        });
      });

      return apiSuccess({
        totalLegacyItems: legacyItems?.length || 0,
        itemsByUser,
      });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

/**
 * POST /api/inventario/sync-legacy-data
 * Sincroniza um item legado com seu allocated_user_id
 * Body: {
 *   itemId: number,
 *   userId: string (UUID do usuário)
 * }
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      // Apenas admins podem sincronizar
      if (user.role !== "admin") {
        return apiForbidden(
          "Apenas administradores podem sincronizar dados"
        );
      }

      const body = await req.json();
      const { itemId, userId } = body;

      if (!itemId || !userId) {
        return apiInternalError("itemId e userId são obrigatórios");
      }

      // Buscar o item legado
      const { data: item, error: itemError } = await supabaseServer
        .from("inventory_items")
        .select("allocated_user")
        .eq("id", itemId)
        .single();

      if (itemError || !item) {
        return apiInternalError("Item não encontrado");
      }

      const itemAllocatedUser = sanitizeText(item.allocated_user || "");

      // Sincronizar
      const result = await syncLegacyInventoryItem(
        itemId,
        userId,
        itemAllocatedUser
      );

      if (!result.success) {
        return apiInternalError("Erro ao sincronizar item");
      }

      // Registrar em auditoria
      await addAuditLog({
        user_id: user.id,
        action: "sync_legacy_inventory",
        resource_type: "inventory_items",
        resource_id: String(itemId),
        details: JSON.stringify({
          fromAllocatedUser: item.allocated_user,
          toUserId: userId,
        }),
      });

      return apiSuccess({
        success: true,
        message: "Item sincronizado com sucesso",
        itemId,
        userId,
      });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

/**
 * PUT /api/inventario/sync-legacy-data
 * Sincroniza automaticamente todos os items de um usuário legado
 * Body: {
 *   allocatedUserName: string,
 *   userId: string (UUID do usuário)
 * }
 */
export async function PUT(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      // Apenas admins podem sincronizar
      if (user.role !== "admin") {
        return apiForbidden(
          "Apenas administradores podem sincronizar dados"
        );
      }

      const body = await req.json();
      const { allocatedUserName, userId } = body;

      if (!allocatedUserName || !userId) {
        return apiInternalError(
          "allocatedUserName e userId são obrigatórios"
        );
      }

      // Buscar todos os items deste usuário legado
      const sanitizedAllocatedUserName = sanitizeText(allocatedUserName);

      const { data: items, error: itemsError } = await supabaseServer
        .from("inventory_items")
        .select("id, allocated_user")
        .is("allocated_user_id", null);

      if (itemsError || !items) {
        return apiInternalError("Erro ao buscar items");
      }

      const matchingItems = items.filter((item) =>
        sanitizeText((item.allocated_user as string) || "") === sanitizedAllocatedUserName
      );

      let syncedCount = 0;
      const errors: { itemId: number; error?: unknown }[] = [];

      // Sincronizar cada item
      for (const item of matchingItems) {
        const result = await syncLegacyInventoryItem(
          item.id,
          userId,
          sanitizedAllocatedUserName
        );

        if (result.success) {
          syncedCount++;
        } else {
          errors.push({ itemId: item.id, error: result.error });
        }
      }

      // Registrar em auditoria
      await addAuditLog({
        user_id: user.id,
        action: "bulk_sync_legacy_inventory",
        resource_type: "inventory_items",
        details: JSON.stringify({
          allocatedUserName,
          toUserId: userId,
          syncedCount,
          failedCount: errors.length,
        }),
      });

      return apiSuccess({
        success: true,
        message: `${syncedCount} items sincronizados com sucesso`,
        syncedCount,
        failedCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
