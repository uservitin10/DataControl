import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiInternalError, apiForbidden } from "@/lib/api-response";
import { addAuditLog } from "@/lib/audit";
import { withAuthenticatedClient } from "@/lib/db";
import { s3Client } from "@/lib/minio";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { PoolClient } from "pg";

const STORAGE_BUCKET = "documentos";

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

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string; fileId: string }> }) {
  return withAuth(req, async (user) => {
    try {
      const { id: equipmentId, fileId } = await context.params;
      const userId = user.id || "";

      const fileRecord = await withAuthenticatedClient({ id: userId, role: user.role }, async (client) => {
        const result = await client.query(
          `SELECT id, equipment_id, file_url FROM equipment_files WHERE id = $1 LIMIT 1`,
          [fileId]
        );
        return result.rows[0] ?? null;
      });

      if (!fileRecord) {
        return apiValidationError("Arquivo não encontrado.");
      }

      if (String(fileRecord.equipment_id) !== equipmentId) {
        return apiForbidden("Este arquivo não pertence a este equipamento.");
      }

      const canManage = await withAuthenticatedClient({ id: userId, role: user.role }, async (client) =>
        userCanManageEquipment(userId, user.role, equipmentId, client)
      );

      if (!canManage) {
        return apiForbidden("Apenas proprietário ou administrador pode excluir este arquivo.");
      }

      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: STORAGE_BUCKET,
            Key: fileRecord.file_url,
          })
        );
      } catch (deleteFileError) {
        return apiInternalError(
          deleteFileError instanceof Error
            ? deleteFileError.message
            : "Erro ao deletar arquivo do storage"
        );
      }

      const remainingFiles = await withAuthenticatedClient({ id: userId, role: user.role }, async (client) => {
        await client.query(`DELETE FROM equipment_files WHERE id = $1`, [fileId]);

        const result = await client.query(
          `SELECT id, equipment_id, file_url, file_name, file_type, created_at
           FROM equipment_files
           WHERE equipment_id = $1
           ORDER BY created_at DESC`,
          [equipmentId]
        );
        return result.rows;
      });

      await addAuditLog({
        user_id: user.id,
        action: "delete_equipment_file",
        resource_type: "equipment_files",
        resource_id: fileId,
        details: JSON.stringify({ equipmentId }),
      });

      return apiSuccess({ deleted: true, remainingFiles: remainingFiles ?? [] });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
