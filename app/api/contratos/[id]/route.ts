import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import {
  apiError,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response";
import { getContractsWithDetails, validateContractInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(request, async () => {
    try {
      const { id } = await params;
      const contracts = await getContractsWithDetails(id);
      if (!contracts[0]) return apiNotFound("Contrato não encontrado.");
      return apiSuccess(contracts[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractInput(body);
    if (!validation.contract) {
      return apiValidationError(validation.error || "Dados do contrato inválidos.");
    }

    try {
      const { id } = await params;
      const existingContract = await pool.query(
        `SELECT c.payment_frequency AS "paymentFrequency",
           EXISTS (SELECT 1 FROM public.contract_monthly_entries e WHERE e.contract_id = c.id)
           OR EXISTS (SELECT 1 FROM public.contract_annual_entries e WHERE e.contract_id = c.id) AS "hasEntries"
         FROM public.contracts c
         WHERE c.id = $1`,
        [id]
      );
      if (!existingContract.rows[0]) return apiNotFound("Contrato não encontrado.");
      if (
        existingContract.rows[0].paymentFrequency !== validation.contract.paymentFrequency &&
        existingContract.rows[0].hasEntries
      ) {
        return apiError("A periodicidade não pode ser alterada após a inclusão de lançamentos.", 409);
      }

      const result = await pool.query(
        `UPDATE public.contracts
         SET name = $1, total_value = $2, execution_summary = $3,
           payment_frequency = $4, valid_from = $5, valid_to = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING id, name, total_value::text AS "totalValue", execution_summary AS "executionSummary",
           payment_frequency AS "paymentFrequency", to_char(valid_from, 'YYYY-MM-DD') AS "validFrom",
           to_char(valid_to, 'YYYY-MM-DD') AS "validTo",
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          validation.contract.name,
          validation.contract.totalValue,
          validation.contract.executionSummary,
          validation.contract.paymentFrequency,
          validation.contract.validFrom,
          validation.contract.validTo,
          id,
        ]
      );
      if (!result.rows[0]) return apiNotFound("Contrato não encontrado.");

      await addAuditLog({
        user_id: user.id,
        action: "update_contract",
        resource_type: "contract",
        resource_id: id,
        details: `Contrato ${validation.contract.name} atualizado.`,
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
      const { id } = await params;
      const result = await pool.query(
        "DELETE FROM public.contracts WHERE id = $1 RETURNING id, name",
        [id]
      );
      if (!result.rows[0]) return apiNotFound("Contrato não encontrado.");

      await addAuditLog({
        user_id: user.id,
        action: "delete_contract",
        resource_type: "contract",
        resource_id: id,
        details: `Contrato excluído: ${result.rows[0].name}.`,
      });
      return apiSuccess({ deleted: true });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}