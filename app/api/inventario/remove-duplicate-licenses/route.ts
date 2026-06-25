import { supabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Buscar todas as licenças ativas, usando filtro de tipo mais flexível
    const { data: licenses, error: fetchError } = await supabaseServer
      .from("inventory_items")
      .select("id, type, model, asset_id, responsible, equipment_state")
      .ilike("type", "%lic%")
      .order("asset_id", { ascending: true })
      .order("id", { ascending: true });

    if (fetchError) {
      return NextResponse.json(
        { error: `Erro ao buscar licenças: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const activeLicenses = (licenses || []).filter((license: any) =>
      ["ativa", "ativo"].includes(
        (license.equipment_state || "").toString().trim().toLowerCase()
      )
    );

    // Agrupar por asset_id (email) para encontrar duplicatas
    const groupedByAsset: { [key: string]: any[] } = {};
    activeLicenses.forEach((l: any) => {
      const key = (l.asset_id || "").toString().trim().toLowerCase() || `_no_email_${l.id}`;
      if (!groupedByAsset[key]) {
        groupedByAsset[key] = [];
      }
      groupedByAsset[key].push(l);
    });

    // Encontrar duplicatas
    const duplicates: any[] = [];
    const idsToDelete: number[] = [];

    for (const [key, items] of Object.entries(groupedByAsset)) {
      if (items.length > 1) {
        duplicates.push({
          asset: key,
          count: items.length,
          records: items.map((item: any, idx: number) => ({
            id: item.id,
            model: item.model,
            responsible: item.responsible,
            asset_id: item.asset_id,
            keep: idx === 0,
            delete: idx > 0,
          })),
        });

        // Manter o primeiro, marcar o resto para deletar
        items.forEach((item: any, idx: number) => {
          if (idx > 0) {
            idsToDelete.push(item.id);
          }
        });
      }
    }

    // Se há duplicatas e método é POST com action=remove, deletar
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "remove" && idsToDelete.length > 0) {
      const { error: deleteError } = await supabaseServer
        .from("inventory_items")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        return NextResponse.json(
          {
            error: `Erro ao deletar duplicatas: ${deleteError.message}`,
            duplicates,
            idsToDelete,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: `✓ ${idsToDelete.length} licenças duplicadas removidas com sucesso!`,
        deletedCount: idsToDelete.length,
        deletedIds: idsToDelete,
        duplicatesRemoved: duplicates,
      });
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
