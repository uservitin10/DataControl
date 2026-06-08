import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiInternalError, apiForbidden } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";

const STORAGE_BUCKET = "documentos";
const MAX_UPLOAD_FILES = 5;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

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

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    try {
      const { id: equipmentId } = await context.params;
      const { data, error } = await supabaseServer
        .from("equipment_files")
        .select("id,equipment_id,file_url,file_name,file_type,created_at")
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false });

      if (error) {
        return apiInternalError(error.message);
      }

      return apiSuccess(data ?? []);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (user) => {
    try {
      const { id: equipmentId } = await context.params;
      const canManage = await userCanManageEquipment(user.id || "", user.role, equipmentId);
      if (!canManage) {
        return apiForbidden("Apenas proprietário ou administrador pode enviar arquivos para este equipamento.");
      }

      const formData = await req.formData();
      const files = formData.getAll("files");

      if (!files.length) {
        return apiValidationError("Nenhum arquivo enviado.");
      }
      if (files.length > MAX_UPLOAD_FILES) {
        return apiValidationError(`Máximo de ${MAX_UPLOAD_FILES} arquivos por upload.`);
      }

      const uploadedFiles = [] as Array<Record<string, unknown>>;

      for (const file of files) {
        if (!(file instanceof Blob)) {
          return apiValidationError("Arquivo inválido.");
        }

        if (file.size > MAX_FILE_SIZE) {
          return apiValidationError(`O arquivo ${file instanceof File ? file.name : "anônimo"} excede o limite de 20MB.`);
        }

        const fileType = file.type || "application/octet-stream";
        if (!ALLOWED_TYPES.includes(fileType)) {
          return apiValidationError(`Tipo de arquivo não permitido: ${fileType}`);
        }

        const fileName = file instanceof File ? sanitizeFileName(file.name) : `file_${Date.now()}`;
        const path = `equipments/${equipmentId}/${Date.now()}_${fileName}`;
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabaseServer.storage
          .from(STORAGE_BUCKET)
          .upload(path, new Uint8Array(arrayBuffer), { upsert: true });

        if (uploadError) {
          return apiInternalError(uploadError.message);
        }

        const { data: created, error: insertError } = await supabaseServer
          .from("equipment_files")
          .insert([
            {
              equipment_id: equipmentId,
              file_url: path,
              file_name: fileName,
              file_type: fileType,
              created_by: user.id,
            },
          ])
          .select()
          .single();

        if (insertError) {
          return apiInternalError(insertError.message);
        }

        uploadedFiles.push(created);
      }

      await addAuditLog({
        user_id: user.id,
        action: "upload_equipment_files",
        resource_type: "equipment_files",
        resource_id: equipmentId,
        details: JSON.stringify({ fileCount: uploadedFiles.length }),
      });

      return apiSuccess({ files: uploadedFiles }, 201);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
