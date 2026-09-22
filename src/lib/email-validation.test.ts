import { isValidEmail } from "./email-validation";

describe("isValidEmail", () => {
  it.each(["nome@exemplo.com", "nome@sub.exemplo.com", "nome+tag@exemplo.com"]) (
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    }
  );

  it.each(["nome", "@exemplo.com", "nome@", "nome@.com", "nome@exemplo", "nome@@exemplo.com", "nome @exemplo.com"])(
    "rejects %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    }
  );
});