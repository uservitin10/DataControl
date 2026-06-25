import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError, apiCreated, apiValidationError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import { sanitizeText } from "@/lib/text";
import { isLicenseType } from "@/lib/inventario";

function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  const message = String((error as { message?: string }).message);
  return (
    new RegExp(`column \\\"?inventory_items\\.${column}\\\"? does not exist`, "i").test(message) ||
    new RegExp(`${column}.*does not exist`, "i").test(message) ||
    new RegExp(`coluna .*${column}.*não existe`, "i").test(message)
  );
}

async function fetchInventoryItemsByColumn(column: string, value: string) {
  return supabaseServer
    .from("inventory_items")
    .select("*")
    .eq(column, value)
    .order("sector", { ascending: true })
    .order("type", { ascending: true });
}

async function loadViewerEquipments(userId: string) {
  let searchMethod: "allocated_user_id" | "user_id" = "allocated_user_id";
  const allocatedResult = await fetchInventoryItemsByColumn("allocated_user_id", userId);

  if (!allocatedResult.error) {
    return { equipments: allocatedResult.data ?? [], searchMethod };
  }

  if (!isMissingColumnError(allocatedResult.error, "allocated_user_id")) {
    throw allocatedResult.error;
  }

  searchMethod = "user_id";
  const userIdResult = await fetchInventoryItemsByColumn("user_id", userId);

  if (userIdResult.error) {
    throw userIdResult.error;
  }

  return { equipments: userIdResult.data ?? [], searchMethod };
}

// FIX: removido o loop de update a cada GET — normalização agora é apenas leitura
function normalizeInventoryItems(items: any[]) {
  return (items ?? []).map((item) => ({
    ...item,
    allocated_user: sanitizeText(item.allocated_user || "") || null,
    responsible: sanitizeText(item.responsible || "") || null,
  }));
}

