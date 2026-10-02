import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import {
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { validateContractEntryInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string; lancamentoId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractEntryInput(body);
    if (!validation.entry) {
      return apiValidationError(validation.error || "Dados do lançamento inválidos.");
    }

    try {
      const { id, lancamentoId } = await params;
      const result = await pool.query(
        `UPDATE public.contract_monthly_entries
         SET payment_process_number = $1, monthly_paid_value = $2, glosas_value = $3,
           reference_month = $4, execution_summary = $5, empenho = $6, updated_at = NOW()
         WHERE id = $7 AND contract_id = $8
         RETURNING id, payment_process_number AS "paymentProcessNumber",
           monthly_paid_value::text AS "monthlyPaidValue", glosas_value::text AS "glosasValue",
           to_char(reference_month, 'YYYY-MM') AS "referenceMonth",
           execution_summary AS "executionSummary", empenho,
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          validation.entry.paymentProcessNumber,
          validation.entry.monthlyPaidValue,
          validation.entry.glosasValue,
          validation.entry.referenceMonth,
          validation.entry.executionSummary,
          validation.entry.empenho,
          lancamentoId,
          id,
        ]
      );
      if (!result.rows[0]) return apiNotFound("Lançamento mensal não encontrado.");

      await addAuditLog({
        user_id: user.id,
        action: "update_contract_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Lançamento de ${validation.entry.referenceMonth.slice(0, 7)} atualizado.`,
      });
      return apiSuccess(result.rows[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    try {
      const { id, lancamentoId } = await params;
      const result = await pool.query(
        `DELETE FROM public.contract_monthly_entries
         WHERE id = $1 AND contract_id = $2
         RETURNING id, reference_month`,
        [lancamentoId, id]
      );
      if (!result.rows[0]) return apiNotFound("Lançamento mensal não encontrado.");

      await addAuditLog({
        user_id: user.id,
        action: "delete_contract_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Lançamento de ${String(result.rows[0].reference_month).slice(0, 7)} excluído.`,
      });
      return apiSuccess({ deleted: true });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}