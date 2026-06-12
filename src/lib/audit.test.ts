import { describe, expect, it, vi, beforeEach } from "vitest";
import { addAuditLog } from "./audit";
import { supabaseServer } from "@/lib/supabase-server";

// Tipo do mock do from()
type MockFrom = ReturnType<typeof vi.fn> & typeof supabaseServer.from;

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: {
    from: vi.fn(),
  },
}));

const supabaseMock = vi.mocked(supabaseServer);

describe("addAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success when the insert succeeds", async () => {
    const insert = vi.fn().mockResolvedValue({ data: [{ id: "log-1" }], error: null });
    supabaseMock.from = vi.fn(() => ({ insert })) as MockFrom;

    const result = await addAuditLog({
      user_id: "user-1",
      action: "test_action",
      resource_type: "test",
      resource_id: "1",
      details: "Testing audit log",
    });

    expect(result).toEqual({ success: true, data: [{ id: "log-1" }] });
    expect(supabaseMock.from).toHaveBeenCalledWith("audit_logs");
  });

  it("skips audit logging when the audit table is missing", async () => {
    const insert = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "Could not find the table 'public.audit_logs'" },
    });
    supabaseMock.from = vi.fn(() => ({ insert })) as MockFrom;

    const result = await addAuditLog({
      user_id: "user-1",
      action: "missing_table",
    });

    expect(result).toEqual({ success: false, skipped: true });
  });

  it("returns an error object when the insert fails for another reason", async () => {
    const error = { code: "PGRST000", message: "Unexpected error" };
    const insert = vi.fn().mockResolvedValue({ data: null, error });
    supabaseMock.from = vi.fn(() => ({ insert })) as MockFrom;

    const result = await addAuditLog({
      user_id: "user-1",
      action: "bad_action",
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
  });
});