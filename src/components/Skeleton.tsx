'use client';

/**
 * Base skeleton primitive – responsive, uses animate-pulse.
 * Use className for size (e.g. h-4 w-32, h-20 w-full).
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className ?? ''}`.trim()}
      aria-hidden
      {...props}
    />
  );
}

/** Page header skeleton: icon + title (+ optional subtitle / actions). Matches task-list and project headers. */
export function PageHeaderSkeleton({
  hasSubtitle,
  hasActions = true,
  hasColorDot = false,
}: {
  hasSubtitle?: boolean;
  hasActions?: boolean;
  hasColorDot?: boolean;
}) {
  return (
    <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {hasColorDot && (
            <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
          )}
          {!hasColorDot && (
            <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
          )}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-40 sm:w-48" />
            {hasSubtitle && (
              <Skeleton className="h-4 w-28" />
            )}
          </div>
        </div>
        {hasActions && (
          <Skeleton className="h-9 w-24 rounded-lg" />
        )}
      </div>
    </div>
  );
}

/** Single task row skeleton – matches TaskItem layout (handle, checkbox, title, meta). */
function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-full max-w-[220px] sm:max-w-[280px]" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** Task rows only (no page padding) – for embedding in cards/sections. */
export function TaskRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <TaskRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full task list content skeleton – N rows. Matches TaskList container. */
export function TaskListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <TaskRowsSkeleton rows={rows} />
    </div>
  );
}

/** Task list page: header + task list skeleton. Use for inbox, today, upcoming, project. */
export function TaskListPageSkeleton({
  hasSubtitle,
  hasColorDot = false,
  rows = 6,
}: {
  hasSubtitle?: boolean;
  hasColorDot?: boolean;
  rows?: number;
}) {
  return (
    <div className="h-full">
      <PageHeaderSkeleton hasSubtitle={hasSubtitle} hasColorDot={hasColorDot} />
      <TaskListSkeleton rows={rows} />
    </div>
  );
}

/** Completed page content only: date groups with task rows (header shown by page). */
export function CompletedContentSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 space-y-6">
      {[1, 2].map((group) => (
        <div key={group}>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="rounded-lg border border-border overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <TaskRowSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Notes list content: tabs + note cards grid (header shown by page). Use inside a padded container. */
export function NotesContentSkeleton() {
  return (
    <div>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-background p-4 space-y-2"
          >
            <Skeleton className="h-4 max-w-[75%]" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Calendar page content: tabs + month strip + task list (header shown by page). */
export function CalendarContentSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="rounded-lg border border-border overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <TaskRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Generic page: header + content blocks. For search, help, filters, settings. */
export function GenericPageSkeleton({ contentBlocks = 3 }: { contentBlocks?: number }) {
  return (
    <div className="h-full">
      <PageHeaderSkeleton hasActions={false} />
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 space-y-4">
        {Array.from({ length: contentBlocks }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Project page while project is loading: header placeholder + task list skeleton. */
export function ProjectPageSkeleton() {
  return (
    <div className="h-full">
      <PageHeaderSkeleton hasColorDot hasActions />
      <TaskListSkeleton rows={5} />
    </div>
  );
}

/** Dashboard shell while auth/initial load: sidebar strip + main content area. */
export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      <div className="hidden w-14 shrink-0 border-r border-border lg:block" aria-hidden>
        <div className="flex flex-col gap-2 p-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-lg" />
          ))}
        </div>
      </div>
      <main className="min-h-0 flex-1 flex flex-col">
        <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
          </div>
        </div>
        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <TaskRowsSkeleton rows={6} />
        </div>
      </main>
    </div>
  );
}
