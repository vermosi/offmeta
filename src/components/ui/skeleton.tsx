import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "text" | "avatar" | "button";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variantClasses = {
    default: "bg-muted",
    card: "bg-muted rounded-xl",
    text: "bg-muted h-4 rounded",
    avatar: "bg-muted rounded-full",
    button: "bg-muted h-9 rounded-lg",
  };

  return (
    <div 
      className={cn(
        "shimmer animate-pulse", 
        variantClasses[variant],
        className
      )} 
      {...props} 
    />
  );
}

// Pre-built skeleton components for common patterns
function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3 animate-in">
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2 h-3" />
        </div>
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton variant="button" className="flex-1" />
        <Skeleton variant="button" className="w-20" />
      </div>
    </div>
  );
}

function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 animate-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Skeleton variant="avatar" className="h-8 w-8" />
          <div className="flex-1 space-y-1.5">
            <Skeleton variant="text" className="w-2/3" />
            <Skeleton variant="text" className="w-1/3 h-3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton({ count = 8, cols = 4 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="animate-in"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <Skeleton className="aspect-[3/4] rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          className={i === lines - 1 ? "w-2/3" : "w-full"}
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}

export { Skeleton, CardSkeleton, ListSkeleton, GridSkeleton, TextBlockSkeleton };