"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user ?? null;
        if (!sessionUser) {
          setLoading(false);
          return;
        }

        const profile = (await fetchJson(`/api/profile?id=${encodeURIComponent(sessionUser.id)}`)) as {
          role?: string | null;
          display_name?: string | null;
        } | null;
        if (!mounted) return;
        setDisplayName(profile?.display_name ?? sessionUser.email ?? "Usuário");
        setRole(profile?.role ?? null);
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
  }, [router]);

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

