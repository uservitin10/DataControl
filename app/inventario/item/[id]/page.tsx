import InventoryDetail from "@/components/inventario/InventoryDetail";
import { equipmentData } from "@/lib/inventario";
import { notFound } from "next/navigation";

type Props = {
  params: {
    id: string;
  };
};

export default async function ItemPage({ params }: Props) {
  const resolvedParams = await params as { id?: string };
  const id = Number(resolvedParams.id ?? "");
  const item = equipmentData.find((i) => Number(i.id) === id) ?? null;

  if (!item) {
    return notFound();
  }

  return (
    <div className="p-6">
      <InventoryDetail item={item} />
    </div>
  );
}
