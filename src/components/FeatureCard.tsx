import { type LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) => {
  return (
    <div
      className="group h-full rounded-lg border border-border bg-card p-4 sm:p-5 card-shadow transition-all duration-200 hover:border-primary/30 hover:card-shadow-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15 sm:mb-4 sm:h-11 sm:w-11">
        <Icon className="h-4.5 w-4.5 text-primary sm:h-5 sm:w-5" />
      </div>
      <h3 className="mb-1.5 font-heading text-base font-bold leading-snug text-foreground sm:mb-2 sm:text-lg">
        {title}
      </h3>
      <p className="text-sm leading-5 text-muted-foreground sm:leading-6">{description}</p>
    </div>
  );
};

export default FeatureCard;
