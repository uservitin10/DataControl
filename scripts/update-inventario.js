const fs = require('fs');
const path = require('path');

// ============================================================
// NÚMEROS DE SÉRIE CONFERIDOS (lista fornecida)
// ============================================================
const serialNumbers = [
  "9TDLF83",
  "CYDLF83",
  "5A463W96C",
  "FQHLF83",
  "58PLF83",
  "5A4636T40",
  "01047095010009",
  "6XSLF83",
  "9NBLF83",
  "GNSJ2XA000157",
  "GNSJ2XA003321",
  "GNSJ2XA000687",
  "01047510010031",
  "01047095010045",
  "D1WLF83",
  "FPDLF83",
  "01047095010008",
  "DW0LF83",
  "DX1LF83",
  "J1CLF83",
  "GNSJ2XA003114",
  "GNSJ2XA003256",
  "5A4636T2E",
  "GNSO8XA008982",
  "GNSO8XA008988",
  "01047510010016",
  "GNSO9XA014166",
  "GNSO9XA014169",
  "01047095010001",
  "GNSO9XA014156",
  "GNSO8XA009021",
  "GNSO8XA009661",
  "01047095010036",
  "GNSO8XA008984",
  "GNSOAXA001192",
  "01047510010019",
  "01047510010042",
  "FQDLF83",
  "FNNLF83",
  "GNSO9XA014167",
  "GNSO9XA014163",
  "01047510010039",
  "01047510010022",
  "9Q8LF83",
  "GG7LF83",
  "57GLF83",
  "GNSO8XA007148",
  "GNSO8XA009419",
  "GNSO8XA009431",
  "01047510010023",
  "01047095010038",
  "9QFLF83",
  "9RJLF83",
  "5GBLF83",
  "01047095010033",
  "9R7LF83",
  "9PFLF83",
  "GBPLF83",
  "GNSO8XA009008",
  "GNSO9XA014172",
  "01047510010014",
  "01047511010008",
  "GB1LF83",
  "5JSLF83",
  "401AZSP4N926",
  "01047095010012",
  "9PHLF83",
  "9S1LF83",
  "GNSO9XA014139",
  "GNSOAXA001109",
  "GNSOAXA001857",
  "01047095010035",
  "GNSO9XA009434",
  "GNSO8XA009656",
  "01047095010044",
  "01047095010023",
  "312AZKA85349",
  "401AZMG0J835",
  "GNSO8XA008999",
  "GNSO9XA015300",
  "GNSO9XA014168",
  "01047095010040",
  "GNSO9XA014161",
  "GNSOAXA001298",
  "01047510010048",
  "01047510010013",
  "312AZNK88807",
  "312AZUJ8R846",
  "01047510010028",
  "5JCLF83",
  "5WKLF83",
  "GNSO9XA014025",
  "GNSOAXA002184",
  "GNSOAXA002183",
  "01047510010035",
  "312AZRDBR878",
  "312AZAL4P200",
  "312AZVN3M143",
  "01047510010024",
  "401AZPU4N968",
  "312AZBZ3M117",
  "GNSO8XA008997",
  "GNSO8XA009424",
  "01047510010037",
  "GNSO8XA010454",
  "GNSO8XA009013",
  "GNSO8XA009001",
  "01047510010021",
  "GNSO9XA427",
  "GNSO8XA010451",
  "GNSO9XA015301",
  "01047095010007",
  "01047095010015",
  "301AZWS9R961",
  "401AZDB0H658",
  "312AZJT3M044",
  "01047095010034",
  "8PSLF83",
  "FSHLF83",
  "5HTLF83",
  "GNSO8XA009422",
  "GNSO8XA009430",
  "GNSO9XA014157",
  "01047510010003",
  "GNSO8XA008995",
  "GNSO8XA009433",
  "01047095010032",
  "01047095010050",
  "312AZWS8R873",
  "312AZKA3F829",
  "GNSO8XA008981",
  "GNSO8XA009651",
  "GNSO8XA009668",
  "01047510010025",
  "01047095010018",
  "301AZGFC5311",
  "312AZVN8R807",
  "01047510010014",
  "312AZHY88577",
  "312AZCQ3M075",
  "GNSOAXA002186",
  "GNSOAXA002180",
  "01047510010033",
  "GNSO9XA014165",
  "GNSO9XA014171",
  "01047511010026",
  "01047511010014",
  "301AZXC9R962",
  "312AZHY7S497",
  "5A463710Z",
  "01045653060112",
  "01047510010045",
  "01047511010031",
  "01047511010028",
  "01047511010011",
  "01047095010042",
  "89776029E",
];

// ============================================================
// Leitura e substituição em src/lib/inventario.ts
// ============================================================
const inventarioPath = path.resolve(__dirname, '../src/lib/inventario.ts');

if (!fs.existsSync(inventarioPath)) {
  console.error('❌ Arquivo inventario.ts não encontrado em:', inventarioPath);
  process.exit(1);
}

// Faz backup antes de alterar
const backupPath = inventarioPath + '.bak';
fs.copyFileSync(inventarioPath, backupPath);
console.log('🔖 Backup criado em', backupPath);

let content = fs.readFileSync(inventarioPath, 'utf-8');

const equipmentIdRegex = /equipmentId:\s*'([^']*)'/g;
const matches = [...content.matchAll(equipmentIdRegex)];

console.log(`\n📋 Total de equipmentIds encontrados no arquivo: ${matches.length}`);
console.log(`📋 Total de números de série fornecidos: ${serialNumbers.length}`);

if (matches.length !== serialNumbers.length) {
  console.warn(`\n⚠️  ATENÇÃO: A quantidade de equipmentIds no arquivo (${matches.length}) é diferente da lista fornecida (${serialNumbers.length}).`);
  console.warn('   O script vai substituir apenas até o menor dos dois valores.\n');
}

const totalToReplace = Math.min(matches.length, serialNumbers.length);
let updatedContent = content;
let offset = 0;

for (let i = 0; i < totalToReplace; i++) {
  const match = matches[i];
  const oldValue = match[1];
  const newValue = serialNumbers[i];
  const fullMatch = match[0];
  const newFullMatch = `equipmentId: '${newValue}'`;

  const matchStart = match.index + offset;
  const matchEnd = matchStart + fullMatch.length;

  updatedContent =
    updatedContent.slice(0, matchStart) +
    newFullMatch +
    updatedContent.slice(matchEnd);

  offset += newFullMatch.length - fullMatch.length;

  console.log(`  [${i + 1}] id antigo: "${oldValue}" → novo: "${newValue}"`);
}

fs.writeFileSync(inventarioPath, updatedContent, 'utf-8');

console.log(`\n✅ inventario.ts atualizado com sucesso! (${totalToReplace} equipmentIds substituídos)`);
