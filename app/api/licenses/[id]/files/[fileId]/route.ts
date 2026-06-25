import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiInternalError, apiForbidden } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";

const STORAGE_BUCKET = "documentos";

async function userCanManageLicense(userId: string, role: string, licenseId: string) {
  if (role === "admin") {
    return true;
  }

  const { data: licenseItem, error } = await supabaseServer
    .from("inventory_items")
    .select("allocated_user_id, user_id")
    .eq("id", licenseId)
    .single();

  if (error || !licenseItem) {
    return false;
  }

  return licenseItem.allocated_user_id === userId || licenseItem.user_id === userId;
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string; fileId: string }> }) {
  return withAuth(req, async (user) => {
    try {
      const { id: licenseId, fileId } = await context.params;

      const { data: fileRecord, error: selectError } = await supabaseServer
        .from("license_files")
        .select("id,license_id,file_url,created_by")
        .eq("id", fileId)
        .single();

      if (selectError || !fileRecord) {
        return apiValidationError("Arquivo não encontrado.");
      }

      if (String(fileRecord.license_id) !== licenseId) {
        return apiForbidden("Este arquivo não pertence a esta licença.");
      }

      const canManage = await userCanManageLicense(user.id || "", user.role, licenseId);
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
        .from("license_files")
        .delete()
        .eq("id", fileId);

      if (deleteDbError) {
        return apiInternalError(deleteDbError.message);
      }

      await addAuditLog({
        user_id: user.id,
        action: "delete_license_file",
        resource_type: "license_files",
        resource_id: fileId,
        details: JSON.stringify({ licenseId }),
      });

      // ✅ Retornar lista atualizada para evitar GET extra no frontend
      const { data: remainingFiles, error: listError } = await supabaseServer
        .from("license_files")
        .select("id,license_id,file_url,file_name,file_type,created_at")
        .eq("license_id", licenseId)
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
