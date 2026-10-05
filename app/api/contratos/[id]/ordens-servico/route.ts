import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiCreated, apiError, apiInternalError, apiNotFound, apiValidationError } from "@/lib/api-response";
import { getContractClosureStatus, validateContractServiceOrderInput } from "@/lib/contratos";

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
      if (await getContractClosureStatus(id)) {
        return apiError("Não é possível adicionar informações a um contrato encerrado.", 409);
      }

      const order = validation.serviceOrder;
      const result = await pool.query(
        `INSERT INTO public.contract_service_orders (
           contract_id, siaf_number, sei_document_number, valid_from, valid_to, service_description
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, siaf_number AS "siafNumber", sei_document_number AS "seiDocumentNumber",
           to_char(valid_from, 'YYYY-MM-DD') AS "validFrom", to_char(valid_to, 'YYYY-MM-DD') AS "validTo",
           service_description AS "serviceDescription"`,
        [
          id,
          order.siafNumber,
          order.seiDocumentNumber,
          order.validFrom,
          order.validTo,
          order.serviceDescription,
        ]
      );

      await addAuditLog({
        user_id: user.id,
        action: "create_contract_service_order",
        resource_type: "contract",
        resource_id: id,
        details: `Ordem de serviço ${order.siafNumber} adicionada ao contrato ${contract.name}.`,
      });
      return apiCreated(result.rows[0]);
    } catch (error) {
      return apiInternalError((error as Error).message);
    }
  }, ["admin", "editor"]);
}