import { cn } from "@/lib/utils";

interface DarkTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "tertiary";
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const variantClasses = {
  primary: "text-white",
  secondary: "text-slate-400",
  tertiary: "text-slate-500",
};

export function DarkText({ 
  children, 
  className, 
  variant = "primary",
  as: Component = "p" 
}: DarkTextProps) {
  return (
    <Component className={cn(variantClasses[variant], className)}>
      {children}
    </Component>
  );
}
