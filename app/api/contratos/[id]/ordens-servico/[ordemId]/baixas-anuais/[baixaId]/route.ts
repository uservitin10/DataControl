import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiError, apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response";
import { validateContractAnnualEntryInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string; ordemId: string; baixaId: string }> };

async function ensureAnnualContract(contractId: string) {
  const result = await pool.query(
    "SELECT payment_frequency AS \"paymentFrequency\" FROM public.contracts WHERE id = $1",
    [contractId]
  );
  if (!result.rows[0]) return apiNotFound("Contrato não encontrado.");
  if (result.rows[0].paymentFrequency !== "annual") {
    return apiError("Este contrato está configurado para baixas mensais.", 409);
  }
  return null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractAnnualEntryInput(body);
    if (!validation.annualEntry) {
      return apiValidationError(validation.error || "Dados da baixa anual inválidos.");
    }

    try {
      const { id, ordemId, baixaId } = await params;
      const contractError = await ensureAnnualContract(id);
      if (contractError) return contractError;
      const entry = validation.annualEntry;
      const result = await pool.query(
        `UPDATE public.contract_annual_entries
         SET payment_process_number = $1, annual_paid_value = $2, glosas_value = $3,
           fiscal_year = $4, execution_summary = $5, updated_at = NOW()
         WHERE id = $6 AND service_order_id = $7 AND contract_id = $8
         RETURNING id, payment_process_number AS "paymentProcessNumber",
           annual_paid_value::text AS "annualPaidValue", annual_net_value::text AS "annualNetValue",
           glosas_value::text AS "glosasValue", fiscal_year AS "fiscalYear",
           execution_summary AS "executionSummary", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [entry.paymentProcessNumber, entry.annualPaidValue, entry.glosasValue, entry.fiscalYear,
          entry.executionSummary, baixaId, ordemId, id]
      );
      if (!result.rows[0]) return apiNotFound("Baixa anual não encontrada.");

      await addAuditLog({
        user_id: user.id,
        action: "update_contract_annual_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Baixa de ${entry.fiscalYear} atualizada.`,
      });
      return apiSuccess(result.rows[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  return withAuth(_request, async (user) => {
    try {
      const { id, ordemId, baixaId } = await params;
      const contractError = await ensureAnnualContract(id);
      if (contractError) return contractError;
      const result = await pool.query(
        `DELETE FROM public.contract_annual_entries
         WHERE id = $1 AND service_order_id = $2 AND contract_id = $3
         RETURNING fiscal_year AS "fiscalYear"`,
        [baixaId, ordemId, id]
      );
      if (!result.rows[0]) return apiNotFound("Baixa anual não encontrada.");

      await addAuditLog({
        user_id: user.id,
        action: "delete_contract_annual_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Baixa de ${result.rows[0].fiscalYear} excluída.`,
      });
      return apiSuccess({ deleted: true });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}