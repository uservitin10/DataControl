import { resolveMinioPresignEndpoint } from "./minio";

describe("resolveMinioPresignEndpoint", () => {
  it("prefers the public endpoint when configured", () => {
    expect(resolveMinioPresignEndpoint({
      MINIO_ENDPOINT: "http://minio.internal:9000",
      MINIO_PUBLIC_URL: "https://files.example.gov.br/",
    })).toBe("https://files.example.gov.br");
  });

  it("falls back to the internal endpoint", () => {
    expect(resolveMinioPresignEndpoint({
      MINIO_ENDPOINT: "http://minio.internal:9000",
    })).toBe("http://minio.internal:9000");
  });
});