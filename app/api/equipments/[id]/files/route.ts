import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiInternalError, apiForbidden } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import { withAuthenticatedClient } from "@/lib/db";
import { s3Client } from "@/lib/minio";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { PoolClient } from "pg";

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

async function userCanManageEquipment(userId: string, role: string, equipmentId: string, client: PoolClient) {
  if (role === "admin") {
    return true;
  }

  const result = await client.query(
    `SELECT 1 FROM inventory_items WHERE id = $1 AND ($2 = allocated_user_id OR $2 = user_id) LIMIT 1`,
    [equipmentId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (user) => {
    try {
      const { id: equipmentId } = await context.params;
      const files = await withAuthenticatedClient({ id: user.id || "", role: user.role }, async (client) => {
        const result = await client.query(
          `SELECT id, equipment_id, file_url, file_name, file_type, created_at
           FROM equipment_files
           WHERE equipment_id = $1
           ORDER BY created_at DESC`,
          [equipmentId]
        );
        return result.rows;
      });

      return apiSuccess(files ?? []);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (user) => {
    try {
      const { id: equipmentId } = await context.params;
      const userId = user.id || "";

      const canManage = await withAuthenticatedClient({ id: userId, role: user.role }, async (client) =>
        userCanManageEquipment(userId, user.role, equipmentId, client)
      );

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

      const uploadedFiles = await withAuthenticatedClient({ id: userId, role: user.role }, async (client) => {
        const createdFiles: Array<Record<string, unknown>> = [];

        for (const file of files) {
          if (!(file instanceof Blob)) {
            throw new Error("Arquivo inválido.");
          }

          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`O arquivo ${file instanceof File ? file.name : "anônimo"} excede o limite de 20MB.`);
          }

          const fileType = file.type || "application/octet-stream";
          if (!ALLOWED_TYPES.includes(fileType)) {
            throw new Error(`Tipo de arquivo não permitido: ${fileType}`);
          }

          const fileName = file instanceof File ? sanitizeFileName(file.name) : `file_${Date.now()}`;
          const path = `equipments/${equipmentId}/${Date.now()}_${fileName}`;
          const arrayBuffer = await file.arrayBuffer();

          try {
            await s3Client.send(
              new PutObjectCommand({
                Bucket: STORAGE_BUCKET,
                Key: path,
                Body: new Uint8Array(arrayBuffer),
                ContentType: fileType,
              })
            );
          } catch (uploadError) {
            throw new Error(
              uploadError instanceof Error
                ? uploadError.message
                : "Erro ao fazer upload do arquivo"
            );
          }

          const insertResult = await client.query(
            `INSERT INTO equipment_files (equipment_id, file_url, file_name, file_type, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, equipment_id, file_url, file_name, file_type, created_at`,
            [equipmentId, path, fileName, fileType, userId]
          );

          createdFiles.push(insertResult.rows[0]);
        }

        return createdFiles;
      });

      await addAuditLog({
        user_id: user.id,
        action: "upload_equipment_files",
        resource_type: "equipment_files",
        resource_id: equipmentId,
        details: JSON.stringify({ fileCount: uploadedFiles.length }),
      });

      return apiSuccess({ files: uploadedFiles }, 201);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Arquivo")) {
        return apiValidationError(err.message);
      }
      return apiInternalError((err as Error).message);
    }
  });
}
