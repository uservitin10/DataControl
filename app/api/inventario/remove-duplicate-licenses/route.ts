import pool from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type LicenseRecord = {
  id: string; // Corrigido para string (UUID)
  type?: string | null;
  model?: string | null;
  asset_id?: string | null;
  responsible?: string | null;
  equipment_state?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    // Buscar todas as licenças usando filtro flexível no tipo
    let licenses: LicenseRecord[] = [];
    try {
      const selectResult = await pool.query(
        `SELECT id, type, model, asset_id, responsible, equipment_state
         FROM inventory_items
         WHERE type ILIKE $1
         ORDER BY asset_id ASC, id ASC`,
        ["%lic%"]
      );
      licenses = selectResult.rows as LicenseRecord[];
    } catch (fetchError: any) {
      return NextResponse.json(
        { error: `Erro ao buscar licenças: ${fetchError?.message || String(fetchError)}` },
        { status: 500 }
      );
    }

    // Corrigido a verificação para comparar tudo em caixa baixa
    const activeLicenses = (licenses || []).filter((license: LicenseRecord) =>
      ["ativa", "ativo"].includes(
        (license.equipment_state || "").toString().trim().toLowerCase()
      )
    );

    // Agrupar por asset_id para encontrar duplicatas
    const groupedByAsset: Record<string, LicenseRecord[]> = {};
    activeLicenses.forEach((l: LicenseRecord) => {
      const key = (l.asset_id || "").toString().trim().toLowerCase() || `_no_email_${l.id}`;
      if (!groupedByAsset[key]) {
        groupedByAsset[key] = [];
      }
      groupedByAsset[key].push(l);
    });

    // Encontrar duplicatas
    const duplicates: Array<{
      asset: string;
      count: number;
      records: Array<{
        id: string;
        model?: string | null;
        responsible?: string | null;
        asset_id?: string | null;
        keep: boolean;
        delete: boolean;
      }>;
    }> = [];
    const idsToDelete: string[] = [];

    for (const [key, items] of Object.entries(groupedByAsset)) {
      if (items.length > 1) {
        duplicates.push({
          asset: key,
          count: items.length,
          records: items.map((item: LicenseRecord, idx: number) => ({
            id: item.id,
            model: item.model,
            responsible: item.responsible,
            asset_id: item.asset_id,
            keep: idx === 0,
            delete: idx > 0,
          })),
        });

        // Manter o primeiro e marcar os restantes para exclusão
        items.forEach((item: LicenseRecord, idx: number) => {
          if (idx > 0) {
            idsToDelete.push(item.id);
          }
        });
      }
    }

    // Se action=remove, efetuar a deleção no Postgres
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "remove" && idsToDelete.length > 0) {
      try {
        await pool.query(
          `DELETE FROM inventory_items WHERE id = ANY($1::uuid[])`, // Corrigido para ::uuid[]
          [idsToDelete]
        );

        return NextResponse.json({
          message: `✓ ${idsToDelete.length} licenças duplicadas removidas com sucesso!`,
          deletedCount: idsToDelete.length,
          deletedIds: idsToDelete,
          duplicatesRemoved: duplicates,
        });
      } catch (deleteError: any) {
        return NextResponse.json(
          {
            error: `Erro ao deletar duplicatas: ${deleteError?.message || String(deleteError)}`,
            duplicates,
            idsToDelete,
          },
          { status: 500 }
        );
      }
    }

    // Retornar relatório de duplicatas encontradas
    return NextResponse.json({
      totalLicenses: licenses.length,
      duplicateGroups: duplicates.length,
      totalDuplicateRecords: idsToDelete.length,
      duplicates,
      idsToDelete,
      removeUrl: "/api/inventario/remove-duplicate-licenses?action=remove",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}