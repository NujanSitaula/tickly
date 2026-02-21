'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { userPreferences, auth as authApi } from '@/lib/api';
import {
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Key,
  CheckCircle2,
  Search,
  Palette,
  Plus,
  Upload,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

type SettingsSection = 'general' | 'accessibility' | 'theme';

const navigationItems: Array<{ id: SettingsSection; label: string; icon: typeof Settings }> = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'accessibility', label: 'Accessibility', icon: Eye },
  { id: 'theme', label: 'Theme', icon: Palette },
];

export default function SettingsPage() {
  const t = useTranslations('dashboard.common');
  const tDeletionReasons = useTranslations('dashboard.deletionReasons');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, user, setUser } = useAuth();
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  const sectionFromUrl = searchParams.get('section') as SettingsSection | null;
  const validSection = sectionFromUrl && navigationItems.some((item) => item.id === sectionFromUrl)
    ? sectionFromUrl
    : 'general';
  const [activeSection, setActiveSection] = useState<SettingsSection>(validSection);

  useEffect(() => {
    if (sectionFromUrl && sectionFromUrl !== activeSection && navigationItems.some((item) => item.id === sectionFromUrl)) {
      setActiveSection(sectionFromUrl);
    }
  }, [sectionFromUrl]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFocusIndicators, setShowFocusIndicators] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [selectedDeletionReason, setSelectedDeletionReason] = useState<
    'complicated' | 'missing_features' | 'other_tool' | 'cleanup' | 'other' | null
  >(null);
  const [missingFeatures, setMissingFeatures] = useState<string[]>(['']);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingName) {
      setNameDraft(user?.name ?? '');
      setNameError(null);
      setSavingName(false);
    }
  }, [user?.name, editingName]);

  async function handleSaveName() {
    setNameError(null);
    const next = nameDraft.trim();
    if (!next) {
      setNameError('Name is required');
      return;
    }
    if (next.length > 255) {
      setNameError('Name must be 255 characters or less');
      return;
    }
    if (next === (user?.name ?? '')) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const updated = await authApi.updateName(next);
      setUser(updated.user);
      setEditingName(false);
    } catch (e: any) {
      setNameError(e?.data?.message ?? e?.message ?? 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangeMode(nextMode: 'basic' | 'advanced') {
    if (!user || user.mode === nextMode) return;
    setModeError(null);
    setSavingMode(true);
    try {
      const updated = await authApi.updateMode(nextMode);
      setUser(updated.user);
      // Redirect through root dashboard so it picks the correct mode-specific home
      router.replace('/');
    } catch (e: any) {
      setModeError(e?.data?.message ?? e?.message ?? 'Failed to update mode');
    } finally {
      setSavingMode(false);
    }
  }

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    const g = searchParams.get('google');
    const reason = searchParams.get('reason');
    if (g === 'connected') {
      setGoogleError(null);
      setGoogleMessage(t('googleConnectSuccess'));
    } else if (g === 'error') {
      setGoogleMessage(null);
      const map: Record<string, string> = {
        connect_expired: t('googleConnectExpired'),
        email_mismatch: t('googleConnectEmailMismatch'),
        already_linked: t('googleConnectAlreadyLinked'),
      };
      setGoogleError(map[reason ?? ''] ?? t('googleConnectFailed'));
    }
  }, [searchParams, t]);

  useEffect(() => {
    // Apply focus indicators preference
    const root = document.documentElement;
    if (showFocusIndicators) {
      root.classList.remove('no-focus-indicators');
    } else {
      root.classList.add('no-focus-indicators');
    }
  }, [showFocusIndicators]);

  async function loadPreferences() {
    try {
      const pref = await userPreferences.get('show_focus_indicators');
      setShowFocusIndicators(pref?.data?.value !== 'false');
    } catch (error) {
      // Preference doesn't exist yet, use default (true)
      setShowFocusIndicators(true);
    }
  }

  async function handleToggleFocusIndicators(enabled: boolean) {
    setShowFocusIndicators(enabled);
    setLoading(true);
    try {
      await userPreferences.set('show_focus_indicators', enabled ? 'true' : 'false');
    } catch (error) {
      console.error('Failed to save preference:', error);
      // Revert on error
      setShowFocusIndicators(!enabled);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      setPasswordSuccess(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.setPassword(newPassword, confirmPassword);
      setPasswordSuccess(t('passwordSet'));
      setNewPassword('');
      setConfirmPassword('');
      // Refresh user data to update has_password status
      const updatedUser = await authApi.user();
      setUser(updatedUser.user);
      setTimeout(() => {
        setShowSetPassword(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to set password');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!selectedDeletionReason) {
      setDeleteAccountError(t('deleteAccountReasonError'));
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
      await logout();
      router.push('/login');
    } catch (error) {
      setDeleteAccountError(error instanceof Error ? error.message : 'Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleGoogleConnect() {
    setGoogleMessage(null);
    setGoogleError(null);
    setGoogleBusy(true);
    try {
      const res = await authApi.googleConnectIntent();
      window.location.href = res.url;
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : t('googleConnectFailed'));
      setGoogleBusy(false);
    }
  }

  async function handleGoogleDisconnect() {
    setGoogleMessage(null);
    setGoogleError(null);
    setGoogleBusy(true);
    try {
      await authApi.googleDisconnect();
      const updatedUser = await authApi.user();
      setUser(updatedUser.user);
      setGoogleMessage(t('googleDisconnectSuccess'));
    } catch (error) {
      const anyErr = error as Error & { status?: number; data?: unknown };
      const code = (anyErr.data as { code?: string } | undefined)?.code;
      if (anyErr.status === 409 && code === 'password_required_before_disconnect') {
        setGoogleError(t('googleDisconnectRequiresPassword'));
        // Guide user to set a password first
        if (user?.oauth_provider === 'google' && !user?.has_password) {
          setShowSetPassword(true);
        } else {
          setShowChangePassword(true);
        }
      } else {
        setGoogleError(anyErr instanceof Error ? anyErr.message : t('googleDisconnectFailed'));
      }
    } finally {
      setGoogleBusy(false);
    }
  }

  const filteredNavigationItems = navigationItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-background flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground mb-4">Settings</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {filteredNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('section', item.id);
                  router.replace(`/settings?${params.toString()}`, { scroll: false });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {/* Footer area reserved for future settings; hidden for now */}
      </aside>

      {/* Right Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-8 py-8">
          {/* General Section (formerly Account) */}
          {activeSection === 'general' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-foreground">General</h2>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Manage plan
                </button>
              </div>

              {/* Plan */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Plan</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {user?.tier === 'free' ? 'Free' : user?.tier === 'pro' ? 'Pro' : 'Beginner'}
                    </p>
                  </div>
                </div>
              </section>

              {/* App mode */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">App mode</h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Choose between a simple, list-focused experience (Basic) and the full productivity workspace (Advanced).
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['basic', 'advanced'] as const).map((mode) => {
                    const isActive = (user?.mode ?? 'advanced') === mode;
                    const label = mode === 'basic' ? 'Basic' : 'Advanced';
                    const description =
                      mode === 'basic'
                        ? 'Simple to-dos without projects or Kanban.'
                        : 'Full features with projects, Kanban, and more.';
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleChangeMode(mode)}
                        disabled={savingMode}
                        className={`cursor-pointer flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground hover:bg-muted'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <span className="font-medium">{label}</span>
                        <span
                          className={`text-xs ${
                            isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {modeError && <p className="text-xs text-red-600">{modeError}</p>}
              </section>

              {/* Photo */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Photo</h3>
                <div className="flex items-center gap-4">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || 'User avatar'}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xl font-semibold text-primary">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Upload className="h-4 w-4 inline mr-2" />
                      Upload photo
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avatars are powered by Gravatar based on your account email.
                    </p>
                  </div>
                </div>
              </section>

              {/* Name */}
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-foreground">Name</h3>
                  {!editingName ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(user?.name ?? '');
                        setNameError(null);
                        setEditingName(true);
                      }}
                      className="cursor-pointer px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        disabled={savingName}
                        className="cursor-pointer px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="cursor-pointer px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingName ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={editingName ? nameDraft : (user?.name || '')}
                  readOnly={!editingName}
                  onChange={(e) => {
                    setNameDraft(e.target.value);
                    setNameError(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 read-only:opacity-90"
                />
                {nameError && (
                  <p className="text-xs text-red-600">{nameError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {(editingName ? nameDraft.length : (user?.name?.length || 0))}/255
                </p>
              </section>

              {/* Email */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Email</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Change email
                </button>
              </section>

              {/* Password */}
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Password</h3>
                {user?.oauth_provider === 'google' && !user?.has_password ? (
                  <div className="space-y-3">
                    {showSetPassword ? (
                      <form onSubmit={handleSetPassword} className="space-y-3">
                        <div className="space-y-2">
                          <label htmlFor="set-new-password" className="block text-xs font-medium text-foreground">
                            {t('newPassword')}
                          </label>
                          <div className="relative">
                            <input
                              id="set-new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                setPasswordError(null);
                              }}
                              required
                              minLength={8}
                              placeholder={t('newPassword')}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none rounded"
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="set-confirm-password" className="block text-xs font-medium text-foreground">
                            {t('confirmNewPassword')}
                          </label>
                          <div className="relative">
                            <input
                              id="set-confirm-password"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setPasswordError(null);
                              }}
                              required
                              minLength={8}
                              placeholder={t('confirmNewPassword')}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none rounded"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                        {passwordSuccess && <p className="text-xs text-green-600">{passwordSuccess}</p>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowSetPassword(false);
                              setNewPassword('');
                              setConfirmPassword('');
                              setPasswordError(null);
                              setPasswordSuccess(null);
                            }}
                            className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={changingPassword || !newPassword || !confirmPassword}
                            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {changingPassword ? 'Setting...' : t('setPassword')}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSetPassword(true)}
                        className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Add password
                      </button>
                    )}
                  </div>
                ) : user?.has_password ? (
                  <div className="space-y-3">
                    {showChangePassword ? (
                      <form onSubmit={handleChangePassword} className="space-y-3">
                        <div className="space-y-2">
                          <label htmlFor="current-password" className="block text-xs font-medium text-foreground">
                            {t('currentPassword')}
                          </label>
                          <div className="relative">
                            <input
                              id="current-password"
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => {
                                setCurrentPassword(e.target.value);
                                setPasswordError(null);
                              }}
                              required
                              placeholder={t('currentPassword')}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none rounded"
                              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="change-new-password" className="block text-xs font-medium text-foreground">
                            {t('newPassword')}
                          </label>
                          <div className="relative">
                            <input
                              id="change-new-password"
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                setPasswordError(null);
                              }}
                              required
                              minLength={8}
                              placeholder={t('newPassword')}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none rounded"
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="change-confirm-password" className="block text-xs font-medium text-foreground">
                            {t('confirmNewPassword')}
                          </label>
                          <div className="relative">
                            <input
                              id="change-confirm-password"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setPasswordError(null);
                              }}
                              required
                              minLength={8}
                              placeholder={t('confirmNewPassword')}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none rounded"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                        {passwordSuccess && <p className="text-xs text-green-600">{passwordSuccess}</p>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowChangePassword(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                              setPasswordError(null);
                              setPasswordSuccess(null);
                            }}
                            className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {changingPassword ? 'Changing...' : t('changePassword')}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowChangePassword(true)}
                        className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Change password
                      </button>
                    )}
                  </div>
                ) : null}
              </section>

              {/* Two-factor authentication */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Two-factor authentication</h3>
                    <p className="text-xs text-muted-foreground mt-1">2FA is disabled on your Tickly account.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      disabled
                    />
                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </section>

              {/* Connected accounts */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">{t('connectedAccounts')}</h3>
                <p className="text-sm text-muted-foreground">{t('connectedAccountsDescription')}</p>
                {(googleMessage || googleError) && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      googleError
                        ? 'border-destructive/50 bg-destructive/10 text-destructive'
                        : 'border-border bg-muted/30 text-foreground'
                    }`}
                  >
                    {googleError ?? googleMessage}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {user?.google_id ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">G</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">Google</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                        <button
                          type="button"
                          onClick={handleGoogleDisconnect}
                          disabled={googleBusy}
                          className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('disconnectGoogle')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleConnect}
                      disabled={googleBusy}
                      className="cursor-pointer flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">G</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {googleBusy ? t('googleConnecting') : t('connectGoogle')}
                      </span>
                    </button>
                  )}
                </div>
              </section>

              {/* Delete Account */}
              <section className="space-y-3 pt-4 border-t border-border">
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Trash2 className="h-5 w-5 text-destructive" />
                        <h3 className="text-sm font-medium text-foreground">Delete account</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      {showDeleteAccount ? (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">{t('deleteAccountIntro')}</p>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {t('deleteAccountReasonLabel')}
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
                                    className="h-3.5 w-3.5 border-border text-primary focus:outline-none"
                                  />
                                  <span className="truncate">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          {selectedDeletionReason === 'missing_features' && (
                            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {t('deleteAccountFeatureSectionTitle')}
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
                                      placeholder={t('deleteAccountFeaturePlaceholder')}
                                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                    />
                                    {missingFeatures.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = missingFeatures.filter((_, i) => i !== idx);
                                          setMissingFeatures(next.length ? next : ['']);
                                        }}
                                        className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                                      >
                                        {t('deleteAccountRemoveFeature')}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setMissingFeatures((prev) => [...prev, ''])}
                                className="cursor-pointer mt-2 text-xs font-medium text-primary hover:text-primary/80"
                              >
                                {t('deleteAccountAddFeature')}
                              </button>
                            </div>
                          )}
                          <div>
                            <label htmlFor="delete-reason-details" className="block text-xs font-medium text-muted-foreground mb-1">
                              Additional details (optional)
                            </label>
                            <textarea
                              id="delete-reason-details"
                              value={deleteReason}
                              onChange={(e) => {
                                setDeleteReason(e.target.value);
                                setDeleteAccountError(null);
                              }}
                              placeholder={t('deleteAccountReasonPlaceholder')}
                              rows={4}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            />
                          </div>
                          {deleteAccountError && <p className="text-xs text-destructive">{deleteAccountError}</p>}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteAccount(false);
                                setDeleteReason('');
                                setSelectedDeletionReason(null);
                                setMissingFeatures(['']);
                                setDeleteAccountError(null);
                              }}
                              className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none"
                            >
                              {t('deleteAccountCancel')}
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteAccount}
                              disabled={deletingAccount}
                              className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingAccount ? t('deleteAccountDeleting') : t('deleteAccountConfirm')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowDeleteAccount(true)}
                          className="cursor-pointer rounded-lg border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none"
                        >
                          Delete account
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Accessibility Section */}
          {activeSection === 'accessibility' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Accessibility</h2>
              <section className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {showFocusIndicators ? (
                        <Eye className="h-5 w-5 text-primary" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      )}
                      <h3 className="text-sm font-medium text-foreground">Show focus indicators</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Display visual focus indicators when navigating with keyboard (Tab key). Disable for a cleaner look.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFocusIndicators}
                      onChange={(e) => handleToggleFocusIndicators(e.target.checked)}
                      disabled={loading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </section>
            </div>
          )}

          {/* Theme Section */}
          {activeSection === 'theme' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-foreground mb-6">{t('themeSection')}</h2>

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">{t('themeMode')}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{t('themeModeDescription')}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'light' as const, label: t('themeLight'), icon: Sun },
                      { value: 'dark' as const, label: t('themeDark'), icon: Moon },
                      { value: 'system' as const, label: t('themeSystem'), icon: Monitor },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTheme(option.value)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            theme === option.value
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-background text-foreground hover:bg-muted'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">{t('colorScheme')}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{t('colorSchemeDescription')}</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'blue' as const, label: t('colorBlue'), preview: '#2e335c' },
                      { value: 'green' as const, label: t('colorGreen'), preview: '#30a14e' },
                      { value: 'purple' as const, label: t('colorPurple'), preview: '#8b5cf6' },
                      { value: 'red' as const, label: t('colorRed'), preview: '#e5484d' },
                      { value: 'orange' as const, label: t('colorOrange'), preview: '#f76808' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setColorScheme(option.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          colorScheme === option.value
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground hover:bg-muted'
                        }`}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: option.preview }}
                          aria-hidden
                        />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Other sections intentionally hidden until implemented */}
        </div>
      </main>
    </div>
  );
}
