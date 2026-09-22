import { EMPTY_NEW_USER, createEmptyPermissions, filterUsers, getDefaultPermissions, getErrorMessage, updateModulePermission, validateNewUser, type Profile } from "./user-management";

const users: Profile[] = [{ id: "1", email: "Admin@teste.com", display_name: "Ana", role: "admin" }, { id: "2", email: "bruno@teste.com", role: "viewer" }];

describe("user management domain", () => {
  it("filters by name or email, ignoring case and whitespace", () => {
    expect(filterUsers(users, "  ANA ")).toEqual([users[0]]);
    expect(filterUsers(users, "TESTE.COM")).toHaveLength(2);
    expect(filterUsers(users, "inexistente")).toEqual([]);
  });
  it("does not mutate permission templates or the current permission set", () => {
    const permissions = createEmptyPermissions();
    const updated = updateModulePermission(permissions, "dashboard", "view", true);
    expect(permissions.dashboard.view).toBe(false);
    expect(updated.dashboard.view).toBe(true);
    expect(getDefaultPermissions("admin")).not.toBe(updated);
  });
  it("validates required fields and the password boundary", () => {
    expect(validateNewUser(EMPTY_NEW_USER)).toBe("Preencha nome, email e senha para criar o usuário.");
    expect(validateNewUser({ ...EMPTY_NEW_USER, display_name: "Ana", email: "a@b.com", password: "12345" })).toBe("A senha precisa ter pelo menos 6 caracteres.");
    expect(validateNewUser({ ...EMPTY_NEW_USER, display_name: "Ana", email: "a@b.com", password: "123456" })).toBeNull();
  });
  it("normalizes unknown thrown values into a safe message", () => {
    expect(getErrorMessage(new Error("falha"))).toBe("falha");
    expect(getErrorMessage("falha" as unknown)).toBe("Ocorreu um erro inesperado.");
  });
});