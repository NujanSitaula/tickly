'use client';

import { useAuth } from '@/contexts/AuthContext';
import { projects as projectsApi, auth as authApi, type Project } from '@/lib/api';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  HelpCircle,
  Inbox,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useIsLg } from '@/hooks/useMediaQuery';
import LanguageSwitcher from './LanguageSwitcher';
import AddProjectModal from './AddProjectModal';
import { useTranslations } from 'next-intl';

interface SidebarProps {
  projects: Project[];
  collapsed: boolean;
  onToggle: () => void;
  onProjectsChange: () => void;
  onOpenAddTask: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ projects, collapsed, onToggle, onProjectsChange, onOpenAddTask, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLg = useIsLg();
  const effectiveExpanded = !collapsed || !isLg;
  const onMobileCloseRef = useRef(onMobileClose);
  onMobileCloseRef.current = onMobileClose;

  // Close drawer only when route changes (mobile/tablet), not on every render
  useEffect(() => {
    if (!isLg) {
      onMobileCloseRef.current?.();
    }
  }, [pathname, isLg]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [projectMenuOpenId, setProjectMenuOpenId] = useState<number | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<number>(4);
  const [editIcon, setEditIcon] = useState<string>('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const tSidebar = useTranslations('dashboard.sidebar');
  const tCommon = useTranslations('dashboard.common');
  const tDeletionReasons = useTranslations('dashboard.deletionReasons');
  const [selectedDeletionReason, setSelectedDeletionReason] = useState<
    'complicated' | 'missing_features' | 'other_tool' | 'cleanup' | 'other'
  >('complicated');
  const [missingFeatures, setMissingFeatures] = useState<string[]>(['']);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navItems = [
    { icon: Search, label: tSidebar('search'), href: '/search' },
    { icon: Inbox, label: tSidebar('inbox'), href: '/inbox', count: 0 },
    { icon: Calendar, label: tSidebar('today'), href: '/today', count: 0 },
    { icon: LayoutGrid, label: tSidebar('upcoming'), href: '/upcoming' },
    { icon: Filter, label: tSidebar('filtersLabels'), href: '/filters' },
    { icon: CheckCircle2, label: tSidebar('completed'), href: '/completed' },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const sortedProjects = [...projects].sort((a, b) => {
    const pa = a.priority ?? 4;
    const pb = b.priority ?? 4;
    if (pa !== pb) return pa - pb; // P1..P4
    const oa = (a as any).order ?? 0;
    const ob = (b as any).order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });

  const asideContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 shrink-0">
        {!isLg && onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <Link
          href="/"
          className={`flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-[width,opacity] duration-200 ease-out ${
            !effectiveExpanded ? 'w-0 flex-none opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="truncate text-lg font-semibold text-foreground">Tickly</span>
        </Link>
        {isLg && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-medium text-sm">
            {user?.name ? getInitials(user.name) : 'U'}
          </div>
          {effectiveExpanded && (
            <div className="relative flex-1">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <span className="truncate">{user?.name || 'User'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute left-0 top-full z-20 mt-2 w-48 rounded-lg border border-border bg-popover shadow-lg">
                    <div className="p-1">
                      <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                        {user?.email}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted transition-colors"
                      >
                        Sign out
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          setDeleteReason('');
                          setDeleteAccountError(null);
                          setShowDeleteAccount(true);
                        }}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete account
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Button */}
      <div className={`flex border-b border-border shrink-0 ${effectiveExpanded ? 'p-4' : 'justify-center px-3 py-3'}`}>
        <button
          onClick={onOpenAddTask}
          className={`flex h-10 items-center justify-center rounded-lg bg-primary py-2.5 text-primary-foreground transition-[width,padding] duration-200 ease-out hover:bg-primary/90 shrink-0 ${
            effectiveExpanded ? 'w-full gap-2 px-4' : 'w-10 gap-0 px-0'
          }`}
          title={!effectiveExpanded ? tCommon('addTask') : undefined}
        >
          <Plus className="h-5 w-5 shrink-0" />
          <span
            className={`overflow-hidden whitespace-nowrap text-sm font-medium transition-[opacity] duration-150 ease-out ${
              effectiveExpanded ? 'opacity-100' : 'w-0 min-w-0 opacity-0'
            }`}
          >
            {tCommon('addTask')}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/today' && pathname === '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={!effectiveExpanded ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {effectiveExpanded && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="text-xs text-muted-foreground">{item.count}</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Projects Section */}
        {effectiveExpanded && (
          <div className="mt-6 group/header">
            <div className="mb-2 flex items-center justify-between gap-1 px-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tSidebar('myProjects')}
              </h3>
              <span className="text-xs text-muted-foreground shrink-0">
                {projects.length}/∞
              </span>
              <button
                type="button"
                onClick={() => setShowAddProjectModal(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-100"
                aria-label="Add project"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              {sortedProjects.map((project) => {
                const isActive = pathname === `/project/${project.id}`;
                const taskCount = project.tasks_count ?? 0;
                return (
                  <div key={project.id} className="relative group/project">
                    <Link
                      href={`/project/${project.id}`}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: project.color || '#94a3b8',
                        }}
                      />
                      <span className="flex-1 min-w-0 truncate flex items-center gap-1">
                        {project.icon && (
                          <span className="inline-flex h-4 w-4 items-center justify-center text-xs leading-none shrink-0" aria-hidden="true">
                            {project.icon}
                          </span>
                        )}
                        <span className="truncate">{project.name}</span>
                      </span>
                      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                        <span className="text-xs text-muted-foreground tabular-nums transition-opacity group-hover/project:opacity-0">
                          {taskCount}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setProjectMenuOpenId(projectMenuOpenId === project.id ? null : project.id);
                          }}
                          className="absolute inset-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-opacity opacity-0 group-hover/project:opacity-100 pointer-events-none group-hover/project:pointer-events-auto"
                          aria-label="Project options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </span>
                    </Link>
                    {projectMenuOpenId === project.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setProjectMenuOpenId(null)}
                        />
                        <div
                          className="absolute right-2 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-popover shadow-lg transform transition duration-150 ease-out opacity-100 translate-y-0"
                        >
                          <div className="p-1">
                            <button
                              type="button"
                              onClick={() => {
                                setProjectMenuOpenId(null);
                                setEditingProject(project);
                                setEditName(project.name);
                                setEditColor(project.color ?? null);
                                setEditPriority(project.priority ?? 4);
                                setEditIcon(project.icon ?? '');
                              }}
                              className="w-full rounded-md px-3 py-2 text-left text-sm text-popover-foreground hover:bg-muted transition-colors"
                            >
                              Edit project details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProjectToDelete(project);
                                setDeleteConfirmName('');
                                setProjectMenuOpenId(null);
                              }}
                              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Delete project
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {showAddProjectModal && (
        <AddProjectModal
          open={showAddProjectModal}
          onClose={() => setShowAddProjectModal(false)}
          onSuccess={onProjectsChange}
          onNavigateToProject={(id) => router.push(`/project/${id}`)}
        />
      )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        {!effectiveExpanded ? (
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <HelpCircle className="h-5 w-5" />
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <Link
              href="/help"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              <span>{tSidebar('helpResources')}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        )}
      </div>

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[min(90vh,calc(100dvh-8rem))] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete project</h2>
            <p className="text-sm text-muted-foreground mb-4">
              To confirm, type the project name exactly:
              <span className="ml-1 font-mono text-foreground">#{projectToDelete.name}</span>
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Project name"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setProjectToDelete(null);
                  setDeleteConfirmName('');
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmName !== projectToDelete.name}
                onClick={async () => {
                  if (!projectToDelete) return;
                  try {
                    await projectsApi.delete(projectToDelete.id);
                    setProjectToDelete(null);
                    setDeleteConfirmName('');
                    onProjectsChange();
                    if (pathname === `/project/${projectToDelete.id}`) {
                      router.push('/inbox');
                    }
                  } catch (error) {
                    console.error('Failed to delete project:', error);
                  }
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[min(90vh,calc(100dvh-8rem))] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">Edit project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Project name"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editColor ?? '#94a3b8'}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-border bg-background"
                    />
                    <input
                      type="text"
                      value={editColor ?? ''}
                      onChange={(e) => setEditColor(e.target.value || null)}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="#RRGGBB"
                    />
                  </div>
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(Number(e.target.value) || 4)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={1}>P1</option>
                    <option value={2}>P2</option>
                    <option value={3}>P3</option>
                    <option value={4}>P4 (default)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Icon (emoji or short text)
                </label>
                <input
                  type="text"
                  value={editIcon}
                  maxLength={8}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. ✅, 📝"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProject(null);
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!editName.trim()}
                  onClick={async () => {
                    if (!editingProject) return;
                    try {
                      await projectsApi.update(editingProject.id, {
                        name: editName.trim(),
                        color: editColor || null,
                        priority: editPriority,
                        icon: editIcon.trim() || null,
                      });
                      setEditingProject(null);
                      onProjectsChange();
                    } catch (error) {
                      console.error('Failed to update project:', error);
                    }
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[min(90vh,calc(100dvh-8rem))] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">{tCommon('deleteAccountTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {tCommon('deleteAccountIntro')}
            </p>
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tCommon('deleteAccountReasonLabel')}
              </p>
              <div className="space-y-1">
                {[
                  { key: 'complicated', label: tDeletionReasons('complicated') },
                  { key: 'missing_features', label: tDeletionReasons('missing_features') },
                  { key: 'other_tool', label: tDeletionReasons('other_tool') },
                  { key: 'cleanup', label: tDeletionReasons('cleanup') },
                  { key: 'other', label: tDeletionReasons('other') },
                ].map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="delete-reason"
                      value={option.key}
                      checked={selectedDeletionReason === option.key}
                      onChange={() => setSelectedDeletionReason(option.key as any)}
                      className="h-3.5 w-3.5 border-border text-primary focus:ring-primary"
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {selectedDeletionReason === 'missing_features' && (
              <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tCommon('deleteAccountFeatureSectionTitle')}
                </p>
                <div className="space-y-2">
                  {missingFeatures.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const next = [...missingFeatures];
                          next[idx] = e.target.value;
                          setMissingFeatures(next);
                        }}
                        placeholder={tCommon('deleteAccountFeaturePlaceholder')}
                        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {missingFeatures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = missingFeatures.filter((_, i) => i !== idx);
                            setMissingFeatures(next.length ? next : ['']);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {tCommon('deleteAccountRemoveFeature')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMissingFeatures((prev) => [...prev, ''])}
                  className="mt-2 text-xs font-medium text-primary hover:text-primary/80"
                >
                  {tCommon('deleteAccountAddFeature')}
                </button>
              </div>
            )}
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-3"
              placeholder={tCommon('deleteAccountReasonPlaceholder')}
            />
            {deleteAccountError && (
              <p className="mb-3 text-sm text-red-600">
                {deleteAccountError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAccount(false);
                  setDeleteReason('');
                  setDeleteAccountError(null);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                {tCommon('deleteAccountCancel')}
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={async () => {
                  if (!selectedDeletionReason) {
                    setDeleteAccountError(tCommon('deleteAccountReasonError'));
                    return;
                  }
                  setDeletingAccount(true);
                  setDeleteAccountError(null);
                  try {
                    const reasonLabel = tDeletionReasons(selectedDeletionReason);
                    const parts: string[] = [];
                    parts.push(`Reason: ${reasonLabel}`);
                    const trimmedDetail = deleteReason.trim();
                    if (trimmedDetail) {
                      parts.push(`Details: ${trimmedDetail}`);
                    }
                    const featureList = missingFeatures.map((f) => f.trim()).filter(Boolean);
                    if (selectedDeletionReason === 'missing_features' && featureList.length > 0) {
                      parts.push('Missing features:');
                      for (const f of featureList) {
                        parts.push(`- ${f}`);
                      }
                    }
                    const composedReason = parts.join('\n');
                    await authApi.deleteAccount(composedReason || reasonLabel);
                    // Clear local token and send user to login
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('tickly_token');
                    }
                    setShowDeleteAccount(false);
                    router.replace('/login');
                  } catch (error: any) {
                    setDeleteAccountError(error?.message ?? 'Failed to delete account. Please try again.');
                  } finally {
                    setDeletingAccount(false);
                  }
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deletingAccount ? tCommon('deleteAccountDeleting') : tCommon('deleteAccountConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
  return (
    <>
      {!isLg && mobileOpen && onMobileClose && (
        <div className="fixed inset-0 z-20 bg-black/50" onClick={onMobileClose} aria-hidden />
      )}
      <aside
        className={
          isLg
            ? `flex h-screen flex-col border-r border-border bg-muted/30 shrink-0 transition-[width] duration-200 ease-out ${collapsed ? 'w-16' : 'w-64'}`
            : `fixed inset-y-0 left-0 z-30 flex h-screen w-64 flex-col border-r border-border bg-background shadow-xl transition-transform duration-200 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
        }
      >
        {asideContent}
      </aside>
    </>
  );
}
