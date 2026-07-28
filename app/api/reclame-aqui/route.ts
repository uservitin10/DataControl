import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { apiCreated, apiInternalError, apiValidationError } from "@/lib/api-response";
import { sanitizeText } from "@/lib/text";

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const body = await req.json();
      const tipo = sanitizeText(body.tipo || "Reclame aqui");
      const mensagem = sanitizeText(body.mensagem || "");

      if (!mensagem) {
        return apiValidationError("A mensagem da reclamação é obrigatória.");
      }

      const result = await pool.query(
        `INSERT INTO notificacoes (tipo, mensagem, lida)
         VALUES ($1, $2, false)
         RETURNING id, tipo, mensagem, lida, created_at`,
        [tipo, mensagem]
      );

      if (result.rows.length === 0) {
        return apiInternalError("Erro ao criar notificação.");
      }

      return apiCreated(result.rows[0]);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
