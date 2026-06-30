import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

// Endpoint público para diagnóstico (sem autenticação)
export async function GET(req: NextRequest) {
  try {
    // Buscar todos os desktops do setor SAGE
    const { data: sageDesktops, error: fetchError } = await supabaseServer
      .from("inventory_items")
      .select("*")
      .eq("sector", "SAGE")
      .eq("type", "Desktop");

    if (fetchError) {
      return apiInternalError(`Erro ao buscar desktops: ${fetchError.message}`);
    }

    // Filtrar apenas os incompletos - aqueles sem as informações essenciais mostradas na UI
    const incompleteDesktops = (sageDesktops || []).filter((desktop) => {
      // Campos que aparecem como vazios na UI
      const hasNoAssetId = !desktop.asset_id || desktop.asset_id.trim() === "";
      const hasNoAllocatedUser = !desktop.allocated_user && !desktop.allocated_user_id;
      const hasNoLegalResponsible = !desktop.legal_responsible || desktop.legal_responsible.trim() === "";
      const hasNoWarranty = !desktop.warranty || desktop.warranty.trim() === "";
      const hasNoState = !desktop.equipment_state || desktop.equipment_state.trim() === "";

      // Remover apenas se tiver múltiplos campos críticos vazios (não apenas estado/garantia)
      // Critério: sem asset_id OU (sem usuário alocado E sem garantia E sem estado)
      return (
        hasNoAssetId ||
        (hasNoAllocatedUser && hasNoWarranty && hasNoState)
      );
    });

    return apiSuccess({
      totalDesktops: sageDesktops.length,
      incompleteCount: incompleteDesktops.length,
      incompleteDesktops: incompleteDesktops.map((d) => ({
        id: d.id,
        model: d.model,
        assetId: d.asset_id || "VAZIO",
        equipmentId: d.equipment_id || "VAZIO",
        responsible: d.responsible || "VAZIO",
        allocatedUser: d.allocated_user || d.allocated_user_id || "VAZIO",
        warranty: d.warranty || "VAZIO",
        equipmentState: d.equipment_state || "VAZIO",
      })),
    });
  } catch (error) {
    return apiInternalError(`Erro: ${(error as Error).message}`);
  }
}
