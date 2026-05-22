import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiInternalError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  return withAuth(
    req,
    async () => {
      try {
        const { data, error } = await supabaseServer
          .from("profiles")
          .select("id,email,display_name,role,created_at")
          .order("created_at", { ascending: false });

        if (error) {
          return apiInternalError(error.message);
        }

        return apiSuccess(data ?? []);
      } catch (err) {
        return apiInternalError((err as Error).message);
      }
    },
    ["admin"]
  );
}
