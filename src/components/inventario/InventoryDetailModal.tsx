"use client";

import React, { useEffect } from "react";
import InventoryDetail from "./InventoryDetail";
import type { EquipmentItem } from "@/types/inventario";

type Props = {
  item: EquipmentItem | null;
  open: boolean;
  onClose: () => void;
};

export default function InventoryDetailModal({ item, open, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ativo #{item.id}</h2>
          <button onClick={onClose} className="gov-button-secondary-dark rounded px-3 py-1 text-sm">Fechar</button>
        </div>
        <div className="mt-4">
          <InventoryDetail item={item} />
        </div>
      </div>
    </div>
  );
}
