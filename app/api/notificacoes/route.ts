import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_NOTIFICACAO_FIELDS } from "@/lib/validation";
import { apiSuccess, apiCreated, apiValidationError, apiInternalError, apiNotFound } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const result = await pool.query(
        `SELECT *
         FROM notificacoes
         ORDER BY created_at DESC
         LIMIT 20`
      );

      return apiSuccess(result.rows ?? []);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "notificacoes", action: "view" });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const body = await req.json();
      
      // Validar usando schema reutilizável
      const validationError = validateObject(body, VALIDATION_SCHEMAS.criarNotificacao);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const cleanBody = sanitizeObject(body, ALLOWED_NOTIFICACAO_FIELDS);
      
      const columns = Object.keys(cleanBody);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const values = columns.map((column) => cleanBody[column]);

      const result = await pool.query(
        `INSERT INTO notificacoes (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );

      await addAuditLog({
        user_id: user.id,
        action: "create_notification",
        resource_type: "notificacoes",
        resource_id: null,
        details: `Notificação criada: ${cleanBody.tipo ?? "sem tipo"}`,
      });

      return apiCreated(result.rows);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "notificacoes", action: "edit" });
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      await pool.query("UPDATE notificacoes SET lida = true WHERE lida = false");

      await addAuditLog({
        user_id: user.id,
        action: "mark_notifications_read",
        resource_type: "notificacoes",
        resource_id: null,
        details: "Todas as notificações foram marcadas como lidas.",
      });

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "notificacoes", action: "edit" });
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const notificationId = request.nextUrl.searchParams.get("id");

      if (!notificationId) {
        return apiValidationError("O id da notificação é obrigatório.");
      }

      const deleteResult = await pool.query("DELETE FROM notificacoes WHERE id = $1", [notificationId]);
      if (deleteResult.rowCount === 0) {
        return apiNotFound("Notificação não encontrada");
      }

      await addAuditLog({
        user_id: user.id,
        action: "delete_notification",
        resource_type: "notificacoes",
        resource_id: notificationId,
        details: "Notificação removida.",
      });

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "notificacoes", action: "delete" });
}
