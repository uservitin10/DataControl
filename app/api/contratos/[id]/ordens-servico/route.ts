import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiCreated, apiInternalError, apiNotFound, apiValidationError } from "@/lib/api-response";
import { validateContractServiceOrderInput } from "@/lib/contratos";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(request, async (user) => {
    const body = await request.json().catch(() => null);
    const validation = validateContractServiceOrderInput(body);
    if (!validation.serviceOrder) {
      return apiValidationError(validation.error || "Dados da ordem de serviço inválidos.");
    }

    try {
      const { id } = await params;
      const contractResult = await pool.query(
        "SELECT id, name FROM public.contracts WHERE id = $1",
        [id]
      );
      const contract = contractResult.rows[0];
      if (!contract) return apiNotFound("Contrato não encontrado.");

      const order = validation.serviceOrder;
      const result = await pool.query(
        `INSERT INTO public.contract_service_orders (
           contract_id, service_order_number, internal_number, valid_from, valid_to,
           service_description, addendum_number, addendum_valid_from, addendum_valid_to
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, service_order_number AS "serviceOrderNumber", internal_number AS "internalNumber",
           to_char(valid_from, 'YYYY-MM-DD') AS "validFrom", to_char(valid_to, 'YYYY-MM-DD') AS "validTo",
           service_description AS "serviceDescription", addendum_number AS "addendumNumber",
           to_char(addendum_valid_from, 'YYYY-MM-DD') AS "addendumValidFrom",
           to_char(addendum_valid_to, 'YYYY-MM-DD') AS "addendumValidTo"`,
        [
          id,
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

      await addAuditLog({
        user_id: user.id,
        action: "create_contract_service_order",
        resource_type: "contract",
        resource_id: id,
        details: `Ordem de serviço ${order.serviceOrderNumber} adicionada ao contrato ${contract.name}.`,
      });
      return apiCreated(result.rows[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}