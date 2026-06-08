import { describe, expect, it } from "vitest";
import { fixLegacyEncoding, sanitizeText } from "./text";

describe("text sanitization", () => {
  it("fixes Latin1-encoded UTF-8 mojibake", () => {
    expect(fixLegacyEncoding("MÃ©")).toBe("Mé");
    expect(fixLegacyEncoding("JosÃ©")).toBe("José");
  });

  it("fixes legacy box-drawing mojibake sequences", () => {
    expect(sanitizeText("Jos├©")).toBe("José");
    expect(sanitizeText("S├úri")).toBe("Súri");
    expect(sanitizeText("Mar├ília")).toBe("Marília");
    expect(sanitizeText("Jo┬£o")).toBe("João");
    expect(sanitizeText("Gon├ºalves")).toBe("Gonçalves");
    expect(sanitizeText("Mendon├ºa")).toBe("Mendonça");
    expect(sanitizeText("Guimar├£es")).toBe("Guimarães");
    expect(sanitizeText("dep├³sito")).toBe("depósito");
    expect(sanitizeText("minidep├³sito")).toBe("minidepósito");
    expect(sanitizeText("At├©")).toBe("Até");
    expect(sanitizeText("Euz├©bio")).toBe("Euzébio");
    expect(sanitizeText("Maur├ácio Rodrigues Pereira")).toBe("Maurício Rodrigues Pereira");
    expect(sanitizeText("usu├ário")).toBe("usuário");
  });

  it("does not change clean text", () => {
    expect(sanitizeText("Victor Fernandes")).toBe("Victor Fernandes");
    expect(sanitizeText(""))
      .toBe("");
  });
});
