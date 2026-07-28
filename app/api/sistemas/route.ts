import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth, withOptionalAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_SISTEMA_FIELDS } from "@/lib/validation";
import { apiSuccess, apiCreated, apiValidationError, apiInternalError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withOptionalAuth(request, async (user) => {
    try {
      let query = "SELECT * FROM sistemas ORDER BY created_at DESC";

      // Para visitantes e viewers, mostrar apenas sistemas públicos com produção disponível
      if (!user.id || user.role === "viewer") {
        query = `SELECT * FROM sistemas
                 WHERE tipo_acesso = 'publico'
                   AND url_producao IS NOT NULL
                   AND url_producao <> ''
                 ORDER BY created_at DESC`;
      }

      const result = await pool.query(query);
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
      const validationError = validateObject(body, VALIDATION_SCHEMAS.criarSistema);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const cleanBody = sanitizeObject(body, ALLOWED_SISTEMA_FIELDS);
      
      const columns = Object.keys(cleanBody);
      const values = Object.values(cleanBody);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const insertQuery = `INSERT INTO sistemas (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`;

      const result = await pool.query(insertQuery, values);

      await addAuditLog({
        user_id: user.id,
        action: "create_system",
        resource_type: "sistemas",
        resource_id: null,
        details: `Sistema criado: ${String(cleanBody.nome || cleanBody.sigla || "sem nome")}`,
      });

      return apiCreated(result.rows ?? []);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "sistemas", action: "edit" });
}
