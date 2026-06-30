import React from "react";
import { BackButton } from "@/components/BackButton";

type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backOnClick?: () => void;
  backLabel?: string;
};

export function PageHeader({ title, subtitle, actions, backHref, backOnClick, backLabel = "Voltar" }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {(backHref || backOnClick) && (
            <BackButton href={backHref} onClick={backOnClick} label={backLabel} className="mb-4" />
          )}
          <div>{typeof title === "string" ? <h1 className="text-3xl font-bold text-gov-heading">{title}</h1> : title}</div>
          {subtitle ? <div className="mt-2 text-base text-slate-600">{subtitle}</div> : null}
        </div>

        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

export default PageHeader;
