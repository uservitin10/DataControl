import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError, apiCreated, apiValidationError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import { sanitizeText } from "@/lib/text";
import { isLicenseType } from "@/lib/inventario";

type InventoryItemRecord = {
  [key: string]: unknown;
  allocated_user?: string | null;
  responsible?: string | null;
  type?: string | null;
  equipment_state?: string | null;
};

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
  try {
    const res = await pool.query(
      `SELECT * FROM inventory_items WHERE ${column} = $1 ORDER BY sector ASC, type ASC`,
      [value]
    );
    return { data: res.rows, error: null } as { data: Record<string, unknown>[] | null; error: unknown | null };
  } catch (err) {
    return { data: null, error: err } as { data: Record<string, unknown>[] | null; error: unknown | null };
  }
}

function normalizePersonName(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function loadPersonalInventory(
  userId: string,
  displayName: string
): Promise<{ equipments: InventoryItemRecord[]; searchMethod: "allocated_user_id" | "user_id" | "allocated_user" }> {
  const allocatedResult = await fetchInventoryItemsByColumn("allocated_user_id", userId);
  if (allocatedResult.error && !isMissingColumnError(allocatedResult.error, "allocated_user_id")) {
    throw allocatedResult.error;
  }

  const userIdResult = await fetchInventoryItemsByColumn("user_id", userId);
  if (userIdResult.error && !isMissingColumnError(userIdResult.error, "user_id")) {
    throw userIdResult.error;
  }

  const legacyResult = await pool.query(
    `SELECT * FROM inventory_items
     WHERE allocated_user IS NOT NULL
     ORDER BY sector ASC, type ASC`
  );
  const normalizedDisplayName = normalizePersonName(displayName);
  const legacyItems = legacyResult.rows.filter(
    (item: InventoryItemRecord) => normalizePersonName(item.allocated_user) === normalizedDisplayName
  );
  const idItems = [
    ...(allocatedResult.data ?? []),
    ...(userIdResult.data ?? []),
  ];
  const uniqueItems = Array.from(
    new Map([...idItems, ...legacyItems].map((item) => [String(item.id), item])).values()
  );

  return {
    equipments: uniqueItems,
    searchMethod: idItems.length > 0 ? "allocated_user_id" : "allocated_user",
  };
}

// FIX: removido o loop de update a cada GET — normalização agora é apenas leitura
function normalizeInventoryItems(items: InventoryItemRecord[]) {
  return (items ?? []).map((item) => ({
    ...item,
    allocated_user: sanitizeText(item.allocated_user || "") || null,
    responsible: sanitizeText(item.responsible || "") || null,
  }));
}

function splitInventoryItems(items: InventoryItemRecord[]) {
  const regularEquipments = items.filter((item) => !isLicenseType(String(item.type ?? "")));
  const licenses = items.filter((item) => isLicenseType(String(item.type ?? "")));
  return { regularEquipments, licenses };
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      let profileData: Record<string, unknown> | null = null;
      try {
        const r = await pool.query(
          `SELECT display_name FROM profiles WHERE id = $1`,
          [user.id]
        );
        profileData = r.rows[0] ?? null;
      } catch (e) {
        profileData = null;
      }

      if (!profileData) {
        return apiInternalError("Perfil do usuário não encontrado");
      }

      const fixedDisplayName = sanitizeText(profileData.display_name as string || user.nome);
      if (fixedDisplayName !== profileData.display_name) {
        try {
          await pool.query(
            `UPDATE profiles SET display_name = $1 WHERE id = $2`,
            [fixedDisplayName, user.id]
          );
        } catch (e) {
          // ignore update failure
        }
      }

      const displayName = fixedDisplayName;

      const userId = user.id;
      if (!userId) {
        return apiInternalError("ID do usuário não encontrado.");
      }

      const personalResult = await loadPersonalInventory(userId, displayName);
      const equipments = personalResult.equipments;
      const searchMethod = personalResult.searchMethod;

      // FIX: normalização sem side-effects (sem update no banco a cada GET)
      const cleanedEquipments = normalizeInventoryItems(equipments || []);
      const { regularEquipments, licenses } = splitInventoryItems(cleanedEquipments);

      const activeLicenses = licenses.filter((license) =>
        ["ativa", "ativo"].includes(
          (license.equipment_state || "").toString().toLowerCase()
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
          usingFallback: searchMethod === "allocated_user",
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
          allocated_user_id: user.id,
          sector: sector || null,
          warranty: warranty || null,
          equipment_state: equipment_state || null,
          notes: notes || null,
          created_by: user.id,
        };
        let createdItem: Record<string, unknown> | null = null;
        try {
          const cols = [
            'type','model','serial_number','asset_id','equipment_id','asset_type','mac_ip','responsible','allocated_user','allocated_user_id','sector','warranty','equipment_state','notes','created_by'
          ];
          const values = [
            insertPayload.type,
            insertPayload.model,
            insertPayload.serial_number,
            insertPayload.asset_id,
            insertPayload.equipment_id,
            insertPayload.asset_type,
            insertPayload.mac_ip,
            insertPayload.responsible,
            insertPayload.allocated_user,
            insertPayload.allocated_user_id,
            insertPayload.sector,
            insertPayload.warranty,
            insertPayload.equipment_state,
            insertPayload.notes,
            insertPayload.created_by,
          ];

          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          const res = await pool.query(
            `INSERT INTO inventory_items (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`,
            values
          );
          createdItem = res.rows[0];
        } catch (insertError: any) {
          return apiInternalError(insertError?.message || String(insertError));
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

        let updatedItem: Record<string, unknown> | null = null;
        try {
          const values = [
            type,
            model,
            serial_number,
            asset_id || null,
            equipment_id || null,
            type,
            mac_ip || null,
            sanitizeText(responsible),
            sector || null,
            warranty || null,
            equipment_state || null,
            notes || null,
            new Date().toISOString(),
            id,
            user.id,
          ];

          const res = await pool.query(
            `UPDATE inventory_items SET
              type = $1,
              model = $2,
              serial_number = $3,
              asset_id = $4,
              equipment_id = $5,
              asset_type = $6,
              mac_ip = $7,
              responsible = $8,
              sector = $9,
              warranty = $10,
              equipment_state = $11,
              notes = $12,
              updated_at = $13,
              allocated_user_id = COALESCE(allocated_user_id, $15)
             WHERE id = $14 RETURNING *`,
            values
          );
          updatedItem = res.rows[0];
        } catch (updateError: any) {
          return apiInternalError(updateError?.message || String(updateError));
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

        try {
          await pool.query(`DELETE FROM inventory_items WHERE id = $1`, [id]);
        } catch (deleteError: any) {
          return apiInternalError(deleteError?.message || String(deleteError));
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