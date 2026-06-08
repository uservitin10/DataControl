import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAdminCheck() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        const userMetadata = session.user.user_metadata;
        const role = userMetadata?.role || "viewer";

        if (role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Erro ao verificar permissões:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [router]);

  return { isAdmin, loading };
}
