import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  variant?: "default" | "compact";
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  const align = props.align ?? "center";
  const variant = props.variant ?? "default";

  return (
    <header
      className={cn(
        "knob-page-header",
        align === "left" ? "text-left" : "text-center",
        props.className,
      )}
    >
      <h1
        className={cn(
          "knob-page-title",
          variant === "compact" && "knob-page-title--compact",
          props.titleClassName,
        )}
      >
        {props.title}
      </h1>
      {props.subtitle ? (
        <p className={cn("knob-page-subtitle", props.subtitleClassName)}>{props.subtitle}</p>
      ) : null}
    </header>
  );
}

