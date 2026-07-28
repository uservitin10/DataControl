import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

type InventoryItem = Record<string, any>;

export async function GET(req: NextRequest) {
  try {
    // Buscar todos os equipamentos do banco
    const dbResult = await pool.query(
      `SELECT * FROM inventory_items ORDER BY id ASC`
    );
    const dbEquipments = dbResult.rows;

    // Importar o arquivo JSON local
    const inventarioData = await import("@/data/inventario.json").then(m => m.default);

    // Criar chave única para comparação (asset_id + equipment_id + type)
    const createKey = (eq: any) => {
      const assetId = eq.asset_id || eq.assetId || "";
      const equipmentId = eq.equipment_id || eq.equipmentId || "";
      const type = eq.type || "";
      return `${assetId}|${equipmentId}|${type}`.toLowerCase().trim();
    };

    // Mapear por chave
    const dbMap = new Map();
    const jsonMap = new Map();

    dbEquipments.forEach((eq: InventoryItem) => {
      const key = createKey(eq);
      if (!dbMap.has(key)) {
        dbMap.set(key, []);
      }
      dbMap.get(key).push(eq);
    });

    inventarioData.forEach((eq: InventoryItem) => {
      const key = createKey(eq);
      if (!jsonMap.has(key)) {
        jsonMap.set(key, []);
      }
      jsonMap.get(key).push(eq);
    });

    // Análise
    const analysis = {
      dbTotal: dbEquipments.length,
      jsonTotal: inventarioData.length,
      uniqueKeysInDB: dbMap.size,
      uniqueKeysInJSON: jsonMap.size,

      // Chaves no banco mas não no JSON
      onlyInDB: Array.from(dbMap.entries())
        .filter(([key]) => !jsonMap.has(key))
        .map(([key, items]) => ({
          key,
          count: items.length,
          items: items.map((eq: InventoryItem) => ({
            id: eq.id,
            assetId: eq.asset_id,
            equipmentId: eq.equipment_id,
            type: eq.type,
            model: eq.model,
            sector: eq.sector,
            responsible: eq.responsible,
            allocatedUser: eq.allocated_user || "",
            updatedAt: eq.updated_at,
          })),
        })),

      // Chaves no JSON mas não no banco
      onlyInJSON: Array.from(jsonMap.entries())
        .filter(([key]) => !dbMap.has(key))
        .map(([key, items]) => ({
          key,
          count: items.length,
          items: items.map((eq: InventoryItem) => ({
            id: eq.id,
            assetId: eq.assetId,
            equipmentId: eq.equipmentId,
            type: eq.type,
            model: eq.model,
            sector: eq.sector,
            responsible: eq.responsible,
            allocatedUser: eq.allocatedUser || "",
          })),
        })),

      // Duplicatas no banco (mesma chave com múltiplos IDs)
      duplicatesInDB: Array.from(dbMap.entries())
        .filter(([key, items]) => items.length > 1)
        .map(([key, items]) => ({
          key,
          count: items.length,
          items: items.map((eq: InventoryItem) => ({
            id: eq.id,
            assetId: eq.asset_id,
            equipmentId: eq.equipment_id,
            sector: eq.sector,
            allocatedUser: eq.allocated_user || "",
            updatedAt: eq.updated_at,
          })),
        })),

      // Duplicatas no JSON
      duplicatesInJSON: Array.from(jsonMap.entries())
        .filter(([key, items]) => items.length > 1)
        .map(([key, items]) => ({
          key,
          count: items.length,
          items: items.map((eq: InventoryItem) => ({
            id: eq.id,
            assetId: eq.assetId,
            equipmentId: eq.equipmentId,
            sector: eq.sector,
            allocatedUser: eq.allocatedUser || "",
          })),
        })),

      // Itens que existem em ambos mas com dados diferentes
      inBothWithDifferences: Array.from(dbMap.entries())
        .filter(([key, dbItems]) => jsonMap.has(key) && dbItems.length === 1 && jsonMap.get(key).length === 1)
        .map(([key, dbItems]) => {
          const jsonItems = jsonMap.get(key);
          const dbEq = dbItems[0];
          const jsonEq = jsonItems[0];
          
          const differences = [];
          if ((dbEq.sector || "").trim() !== (jsonEq.sector || "").trim()) 
            differences.push("sector");
          if ((dbEq.responsible || "").toLowerCase().trim() !== (jsonEq.responsible || "").toLowerCase().trim()) 
            differences.push("responsible");
          if ((dbEq.allocated_user || "").toLowerCase().trim() !== (jsonEq.allocatedUser || "").toLowerCase().trim()) 
            differences.push("allocatedUser");
          if ((dbEq.model || "").toLowerCase().trim() !== (jsonEq.model || "").toLowerCase().trim()) 
            differences.push("model");
          if (dbEq.equipment_state !== jsonEq.equipmentState) 
            differences.push("equipmentState");
          if (dbEq.warranty !== jsonEq.warranty) 
            differences.push("warranty");

          return {
            key,
            hasDifferences: differences.length > 0,
            differences,
            db: {
              assetId: dbEq.asset_id,
              equipmentId: dbEq.equipment_id,
              sector: dbEq.sector,
              responsible: dbEq.responsible,
              allocatedUser: dbEq.allocated_user || "",
              model: dbEq.model,
              equipmentState: dbEq.equipment_state,
              warranty: dbEq.warranty,
            },
            json: {
              assetId: jsonEq.assetId,
              equipmentId: jsonEq.equipmentId,
              sector: jsonEq.sector,
              responsible: jsonEq.responsible,
              allocatedUser: jsonEq.allocatedUser || "",
              model: jsonEq.model,
              equipmentState: jsonEq.equipmentState,
              warranty: jsonEq.warranty,
            },
          };
        })
        .filter(item => item.hasDifferences),
    };

    return apiSuccess(analysis);
  } catch (error) {
    return apiInternalError(`Erro: ${(error as Error).message}`);
  }
}
