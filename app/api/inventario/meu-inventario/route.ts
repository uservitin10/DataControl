import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError, apiCreated, apiValidationError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import {
  normalizeString,
  notifyAdminsAboutFallback,
  logFallbackUsage,
} from "@/lib/inventory-sync";
import { notifyAdmins, buildEntityNotification } from "@/lib/notification-service";

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

      const displayName = profileData.display_name || user.nome;

      
      let equipments = null;
      let searchMethod = "allocated_user_id"; // Para rastreamento

      
      if (user.role === "viewer") {
        const { data, error } = await supabaseServer
          .from("inventory_items")
          .select("*")
          .eq("allocated_user_id", user.id)
          .order("sector", { ascending: true })
          .order("type", { ascending: true });

        if (error) {
          return apiInternalError(error.message);
        }

        equipments = data;

        
        if ((!equipments || equipments.length === 0) && displayName) {
          console.log(
            `[Meu Inventário] Fallback para busca por nome para ${displayName}`
          );

          const normalizedDisplayName = normalizeString(displayName);

          const { data: legacyEquipments, error: legacyError } =
            await supabaseServer
              .from("inventory_items")
              .select("*")
              .is("allocated_user_id", null) // Só dados legados (sem UUID)
              .order("sector", { ascending: true })
              .order("type", { ascending: true });

          if (legacyError) {
            console.warn(
              "[Meu Inventário] Erro na busca por fallback:",
              legacyError
            );
          } else {
            // Filtrar equipamentos legados que combinam com o nome
            const matchedEquipments = (legacyEquipments || []).filter(
              (item) => {
                const normalizedAllocatedUser = normalizeString(
                  item.allocated_user || ""
                );
                // Match exato (após normalização) ou parcial
                return (
                  normalizedAllocatedUser === normalizedDisplayName ||
                  normalizedAllocatedUser.includes(normalizedDisplayName) ||
                  normalizedDisplayName.includes(normalizedAllocatedUser)
                );
              }
            );

            if (matchedEquipments.length > 0) {
              equipments = matchedEquipments;
              searchMethod = "allocated_user_name_fallback";
              console.log(
                `[Meu Inventário] Encontrados ${matchedEquipments.length} equipamentos por fallback`
              );

              const allocatedUserName =
                matchedEquipments[0]?.allocated_user || "desconhecido";

              
              await notifyAdminsAboutFallback({
                userId: user.id || "",
                userName: displayName,
                userEmail: user.email || "desconhecido",
                allocatedUserName,
                equipmentCount: matchedEquipments.length,
              });

              
              await logFallbackUsage({
                userId: user.id || "",
                displayName,
                allocatedUserName: allocatedUserName || "",
                equipmentCount: matchedEquipments.length,
              });
            }
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

      const regularEquipments = (equipments || []).filter(
        (item) => normalizeType(item.type) !== "licenca"
      );
      const licenses = (equipments || []).filter(
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
        const { type, model, asset_id, equipment_id, mac_ip, sector, responsible, warranty, equipment_state, notes } = body;
        if (!type || !model || !responsible) {
          return apiValidationError('Tipo, modelo e responsável são obrigatórios.');
        }
        const insertPayload = {
          type,
          model,
          asset_id: asset_id || null,
          equipment_id: equipment_id || null,
          asset_type: type,
          mac_ip: mac_ip || null,
          responsible,
          allocated_user: user.nome,
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

          await notifyAdmins(
            buildEntityNotification(
              "criado",
              "item de inventário",
              `ID ${createdItem?.id ?? "?"}`,
              user.nome
            ),
            "inventory"
          );
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

        const { data: updatedItem, error: updateError } = await supabaseServer
          .from('inventory_items')
          .update({
            type,
            model,
            asset_id: asset_id || null,
            equipment_id: equipment_id || null,
            asset_type: type,
            mac_ip: mac_ip || null,
            responsible,
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

          await notifyAdmins(
            buildEntityNotification(
              "atualizado",
              "item de inventário",
              `ID ${id}`,
              user.nome
            ),
            "inventory"
          );
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

          await notifyAdmins(
            buildEntityNotification(
              "excluído",
              "item de inventário",
              `ID ${id}`,
              user.nome
            ),
            "inventory"
          );
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
