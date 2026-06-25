import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiSuccess, apiNotFound, apiValidationError, apiInternalError } from "@/lib/api-response";
import { getRespostaPorId, atualizarResposta } from "@/lib/levantamento";
import type { RespostaLevantamentoInsert } from "@/types/levantamento";

type Params = {
  id: string;
};

export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
  return withAuth(request, async () => {
    try {
      const { id } = await params;

      const resposta = await getRespostaPorId(id);

      if (!resposta) {
        return apiNotFound("Resposta de levantamento não encontrada");
      }

      return apiSuccess(resposta);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
  return withAuth(request, async (user) => {
    try {
      const { id } = await params;
      const body = (await request.json()) as Partial<RespostaLevantamentoInsert>;

      // Verificar se a resposta existe
      const respostaExistente = await getRespostaPorId(id);
      if (!respostaExistente) {
        return apiNotFound("Resposta de levantamento não encontrada");
      }

      // Atualizar resposta
      const resposta = await atualizarResposta(id, body);

      await addAuditLog({
        user_id: user.id,
        action: "update_levantamento",
        resource_type: "levantamento_ativos",
        resource_id: id,
        details: `Levantamento atualizado: ${body.nome_ativo || respostaExistente.nome_ativo}`,
      });

      return apiSuccess(resposta);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
