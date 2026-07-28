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

    // Análise por setor - dados do banco
    const sectorAnalysis = {
      banco: {} as Record<string, any>,
      json: {} as Record<string, any>,
    };

    // Agrupar por setor no banco
    dbEquipments.forEach(eq => {
      const sector = eq.sector || "Sem Setor";
      if (!sectorAnalysis.banco[sector]) {
        sectorAnalysis.banco[sector] = {
          total: 0,
          desktop: 0,
          monitor: 0,
          notebook: 0,
          licenca: 0,
          comUsuario: 0,
          semUsuario: 0,
        };
      }
      sectorAnalysis.banco[sector].total++;
      if (eq.type === "Desktop") sectorAnalysis.banco[sector].desktop++;
      if (eq.type === "Monitor") sectorAnalysis.banco[sector].monitor++;
      if (eq.type === "Notebook") sectorAnalysis.banco[sector].notebook++;
      if (eq.type === "Licença") sectorAnalysis.banco[sector].licenca++;
      if (eq.allocated_user || eq.allocated_user_id) {
        sectorAnalysis.banco[sector].comUsuario++;
      } else {
        sectorAnalysis.banco[sector].semUsuario++;
      }
    });

    // Agrupar por setor no JSON
    inventarioData.forEach(eq => {
      const sector = eq.sector || "Sem Setor";
      if (!sectorAnalysis.json[sector]) {
        sectorAnalysis.json[sector] = {
          total: 0,
          desktop: 0,
          monitor: 0,
          notebook: 0,
          licenca: 0,
          comUsuario: 0,
          semUsuario: 0,
        };
      }
      sectorAnalysis.json[sector].total++;
      if (eq.type === "Desktop") sectorAnalysis.json[sector].desktop++;
      if (eq.type === "Monitor") sectorAnalysis.json[sector].monitor++;
      if (eq.type === "Notebook") sectorAnalysis.json[sector].notebook++;
      if (eq.type === "Licença") sectorAnalysis.json[sector].licenca++;
      if (eq.allocatedUser) {
        sectorAnalysis.json[sector].comUsuario++;
      } else {
        sectorAnalysis.json[sector].semUsuario++;
      }
    });

    // Detalhes específicos do SAGE
    const sageDBDetailed = dbEquipments
      .filter(eq => eq.sector === "SAGE")
      .map(eq => ({
        id: eq.id,
        assetId: eq.asset_id,
        equipmentId: eq.equipment_id,
        type: eq.type,
        model: eq.model,
        responsible: eq.responsible,
        allocatedUser: eq.allocated_user || "NÃO",
        sector: eq.sector,
      }));

    const sageJSONDetailed = inventarioData
      .filter(eq => eq.sector === "SAGE")
      .map(eq => ({
        id: eq.id,
        assetId: eq.assetId,
        equipmentId: eq.equipmentId,
        type: eq.type,
        model: eq.model,
        responsible: eq.responsible,
        allocatedUser: eq.allocatedUser || "NÃO",
        sector: eq.sector,
      }));

    return apiSuccess({
      summary: {
        bankTotal: dbEquipments.length,
        jsonTotal: inventarioData.length,
        difference: Math.abs(dbEquipments.length - inventarioData.length),
        sectors: Object.keys(sectorAnalysis.banco).length,
      },
      sectorComparison: sectorAnalysis,
      sageDetailed: {
        bankCount: sageDBDetailed.length,
        jsonCount: sageJSONDetailed.length,
        bankEquipments: sageDBDetailed,
        jsonEquipments: sageJSONDetailed,
        bankWithUser: sageDBDetailed.filter(e => e.allocatedUser !== "NÃO"),
        jsonWithUser: sageJSONDetailed.filter(e => e.allocatedUser !== "NÃO"),
      },
    });
  } catch (error) {
    return apiInternalError(`Erro: ${(error as Error).message}`);
  }
}
