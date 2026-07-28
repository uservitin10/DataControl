import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth, withOptionalAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_REGISTRO_FIELDS } from "@/lib/validation";
import { apiSuccess, apiCreated, apiValidationError, apiInternalError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withOptionalAuth(request, async () => {
    try {
      const result = await pool.query(
        `SELECT * FROM registros
         WHERE tipo_acesso = 'publico'
         ORDER BY created_at DESC`
      );

      return apiSuccess(result.rows ?? []);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const body = await req.json();
      
      // Validar usando schema reutilizável
      const validationError = validateObject(body, VALIDATION_SCHEMAS.criarRegistro);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const cleanBody = sanitizeObject(body, ALLOWED_REGISTRO_FIELDS);
      
      const columns = Object.keys(cleanBody);
      const values = Object.values(cleanBody);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const result = await pool.query(`INSERT INTO registros (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`, values);

      // Registrar auditoria (não bloqueante)
      try {
        if (result.rows[0]) {
          const createdRecord = result.rows[0];
          const createdId = (createdRecord as Record<string, unknown>)?.['id'] as number | undefined;
          const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
          await addAuditLog({
            user_id: user.id,
            action: "Criou painel",
            resource_type: "dashboard",
            resource_id: createdId ? String(createdId) : null,
            details: JSON.stringify(cleanBody),
            ip_address: ip,
          });
        }
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria (não bloqueante):", auditErr);
      }

      return apiCreated(result.rows);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "edit" });
}
