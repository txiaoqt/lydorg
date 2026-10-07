import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  wrapActions?: boolean;
};

export const AdminPageHeader = ({ title, description, action, wrapActions = false }: AdminPageHeaderProps) => (
  <div className={`-mt-3 flex items-start justify-between gap-3 pb-2 pt-4 sm:-mt-6 lg:-mt-8 ${wrapActions ? "flex-col xl:flex-row" : ""}`}>
    <div className="flex flex-col gap-1">
      <h1 className="font-segoe text-[26px] font-semibold leading-[120%] tracking-[-0.02em] text-text-default">
        {title}
      </h1>
      <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-slate-500">{description}</p>
    </div>
    {action ? <div className={wrapActions ? "w-full xl:w-auto" : "shrink-0"}>{action}</div> : null}
  </div>
);
