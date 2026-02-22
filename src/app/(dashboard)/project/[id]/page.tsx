'use client';

import { projects as projectsApi, tasks as tasksApi } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TaskList from '@/components/TaskList';
import { ProjectPageSkeleton, TaskListSkeleton } from '@/components/Skeleton';
import ViewSwitcher from '@/components/ViewSwitcher';
import { useViewPreference } from '@/hooks/useViewPreference';
import { useTaskStore } from '@/contexts/TaskStoreContext';

export default function ProjectPage() {
  const params = useParams();
  const projectId = parseInt(params.id as string);
  const [project, setProject] = useState<{ id: number; name: string; color: string | null } | null>(null);
  const { loadTasksForView, getTasks, loading } = useTaskStore();
  const [view, setView] = useViewPreference(`project:${projectId}`);

  const loadProject = useCallback(async () => {
    try {
      const res = await projectsApi.get(projectId);
      setProject(res.data);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  }, [projectId]);

  const fetchProjectTasks = useCallback(
    () => tasksApi.list({ project_id: projectId }).then((r) => r.data),
    [projectId]
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    loadTasksForView(`project:${projectId}`, fetchProjectTasks);
  }, [loadTasksForView, projectId, fetchProjectTasks]);

  const tasks = getTasks();

  if (!project) {
    return <ProjectPageSkeleton />;
  }

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: project.color || '#94a3b8' }}
            />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
              )}
            </div>
          </div>
          <ViewSwitcher view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        {loading && tasks.length === 0 ? (
          <TaskListSkeleton />
        ) : (
          <TaskList tasks={tasks} projectId={projectId} view={view} />
        )}
      </div>
    </div>
  );
}
