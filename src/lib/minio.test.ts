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

  it("ignores blank public URLs and empty values", () => {
    expect(resolveMinioPresignEndpoint({
      MINIO_PUBLIC_URL: "   ",
      MINIO_ENDPOINT: "http://minio.internal:9000",
    })).toBe("http://minio.internal:9000");

    expect(resolveMinioPresignEndpoint({
      MINIO_PUBLIC_URL: "",
      MINIO_ENDPOINT: "",
    })).toBe("");
  });
});