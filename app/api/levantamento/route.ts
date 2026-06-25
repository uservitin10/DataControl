import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { apiSuccess, apiCreated, apiValidationError, apiInternalError } from "@/lib/api-response";
import {
  getRespostas,
  criarResposta,
  getEstatisticas,
} from "@/lib/levantamento";
import type { RespostaLevantamentoInsert } from "@/types/levantamento";

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const url = new URL(request.url);
      const stats = url.searchParams.get("stats");

      if (stats === "true") {
        const estatisticas = await getEstatisticas();
        return apiSuccess(estatisticas);
      }

      const respostas = await getRespostas();
      return apiSuccess(respostas);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    try {
      const body = (await request.json()) as RespostaLevantamentoInsert;

      // Validação básica dos campos obrigatórios
      const camposObrigatorios = [
        "nome_respondente",
        "secretaria",
        "unidade_responsavel",
        "nome_ativo",
        "tipo_ativo",
        "local_armazenamento",
        "nivel_acesso",
        "nivel_criticidade",
        "politica_retencao",
      ];

      for (const campo of camposObrigatorios) {
        if (!body[campo as keyof RespostaLevantamentoInsert]) {
          return apiValidationError(`Campo obrigatório ausente: ${campo}`);
        }
      }

      // Criar resposta
      const resposta = await criarResposta(body);

      await addAuditLog({
        user_id: user.id,
        action: "create_levantamento",
        resource_type: "levantamento_ativos",
        resource_id: resposta.id,
        details: `Levantamento criado para o ativo: ${body.nome_ativo}`,
      });

      return apiCreated(resposta);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}