function splitInventoryItems(items: any[]) {
  const regularEquipments = items.filter((item) => !isLicenseType(item.type));
  const licenses = items.filter((item) => isLicenseType(item.type));
  return { regularEquipments, licenses };
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const { data: profileData, error: profileError } = await supabaseServer
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        return apiInternalError("Perfil do usuário não encontrado");
      }

      const fixedDisplayName = sanitizeText(profileData.display_name || user.nome);
      if (fixedDisplayName !== profileData.display_name) {
        await supabaseServer
          .from("profiles")
          .update({ display_name: fixedDisplayName })
          .eq("id", user.id);
      }

      const displayName = fixedDisplayName;

      let equipments = null;
      let searchMethod: "allocated_user_id" | "user_id" = "allocated_user_id";

      if (user.role === "viewer") {
        const userId = user.id;
        if (!userId) {
          return apiInternalError("ID do usuário não encontrado.");
        }

        const viewerResult = await loadViewerEquipments(userId);
        equipments = viewerResult.equipments;
        searchMethod = viewerResult.searchMethod;
      } else {
        // admin/editor vê tudo
        const { data, error } = await supabaseServer
          .from("inventory_items")
          .select("*")
          .order("sector", { ascending: true })
          .order("type", { ascending: true });

        if (error) {
          return apiInternalError(error.message);
        }

        equipments = data;
      }

      // FIX: normalização sem side-effects (sem update no banco a cada GET)
      const cleanedEquipments = normalizeInventoryItems(equipments || []);
      const { regularEquipments, licenses } = splitInventoryItems(cleanedEquipments);

      const activeLicenses = licenses.filter((license) =>
        ["ativa", "ativo"].includes(
          (license.equipment_state || "").toLowerCase()
        )
      );

      // FIX: removido mpoParkEquipment — esses dados já estão no banco após a sincronização
      const responseEquipments = regularEquipments;

      return apiSuccess({
        user: {
          id: user.id,
          displayName,
        },
        equipments: responseEquipments,
        licenses: activeLicenses,
        totalEquipments: responseEquipments.length,
        totalLicenses: activeLicenses.length,
        _metadata: {
          searchMethod,
          usingFallback: false,
        },
      });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(
    req,
    async (user) => {
      try {
        const body = await req.json();
        const { type, model, serial_number, asset_id, equipment_id, mac_ip, sector, responsible, warranty, equipment_state, notes } = body;
        if (!type || !model || !responsible) {
          return apiValidationError('Tipo, modelo e responsável são obrigatórios.');
        }
        const insertPayload = {
          type,
          model,
          serial_number: serial_number || null,
          asset_id: asset_id || null,
          equipment_id: equipment_id || null,
          asset_type: type,
          mac_ip: mac_ip || null,
          responsible: sanitizeText(responsible),
          allocated_user: sanitizeText(user.nome),
          user_id: user.id,
          sector: sector || null,
          warranty: warranty || null,
          equipment_state: equipment_state || null,
          notes: notes || null,
          created_by: user.id,
        };
        const { data: createdItem, error: insertError } = await supabaseServer
          .from('inventory_items')
          .insert([insertPayload])
          .select()
          .single();
        if (insertError) {
          return apiInternalError(insertError.message);
        }

        try {
          await addAuditLog({
            user_id: user.id,
            action: 'create_inventory_item',
            resource_type: 'inventory_item',
            resource_id: createdItem?.id ? String(createdItem.id) : null,
            details: JSON.stringify({ type, model, asset_id, equipment_id, sector, responsible, warranty, equipment_state, notes }),
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
          });
        } catch (auditErr) {
          console.warn('Falha ao gravar auditoria de inventário:', auditErr);
        }

        return apiCreated(createdItem);
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    ['admin', 'editor']
  );
}

export async function PATCH(req: NextRequest) {
  return withAuth(
    req,
    async (user) => {
      try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) {
          return apiValidationError('ID do item é obrigatório.');
        }

        const body = await req.json();
        const {
          type,
          model,
          serial_number,
          asset_id,
          equipment_id,
          mac_ip,
          sector,
          responsible,
          warranty,
          equipment_state,
          notes,
        } = body;

        if (!type || !model || !responsible) {
          return apiValidationError('Tipo, modelo e responsável são obrigatórios.');
        }
        if (type === 'Licença' && !asset_id) {
          return apiValidationError('Email do responsável é obrigatório para licenças.');
        }

        const { data: updatedItem, error: updateError } = await supabaseServer
          .from('inventory_items')
          .update({
            type,
            model,
            serial_number,
            asset_id: asset_id || null,
            equipment_id: equipment_id || null,
            asset_type: type,
            mac_ip: mac_ip || null,
            responsible: sanitizeText(responsible),
            sector: sector || null,
            warranty: warranty || null,
            equipment_state: equipment_state || null,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          return apiInternalError(updateError.message);
        }

        try {
          await addAuditLog({
            user_id: user.id,
            action: 'update_inventory_item',
            resource_type: 'inventory_item',
            resource_id: String(id),
            details: JSON.stringify({ type, model, asset_id, equipment_id, sector, responsible, warranty, equipment_state, notes }),
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
          });
        } catch (auditErr) {
          console.warn('Falha ao gravar auditoria de inventário:', auditErr);
        }

        return apiSuccess(updatedItem);
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    ['admin', 'editor']
  );
}

export async function DELETE(req: NextRequest) {
  return withAuth(
    req,
    async (user) => {
      try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) {
          return apiValidationError('ID do item é obrigatório.');
        }

        const { error: deleteError } = await supabaseServer
          .from('inventory_items')
          .delete()
          .eq('id', id);

        if (deleteError) {
          return apiInternalError(deleteError.message);
        }

        try {
          await addAuditLog({
            user_id: user.id,
            action: 'delete_inventory_item',
            resource_type: 'inventory_item',
            resource_id: id,
            details: JSON.stringify({ id }),
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
          });
        } catch (auditErr) {
          console.warn('Falha ao gravar auditoria de inventário:', auditErr);
        }

        return apiSuccess({ deleted: true });
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    ['admin', 'editor']
  );
}