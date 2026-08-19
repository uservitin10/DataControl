import pool from "@/lib/db";
import { addAuditLog } from "./audit";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const poolQueryMock = pool.query as jest.Mock;

describe("addAuditLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success when the insert succeeds", async () => {
    poolQueryMock.mockResolvedValue({ rows: [{ id: "log-1" }] } as never);

    const result = await addAuditLog({
      user_id: "user-1",
      action: "test_action",
      resource_type: "test",
      resource_id: "1",
      details: "Testing audit log",
    });

    expect(result).toEqual({ success: true, data: { id: "log-1" } });
    expect(poolQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_logs"),
      ["user-1", "test_action", "test", "1", "Testing audit log", null]
    );
  });

  it("skips audit logging when the audit table is missing", async () => {
    poolQueryMock.mockRejectedValue(new Error('relation "audit_logs" does not exist'));

    const result = await addAuditLog({
      user_id: "user-1",
      action: "missing_table",
    });

    expect(result).toEqual({ success: false, skipped: true });
  });

  it("returns an error object when the insert fails for another reason", async () => {
    const error = new Error("Unexpected error");
    poolQueryMock.mockRejectedValue(error);

    const result = await addAuditLog({
      user_id: "user-1",
      action: "bad_action",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
  });
});
