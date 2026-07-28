import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    // Buscar todos os equipamentos do banco
    const result = await pool.query(
      `SELECT * FROM inventory_items ORDER BY id ASC`
    );
    const dbEquipments = result.rows;

    // Importar o arquivo JSON local
    const inventarioData = await import("@/data/inventario.json").then(m => m.default);

    // Criar chave única para comparação
    const createKey = (eq: any) => {
      const assetId = eq.asset_id || eq.assetId || "";
      const equipmentId = eq.equipment_id || eq.equipmentId || "";
      const type = eq.type || "";
      return `${assetId}|${equipmentId}|${type}`.toLowerCase().trim();
    };

    type InventoryItem = Record<string, any>;

    // Mapear por chave
    const dbMap = new Map<string, InventoryItem[]>();
    const jsonMap = new Map<string, InventoryItem[]>();

    dbEquipments.forEach((eq: InventoryItem) => {
      const key = createKey(eq);
      if (!dbMap.has(key)) {
        dbMap.set(key, []);
      }
      dbMap.get(key)!.push(eq);
    });

    inventarioData.forEach((eq: InventoryItem) => {
      const key = createKey(eq);
      if (!jsonMap.has(key)) {
        jsonMap.set(key, []);
      }
      jsonMap.get(key)!.push(eq);
    });

    // 1. DUPLICATAS NO BANCO - Identificar
    const duplicatesInDB = Array.from(dbMap.entries())
      .filter(([key, items]) => items.length > 1)
      .map(([key, items]) => ({
        key,
        count: items.length,
        items: items.map((eq: InventoryItem, idx: number) => ({
          id: eq.id,
          assetId: eq.asset_id,
          equipmentId: eq.equipment_id,
          sector: eq.sector,
          responsible: eq.responsible,
          allocatedUser: eq.allocated_user || "",
          updatedAt: eq.updated_at,
          isNewest: idx === 0, // O primeiro é o mais antigo, o último o mais novo
        })),
        toKeep: items[items.length - 1].id, // Manter o mais recente
        toDelete: items.slice(0, -1).map((i: InventoryItem) => i.id),
      }));

    // 2. EQUIPAMENTOS APENAS NO BANCO (novos)
    const onlyInDB = Array.from(dbMap.entries())
      .filter(([key]) => !jsonMap.has(key))
      .map(([key, items]) => ({
        key,
        dbItem: items[0],
      }));

    // 3. EQUIPAMENTOS APENAS NO JSON (desatualizados)
    const onlyInJSON = Array.from(jsonMap.entries())
      .filter(([key]) => !dbMap.has(key))
      .map(([key, items]) => ({
        key,
        jsonItem: items[0],
      }));

    // 4. EQUIPAMENTOS DO SAGE SEM ASSET_ID (errados)
    const sageWithoutAssetId = dbEquipments
      .filter(eq => eq.sector === "SAGE" && (!eq.asset_id || eq.asset_id.trim() === ""))
      .map(eq => ({
        id: eq.id,
        type: eq.type,
        model: eq.model,
        sector: eq.sector,
        responsible: eq.responsible,
        allocatedUser: eq.allocated_user || "",
        notes: eq.notes,
      }));

    // 5. ITENS COM DADOS DIFERENTES
    const itemsWithDifferences = Array.from(dbMap.entries())
      .map(([key, dbItems]) => {
        const jsonItems = jsonMap.get(key);
        return { key, dbItems, jsonItems };
      })
      .filter(({ jsonItems, dbItems }) => jsonItems?.length === 1 && dbItems.length === 1)
      .map(({ key, dbItems, jsonItems }) => {
        const dbEq = dbItems[0];
        const jsonEq = jsonItems![0];

        const differences = [];
        if ((dbEq.sector || "").trim() !== (jsonEq.sector || "").trim())
          differences.push({ field: "sector", db: dbEq.sector, json: jsonEq.sector });
        if ((dbEq.responsible || "").toLowerCase().trim() !== (jsonEq.responsible || "").toLowerCase().trim())
          differences.push({ field: "responsible", db: dbEq.responsible, json: jsonEq.responsible });
        if ((dbEq.allocated_user || "").toLowerCase().trim() !== (jsonEq.allocatedUser || "").toLowerCase().trim())
          differences.push({ field: "allocatedUser", db: dbEq.allocated_user, json: jsonEq.allocatedUser });
        if ((dbEq.model || "").toLowerCase().trim() !== (jsonEq.model || "").toLowerCase().trim())
          differences.push({ field: "model", db: dbEq.model, json: jsonEq.model });
        if (dbEq.equipment_state !== jsonEq.equipmentState)
          differences.push({ field: "equipmentState", db: dbEq.equipment_state, json: jsonEq.equipmentState });
        if (dbEq.warranty !== jsonEq.warranty)
          differences.push({ field: "warranty", db: dbEq.warranty, json: jsonEq.warranty });

        return {
          key,
          dbId: dbEq.id,
          jsonId: jsonEq.id,
          hasDifferences: differences.length > 0,
          differences,
        };
      })
      .filter(item => item.hasDifferences);

    return apiSuccess({
      summary: {
        "Duplicatas no Banco": duplicatesInDB.length,
        "Novos no Banco (não estão no JSON)": onlyInDB.length,
        "Desatualizados no JSON (não estão no Banco)": onlyInJSON.length,
        "SAGE sem Asset ID (ERRADOS)": sageWithoutAssetId.length,
        "Itens com dados diferentes": itemsWithDifferences.length,
      },
      recommendations: {
        removeDuplicates: duplicatesInDB.length > 0,
        addNewItems: onlyInDB.length > 0,
        removeOldJSON: onlyInJSON.length > 0,
        removeSageInvalid: sageWithoutAssetId.length > 0,
        updateDifferences: itemsWithDifferences.length > 0,
      },
      details: {
        duplicates: duplicatesInDB,
        newInDB: onlyInDB,
        oldInJSON: onlyInJSON,
        sageInvalid: sageWithoutAssetId,
        differences: itemsWithDifferences.slice(0, 10), // Primeiras 10 para não ficar muito grande
      },
    });
  } catch (error) {
    return apiInternalError(`Erro: ${(error as Error).message}`);
  }
}
