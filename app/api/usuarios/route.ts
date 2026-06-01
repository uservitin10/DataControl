import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async () => {
      try {
        const url = new URL(req.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
        const offset = parseInt(url.searchParams.get("offset") ?? "0");

        const { data, error, count } = await supabaseServer
          .from("profiles")
          .select("id,email,display_name,role,created_at", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          return apiInternalError(error.message);
        }

        return apiSuccess({ data: data ?? [], total: count ?? 0 });
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    ["admin"]
  );
}