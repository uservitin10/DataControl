import Link from "next/link";
import { cookies } from "next/headers";
import { decodeJWT } from "@/lib/api-guard";
import { getProfileById } from "@/lib/profile";
import { ROLE_LABELS } from "@/lib/ui-constants";
import type { Role } from "@/types/dashboard";

type TokenPayload = {
  sub?: string;
  email?: string;
  exp?: number;
};

function isTokenExpired(payload: TokenPayload | null): boolean {
  if (!payload?.exp) {
    return false;
  }

  return Math.floor(Date.now() / 1000) >= payload.exp;
}

async function getServerUserData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-auth-token")?.value;
  if (!token) {
    return null;
  }

  const payload = decodeJWT(token) as TokenPayload | null;
  if (!payload || !payload.sub || isTokenExpired(payload)) {
    return null;
  }

  const profile = await getProfileById(payload.sub);
  if (!profile) {
    return null;
  }

  return {
    displayName: profile.display_name || payload.email || "Usuário",
    role: (profile.role ?? "viewer") as Role,
  };
}

export default async function ServerUserBadge() {
  const user = await getServerUserData();
  if (!user) {
    return null;
  }

  return (
    <Link
      href="/dashboard/profile"
      className="gov-button-secondary-dark inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-medium"
      aria-label={`Perfil de ${user.displayName}`}
      title={user.displayName}
    >
      <span className="text-sm text-white/95 truncate max-w-[160px]">{user.displayName}</span>
      <span className={`gov-badge role-${user.role}`}>
        {ROLE_LABELS?.[user.role] ?? user.role}
      </span>
    </Link>
  );
}
