import type { MouseEventHandler } from "react";
import { COLORS } from "@/src/lib/ui-constants";

type CategoryCardProps = {
  categoria: string;
  count: number;
  color: { bg: string; text: string };
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export function CategoryCard({ categoria, count, color, onClick }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl border bg-white p-6 transition-all duration-200 hover-lift shadow-soft hover:shadow-medium"
      style={{ borderColor: COLORS.cardBg }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl hover-scale"
          style={{ backgroundColor: color.bg }}
        >
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="1" width="10" height="14" rx="1.5" stroke={color.text} strokeWidth="1.3" />
            <path d="M5 6h6M5 9h6M5 12h4" stroke={color.text} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12 1v5h4" stroke={color.text} strokeWidth="1.3" />
          </svg>
        </div>
        <span className="text-3xl font-bold" style={{ color: COLORS.primary }}>{count}</span>
      </div>

      <p className="text-base font-semibold mb-1" style={{ color: COLORS.primary }}>{categoria}</p>
      <p className="text-sm text-slate-600 mb-4">
        {count} painel{count !== 1 ? "s" : ""} disponível{count !== 1 ? "s" : ""}
      </p>
      <div className="border-t pt-3" style={{ borderColor: "#f1f5f9" }}>
        <span className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          Ver painéis →
        </span>
      </div>
    </button>
  );
}
