const fs = require("fs");
const path = require("path");
const filePath = path.join(process.cwd(), "src", "lib", "inventario.ts");
let content = fs.readFileSync(filePath, "utf8");
const replacements = [
  ["assetType: 'NE'", "assetType: 'MPO'"],
  ["assetType: 'NF'", "assetType: 'MGI'"],
  ["assetType: 'MK3'", "assetType: 'MF'"],
  ["assetType: 'MPU'", "assetType: 'ME'"],
  ["Bianca Andriol de Moura Gumaraes", "Bianca Andrioli de Moura Guimar�es"],
  ["Elaine Maria da Silva Barrera", "Elayne Maria da Silva Batista"],
  ["Gustavo Andrade Brueggemann", "Gustavo Andrade Bruzzeguez"],
  ["Patricia Daniele Oliveira de Alancao", "Patr�cia Daniele Oliveira de Alarc�o"],
  ["Debora Lopez Ferrera Saldanha / Exelton Souza de Oliveira", "D�bora Lopes Ferreira Saldanha / Eveilton Souza de Oliveira"],
  ["Rafael Boen Souza Silva", "Rafael Ibsen Souza Silva"],
  ["Alvaro Jose de Andrade Carnaeiro / Henrique Eri Chaguim Nagacawa", "�lvaro Jos� de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa"],
  ["Leonardo Delia Justinia do Nascimento", "Leonardo Della Justina do Nascimento"],
  ["Tamila Prylpnie Fernandez De Brito Lima / Luis Felipe Sextanozeros Pnro", "T�mila Rayane Esp�ndola De Brito Lima / Luiz Felipe Bertassoni Pinto"],
  ["Luis Felipe Sextanzoros Pnro", "Luiz Felipe Bertassoni Pinto"],
  ["Dianmy Rocha Mera dos Santos", "Dienny Rocha Meira dos Santos"],
  ["Eduardo do Nascimento Suarvi", "Eduardo do Nascimento Stuani"],
  ["Arthur Miguel Oliveira Almeida Alves / Matheus Gomes de Lima", "Arthur Miguel Oliveira Almeida Aros / Matheus Gomes de Lima"],
  ["Winiculas Soares Silva", "Vin�cius Soares Jovito"],
  ["Winiculas Soares Souza / Eduardo do Nascimento Suarvi", "Vin�cius Soares Jovito / Eduardo do Nascimento Stuani"],
  ["Winiculas Soares Jocito / Eduardo do Nascimento Suarvi", "Vin�cius Soares Jovito / Eduardo do Nascimento Stuani"],
  ["Bruno Henrique Bernandez Innocencio", "Bruno Henrique Bernardes Innocencio"],
  ["Jorge Toufe Arbeu", "Jorge Toufic Arbex"],
  ["Carla Maria Pnro Nunues de Souza", "Carla Maria Pinto Nunes de Souza"],
  ["Andrine Gongravesl Soares / Hispas Rosa da Oliveira", "Andrine Gon�alves Soares / H�lquias Rosa de Oliveira"],
  ["Carla Cristina Araupo", "Carla Cristina Araujo"],
  ["Lilian Chaves Malur Fauda", "Lilian Chaves Maluf Fauda"],
  ["Thalr Luiza Magnapo / Geovana Sena Aguari", "Thais Luna Magnago / Geovana Sena Aguiar"],
  ["Marcos Sebatian Alaina", "Marcos Sebastian Alsina"],
  ["Winicias Veronezze Dos Reis Coins", "Vinicius Veronezze dos Reis Costa"],
  ["Mindep�sito IFEA", "Minidep�sito IPEA"],
  ["Sem usuario alocado", "Sem usu�rio alocado"],
  ["Andre Luiz Rodriques", "Andr� Luiz Rodrigues"],
  ["Luiz Felipe Vandamani Gomes", "Luiz Felipe Vendramini Gomes"],
  ["Gustavo Andrade Bruzzeguez", "Gustavo Andrade Bruzzeguez"]
];
for (const [search, replace] of replacements) {
  while (content.includes(search)) {
    content = content.replace(search, replace);
  }
}
fs.writeFileSync(filePath, content, "utf8");
console.log("Replacements applied");
