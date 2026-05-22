export interface EquipmentItem {
  id: number;
  type: 'Monitor' | 'Desktop' | 'Laptop';
  model: string;
  assetType: string;
  assetId: string;
  macIp?: string;
  equipmentId?: string;
  bios?: string;
  responsible: string;
  sector: string;
  notes?: string;
}

export interface InventoryStats {
  totalItems: number;
  byType: {
    monitor: number;
    desktop: number;
    laptop: number;
  };
  bySector: {
    [key: string]: number;
  };
}
