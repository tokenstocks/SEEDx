import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  header?: React.ReactNode;
}

export function GlassCard({ children, className, title, description, header }: GlassCardProps) {
  return (
    <Card className={cn("bg-white/5 border-white/10 backdrop-blur-sm", className)}>
      {(title || description || header) && (
        <CardHeader>
          {header}
          {title && <CardTitle className="text-white">{title}</CardTitle>}
          {description && <CardDescription className="text-slate-400">{description}</CardDescription>}
        </CardHeader>
      )}
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}

interface GlassCardItemProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
  testId?: string;
}

export function GlassCardItem({ children, className, selected, onClick, testId }: GlassCardItemProps) {
  return (
    <div
      className={cn(
        "p-4 border rounded-lg",
        selected
          ? "bg-white/10 border-emerald-500/50"
          : "bg-white/5 border-white/10",
        onClick && "cursor-pointer hover-elevate",
        className
      )}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
