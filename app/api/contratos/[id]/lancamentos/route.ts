import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import {
  apiCreated,
  apiInternalError,
  apiNotFound,
  apiValidationError,
} from "@/lib/api-response";
import { validateContractEntryInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractEntryInput(body);
    if (!validation.entry) {
      return apiValidationError(validation.error || "Dados do lançamento inválidos.");
    }

    try {
      const { id } = await params;
      const contractResult = await pool.query(
        "SELECT id, service_order FROM public.contracts WHERE id = $1",
        [id]
      );
      const contract = contractResult.rows[0];
      if (!contract) return apiNotFound("Contrato não encontrado.");

      const result = await pool.query(
        `INSERT INTO public.contract_monthly_entries (
           contract_id, payment_process_number, monthly_paid_value, glosas_value,
           reference_month, execution_summary, empenho, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, payment_process_number AS "paymentProcessNumber",
           monthly_paid_value::text AS "monthlyPaidValue", glosas_value::text AS "glosasValue",
           to_char(reference_month, 'YYYY-MM') AS "referenceMonth",
           execution_summary AS "executionSummary", empenho,
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          id,
          validation.entry.paymentProcessNumber,
          validation.entry.monthlyPaidValue,
          validation.entry.glosasValue,
          validation.entry.referenceMonth,
          validation.entry.executionSummary,
          validation.entry.empenho,
          user.id,
        ]
      );

      await addAuditLog({
        user_id: user.id,
        action: "create_contract_entry",
        resource_type: "contract",
        resource_id: id,
        details: `Lançamento de ${validation.entry.referenceMonth.slice(0, 7)} criado para ${contract.service_order}.`,
      });
      return apiCreated(result.rows[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}