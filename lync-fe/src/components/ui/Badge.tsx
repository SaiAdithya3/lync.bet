import { type HTMLAttributes } from "react";
import { clsx } from "clsx";

type BadgeVariant = "default" | "yes" | "no" | "primary" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.06] text-muted-foreground",
  yes: "bg-yes/15 text-yes-muted",
  no: "bg-no/15 text-no-muted",
  primary: "bg-primary-500/15 text-primary-200",
  muted: "bg-white/[0.06] text-muted-foreground",
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
