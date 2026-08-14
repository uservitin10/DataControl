export function isPasswordRecoveryRedirect(search: string, hash: string) {
  const params = new URLSearchParams(search);
  const recoveryType = params.get("type");
  const tokenHash = params.get("token_hash");
  const token = params.get("token");

  return (
    recoveryType === "recovery" ||
    Boolean(tokenHash) ||
    Boolean(token) ||
    hash.includes("access_token=") ||
    hash.includes("type=recovery")
  );
}

export function buildPasswordRecoveryRedirectPath(search: string, hash: string) {
  const normalizedSearch = search || "";
  const normalizedHash = hash || "";

  return `/login/reset${normalizedSearch}${normalizedHash}`;
}

export function buildPasswordResetRedirectUrl(appUrl?: string, fallbackOrigin?: string) {
  const baseUrl = appUrl?.trim();
  const fallback = fallbackOrigin?.trim();

  if (baseUrl) {
    try {
      const normalized = baseUrl.replace(/\/$/, "");
      return `${normalized}/login/reset`;
    } catch {
      // ignore and fall back below
    }
  }

  if (fallback) {
    return `${fallback.replace(/\/$/, "")}/login/reset`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/login/reset`;
  }

  return "/login/reset";
}
