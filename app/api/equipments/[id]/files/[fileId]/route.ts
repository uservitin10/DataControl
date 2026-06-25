import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiInternalError, apiForbidden } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";

const STORAGE_BUCKET = "documentos";

async function userCanManageEquipment(userId: string, role: string, equipmentId: string) {
  if (role === "admin") {
    return true;
  }

  const { data: equipment, error } = await supabaseServer
    .from("inventory_items")
    .select("allocated_user_id, user_id")
    .eq("id", equipmentId)
    .single();

  if (error || !equipment) {
    return false;
  }

  return equipment.allocated_user_id === userId || equipment.user_id === userId;
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string; fileId: string }> }) {
  return withAuth(req, async (user) => {
    try {
      const { id: equipmentId, fileId } = await context.params;

      const { data: fileRecord, error: selectError } = await supabaseServer
        .from("equipment_files")
        .select("id,equipment_id,file_url,created_by")
        .eq("id", fileId)
        .single();

      if (selectError || !fileRecord) {
        return apiValidationError("Arquivo não encontrado.");
      }

      if (String(fileRecord.equipment_id) !== equipmentId) {
        return apiForbidden("Este arquivo não pertence a este equipamento.");
      }

      const canManage = await userCanManageEquipment(user.id || "", user.role, equipmentId);
      if (!canManage) {
        return apiForbidden("Apenas proprietário ou administrador pode excluir este arquivo.");
      }

      const { error: deleteFileError } = await supabaseServer
        .storage.from(STORAGE_BUCKET)
        .remove([fileRecord.file_url]);

      if (deleteFileError) {
        return apiInternalError(deleteFileError.message);
      }

      const { error: deleteDbError } = await supabaseServer
        .from("equipment_files")
        .delete()
        .eq("id", fileId);

      if (deleteDbError) {
        return apiInternalError(deleteDbError.message);
      }

      await addAuditLog({
        user_id: user.id,
        action: "delete_equipment_file",
        resource_type: "equipment_files",
        resource_id: fileId,
        details: JSON.stringify({ equipmentId }),
      });

      // ✅ Retornar lista atualizada para evitar GET extra no frontend
      const { data: remainingFiles, error: listError } = await supabaseServer
        .from("equipment_files")
        .select("id,equipment_id,file_url,file_name,file_type,created_at")
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false });

      if (listError) {
        return apiSuccess({ deleted: true, remainingFiles: [] });
      }

      return apiSuccess({ deleted: true, remainingFiles: remainingFiles ?? [] });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
