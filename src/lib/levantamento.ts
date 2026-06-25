import { supabaseServer } from "@/lib/supabase-server";
import type { RespostaLevantamento, RespostaLevantamentoInsert, EstatisticasLevantamento } from "@/types/levantamento";

/**
 * Lista todas as respostas ordenadas por data de criação (mais recentes primeiro)
 */
export async function getRespostas(): Promise<RespostaLevantamento[]> {
  const { data, error } = await supabaseServer
    .from("levantamento_ativos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar respostas: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca uma resposta específica por ID
 */
export async function getRespostaPorId(id: string): Promise<RespostaLevantamento | null> {
  const { data, error } = await supabaseServer
    .from("levantamento_ativos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Não encontrado
    }
    throw new Error(`Erro ao buscar resposta: ${error.message}`);
  }

  return data;
}

/**
 * Retorna estatísticas gerais do levantamento
 */
export async function getEstatisticas(): Promise<EstatisticasLevantamento> {
  const { data, error } = await supabaseServer
    .from("levantamento_ativos")
    .select("status, secretaria");

  if (error) {
    throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
  }

  const respostas = data || [];
  const setores = new Set(respostas.map((r) => r.secretaria));

  return {
    total_respostas: respostas.length,
    setores_respondentes: setores.size,
    pendentes: respostas.filter((r) => r.status === "pendente").length,
    concluidos: respostas.filter((r) => r.status === "concluido").length,
    rascunhos: respostas.filter((r) => r.status === "rascunho").length,
  };
}

/**
 * Cria uma nova resposta de levantamento
 */
export async function criarResposta(payload: RespostaLevantamentoInsert): Promise<RespostaLevantamento> {
  const { data, error } = await supabaseServer
    .from("levantamento_ativos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar resposta: ${error.message}`);
  }

  return data;
}

/**
 * Atualiza uma resposta existente
 */
export async function atualizarResposta(
  id: string,
  payload: Partial<RespostaLevantamentoInsert>
): Promise<RespostaLevantamento> {
  const { data, error } = await supabaseServer
    .from("levantamento_ativos")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar resposta: ${error.message}`);
  }

  return data;
}

/**
 * Salva um rascunho (cria ou atualiza com status 'rascunho')
 */
export async function salvarRascunho(
  id: string | null,
  payload: RespostaLevantamentoInsert
): Promise<RespostaLevantamento> {
  const dataComStatus = {
    ...payload,
    status: "rascunho" as const,
  };

  if (!id) {
    // Criar novo rascunho
    return criarResposta(dataComStatus);
  }

  // Atualizar rascunho existente
  return atualizarResposta(id, dataComStatus);
}
