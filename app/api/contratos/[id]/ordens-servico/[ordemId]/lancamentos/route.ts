import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiCreated, apiError, apiInternalError, apiNotFound, apiValidationError } from "@/lib/api-response";
import { getContractClosureStatus, validateContractEntryInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string; ordemId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractEntryInput(body);
    if (!validation.entry) {
      return apiValidationError(validation.error || "Dados do lançamento mensal inválidos.");
    }

    try {
      const { id, ordemId } = await params;
      const orderResult = await pool.query(
        `SELECT so.id, so.contract_id, so.siaf_number
         FROM public.contract_service_orders so
         WHERE so.id = $1 AND so.contract_id = $2`,
        [ordemId, id]
      );
      const order = orderResult.rows[0];
      if (!order) return apiNotFound("Ordem de serviço não encontrada.");
      if (user.role !== "admin" && await getContractClosureStatus(id)) {
        return apiError("Somente administradores podem adicionar informações a um contrato encerrado.", 409);
      }

      const entry = validation.entry;
      const result = await pool.query(
        `INSERT INTO public.contract_monthly_entries (
           contract_id, service_order_id, payment_process_number, monthly_paid_value,
           glosas_value, reference_month, execution_summary, empenho, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, payment_process_number AS "paymentProcessNumber",
           monthly_paid_value::text AS "monthlyPaidValue", monthly_net_value::text AS "monthlyNetValue",
           glosas_value::text AS "glosasValue", to_char(reference_month, 'YYYY-MM') AS "referenceMonth",
           execution_summary AS "executionSummary", empenho,
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          id,
          ordemId,
          entry.paymentProcessNumber,
          entry.monthlyPaidValue,
          entry.glosasValue,
          entry.referenceMonth,
          entry.executionSummary,
          entry.empenho,
          user.id,
        ]
      );

      await addAuditLog({
        user_id: user.id,
        action: "create_contract_monthly_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Lançamento de ${entry.referenceMonth.slice(0, 7)} criado para a OS ${order.siaf_number}.`,
      });
      return apiCreated(result.rows[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}