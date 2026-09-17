import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiInternalError, apiNotFound, apiSuccess } from "@/lib/api-response";
import { sanitizeText } from "@/lib/text";

const INVENTORY_FIELDS = [
  "type",
  "model",
  "asset_type",
  "asset_id",
  "equipment_id",
  "serial_number",
  "mac_ip",
  "bios",
  "sector",
  "subsector",
  "allocated_user",
  "responsible",
  "legal_responsible",
  "warranty",
  "equipment_state",
  "notes",
  "sei_process_number",
] as const;

function cleanValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const cleaned = sanitizeText(String(value)).trim();
  return cleaned || null;
}

function normalizeInventoryItem(item: Record<string, unknown>) {
  return {
    ...item,
    assetId: item.asset_id ?? "",
    equipmentId: item.equipment_id ?? "",
    assetType: item.asset_type ?? "",
    allocatedUser: item.allocated_user ?? "",
    legalResponsible: item.legal_responsible ?? "",
    equipmentState: item.equipment_state ?? "",
    macIp: item.mac_ip ?? "",
    seiProcessNumber: item.sei_process_number ?? "",
  };
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(
    req,
    async () => {
      try {
        const { id } = await params;
        const parsedBody = await req.json().catch(() => ({}));
        const body = parsedBody && typeof parsedBody === "object" ? parsedBody as Record<string, unknown> : {};
        const updates = INVENTORY_FIELDS
          .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
          .map((field, index) => ({
            field,
            value: cleanValue(body[field]),
            placeholder: `$${index + 1}`,
          }));

        if (updates.length === 0) {
          return apiSuccess(null);
        }

        const result = await pool.query(
          `UPDATE inventory_items
           SET ${updates.map(({ field, placeholder }) => `${field} = ${placeholder}`).join(", ")}, updated_at = now()
           WHERE id = $${updates.length + 1}
           RETURNING *`,
          [...updates.map(({ value }) => value), id]
        );

        if (!result.rows[0]) return apiNotFound("Ativo não encontrado.");
        return apiSuccess(normalizeInventoryItem(result.rows[0]));
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    { module: "inventario", action: "edit" }
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return withAuth(
    req,
    async () => {
      try {
        const { id } = await params;
        const result = await pool.query("DELETE FROM inventory_items WHERE id = $1 RETURNING id", [id]);
        if (!result.rows[0]) return apiNotFound("Ativo não encontrado.");
        return apiSuccess({ id: result.rows[0].id });
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    { module: "inventario", action: "delete" }
  );
}