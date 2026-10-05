import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response";
import { validateContractEntryInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string; ordemId: string; lancamentoId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractEntryInput(body);
    if (!validation.entry) {
      return apiValidationError(validation.error || "Dados do lançamento mensal inválidos.");
    }

    try {
      const { id, ordemId, lancamentoId } = await params;
      const entry = validation.entry;
      const result = await pool.query(
        `UPDATE public.contract_monthly_entries
         SET payment_process_number = $1, monthly_paid_value = $2, glosas_value = $3,
           reference_month = $4, execution_summary = $5, empenho = $6, updated_at = NOW()
         WHERE id = $7 AND service_order_id = $8 AND contract_id = $9
         RETURNING id, payment_process_number AS "paymentProcessNumber",
           monthly_paid_value::text AS "monthlyPaidValue", monthly_net_value::text AS "monthlyNetValue",
           glosas_value::text AS "glosasValue", to_char(reference_month, 'YYYY-MM') AS "referenceMonth",
           execution_summary AS "executionSummary", empenho,
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          entry.paymentProcessNumber,
          entry.monthlyPaidValue,
          entry.glosasValue,
          entry.referenceMonth,
          entry.executionSummary,
          entry.empenho,
          lancamentoId,
          ordemId,
          id,
        ]
      );
      if (!result.rows[0]) return apiNotFound("Lançamento mensal não encontrado.");

      await addAuditLog({
        user_id: user.id,
        action: "update_contract_monthly_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Lançamento de ${entry.referenceMonth.slice(0, 7)} atualizado.`,
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
      const { id, ordemId, lancamentoId } = await params;
      const result = await pool.query(
        `DELETE FROM public.contract_monthly_entries
         WHERE id = $1 AND service_order_id = $2 AND contract_id = $3
         RETURNING id, to_char(reference_month, 'YYYY-MM') AS reference_month`,
        [lancamentoId, ordemId, id]
      );
      if (!result.rows[0]) return apiNotFound("Lançamento mensal não encontrado.");

      await addAuditLog({
        user_id: user.id,
        action: "delete_contract_monthly_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Lançamento de ${result.rows[0].reference_month} excluído.`,
      });
      return apiSuccess({ deleted: true });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}