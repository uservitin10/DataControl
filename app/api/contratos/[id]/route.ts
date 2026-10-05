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
      const result = await pool.query(
        `UPDATE public.contracts
         SET name = $1, total_value = $2, execution_summary = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, name, total_value::text AS "totalValue", execution_summary AS "executionSummary",
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [validation.contract.name, validation.contract.totalValue, validation.contract.executionSummary, id]
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