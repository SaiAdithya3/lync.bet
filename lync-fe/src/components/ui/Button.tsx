import { type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "yes" | "no" | "yesFilled" | "noFilled";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-500 hover:bg-primary-400 text-white border-transparent",
  secondary: "bg-card border border-border hover:bg-primary-900/30 text-white",
  outline: "border border-border hover:bg-card text-white",
  ghost: "hover:bg-white/10 text-white",
  yes: "border border-yes/40 bg-yes/10 text-yes hover:bg-yes/20",
  no: "border border-no/40 bg-no/10 text-no hover:bg-no/20",
  yesFilled: "bg-yes hover:bg-yes-muted text-white border-transparent",
  noFilled: "bg-no hover:bg-no-muted text-white border-transparent",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-full",
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-6 py-3 text-base rounded-full",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-neutral-bg disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
}
