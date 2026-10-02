import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import {
  apiCreated,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { validateCreateContractInput } from "@/lib/contratos";

const CONTRACTS_SELECT = `
  SELECT
    c.id,
    c.service_order AS "serviceOrder",
    c.total_value::text AS "totalValue",
    c.created_at AS "createdAt",
    c.updated_at AS "updatedAt",
    COALESCE(
      json_agg(
        json_build_object(
          'id', e.id,
          'paymentProcessNumber', e.payment_process_number,
          'monthlyPaidValue', e.monthly_paid_value::text,
          'glosasValue', e.glosas_value::text,
          'referenceMonth', to_char(e.reference_month, 'YYYY-MM'),
          'executionSummary', e.execution_summary,
          'empenho', e.empenho,
          'createdAt', e.created_at,
          'updatedAt', e.updated_at
        ) ORDER BY e.reference_month DESC, e.created_at DESC
      ) FILTER (WHERE e.id IS NOT NULL),
      '[]'::json
    ) AS entries
  FROM public.contracts c
  LEFT JOIN public.contract_monthly_entries e ON e.contract_id = c.id
  GROUP BY c.id
  ORDER BY c.created_at DESC
`;

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const result = await pool.query(CONTRACTS_SELECT);
      return apiSuccess(result.rows);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateCreateContractInput(body);
    if (!validation.contract || !validation.entry) {
      return apiValidationError(validation.error || "Dados do contrato inválidos.");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const contractResult = await client.query(
        `INSERT INTO public.contracts (service_order, total_value, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, service_order AS "serviceOrder", total_value::text AS "totalValue", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [validation.contract.serviceOrder, validation.contract.totalValue, user.id]
      );
      const contract = contractResult.rows[0];

      const entryResult = await client.query(
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
          contract.id,
          validation.entry.paymentProcessNumber,
          validation.entry.monthlyPaidValue,
          validation.entry.glosasValue,
          validation.entry.referenceMonth,
          validation.entry.executionSummary,
          validation.entry.empenho,
          user.id,
        ]
      );

      await client.query("COMMIT");
      await addAuditLog({
        user_id: user.id,
        action: "create_contract",
        resource_type: "contract",
        resource_id: contract.id,
        details: `Contrato criado para a ordem de serviço ${contract.serviceOrder}.`,
      });

      return apiCreated({ ...contract, entries: entryResult.rows });
    } catch (error) {
      await client.query("ROLLBACK");
      return apiInternalError((error as Error).message);
    } finally {
      client.release();
    }
  }, ["admin", "editor"]);
}