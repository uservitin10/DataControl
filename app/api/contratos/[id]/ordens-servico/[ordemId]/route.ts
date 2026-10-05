import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response";
import { validateContractServiceOrderInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string; ordemId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractServiceOrderInput(body);
    if (!validation.serviceOrder) {
      return apiValidationError(validation.error || "Dados da ordem de serviço inválidos.");
    }

    try {
      const { id, ordemId } = await params;
      const order = validation.serviceOrder;
      const result = await pool.query(
        `UPDATE public.contract_service_orders
         SET service_order_number = $1, internal_number = $2, valid_from = $3, valid_to = $4,
           service_description = $5, addendum_number = $6, addendum_valid_from = $7,
           addendum_valid_to = $8, updated_at = NOW()
         WHERE id = $9 AND contract_id = $10
         RETURNING id, service_order_number AS "serviceOrderNumber", internal_number AS "internalNumber",
           to_char(valid_from, 'YYYY-MM-DD') AS "validFrom", to_char(valid_to, 'YYYY-MM-DD') AS "validTo",
           service_description AS "serviceDescription", addendum_number AS "addendumNumber",
           to_char(addendum_valid_from, 'YYYY-MM-DD') AS "addendumValidFrom",
           to_char(addendum_valid_to, 'YYYY-MM-DD') AS "addendumValidTo"`,
        [
          order.serviceOrderNumber,
          order.internalNumber,
          order.validFrom,
          order.validTo,
          order.serviceDescription,
          order.addendumNumber,
          order.addendumValidFrom,
          order.addendumValidTo,
          ordemId,
          id,
        ]
      );
      if (!result.rows[0]) return apiNotFound("Ordem de serviço não encontrada.");

      await addAuditLog({
        user_id: user.id,
        action: "update_contract_service_order",
        resource_type: "contract",
        resource_id: id,
        details: `Ordem de serviço ${order.serviceOrderNumber} atualizada.`,
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
      const { id, ordemId } = await params;
      const result = await pool.query(
        `DELETE FROM public.contract_service_orders
         WHERE id = $1 AND contract_id = $2
         RETURNING id, service_order_number`,
        [ordemId, id]
      );
      if (!result.rows[0]) return apiNotFound("Ordem de serviço não encontrada.");

      await addAuditLog({
        user_id: user.id,
        action: "delete_contract_service_order",
        resource_type: "contract",
        resource_id: id,
        details: `Ordem de serviço ${result.rows[0].service_order_number} excluída.`,
      });
      return apiSuccess({ deleted: true });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}