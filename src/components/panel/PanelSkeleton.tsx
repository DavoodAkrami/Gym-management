import { Skeleton } from "@/components/ui/Skeleton";

export function PanelSkeleton() {
  return (
    <div className="panel-page-body">
      <header className="surface-panel mb-4 flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-28" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <aside className="surface-panel hidden w-64 shrink-0 p-4 lg:block">
          <Skeleton className="mb-4 h-3 w-16" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        </aside>

        <main className="panel-main-card surface-panel flex min-h-0 flex-1 flex-col">
          <div className="panel-main-header border-b border-border p-5 sm:p-7 sm:pb-5">
            <div className="flex items-start gap-4">
              <Skeleton className="size-11 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </div>
          </div>
          <div className="flex-1 p-5 sm:p-7">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
