import { sanitizeRedirectUrl } from "../../app/api/auth/forgot-password/route";

describe("sanitizeRedirectUrl", () => {
  it("sends a bare origin to the reset page", () => {
    expect(sanitizeRedirectUrl("https://app.example.com", "https://app.example.com"))
      .toBe("https://app.example.com/login/reset");
  });

  it("rejects external hosts", () => {
    expect(sanitizeRedirectUrl("https://evil.example/path", "https://app.example.com"))
      .toBe("https://app.example.com/login/reset");
  });

  it("preserves a same-origin reset path and token", () => {
    expect(sanitizeRedirectUrl("/login/reset?token=abc", "https://app.example.com"))
      .toBe("https://app.example.com/login/reset?token=abc");
  });
});