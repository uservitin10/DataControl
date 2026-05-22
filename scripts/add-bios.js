const fs = require('fs');
const path = require('path');

const inventarioPath = path.resolve(__dirname, '../src/lib/inventario.ts');

if (!fs.existsSync(inventarioPath)) {
  console.error('Arquivo não encontrado:', inventarioPath);
  process.exit(1);
}

const mapping = [
  { q: 'Bianca Andrioli', v: "não precisa" },
  { q: 'Larissa Martins', v: "não precisa" },
  { q: 'Debora Lopes', v: 'feito' },
  { q: 'Eveilton', v: 'feito' },
  { q: 'Rafael Ibsen', v: 'feito' },
  { q: 'Alvaro Jose', v: 'feito' },
  { q: 'Henrique Eiti', v: 'feito' },
  { q: 'Lucas Matsued', v: 'feito' },
  { q: 'Leonardo Della Justina', v: 'feito' },
  { q: 'Luiz Felipe Bertassoni', v: 'feito' },
  { q: 'Paulo Henrique', v: 'feito' },
  { q: 'Vinicius Soares', v: 'feito' },
  { q: 'Bruno Henrique', v: 'feito' },
  { q: 'Carluska', v: 'feito' },
  { q: 'Rafael Saldanha', v: 'feito' },
  { q: 'Sem usuário alocado', v: 'feito' },
  { q: 'Diego Paulino', v: 'feito' },
  { q: 'Oscar Zuelter', v: 'feito' },
  { q: 'Carla Maria Pinto', v: 'feito' },
  { q: 'Fabiana Oda', v: 'feito' },
  { q: 'Disantido Uarlas', v: 'feito' },
  { q: 'Luiz Felipe Vendramini', v: 'feito' },
  { q: 'CGLCD', v: 'feito', bySector: true },
  { q: 'Joao Pedro Mendes', v: 'feito' },
  { q: 'Andrine Goncalves', v: 'feito' },
  { q: 'Hilquias', v: 'feito' },
  { q: 'Carla Cristina', v: 'feito' },
  { q: 'Eduardo Moura', v: 'feito' },
  { q: 'Lilian Chaves', v: 'feito' },
  { q: 'Matheus Mauricio', v: 'feito' },
  { q: 'Luciene', v: 'feito' },
  { q: 'Carolina Mouza', v: 'feito' },
  { q: 'Francisco Eusebio', v: 'feito' },
  { q: 'Martela Alves', v: 'feito' },
  { q: 'Thais Luna', v: 'feito' },
  { q: 'Geovana Sena', v: 'feito' },
  { q: 'Livre', v: 'feito' },
  { q: 'Marcos Sebastian', v: 'feito' },
  { q: 'Vinicius Veronezze', v: 'feito' },
  { q: 'Minideposito IPEA', v: 'não precisa' },
  { q: 'Problemas', v: 'feito' },
];

// create backup
const backupPath = inventarioPath + '.bios.bak';
fs.copyFileSync(inventarioPath, backupPath);
console.log('Backup criado em', backupPath);

let content = fs.readFileSync(inventarioPath, 'utf8');

// Helper: find object span starting from an index of '{'
function findObjectSpan(str, startIdx) {
  let depth = 0;
  let i = startIdx;
  for (; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i; // index of matching '}'
    }
  }
  return -1;
}

let cursor = 0;
let output = '';

while (true) {
  const typeIdx = content.indexOf("type: 'Desktop'", cursor);
  if (typeIdx === -1) {
    output += content.slice(cursor);
    break;
  }

  // find opening brace '{' before typeIdx
  const braceOpen = content.lastIndexOf('{', typeIdx);
  if (braceOpen === -1) {
    output += content.slice(cursor, typeIdx + 1);
    cursor = typeIdx + 1;
    continue;
  }

  const braceClose = findObjectSpan(content, braceOpen);
  if (braceClose === -1) {
    output += content.slice(cursor);
    break;
  }

  const objStr = content.slice(braceOpen, braceClose + 1);

  // determine responsible and sector
  const respMatch = objStr.match(/responsible:\s*'([^']*)'/);
  const sectorMatch = objStr.match(/sector:\s*'([^']*)'/);
  const responsible = respMatch ? respMatch[1] : '';
  const sector = sectorMatch ? sectorMatch[1] : '';

  let value = null;
  for (const map of mapping) {
    if (map.bySector) {
      if (sector && sector.includes(map.q)) { value = map.v; break; }
    } else {
      if (responsible && responsible.includes(map.q)) { value = map.v; break; }
    }
  }

  let modifiedObj = objStr;
  if (value && !/\bbios:\s*/.test(objStr)) {
    // insert before final }
    const beforeClose = objStr.slice(0, -1);
    modifiedObj = beforeClose + `, bios: '${value}'}`;
    console.log('Adicionando bios:', value, '->', responsible || sector);
  }

  output += content.slice(cursor, braceOpen) + modifiedObj;
  cursor = braceClose + 1;
}

fs.writeFileSync(inventarioPath, output, 'utf8');
console.log('Arquivo atualizado:', inventarioPath);

// Replace each object containing type: 'Desktop'
const objRegex = /\{[\s\S]*?type:\s*'Desktop'[\s\S]*?\}/gs;
let replaced = 0;
const newContent = content.replace(objRegex, (objStr) => {
  const respMatch = objStr.match(/responsible:\s*'([^']*)'/);
  const sectorMatch = objStr.match(/sector:\s*'([^']*)'/);
  const responsible = respMatch ? respMatch[1] : '';
  const sector = sectorMatch ? sectorMatch[1] : '';

  let value = null;
  for (const map of mapping) {
    if (map.bySector) {
      if (sector && sector.includes(map.q)) { value = map.v; break; }
    } else {
      if (responsible && responsible.includes(map.q)) { value = map.v; break; }
    }
  }

  if (value && !/\bbios:\s*/.test(objStr)) {
    replaced++;
    // insert before last closing brace
    const beforeClose = objStr.slice(0, -1);
    const modified = beforeClose + `, bios: '${value}'}`;
    console.log('Adicionando bios:', value, '->', responsible || sector);
    return modified;
  }

  return objStr;
});

fs.writeFileSync(inventarioPath, newContent, 'utf8');
console.log(`Arquivo atualizado: ${inventarioPath} (${replaced} objetos modificados)`);
