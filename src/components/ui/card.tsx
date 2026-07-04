import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div className={cn("glass rounded-2xl p-6", hover && "glass-hover", className)}>
      {children}
    </div>
  );
}
