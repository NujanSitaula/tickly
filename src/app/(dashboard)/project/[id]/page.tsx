'use client';

import { projects as projectsApi, tasks as tasksApi, type Task } from '@/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import TaskList from '@/components/TaskList';
import ViewSwitcher from '@/components/ViewSwitcher';
import { useViewPreference } from '@/hooks/useViewPreference';

export default function ProjectPage() {
  const params = useParams();
  const projectId = parseInt(params.id as string);
  const [project, setProject] = useState<{ id: number; name: string; color: string | null } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [view, setView] = useViewPreference(`project:${projectId}`);

  const loadProject = useCallback(async () => {
    try {
      const res = await projectsApi.get(projectId);
      setProject(res.data);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    setRefreshing(true);
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    try {
      const res = await tasksApi.list({ project_id: projectId });
      setTasks(res.data);
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadTasks();
  }, [loadProject, loadTasks]);

  // Listen for task added event from modal
  useEffect(() => {
    function handleTaskAdded(e: Event) {
      const customEvent = e as CustomEvent<import('@/lib/api').Task | undefined>;
      const newTask = customEvent.detail;
      
      // If we have the task data and it belongs to this project, add it optimistically
      if (newTask && newTask.project_id === projectId) {
        setTasks((prev) => [newTask, ...prev]);
      } else if (newTask && newTask.project_id !== projectId) {
        // Task was added to a different project, no need to refresh
        return;
      } else {
        // Fallback to refetch if no task data
        loadTasks();
      }
    }
    window.addEventListener('taskAdded', handleTaskAdded);
    return () => window.removeEventListener('taskAdded', handleTaskAdded);
  }, [loadTasks, projectId]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading project…</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: project.color || '#94a3b8' }}
            />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              {refreshing && !loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-muted-foreground/40 border-r-transparent" />
              )}
            </div>
          </div>
          <ViewSwitcher view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="px-8 py-6">
        {loading && tasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading tasks…</p>
          </div>
        ) : (
          <TaskList tasks={tasks} projectId={projectId} onTaskUpdate={loadTasks} view={view} />
        )}
      </div>
    </div>
  );
}
