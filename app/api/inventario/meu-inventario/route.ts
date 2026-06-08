import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError, apiCreated, apiValidationError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import {
  normalizeString,
  logFallbackUsage,
} from "@/lib/inventory-sync";
import { sanitizeText } from "@/lib/text";

// Função auxiliar para normalizar tipo de equipamento
function normalizeType(type: string): string {
  return (type || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
      let searchMethod = "allocated_user_id"; // Para rastreamento

      if (user.role === "viewer") {
        const allocatedResult = await supabaseServer
          .from("inventory_items")
          .select("*")
          .eq("allocated_user_id", user.id)
          .order("sector", { ascending: true })
          .order("type", { ascending: true });

        if (!allocatedResult.error) {
          equipments = allocatedResult.data;
        } else {
          const missingColumn = /column \"?inventory_items\.allocated_user_id\"? does not exist/i.test(allocatedResult.error.message) ||
            /allocated_user_id.*does not exist/i.test(allocatedResult.error.message) ||
            /coluna .*allocated_user_id.*não existe/i.test(allocatedResult.error.message);

          if (missingColumn) {
            searchMethod = "user_id";
            const userIdResult = await supabaseServer
              .from("inventory_items")
              .select("*")
              .eq("user_id", user.id)
              .order("sector", { ascending: true })
              .order("type", { ascending: true });

            if (userIdResult.error) {
              return apiInternalError(userIdResult.error.message);
            }

            equipments = userIdResult.data;
          } else {
            return apiInternalError(allocatedResult.error.message);
          }
        }

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

      const cleanedEquipments = [];
      for (const item of (equipments || [])) {
        const fixedAllocatedUser = sanitizeText(item.allocated_user || "");
        const fixedResponsible = sanitizeText(item.responsible || "");

        if (
          fixedAllocatedUser !== (item.allocated_user || "") ||
          fixedResponsible !== (item.responsible || "")
        ) {
          await supabaseServer
            .from("inventory_items")
            .update({
              allocated_user: fixedAllocatedUser || null,
              responsible: fixedResponsible || null,
            })
            .eq("id", item.id);
        }

        cleanedEquipments.push({
          ...item,
          allocated_user: fixedAllocatedUser || null,
          responsible: fixedResponsible || null,
        });
      }

      const regularEquipments = cleanedEquipments.filter(
        (item) => normalizeType(item.type) !== "licenca"
      );
      const licenses = cleanedEquipments.filter(
        (item) => normalizeType(item.type) === "licenca"
      );

      const activeLicenses =
        user.role === "viewer"
          ? licenses.filter((license) =>
              ["ativa", "ativo"].includes(
                (license.equipment_state || "").toLowerCase()
              )
            )
          : licenses;

      return apiSuccess({
        user: {
          id: user.id,
          displayName,
        },
        equipments: regularEquipments,
        licenses: activeLicenses,
        totalEquipments: regularEquipments.length,
        totalLicenses: activeLicenses.length,
        // Informação adicional para rastreamento (opcional, para fase 3)
        _metadata: {
          searchMethod, // 'allocated_user_id' | 'allocated_user_name_fallback'
          usingFallback: searchMethod === "allocated_user_name_fallback",
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

        if (!type || !model || !responsible || !serial_number) {
          return apiValidationError('Tipo, modelo, responsável e número de série são obrigatórios.');
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
