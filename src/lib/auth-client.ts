import { DEFAULT_PERMISSIONS, type Permissions } from "@/lib/permissions";
import type { Role } from "@/types/dashboard";

export type ClientUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  image?: string | null;
};

export type ClientAuthResult = {
  user: ClientUser | null;
  role?: string | null;
};

export type ClientUserState = {
  role: Role;
  displayName: string;
  permissions: Permissions;
};

export async function loadClientUser(): Promise<ClientAuthResult> {
  try {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
    });

    if (!response.ok) {
      return { user: null, role: "viewer" };
    }

    const session = await response.json();
    if (!session?.user) {
      return { user: null, role: "viewer" };
    }

    const user = {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? session.user.email ?? null,
      role: session.user.role ?? "viewer",
      image: session.user.image ?? null,
    } as ClientUser;

    if (user.id) {
      try {
        const profileResponse = await fetch("/api/profile/me", {
          cache: "no-store",
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const displayName = profileData?.data?.display_name;
          if (displayName) {
            user.name = displayName;
          }
        }
      } catch {
        // Ignore profile lookup errors; keep session name as fallback.
      }
    }

    return { user, role: session.user.role ?? "viewer" };
  } catch {
    return { user: null, role: "viewer" };
  }
}

export function getClientUserState(clientUser: ClientAuthResult | null | undefined): ClientUserState {
  const role = (clientUser?.role || clientUser?.user?.role || "viewer") as Role;
  const displayName = clientUser?.user?.name || clientUser?.user?.email || "Usuário";
  const permissions = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.viewer;

  return { role, displayName, permissions };
}
