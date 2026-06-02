/**
 * Validadores reutilizáveis para consolidar validações
 */

interface ValidationRule {
  required?: boolean;
  type?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: (string | number | boolean)[];
  custom?: (value: unknown) => boolean | string;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * Valida um objeto contra um schema
 */
export function validateObject(obj: unknown, schema: ValidationSchema): string | null {
  if (!obj || typeof obj !== "object") {
    return "Payload inválido.";
  }

  const typedObj = obj as Record<string, unknown>;
  for (const [field, rules] of Object.entries(schema)) {
    const value = typedObj[field];

    // Verificar se é obrigatório
    if (rules.required && (value === undefined || value === null || value === "")) {
      return `O campo '${field}' é obrigatório.`;
    }

    // Se não é obrigatório e está vazio, pular validação de tipo
    if (!rules.required && (value === undefined || value === null || value === "")) {
      continue;
    }

    // Verificar tipo
    if (rules.type && typeof value !== rules.type) {
      return `O campo '${field}' deve ser do tipo '${rules.type}'.`;
    }

    // Verificar comprimento mínimo
    if (rules.minLength && typeof value === "string" && value.length < rules.minLength) {
      return `O campo '${field}' deve ter no mínimo ${rules.minLength} caracteres.`;
    }

    // Verificar comprimento máximo
    if (rules.maxLength && typeof value === "string" && value.length > rules.maxLength) {
      return `O campo '${field}' deve ter no máximo ${rules.maxLength} caracteres.`;
    }

    // Verificar pattern (regex)
    if (rules.pattern && typeof value === "string" && !rules.pattern.test(value)) {
      return `O campo '${field}' não está em um formato válido.`;
    }

    // Verificar enum
    if (rules.enum && !rules.enum.includes(value as string | number | boolean)) {
      return `O campo '${field}' deve ser um dos valores: ${rules.enum.join(", ")}.`;
    }

    // Validação customizada
    if (rules.custom) {
      const result = rules.custom(value);
      if (result !== true) {
        return typeof result === "string" ? result : `O campo '${field}' é inválido.`;
      }
    }
  }

  return null;
}

/**
 * Limpa um objeto mantendo apenas os campos permitidos
 */
export function sanitizeObject(obj: unknown, allowedFields: string[]): Record<string, unknown> {
  const typedObj = (obj as Record<string, unknown>) || {};
  return Object.fromEntries(
    Object.entries(typedObj).filter(([key]) => allowedFields.includes(key))
  );
}

/**
 * Schemas de validação reutilizáveis
 */
export const VALIDATION_SCHEMAS = {
  // Schema para criar registro
  criarRegistro: {
    nome: { required: true, type: "string", minLength: 1 },
    categoria: { required: true, type: "string" },
    criado_por: { required: true, type: "string" },
    link: { type: "string" },
    descricao: { type: "string" },
    tipo_acesso: { type: "string", enum: ["publico", "restrito"] },
    responsavel: { type: "string" },
    desenvolvedor: { type: "string" },
    fonte_dados: { type: "string" },
    dados_sensiveis: { type: "boolean" },
    secretaria: { type: "string" },
    arquivo_path: { type: "string" },
    preview_path: { type: "string" },
  } as ValidationSchema,

  // Schema para atualizar registro (tudo opcional)
  atualizarRegistro: {
    nome: { type: "string", minLength: 1 },
    categoria: { type: "string" },
    link: { type: "string" },
    descricao: { type: "string" },
    tipo_acesso: { type: "string", enum: ["publico", "restrito"] },
    responsavel: { type: "string" },
    desenvolvedor: { type: "string" },
    fonte_dados: { type: "string" },
    dados_sensiveis: { type: "boolean" },
    secretaria: { type: "string" },
    arquivo_path: { type: "string" },
    preview_path: { type: "string" },
    updated_at: { type: "string" },
  } as ValidationSchema,

  // Schema para criar notificação
  criarNotificacao: {
    tipo: { required: true, type: "string" },
    mensagem: { required: true, type: "string" },
    lida: { type: "boolean" },
  } as ValidationSchema,

  // Schema para upload de storage
  uploadStorage: {
    bucket: { required: true, type: "string" },
    path: { required: true, type: "string" },
    file: { required: true },
  } as ValidationSchema,

  // Schema para exclusão de storage
  excluirStorage: {
    bucket: { required: true, type: "string" },
    path: { required: true, type: "string" },
  } as ValidationSchema,

  // Schema para criar sistema
  criarSistema: {
    sigla: { required: true, type: "string", minLength: 1, maxLength: 20 },
    nome: { required: true, type: "string", minLength: 1 },
    descricao: { required: true, type: "string" },
    gestores: { required: true, type: "string" },
    sustentacao: { required: true, type: "string" },
    url_producao: { type: "string" },
    url_homologacao: { type: "string" },
    gestao_dados: { required: true, type: "string" },
    acesso_bd: { required: true, type: "string" },
    tipo_acesso: { type: "string", enum: ["publico", "restrito"] },
    secretaria: { type: "string" },
  } as ValidationSchema,

  // Schema para atualizar sistema (tudo opcional)
  atualizarSistema: {
    sigla: { type: "string", minLength: 1, maxLength: 20 },
    nome: { type: "string", minLength: 1 },
    descricao: { type: "string" },
    gestores: { type: "string" },
    sustentacao: { type: "string" },
    url_producao: { type: "string" },
    url_homologacao: { type: "string" },
    gestao_dados: { type: "string" },
    acesso_bd: { type: "string" },
    tipo_acesso: { type: "string", enum: ["publico", "restrito"] },
    secretaria: { type: "string" },
    updated_at: { type: "string" },
  } as ValidationSchema,
};

/**
 * Campos permitidos em operações de registro
 */
export const ALLOWED_REGISTRO_FIELDS = [
  "nome",
  "categoria",
  "link",
  "descricao",
  "tipo_acesso",
  "responsavel",
  "desenvolvedor",
  "fonte_dados",
  "dados_sensiveis",
  "secretaria",
  "criado_por",
  "arquivo_path",
  "preview_path",
  "updated_at",
];

/**
 * Campos permitidos em operações de notificação
 */
export const ALLOWED_NOTIFICACAO_FIELDS = [
  "tipo",
  "mensagem",
  "lida",
];

/**
 * Campos permitidos em operações de sistema
 */
export const ALLOWED_SISTEMA_FIELDS = [
  "sigla",
  "nome",
  "descricao",
  "gestores",
  "sustentacao",
  "url_producao",
  "url_homologacao",
  "gestao_dados",
  "acesso_bd",
  "tipo_acesso",
  "secretaria",
  "updated_at",
];
