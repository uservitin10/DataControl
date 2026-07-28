import pool from "@/lib/db";
import {
  Area,
  LevantamentoAtivo,
  LevantamentoAtivoInput,
  Profile,
} from "@/types/levantamento-ativos";

const TABLE = "levantamento_ativos";

export async function listarAtivos(): Promise<LevantamentoAtivo[]> {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} ORDER BY created_at DESC`
  );
  return rows as LevantamentoAtivo[];
}

export async function buscarAtivoPorId(
  id: string
): Promise<LevantamentoAtivo | null> {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE id = $1 LIMIT 1`,
    [id]
  );
  return (rows[0] as LevantamentoAtivo) ?? null;
}

export async function criarAtivo(
  input: Partial<LevantamentoAtivoInput>
): Promise<LevantamentoAtivo> {
  const colunas = Object.keys(input);
  const valores = Object.values(input);

  if (colunas.length === 0) {
    throw new Error("Erro ao criar ativo: nenhum dado informado");
  }

  const placeholders = colunas.map((_, i) => `$${i + 1}`).join(", ");
  const colunasSql = colunas.join(", ");

  const { rows } = await pool.query(
    `INSERT INTO ${TABLE} (${colunasSql}) VALUES (${placeholders}) RETURNING *`,
    valores
  );
  return rows[0] as LevantamentoAtivo;
}

export async function atualizarAtivo(
  id: string,
  input: Partial<LevantamentoAtivoInput>
): Promise<LevantamentoAtivo> {
  const colunas = Object.keys(input);
  const valores = Object.values(input);

  if (colunas.length === 0) {
    throw new Error("Erro ao atualizar ativo: nenhum dado informado");
  }

  // monta "coluna1 = $1, coluna2 = $2, ..." e acrescenta updated_at fixo
  const setSql = colunas
    .map((col, i) => `${col} = $${i + 1}`)
    .join(", ");

  const idParam = `$${colunas.length + 1}`;

  const { rows } = await pool.query(
    `UPDATE ${TABLE}
     SET ${setSql}, updated_at = NOW()
     WHERE id = ${idParam}
     RETURNING *`,
    [...valores, id]
  );
  return rows[0] as LevantamentoAtivo;
}

export async function excluirAtivo(id: string): Promise<void> {
  await pool.query(`DELETE FROM ${TABLE} WHERE id = $1`, [id]);
}

export async function listarProfiles(): Promise<Profile[]> {
  const { rows } = await pool.query(
    `SELECT id, display_name, email FROM profiles ORDER BY display_name ASC`
  );
  return rows as Profile[];
}

export async function listarAreas(): Promise<Area[]> {
  const { rows } = await pool.query(
    `SELECT id, nome FROM areas ORDER BY nome ASC`
  );
  return rows as Area[];
}