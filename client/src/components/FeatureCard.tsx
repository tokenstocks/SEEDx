import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-8 text-center hover-elevate">
      <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-3" data-testid={`text-feature-title-${title}`}>{title}</h3>
      <p className="text-muted-foreground" data-testid={`text-feature-desc-${title}`}>{description}</p>
    </Card>
  );
}
