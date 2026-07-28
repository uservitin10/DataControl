import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_REGISTRO_FIELDS } from "@/lib/validation";
import { apiSuccess, apiValidationError, apiNotFound, apiInternalError } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const { id } = await params;

      const result = await pool.query(
        `SELECT * FROM registros WHERE id = $1 LIMIT 1`,
        [id]
      );

      if (result.rows.length === 0) {
        return apiNotFound("Registro não encontrado");
      }

      return apiSuccess(result.rows[0]);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "view" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    try {
      const { id } = await params;
      const body = await req.json();

      // Validar usando schema reutilizável
      const validationError = validateObject(body, VALIDATION_SCHEMAS.atualizarRegistro);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const patchBody = sanitizeObject(body, ALLOWED_REGISTRO_FIELDS);

      const colunas = Object.keys(patchBody);
      const valores = Object.values(patchBody);

      if (colunas.length === 0) {
        return apiValidationError("Nenhum campo para atualizar.");
      }

      const setSql = colunas.map((col, i) => `${col} = $${i + 1}`).join(", ");
      const idParam = `$${colunas.length + 1}`;

      const result = await pool.query(
        `UPDATE registros SET ${setSql} WHERE id = ${idParam} RETURNING *`,
        [...valores, id]
      );

      if (result.rows.length === 0) {
        return apiNotFound("Registro não encontrado");
      }

      // Registrar auditoria (não bloqueante)
      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "Editou painel",
          resource_type: "dashboard",
          resource_id: String(id),
          details: JSON.stringify(patchBody),
          ip_address: ip,
        });
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria (não bloqueante):", auditErr);
      }

      return apiSuccess(result.rows[0]);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "edit" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    try {
      const { id } = await params;

      const result = await pool.query(
        `DELETE FROM registros WHERE id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return apiNotFound("Registro não encontrado");
      }

      // Registrar auditoria (não bloqueante)
      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "Excluiu painel",
          resource_type: "dashboard",
          resource_id: String(id),
          details: null,
          ip_address: ip,
        });
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria (não bloqueante):", auditErr);
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "delete" });
}