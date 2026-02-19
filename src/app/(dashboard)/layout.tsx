'use client';

import { useAuth } from '@/contexts/AuthContext';
import { projects as projectsApi, type Project } from '@/lib/api';
import { websocket } from '@/lib/websocket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import AddTaskModal from '@/components/AddTaskModal';
import { useIsLg } from '@/hooks/useMediaQuery';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const isLg = useIsLg();

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
      {!isLg && (
        <header className="fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-foreground">Tickly</span>
          <button
            type="button"
            onClick={() => setAddTaskOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Add task"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>
      )}
      <Sidebar
        projects={projects}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onProjectsChange={loadProjects}
        onOpenAddTask={() => setAddTaskOpen(true)}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
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
