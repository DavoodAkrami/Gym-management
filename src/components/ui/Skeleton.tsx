type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <span className={`ui-skeleton ${className}`} aria-hidden="true" />;
}
