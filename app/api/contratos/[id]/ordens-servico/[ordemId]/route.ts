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
         SET siaf_number = $1, sei_document_number = $2, valid_from = $3, valid_to = $4,
           service_description = $5, updated_at = NOW()
         WHERE id = $6 AND contract_id = $7
         RETURNING id, siaf_number AS "siafNumber", sei_document_number AS "seiDocumentNumber",
           to_char(valid_from, 'YYYY-MM-DD') AS "validFrom", to_char(valid_to, 'YYYY-MM-DD') AS "validTo",
           service_description AS "serviceDescription"`,
        [
          order.siafNumber,
          order.seiDocumentNumber,
          order.validFrom,
          order.validTo,
          order.serviceDescription,
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
        details: `Ordem de serviço ${order.siafNumber} atualizada.`,
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
         RETURNING id, siaf_number`,
        [ordemId, id]
      );
      if (!result.rows[0]) return apiNotFound("Ordem de serviço não encontrada.");

      await addAuditLog({
        user_id: user.id,
        action: "delete_contract_service_order",
        resource_type: "contract",
        resource_id: id,
        details: `Ordem de serviço ${result.rows[0].siaf_number} excluída.`,
      });
      return apiSuccess({ deleted: true });
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}