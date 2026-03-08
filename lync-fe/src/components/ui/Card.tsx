import { type HTMLAttributes } from "react";
import { clsx } from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({ padding = "md", className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-card border border-border rounded-xl",
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  );
}
