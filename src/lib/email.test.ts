import { describe, expect, it } from "vitest";
import { resolveSmtpConfig } from "./email";

describe("resolveSmtpConfig", () => {
  it("uses Gmail defaults when no custom SMTP env is provided", () => {
    const config = resolveSmtpConfig({
      GMAIL_USER: "usuario@gmail.com",
      GMAIL_APP_PASSWORD: "secret",
    } as Record<string, string | undefined>);

    expect(config.host).toBe("smtp.gmail.com");
    expect(config.port).toBe(587);
    expect(config.secure).toBe(false);
    expect(config.auth).toEqual({ user: "usuario@gmail.com", pass: "secret" });
  });

  it("prefers explicit SMTP env values when provided", () => {
    const config = resolveSmtpConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "2525",
      SMTP_SECURE: "true",
      SMTP_USER: "custom@example.com",
      SMTP_PASS: "custom-secret",
    } as Record<string, string | undefined>);

    expect(config.host).toBe("smtp.example.com");
    expect(config.port).toBe(2525);
    expect(config.secure).toBe(true);
    expect(config.auth).toEqual({ user: "custom@example.com", pass: "custom-secret" });
  });
});
