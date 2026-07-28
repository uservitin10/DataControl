"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/ui-constants";

export default function UserBadge() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // Ensure any server-rendered placeholder is removed when the client component mounts
    const removePlaceholder = () => {
      try {
        const el = document.getElementById("user-badge-placeholder");
        if (el) el.remove();
      } catch {
        // ignore
      }
    };
    // try immediate removal and also next frame to be robust against timing
    removePlaceholder();
    requestAnimationFrame(removePlaceholder);
    const load = async () => {
      try {
        const session = await fetchJson<{ user?: { id?: string; email?: string; name?: string; role?: string } }>(
          "/api/auth/session"
        );

        const userId = session?.user?.id;
        if (!userId) {
          setLoading(false);
          return;
        }

        const profileResponse = await fetchJson<{
          success: true;
          data: {
            role?: string | null;
            display_name?: string | null;
          };
        }>(`/api/profile/me`);
        if (!mounted) return;
        const profileData = profileResponse.data ?? {};
        setDisplayName(profileData.display_name ?? session.user?.email ?? session.user?.name ?? "Usuário");
        setRole(profileData.role ?? null);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!displayName) return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard/profile")}
      className="gov-button-secondary-dark inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-medium"
      aria-label={displayName}
      title={displayName}
    >
      <span className="text-sm text-white/95 truncate max-w-[160px]">{displayName}</span>
      <span className={`gov-badge role-${role ?? "viewer"}`}>{ROLE_LABELS?.[(role ?? "viewer") as keyof typeof ROLE_LABELS] ?? role ?? "Usuário"}</span>
    </button>
  );
}

