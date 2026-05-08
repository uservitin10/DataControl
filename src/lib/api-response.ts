import { NextResponse } from "next/server";

/**
 * Resposta bem-sucedida (200 OK)
 */
export const apiSuccess = <T>(data: T, status = 200) => {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
};

/**
 * Resposta criada (201 Created)
 */
export const apiCreated = <T>(data: T) => {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: 201 }
  );
};

/**
 * Resposta de erro
 */
export const apiError = (message: string, status = 400) => {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
};

/**
 * Erro de validação (400)
 */
export const apiValidationError = (message: string) => {
  return apiError(message, 400);
};

/**
 * Não autenticado (401)
 */
export const apiUnauthorized = (message = "Não autenticado") => {
  return apiError(message, 401);
};

/**
 * Sem permissão (403)
 */
export const apiForbidden = (message = "Acesso negado") => {
  return apiError(message, 403);
};

/**
 * Não encontrado (404)
 */
export const apiNotFound = (message = "Recurso não encontrado") => {
  return apiError(message, 404);
};

/**
 * Erro interno do servidor (500)
 */
export const apiInternalError = (message = "Erro interno do servidor") => {
  return apiError(message, 500);
};
