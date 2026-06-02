import { describe, expect, it, vi, beforeEach } from "vitest";
import { addAuditLog } from "./audit";
import { supabaseServer } from "@/lib/supabase-server";

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn(),
  },
}));

describe("addAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success when the insert succeeds", async () => {
    const insert = vi.fn().mockResolvedValue({ data: [{ id: "log-1" }], error: null });
    (supabaseServer as any).from = vi.fn(() => ({ insert }));

    const result = await addAuditLog({
      user_id: "user-1",
      action: "test_action",
      resource_type: "test",
      resource_id: "1",
      details: "Testing audit log",
    });

    expect(result).toEqual({ success: true, data: [{ id: "log-1" }] });
    expect((supabaseServer as any).from).toHaveBeenCalledWith("audit_logs");
  });

  it("skips audit logging when the audit table is missing", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.audit_logs'" } });
    (supabaseServer as any).from = vi.fn(() => ({ insert }));

    const result = await addAuditLog({
      user_id: "user-1",
      action: "missing_table",
    });

    expect(result).toEqual({ success: false, skipped: true });
  });

  it("returns an error object when the insert fails for another reason", async () => {
    const error = { code: "PGRST000", message: "Unexpected error" };
    const insert = vi.fn().mockResolvedValue({ data: null, error });
    (supabaseServer as any).from = vi.fn(() => ({ insert }));

    const result = await addAuditLog({
      user_id: "user-1",
      action: "bad_action",
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
  });
});
