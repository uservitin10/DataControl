import pool from "@/lib/db";
import type { RespostaLevantamento, RespostaLevantamentoInsert, EstatisticasLevantamento } from "@/types/levantamento";

export async function getRespostas(): Promise<RespostaLevantamento[]> {
  const { rows } = await pool.query(
    `SELECT * FROM levantamento_ativos ORDER BY created_at DESC`
  );
  return rows;
}

export async function getRespostaPorId(id: string): Promise<RespostaLevantamento | null> {
  const { rows } = await pool.query(
    `SELECT * FROM levantamento_ativos WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getEstatisticas(): Promise<EstatisticasLevantamento> {
  const { rows: respostas } = await pool.query(
    `SELECT status, secretaria FROM levantamento_ativos`
  );

  const setores = new Set(respostas.map((r) => r.secretaria));

  return {
    total_respostas: respostas.length,
    setores_respondentes: setores.size,
    pendentes: respostas.filter((r) => r.status === "pendente").length,
    concluidos: respostas.filter((r) => r.status === "concluido").length,
    rascunhos: respostas.filter((r) => r.status === "rascunho").length,
  };
}

export async function criarResposta(payload: RespostaLevantamentoInsert): Promise<RespostaLevantamento> {
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  const { rows } = await pool.query(
    `INSERT INTO levantamento_ativos (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

export async function atualizarResposta(
  id: string,
  payload: Partial<RespostaLevantamentoInsert>
): Promise<RespostaLevantamento> {
  const columns = Object.keys(payload);
  const values = Object.values(payload);
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(", ");

  const { rows } = await pool.query(
    `UPDATE levantamento_ativos SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`,
    [...values, id]
  );

  if (rows.length === 0) {
    throw new Error(`Erro ao atualizar resposta: registro ${id} não encontrado`);
  }

  return rows[0];
}

export async function salvarRascunho(
  id: string | null,
  payload: RespostaLevantamentoInsert
): Promise<RespostaLevantamento> {
  const dataComStatus = { ...payload, status: "rascunho" as const };

  if (!id) {
    return criarResposta(dataComStatus);
  }

  return atualizarResposta(id, dataComStatus);
}