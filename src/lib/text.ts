const LEGACY_TEXT_PATTERN = /[ÃÂÄÅÊËÎÏÔÕÛÜãõâêîôûáéíóúÁÉÍÓÚÇç├┤┬┴┼─┐└┌]/;
const UTF8_LEAD_BYTE_BY_BOX_CHAR: Record<string, number[]> = {
  "├": [0xc3],
  "┬": [0xc3, 0xc2],
};

const LEGACY_CONTINUATION_BYTE_CANDIDATES: Record<string, number[]> = {
  "¡": [0xad],
  "¿": [0xa8],
  "¢": [0xbd, 0x9b],
  "£": [0xa3, 0x9c],
  "¥": [0xbe, 0x9d],
  "«": [0xae],
  "»": [0xaf],
  "×": [0x9e],
  "│": [0xb3],
  "║": [0xba],
  "┐": [0xbf],
  "╗": [0xbb],
  "╝": [0xbc],
  "┤": [0xb4],
  "╣": [0xb9],
  "░": [0xb0],
  "▒": [0xb1],
  "▓": [0xb2],
  "©": [0xa9, 0xb8],
  "¬": [0xaa],
  "®": [0xa9],
  "¼": [0xac],
  "½": [0xab],
  "ª": [0xa6],
  "á": [0xa1, 0xa0],
  "à": [0x85],
  "â": [0xa2, 0x83],
  "ä": [0x84],
  "å": [0x86],
  "æ": [0x91],
  "Ç": [0x80],
  "é": [0xa9, 0x82],
  "è": [0x8a],
  "ê": [0xaa, 0x88],
  "ë": [0x89],
  "ƒ": [0x9f],
  "í": [0xad, 0xa1],
  "ì": [0x8d],
  "î": [0xae, 0x8c],
  "ï": [0x8b],
  "ñ": [0xa4],
  "º": [0xa7],
  "ó": [0xb3, 0xa2],
  "ò": [0x95],
  "ô": [0xb4, 0x93],
  "ö": [0x94],
  "ø": [0x9b],
  "ú": [0xba, 0xa3],
  "ù": [0x97],
  "û": [0xbb, 0x96],
  "ü": [0x81],
  "³": [0xb3],
  "ÿ": [0x98],
};

const LEGACY_EXACT_REPLACEMENTS: Record<string, string> = {
  "Jos├©": "José",
  "S├úri": "Súri",
  "Mar├ília": "Marília",
  "Jo┬£o": "João",
  "Gon├ºalves": "Gonçalves",
  "Mendon├ºa": "Mendonça",
  "Guimar├£es": "Guimarães",
  "dep├³sito": "depósito",
  "minidep├³sito": "minidepósito",
  "At├©": "Até",
  "Euz├©bio": "Euzébio",
  "Maur├ácio": "Maurício",
  "Usu├ário": "Usuário",
  "usu├ário": "usuário",
  "Andr├©": "André",
};

export function looksLikeLegacyEncodedText(value: string): boolean {
  return LEGACY_TEXT_PATTERN.test(value);
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function applyLegacyExactReplacements(value: string): string {
  let result = value;
  for (const [legacy, replacement] of Object.entries(LEGACY_EXACT_REPLACEMENTS)) {
    if (result.includes(legacy)) {
      result = result.replaceAll(legacy, replacement);
    }
  }
  return result;
}

function latin1Bytes(value: string): Uint8Array {
  return Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
}

function utf8LegacyCandidates(value: string): Uint8Array[] {
  let byteSequences: number[][] = [[]];

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const leadBytes = UTF8_LEAD_BYTE_BY_BOX_CHAR[char];

    if (leadBytes && i + 1 < value.length) {
      const nextChar = value[i + 1];
      const rawNextByte = nextChar.charCodeAt(0) & 0xff;
      const explicitCandidates = LEGACY_CONTINUATION_BYTE_CANDIDATES[nextChar] || [];
      const candidateNextBytes = new Set<number>([...explicitCandidates, rawNextByte]);

      const nextSequences: number[][] = [];
      for (const sequence of byteSequences) {
        for (const leadByte of leadBytes) {
          for (const nextByte of candidateNextBytes) {
            nextSequences.push([...sequence, leadByte, nextByte]);
          }
        }
      }

      byteSequences = nextSequences;
      i += 1;
      continue;
    }

    const rawByte = char.charCodeAt(0) & 0xff;
    for (const sequence of byteSequences) {
      sequence.push(rawByte);
    }
  }

  return byteSequences.map((sequence) => Uint8Array.from(sequence));
}

function tryFixLegacyEncoding(value: string): string {
  if (!looksLikeLegacyEncodedText(value)) {
    return value;
  }

  const candidates = [latin1Bytes(value), ...utf8LegacyCandidates(value)];

  for (const bytes of candidates) {
    const decoded = decodeUtf8(bytes);
    if (decoded && decoded !== value && !decoded.includes("�")) {
      return decoded;
    }
  }

  return value;
}

export function fixLegacyEncoding(value: string): string {
  if (!value || !looksLikeLegacyEncodedText(value)) {
    return value;
  }

  let decoded = value;
  for (let pass = 0; pass < 2; pass += 1) {
    const next = tryFixLegacyEncoding(decoded);
    if (!next || next === decoded) {
      break;
    }
    decoded = next;
  }

  return decoded;
}

export function sanitizeText(value: string): string {
  const rawValue = value || "";
  const exactFixed = applyLegacyExactReplacements(rawValue);
  if (exactFixed !== rawValue) {
    return exactFixed.trim();
  }

  return fixLegacyEncoding(rawValue).trim();
}
