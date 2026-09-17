import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiCreated, apiSuccess, apiInternalError, apiValidationError } from "@/lib/api-response";
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
    assetId: item.asset_id ?? item.assetId ?? "",
    equipmentId: item.equipment_id ?? item.equipmentId ?? "",
    assetType: item.asset_type ?? item.assetType ?? "",
    allocatedUser: item.allocated_user ?? item.allocatedUser ?? "",
    legalResponsible: item.legal_responsible ?? item.legalResponsible ?? "",
    equipmentState: item.equipment_state ?? item.equipmentState ?? "",
    macIp: item.mac_ip ?? item.macIp ?? "",
    seiProcessNumber: item.sei_process_number ?? item.seiProcessNumber ?? "",
    allocated_user: sanitizeText(item.allocated_user || "") || null,
    responsible: sanitizeText(item.responsible || "") || null,
  }));
}

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

type InventoryField = (typeof INVENTORY_FIELDS)[number];

function cleanValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const cleaned = sanitizeText(String(value)).trim();
  return cleaned || null;
}

function readInventoryPayload(body: Record<string, unknown>) {
  const values = Object.fromEntries(
    INVENTORY_FIELDS.map((field) => [field, cleanValue(body[field])])
  ) as Record<InventoryField, string | null>;

  return values;
}

function splitInventoryItems(items: InventoryItemRecord[]) {
  const regularEquipments = items.filter((item) => !isLicenseType(String(item.type ?? "")));
  const licenses = items.filter((item) => isLicenseType(String(item.type ?? "")));
  return { regularEquipments, licenses };
}

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async () => {
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
    { module: "inventario", action: "view" }
  );
}

export async function POST(req: NextRequest) {
  return withAuth(
    req,
    async (user) => {
      try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return apiValidationError("Dados do ativo inválidos.");
        }

        const values = readInventoryPayload(body as Record<string, unknown>);
        if (!values.type || !values.model || !values.sector) {
          return apiValidationError("Tipo, modelo e setor são obrigatórios.");
        }

        const columns = [...INVENTORY_FIELDS, "created_by"];
        const parameters = [...INVENTORY_FIELDS.map((field) => values[field]), user.id];
        const placeholders = parameters.map((_, index) => `$${index + 1}`).join(", ");
        const result = await pool.query(
          `INSERT INTO inventory_items (${columns.join(", ")})
           VALUES (${placeholders})
           RETURNING *`,
          parameters
        );

        return apiCreated(normalizeInventoryItems(result.rows)[0]);
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    { module: "inventario", action: "create" }
  );
}
