import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiCreated, apiError, apiInternalError, apiNotFound, apiValidationError } from "@/lib/api-response";
import { getContractClosureStatus, validateContractAnnualEntryInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string; ordemId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractAnnualEntryInput(body);
    if (!validation.annualEntry) {
      return apiValidationError(validation.error || "Dados da baixa anual inválidos.");
    }

    try {
      const { id, ordemId } = await params;
      const orderResult = await pool.query(
        `SELECT so.siaf_number AS "siafNumber", c.payment_frequency AS "paymentFrequency"
         FROM public.contract_service_orders so
         JOIN public.contracts c ON c.id = so.contract_id
         WHERE so.id = $1 AND so.contract_id = $2`,
        [ordemId, id]
      );
      const order = orderResult.rows[0];
      if (!order) return apiNotFound("Ordem de serviço não encontrada.");
      if (order.paymentFrequency !== "annual") {
        return apiError("Este contrato está configurado para baixas mensais.", 409);
      }
      if (user.role !== "admin" && await getContractClosureStatus(id)) {
        return apiError("Somente administradores podem adicionar informações a um contrato encerrado.", 409);
      }

      const entry = validation.annualEntry;
      const result = await pool.query(
        `INSERT INTO public.contract_annual_entries (
           contract_id, service_order_id, payment_process_number, annual_paid_value,
           glosas_value, fiscal_year, execution_summary, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, payment_process_number AS "paymentProcessNumber",
           annual_paid_value::text AS "annualPaidValue", annual_net_value::text AS "annualNetValue",
           glosas_value::text AS "glosasValue", fiscal_year AS "fiscalYear",
           execution_summary AS "executionSummary", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          id,
          ordemId,
          entry.paymentProcessNumber,
          entry.annualPaidValue,
          entry.glosasValue,
          entry.fiscalYear,
          entry.executionSummary,
          user.id,
        ]
      );

      await addAuditLog({
        user_id: user.id,
        action: "create_contract_annual_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Baixa de ${entry.fiscalYear} criada para a OS ${order.siafNumber}.`,
      });
      return apiCreated(result.rows[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}