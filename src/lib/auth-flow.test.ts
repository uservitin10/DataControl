import { buildPasswordResetRedirectUrl, isPasswordRecoveryRedirect } from "./auth-flow";

describe("auth flow helpers", () => {
  it("builds an absolute reset password redirect URL from a base URL", () => {
    expect(buildPasswordResetRedirectUrl("https://app.example.com/", "https://fallback.example.com")).toBe(
      "https://app.example.com/login/reset"
    );
  });

  it("falls back to the current origin when no app URL is configured", () => {
    expect(buildPasswordResetRedirectUrl(undefined, "https://fallback.example.com")).toBe(
      "https://fallback.example.com/login/reset"
    );
  });

  it("detects reset links that use a plain token query parameter", () => {
    expect(isPasswordRecoveryRedirect("?token=abc123", "")).toBe(true);
  });
});
