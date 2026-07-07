import { SupabaseClient } from "@supabase/supabase-js";
import {
  Area,
  LevantamentoAtivo,
  LevantamentoAtivoInput,
  Profile,
} from "@/types/levantamento-ativos";

const TABLE = "levantamento_ativos";

export async function listarAtivos(
  supabase: SupabaseClient
): Promise<LevantamentoAtivo[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao listar ativos: ${error.message}`);
  return (data as LevantamentoAtivo[]) ?? [];
}

export async function buscarAtivoPorId(
  supabase: SupabaseClient,
  id: string
): Promise<LevantamentoAtivo | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar ativo: ${error.message}`);
  return data as LevantamentoAtivo | null;
}

export async function criarAtivo(
  supabase: SupabaseClient,
  input: Partial<LevantamentoAtivoInput>
): Promise<LevantamentoAtivo> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar ativo: ${error.message}`);
  return data as LevantamentoAtivo;
}

export async function atualizarAtivo(
  supabase: SupabaseClient,
  id: string,
  input: Partial<LevantamentoAtivoInput>
): Promise<LevantamentoAtivo> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar ativo: ${error.message}`);
  return data as LevantamentoAtivo;
}

export async function excluirAtivo(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(`Erro ao excluir ativo: ${error.message}`);
}

export async function listarProfiles(
  supabase: SupabaseClient
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .order("display_name", { ascending: true });

  if (error) throw new Error(`Erro ao listar profiles: ${error.message}`);
  return (data as Profile[]) ?? [];
}

export async function listarAreas(supabase: SupabaseClient): Promise<Area[]> {
  const { data, error } = await supabase
    .from("areas")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao listar areas: ${error.message}`);
  return (data as Area[]) ?? [];
}
