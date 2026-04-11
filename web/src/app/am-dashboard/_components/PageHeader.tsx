import type React from "react";

export function PageHeader(props: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {props.title}
        </h1>
        {props.description ? (
          <p className="text-sm text-muted-foreground md:text-base">{props.description}</p>
        ) : null}
        {props.right ? <div className="pt-1">{props.right}</div> : null}
      </div>
      {props.actions ? <div className="flex items-center gap-2">{props.actions}</div> : null}
    </div>
  );
}
