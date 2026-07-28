import { describe, expect, it } from "vitest";
import { buildStorageProxyUrl } from "./storage";

describe("buildStorageProxyUrl", () => {
  it("builds an internal proxy URL for storage files", () => {
    expect(buildStorageProxyUrl("documentos", "equipments/123/file.pdf")).toBe(
      "/api/storage?type=proxy&bucket=documentos&path=equipments%2F123%2Ffile.pdf"
    );
  });
});
