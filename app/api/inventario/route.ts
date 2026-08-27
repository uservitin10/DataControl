import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError } from "@/lib/api-response";
import { sanitizeText } from "@/lib/text";
import { isLicenseType } from "@/lib/inventario";

type InventoryItemRecord = {
  [key: string]: unknown;
  allocated_user?: string | null;
  responsible?: string | null;
  type?: string | null;
  equipment_state?: string | null;
};

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
  return withAuth(
    req,
    async (user) => {
      try {
        const result = await pool.query(
          `SELECT * FROM inventory_items ORDER BY sector ASC, type ASC`
        );

        const cleanedItems = normalizeInventoryItems(result.rows || []);
        const { regularEquipments, licenses } = splitInventoryItems(cleanedItems);

        return apiSuccess({
          equipments: regularEquipments,
          licenses: licenses,
          totalEquipments: regularEquipments.length,
          totalLicenses: licenses.length,
        });
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    ["admin"]
  );
}
