import { buildStorageDownloadUrl, buildStorageProxyUrl } from "./storage";

describe("buildStorageProxyUrl", () => {
  it("builds an internal proxy URL for storage files", () => {
    expect(buildStorageProxyUrl("documentos", "equipments/123/file.pdf")).toBe(
      "/api/storage?type=proxy&bucket=documentos&path=equipments%2F123%2Ffile.pdf"
    );
  });
});

describe("buildStorageDownloadUrl", () => {
  it("builds an authenticated proxy URL with attachment disposition", () => {
    expect(buildStorageDownloadUrl("documentos", "equipments/123/file.pdf", "Arquivo final.pdf")).toBe(
      "/api/storage?type=proxy&bucket=documentos&path=equipments%2F123%2Ffile.pdf&disposition=attachment&filename=Arquivo+final.pdf"
    );
  });
});
