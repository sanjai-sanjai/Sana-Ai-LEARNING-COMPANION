import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function GradientButton({
  children,
  className,
  type = "submit",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        "gradient-primary shadow-soft inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px] px-6 text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}
