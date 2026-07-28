"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  atualizarAtivo,
  criarAtivo,
  excluirAtivo,
} from "@/lib/queries/levantamento-ativos";
import { LevantamentoAtivoInput } from "@/types/levantamento-ativos";

function limpar(valor: FormDataEntryValue | null): string | null {
  if (valor === null) return null;
  const str = valor.toString().trim();
  return str === "" ? null : str;
}

function formParaInput(formData: FormData): Partial<LevantamentoAtivoInput> {
  return {
    tipo_ativo: limpar(formData.get("tipo_ativo")) as LevantamentoAtivoInput["tipo_ativo"],
    nome_ativo: limpar(formData.get("nome_ativo")) ?? "",
    sigla: limpar(formData.get("sigla")),
    finalidade: limpar(formData.get("finalidade")),
    secretaria_id: limpar(formData.get("secretaria_id")),
    unidade_responsavel_id: limpar(formData.get("unidade_responsavel_id")),
    responsavel_negocio_id: limpar(formData.get("responsavel_negocio_id")),
    responsavel_tecnico_id: limpar(formData.get("responsavel_tecnico_id")),
    curador_dados_id: limpar(formData.get("curador_dados_id")),
    substituto_curador_id: limpar(formData.get("substituto_curador_id")),
    criado_por: limpar(formData.get("criado_por")),
    status_ativo: limpar(formData.get("status_ativo")) as LevantamentoAtivoInput["status_ativo"],
    uso_ativo: limpar(formData.get("uso_ativo")),
    tecnologia_armazenamento: limpar(formData.get("tecnologia_armazenamento")) as LevantamentoAtivoInput["tecnologia_armazenamento"],
    tipo_backup: limpar(formData.get("tipo_backup")) as LevantamentoAtivoInput["tipo_backup"],
    volume_dados: limpar(formData.get("volume_dados")),
    frequencia_atualizacao: limpar(formData.get("frequencia_atualizacao")) as LevantamentoAtivoInput["frequencia_atualizacao"],
    crescimento_por_atualizacao: limpar(formData.get("crescimento_por_atualizacao")),
    linguagem_programacao: limpar(formData.get("linguagem_programacao")),
    nivel_sigilo: limpar(formData.get("nivel_sigilo")) as LevantamentoAtivoInput["nivel_sigilo"],
    natureza_dados: limpar(formData.get("natureza_dados")) as LevantamentoAtivoInput["natureza_dados"],
    nivel_acesso: limpar(formData.get("nivel_acesso")),
    norma_especifica: limpar(formData.get("norma_especifica")),
    risco_percebido: limpar(formData.get("risco_percebido")),
    termo_responsabilidade: limpar(formData.get("termo_responsabilidade")),
    observacao_juridica: limpar(formData.get("observacao_juridica")),
    tipo_api: limpar(formData.get("tipo_api")) as LevantamentoAtivoInput["tipo_api"],
    como_extracao: limpar(formData.get("como_extracao")),
    dificuldade_extracao: limpar(formData.get("dificuldade_extracao")),
    integracao_automatizada: limpar(formData.get("integracao_automatizada")),
    potencial_reuso: limpar(formData.get("potencial_reuso")),
    possiveis_interessados: limpar(formData.get("possiveis_interessados")),
    data_inventario: limpar(formData.get("data_inventario")),
    periodicidade_revisao: limpar(formData.get("periodicidade_revisao")) as LevantamentoAtivoInput["periodicidade_revisao"],
  };
}

export async function criarAtivoAction(formData: FormData) {
  const input = formParaInput(formData);
  await criarAtivo(input);
  revalidatePath("/ativos");
  redirect("/ativos");
}

export async function atualizarAtivoAction(id: string, formData: FormData) {
  const input = formParaInput(formData);
  await atualizarAtivo(id, input);
  revalidatePath("/ativos");
  redirect("/ativos");
}

export async function excluirAtivoAction(id: string) {
  await excluirAtivo(id);
  revalidatePath("/ativos");
}