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
import { getContractsWithDetails, validateCreateContractInput } from "@/lib/contratos";

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      return apiSuccess(await getContractsWithDetails());
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateCreateContractInput(body);
    if (!validation.contract || !validation.serviceOrder || !validation.entry) {
      return apiValidationError(validation.error || "Dados do contrato inválidos.");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const contractResult = await client.query(
        `INSERT INTO public.contracts (name, total_value, execution_summary, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          validation.contract.name,
          validation.contract.totalValue,
          validation.contract.executionSummary,
          user.id,
        ]
      );
      const contractId = contractResult.rows[0].id as string;
      const order = validation.serviceOrder;
      const orderResult = await client.query(
        `INSERT INTO public.contract_service_orders (
           contract_id, service_order_number, internal_number, valid_from, valid_to,
           service_description, addendum_number, addendum_valid_from, addendum_valid_to
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          contractId,
          order.serviceOrderNumber,
          order.internalNumber,
          order.validFrom,
          order.validTo,
          order.serviceDescription,
          order.addendumNumber,
          order.addendumValidFrom,
          order.addendumValidTo,
        ]
      );
      const orderId = orderResult.rows[0].id as string;
      const entry = validation.entry;
      await client.query(
        `INSERT INTO public.contract_monthly_entries (
           contract_id, service_order_id, payment_process_number, monthly_paid_value,
           glosas_value, reference_month, execution_summary, empenho, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          contractId,
          orderId,
          entry.paymentProcessNumber,
          entry.monthlyPaidValue,
          entry.glosasValue,
          entry.referenceMonth,
          entry.executionSummary,
          entry.empenho,
          user.id,
        ]
      );
      await client.query("COMMIT");

      await addAuditLog({
        user_id: user.id,
        action: "create_contract",
        resource_type: "contract",
        resource_id: contractId,
        details: `Contrato ${validation.contract.name} criado.`,
      });

      const contract = await getContractsWithDetails(contractId);
      return apiCreated(contract[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      return apiInternalError((error as Error).message);
    } finally {
      client.release();
    }
  }, ["admin", "editor"]);
}