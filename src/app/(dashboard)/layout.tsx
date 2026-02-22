'use client';

import { useAuth } from '@/contexts/AuthContext';
import { TaskStoreProvider, useTaskStoreOptional } from '@/contexts/TaskStoreContext';
import { projects as projectsApi, type Project } from '@/lib/api';
import { websocket } from '@/lib/websocket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import AddTaskModal from '@/components/AddTaskModal';
import { DashboardLayoutSkeleton } from '@/components/Skeleton';
import FocusIndicatorsLoader from '@/components/FocusIndicatorsLoader';
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
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <TaskStoreProvider>
      <DashboardContent
        isLg={isLg}
        projects={projects}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        addTaskOpen={addTaskOpen}
        setAddTaskOpen={setAddTaskOpen}
        loadProjects={loadProjects}
      >
        {children}
      </DashboardContent>
    </TaskStoreProvider>
  );
}

function DashboardContent({
  isLg,
  projects,
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarOpen,
  setSidebarOpen,
  addTaskOpen,
  setAddTaskOpen,
  loadProjects,
  children,
}: {
  isLg: boolean;
  projects: Project[];
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  addTaskOpen: boolean;
  setAddTaskOpen: (v: boolean) => void;
  loadProjects: () => void;
  children: React.ReactNode;
}) {
  const taskStore = useTaskStoreOptional();

  return (
    <>
      <FocusIndicatorsLoader />
      <div className="fixed inset-0 flex overflow-hidden bg-background">
        {!isLg && (
        <header className="fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-foreground">Tickly</span>
          <button
            type="button"
            onClick={() => setAddTaskOpen(true)}
            className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
      <main id="main-content" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pt-14 lg:pt-0" tabIndex={-1}>{children}</main>
      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onTaskAdded={(task) => {
          loadProjects();
          if (task) taskStore?.addTask(task);
          window.dispatchEvent(new CustomEvent('taskAdded', { detail: task }));
        }}
      />
      </div>
    </>
  );
}
