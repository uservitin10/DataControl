import { describe, expect, it } from "vitest";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS } from "./validation";

describe("validation utilities", () => {
  it("returns an error when a required field is missing", () => {
    const payload = { mensagem: "Teste" };
    expect(validateObject(payload, VALIDATION_SCHEMAS.criarNotificacao)).toBe("O campo 'tipo' é obrigatório.");
  });

  it("returns an error when a field has the wrong type", () => {
    const payload = { tipo: "alerta", mensagem: 5 };
    expect(validateObject(payload, VALIDATION_SCHEMAS.criarNotificacao)).toBe("O campo 'mensagem' deve ser do tipo 'string'.");
  });

  it("returns null for a valid notification payload", () => {
    const payload = { tipo: "alerta", mensagem: "Teste", lida: false };
    expect(validateObject(payload, VALIDATION_SCHEMAS.criarNotificacao)).toBeNull();
  });

  it("sanitizes object fields correctly", () => {
    const payload = { tipo: "alerta", mensagem: "Teste", extra: "não permitido" };
    expect(sanitizeObject(payload, ["tipo", "mensagem"])).toEqual({ tipo: "alerta", mensagem: "Teste" });
  });
});
