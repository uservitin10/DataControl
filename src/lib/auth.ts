import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { fetchJson } from "@/lib/api";
import { DEFAULT_PERMISSIONS, resolvePermissions, type Permissions } from "@/lib/permissions";
import type { Role } from "@/types/dashboard";

export type ClientProfile = {
  role: Role;
  display_name: string;
  permissions?: Partial<Permissions>;
};

export type AuthClientUser = {
  user: User | null;
  role: Role;
  displayName: string;
  permissions: Permissions;
  profile?: ClientProfile | null;
  profileFetchError?: Error | null;
};

export function getClientUserState(clientUser: AuthClientUser) {
  if (clientUser.profileFetchError) {
    console.warn("Erro ao carregar perfil:", clientUser.profileFetchError.message || clientUser.profileFetchError);
  }

  return {
    role: clientUser.role,
    displayName: clientUser.displayName,
    permissions: clientUser.permissions,
    profileFetchError: clientUser.profileFetchError,
  };
}

export async function getSessionUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function fetchUserProfile(userId: string): Promise<ClientProfile> {
  return fetchJson<ClientProfile>(`/api/profile?id=${encodeURIComponent(userId)}`);
}

export async function loadClientUser(): Promise<AuthClientUser> {
  const user = await getSessionUser();

  if (!user) {
    return {
      user: null,
      role: "viewer",
      displayName: "Visitante",
      permissions: DEFAULT_PERMISSIONS.viewer,
      profile: null,
      profileFetchError: null,
    };
  }

  try {
    const profile = await fetchUserProfile(user.id);
    const role = profile.role ?? "viewer";
    const displayName = profile.display_name || user.email || "Visitante";
    const permissions = resolvePermissions(role, profile.permissions);

    return {
      user,
      role,
      displayName,
      permissions,
      profile,
      profileFetchError: null,
    };
  } catch (error) {
    return {
      user,
      role: "viewer",
      displayName: user.email || "Usuário",
      permissions: resolvePermissions("viewer"),
      profile: null,
      profileFetchError: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
