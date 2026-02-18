'use client';

import { useAuth } from '@/contexts/AuthContext';
import { projects as projectsApi, type Project } from '@/lib/api';
import { websocket } from '@/lib/websocket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AddTaskModal from '@/components/AddTaskModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadProjects();
      // Initialize WebSocket connection
      websocket.init(user.id);
    }
    return () => {
      websocket.disconnect();
    };
  }, [user]);

  // Keyboard shortcut: 't' to open Add Task modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only trigger if 't' is pressed and user is not typing in an input/textarea
      if (
        e.key.toLowerCase() === 't' &&
        document.activeElement &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        !(document.activeElement as HTMLElement).isContentEditable
      ) {
        // Don't trigger if a modifier key is pressed (e.g., Ctrl+T)
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setAddTaskOpen(true);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function loadProjects() {
    try {
      const res = await projectsApi.list();
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        projects={projects}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onProjectsChange={loadProjects}
        onOpenAddTask={() => setAddTaskOpen(true)}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onTaskAdded={(task) => {
          loadProjects();
          // Notify children to refresh with the created task data
          window.dispatchEvent(new CustomEvent('taskAdded', { detail: task }));
        }}
      />
    </div>
  );
}
