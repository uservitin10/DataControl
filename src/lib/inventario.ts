import type { EquipmentItem } from '@/types/inventario';
import inventarioData from '@/data/inventario.json';

const mpoParkInventorySpec = [
  { sector: 'SAGE', model: 'Daten / DC6A-S', count: 28 },
];

const existingEquipmentItems = inventarioData as EquipmentItem[];
const highestInventoryId = Math.max(0, ...existingEquipmentItems.map((item) => item.id ?? 0));

const mpoParkEquipment: EquipmentItem[] = [];
let nextInventoryId = highestInventoryId + 1;

for (const spec of mpoParkInventorySpec) {
  for (let index = 0; index < spec.count; index += 1) {
    mpoParkEquipment.push({
      id: nextInventoryId,
      type: 'Desktop',
      model: spec.model,
      assetType: 'MPO',
      assetId: '',
      equipmentId: '',
      macIp: '',
      sector: spec.sector,
      responsible: '',
      allocatedUser: '',
      warranty: '',
      equipmentState: '',
      notes: 'Parque computacional MPO (Bloco K)',
    });
    nextInventoryId += 1;
  }
}

export const equipmentData: EquipmentItem[] = [
  ...existingEquipmentItems,
  ...mpoParkEquipment,
];

export { mpoParkEquipment };

export function normalizeType(type?: string): string {
  return (type ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isLicenseType(type?: string): boolean {
  return normalizeType(type) === "licenca";
}

export function isActiveLicense(item: {
  type: string;
  equipmentState?: string;
}): boolean {
  return (
    isLicenseType(item.type) &&
    ["Ativa", "ativo"].includes((item.equipmentState ?? "").toLowerCase())
  );
}

export type WarrantyExpiryStatus = {
  expiryDate: Date;
  daysUntilExpiry: number;
  status: "expired" | "expiring" | "ok";
};

export function parseWarrantyExpiryDate(rawValue?: string | null): Date | null {
  const value = (rawValue ?? "").toString().trim();
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  const patterns = [
    { regex: /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/ },
    { regex: /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/ },
    { regex: /^(\d{1,2})[-\/](\d{4})$/ },
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern.regex);
    if (!match) continue;

    let year = 0;
    let month = 0;
    let day = 1;

    if (match.length === 4) {
      if (match[1].length === 4) {
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
      } else {
        const first = Number(match[1]);
        const second = Number(match[2]);
        const third = Number(match[3]);
        if (second >= 1 && second <= 12) {
          day = first;
          month = second;
          year = third;
        } else {
          day = second;
          month = first;
          year = third;
        }
      }
    } else if (match.length === 3) {
      month = Number(match[1]);
      year = Number(match[2]);
      day = 1;
    }

    if (month >= 1 && month <= 12 && year >= 1900 && day >= 1 && day <= 31) {
      const itemDate = new Date(year, month - 1, day);
      if (!Number.isNaN(itemDate.getTime())) {
        return itemDate;
      }
    }
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

export function getWarrantyExpiryStatus(rawValue?: string | null, thresholdDays = 30): WarrantyExpiryStatus | null {
  const expiryDate = parseWarrantyExpiryDate(rawValue);
  if (!expiryDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const status = daysUntilExpiry < 0 ? "expired" : daysUntilExpiry <= thresholdDays ? "expiring" : "ok";

  return {
    expiryDate: expiry,
    daysUntilExpiry,
    status,
  };
}

export function normalizeSectorName(sector?: string): string {
  const rawValue = sector?.toString() ?? "";
  const decodedValue = (() => {
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  })();

  return decodedValue
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/%20/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSemSetorValue(sector?: string): boolean {
  const normalized = normalizeSectorName(sector);
  return normalized === "sem setor" || normalized === "se setor" || normalized === "semsetor";
}

export function getAllSectors(): string[] {
  const sectorMap = new Map<string, string>();

  equipmentData.forEach((item) => {
    const normalized = normalizeSectorName(item.sector);
    const original = (item.sector ?? "").toString().trim();

    if (normalized && !sectorMap.has(normalized)) {
      sectorMap.set(normalized, original);
    }
  });

  const sectorNames = Array.from(sectorMap.values());

  if (equipmentData.some((item) => !normalizeSectorName(item.sector))) {
    sectorNames.push("Sem setor");
  }

  return sectorNames.sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
}

export function getLegalResponsible(sector?: string): string {
  const normalizedSector = sector?.toUpperCase() ?? "";

  if (["COTIC", "CONTB", "DIORC", "CGTCO"].includes(normalizedSector)) {
    return "Gustavo Andrade Bruzzeguez";
  }

  switch (normalizedSector) {
    case "CGEST":
      return "Ricardo de Assis Teixeira";
    case "COLOG":
      return "Patrícia Daniele Oliveira de Alarcão";
    case "COEFI":
      return "Dayene Cristine Peixoto";
    case "SAGE":
      return "Lorena Férrer Cavalcanti Randal Pompeu";
    case "AECI":
      return "Cesar Almeida de Meneses Silva";
    case "ASPAR":
      return "Paulo Eduardo Nunes de Moura Rocha";
    case "AESP":
    case "AREIN":
    case "AESP/AREIN":
      return "Marcelo Ribeiro Moreira";
    case "ASTAD":
      return "Waldir Antônio Gervásio";
    case "ASTEC":
      return "Carlene Guimarães de Souza";
    case "COGEP":
      return "Patricia de Oliveira Ribeiro";
    case "CONJUR":
      return "Jurandi Ferreira de Souza Neto";
    case "CORREGEDORIA":
      return "Nilton Carlos Jacintho Pereira";
    case "GM":
      return "Natalia Nogueira Pereira";
    case "OUVIDORIA":
      return "Carolina Palhares Lima";
    case "SMA":
      return "Mylene Greidinger Campos Coutinho";
    case "SEAID":
      return "Manuela de Azevedo Bezerra Vitor Ramos";
    case "SEAI":
      return "Sandro Eli Malcher de Alencar";
    case "SEPLAN":
      return "Giselle Aranha Farias";
    case "SOF":
      return "Leila Kuhnert Campos";
    default:
      return "-";
  }
}
