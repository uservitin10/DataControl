import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function useAdminCheck() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user?.id) {
      router.replace("/login");
      return;
    }

    const role = session.user.role || "viewer";
    if (role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    queueMicrotask(() => {
      setIsAdmin(true);
      setLoading(false);
    });
  }, [router, session, status]);

  return { isAdmin, loading };
}
