import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiInternalError, apiForbidden } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";

const STORAGE_BUCKET = "documentos";

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

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

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(req, async () => {
    try {
      const { id: licenseId } = await context.params;
      const { data, error } = await supabaseServer
        .from("license_files")
        .select("id,license_id,file_url,file_name,file_type,created_at")
        .eq("license_id", licenseId)
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
      const { id: licenseId } = await context.params;
      const canManage = await userCanManageLicense(user.id || "", user.role, licenseId);
      if (!canManage) {
        return apiForbidden("Apenas proprietário ou administrador pode enviar arquivos para esta licença.");
      }

      const formData = await req.formData();
      const files = formData.getAll("files");

      if (!files.length) {
        return apiValidationError("Nenhum arquivo enviado.");
      }

      const uploadedFiles = [] as Array<Record<string, unknown>>;
      const MAX_UPLOAD_FILES = 5;
      const MAX_FILE_SIZE = 20 * 1024 * 1024;
      const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

      if (files.length > MAX_UPLOAD_FILES) {
        return apiValidationError(`Máximo de ${MAX_UPLOAD_FILES} arquivos por upload.`);
      }

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
        const path = `licenses/${licenseId}/${Date.now()}_${fileName}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabaseServer.storage
          .from(STORAGE_BUCKET)
          .upload(path, new Uint8Array(arrayBuffer), {
            upsert: true,
            contentType: fileType,
          });

        if (uploadError) {
          return apiInternalError(uploadError.message);
        }

        const { data: created, error: insertError } = await supabaseServer
          .from("license_files")
          .insert([
            {
              license_id: licenseId,
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
        action: "upload_license_files",
        resource_type: "license_files",
        resource_id: licenseId,
        details: JSON.stringify({ fileCount: uploadedFiles.length }),
      });

      return apiSuccess({ files: uploadedFiles }, 201);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
