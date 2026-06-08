const s = 'S├úri';
const map = { '├': [0xc3], '┬': [0xc3, 0xc2] };
function utf8LegacyCandidates(value) {
  let byteSequences = [[]];

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const leadBytes = map[char];

    if (leadBytes && i + 1 < value.length) {
      const nextChar = value[i + 1];
      const nextByte = nextChar.charCodeAt(0) & 0xff;
      const nextSequences = [];

      for (const sequence of byteSequences) {
        for (const leadByte of leadBytes) {
          nextSequences.push([...sequence, leadByte, nextByte]);
        }
      }

      byteSequences = nextSequences;
      i += 1;
      continue;
    }

    const rawByte = value[i].charCodeAt(0) & 0xff;
    for (const sequence of byteSequences) {
      sequence.push(rawByte);
    }
  }

  return byteSequences.map((sequence) => Uint8Array.from(sequence));
}

function decode(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

const candidates = utf8LegacyCandidates(s);
console.log(candidates.length, candidates.map((b) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join(' ')).join(' || '));
console.log(candidates.map(decode).join(' || '));
