export interface EquipmentItem {
  id: number;
  type: 'Monitor' | 'Desktop' | 'Notebook' | 'Licença';
  serial_number?: string;
  model: string;
  assetType: string;
  assetId: string;
  macIp?: string;
  equipmentId?: string;
  bios?: string;
  responsible: string;
  allocatedUser?: string;
  legalResponsible?: string;
  sector: string;
  subsector?: string;
  warranty?: string;
  equipmentState?: string;
  notes?: string;
  seiProcessNumber?: string;
}

export interface InventoryStats {
  totalItems: number;
  byType: {
    monitor: number;
    desktop: number;
    notebook: number;
    license: number;
  };
  bySector: {
    [key: string]: number;
  };
}
