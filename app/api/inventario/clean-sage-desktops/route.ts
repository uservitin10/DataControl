import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      // Buscar todos os desktops do setor SAGE
      const result = await pool.query(
        `SELECT * FROM inventory_items WHERE sector = $1 AND type = $2`,
        ["SAGE", "Desktop"]
      );
      const sageDesktops = result.rows;

      // Filtrar apenas os incompletos - aqueles sem as informações essenciais mostradas na UI
      const incompleteDesktops = (sageDesktops || []).filter((desktop) => {
        // Campos que aparecem como vazios na UI
        const hasNoAssetId = !desktop.asset_id || desktop.asset_id.trim() === "";
        const hasNoAllocatedUser = !desktop.allocated_user && !desktop.allocated_user_id;
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
  }, { module: "dashboard", action: "view" });
}

export async function DELETE(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      // Buscar todos os desktops do setor SAGE
      const result = await pool.query(
        `SELECT * FROM inventory_items WHERE sector = $1 AND type = $2`,
        ["SAGE", "Desktop"]
      );
      const sageDesktops = result.rows;

      // Filtrar apenas os incompletos - aqueles sem as informações essenciais mostradas na UI
      const incompleteDesktops = (sageDesktops || []).filter((desktop) => {
        // Campos que aparecem como vazios na UI
        const hasNoAssetId = !desktop.asset_id || desktop.asset_id.trim() === "";
        const hasNoAllocatedUser = !desktop.allocated_user && !desktop.allocated_user_id;
        const hasNoWarranty = !desktop.warranty || desktop.warranty.trim() === "";
        const hasNoState = !desktop.equipment_state || desktop.equipment_state.trim() === "";

        // Remover apenas se tiver múltiplos campos críticos vazios (não apenas estado/garantia)
        // Critério: sem asset_id OU (sem usuário alocado E sem garantia E sem estado)
        return (
          hasNoAssetId ||
          (hasNoAllocatedUser && hasNoWarranty && hasNoState)
        );
      });

      if (incompleteDesktops.length === 0) {
        return apiSuccess({
          message: "Nenhum desktop incompleto encontrado",
          deleted: 0,
        });
      }

      // Remover os desktops incompletos
      const desktopIds = incompleteDesktops.map((d) => d.id);

      try {
        await pool.query(
          `DELETE FROM inventory_items WHERE id = ANY($1::uuid[])`,
          [desktopIds]
        );
      } catch (deleteError: unknown) {
        const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
        return apiInternalError(`Erro ao remover: ${message}`);
      }

      // Registrar auditoria
      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "Removeu desktops incompletos do SAGE",
          resource_type: "inventory_items",
          resource_id: desktopIds.join(","),
          details: JSON.stringify({
            count: incompleteDesktops.length,
            desktops: incompleteDesktops.map((d) => ({
              id: d.id,
              assetId: d.asset_id,
              equipmentId: d.equipment_id,
              responsible: d.responsible,
            })),
          }),
          ip_address: ip,
        });
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria:", auditErr);
      }

      console.log(`✅ ${incompleteDesktops.length} desktop(s) removido(s) do SAGE:`, desktopIds);

      return apiSuccess({
        message: `${incompleteDesktops.length} desktop(s) removido(s) com sucesso`,
        deleted: incompleteDesktops.length,
        deletedIds: desktopIds,
      });
    } catch (error) {
      return apiInternalError(`Erro: ${(error as Error).message}`);
    }
  }, { module: "dashboard", action: "delete" });
}
