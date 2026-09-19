'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AppWindow,
  Check,
  ChevronRight,
  Copy,
  KeyRound,
  Link2,
  LockKeyhole,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  Upload,
  UserCog,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from '@/i18n/navigation';
import {
  Button,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@/components/ui/primitives';
import {
  applicationService,
  rbacService,
  type RbacApplication,
} from '@/services';
import { UserSearchPicker } from '@/components/admin/user-search-picker';
import { PageShell } from '@/components/layout/page-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/components/auth/auth-provider';
import { isAdmin } from '@/lib/onboarding';

function roleHasPermission(
  app: RbacApplication,
  roleCode: string,
  permCode: string,
) {
  const role = app.roles.find((r) => r.code === roleCode);
  return role?.permissions.some((p) => p.permission.code === permCode) ?? false;
}

function roleLabel(role: { code: string; name?: string | null }) {
  return role.name?.trim() || role.code;
}

function permissionLabel(perm: {
  code: string;
  description?: string | null;
}) {
  const description = perm.description?.trim();
  if (description) return description;
  const parts = perm.code.split('.').filter(Boolean);
  const rest = parts.length > 1 ? parts.slice(1) : parts;
  return rest
    .map((part) => part.replace(/[_-]+/g, ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ');
}

export default function AdminRbacPage() {
  const t = useTranslations('rbac');
  const tc = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const platformAdmin = isAdmin(user);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [appFilter, setAppFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    clientId: '',
    redirectUri: '',
    require2fa: false,
    accessMode: 'MANUAL' as 'MANUAL' | 'MEMBERS',
  });
  const [newUri, setNewUri] = useState('');
  const [newRole, setNewRole] = useState({ code: '', name: '' });
  const [newPerm, setNewPerm] = useState({ code: '', description: '' });
  const [managerUserId, setManagerUserId] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [manifest, setManifest] = useState('');
  const [revealedSecret, setRevealedSecret] = useState<{
    appCode: string;
    secret: string;
  } | null>(null);

  const appsQuery = useQuery({
    queryKey: ['admin', 'rbac', 'apps'],
    queryFn: () => rbacService.listApps(),
  });

  const apps = useMemo(() => appsQuery.data ?? [], [appsQuery.data]);
  const filteredApps = useMemo(() => {
    const q = appFilter.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.clientId.toLowerCase().includes(q),
    );
  }, [apps, appFilter]);

  const activeCode = selectedCode ?? apps[0]?.code ?? null;

  const appQuery = useQuery({
    queryKey: ['admin', 'rbac', 'app', activeCode],
    queryFn: () => rbacService.getApp(activeCode!),
    enabled: Boolean(activeCode),
  });

  const usersQuery = useQuery({
    queryKey: ['admin', 'rbac', 'users', activeCode],
    queryFn: () => rbacService.listAppUsers(activeCode!),
    enabled: Boolean(activeCode),
  });

  const app = appQuery.data;
  const activeRole =
    app?.roles.find((role) => role.code === selectedRole) ??
    app?.roles[0] ??
    null;
  const activeRoleCode = activeRole?.code ?? null;
  const permissionCodeExample =
    app?.permissions[0]?.code ??
    `${(activeCode ?? 'APP').toLowerCase()}.question.read`;

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'rbac'] });
  }

  async function run(action: () => Promise<unknown>, ok = t('saved')) {
    setBusy(true);
    try {
      await action();
      await invalidate();
      toast.success(ok);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function importManifest(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const imported = await rbacService.importManifest(manifest);
      setSelectedCode(imported.code);
      setManifest('');
    }, t('manifestImported'));
  }

  async function createApp(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const created = await rbacService.createApp({
        code: createForm.code,
        name: createForm.name,
        clientId: createForm.clientId,
        require2fa: createForm.require2fa,
        accessMode: createForm.accessMode,
        redirectUri: createForm.redirectUri || undefined,
      });
      setSelectedCode(created.code);
      setCreateForm({
        code: '',
        name: '',
        clientId: '',
        redirectUri: '',
        require2fa: false,
        accessMode: 'MANUAL',
      });
      setShowCreate(false);
      if (created.clientSecret) {
        setRevealedSecret({
          appCode: created.code,
          secret: created.clientSecret,
        });
      }
    }, t('appCreated'));
  }

  async function copySecret(secret: string) {
    await navigator.clipboard.writeText(secret);
    toast.success(t('secretCopied'));
  }

  return (
    <PageShell>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          platformAdmin ? (
            <Button type="button" onClick={() => setShowCreate((v) => !v)}>
              <Plus className="size-4" aria-hidden />
              {t('createApp')}
            </Button>
          ) : undefined
        }
      />

      {!platformAdmin ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <Shield className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium">{t('managerMode')}</p>
            <p className="mt-1 text-muted-foreground">
              {t('managerModeHint')}
            </p>
          </div>
        </div>
      ) : null}

      {showCreate && platformAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('createApp')}</CardTitle>
            <CardDescription>{t('createHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={createApp}>
              {(
                [
                  ['code', t('code'), 'PROFILE', 'text'],
                  ['name', t('name'), 'BCN Profiles', 'text'],
                  ['clientId', t('clientId'), 'bcn-profiles', 'text'],
                  [
                    'redirectUri',
                    t('redirectUri'),
                    'https://app.example/auth/callback',
                    'url',
                  ],
                ] as const
              ).map(([key, label, placeholder, type]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`create-app-${key}`}>{label}</Label>
                  <Input
                    id={`create-app-${key}`}
                    type={type}
                    required={key !== 'redirectUri'}
                    placeholder={placeholder}
                    value={createForm[key]}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={createForm.require2fa}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      require2fa: e.target.checked,
                    }))
                  }
                />
                {t('require2fa')}
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={createForm.accessMode === 'MEMBERS'}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      accessMode: e.target.checked ? 'MEMBERS' : 'MANUAL',
                    }))
                  }
                />
                {t('accessModeMembers')}
              </label>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={busy}>
                  {t('createApp')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                >
                  {tc('cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4 xl:hidden">
        <Label htmlFor="rbac-app-select">{t('selectApplication')}</Label>
        <select
          id="rbac-app-select"
          value={activeCode ?? ''}
          onChange={(event) => {
            setSelectedCode(event.target.value || null);
            setSelectedRole(null);
          }}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          {apps.map((item) => (
            <option key={item.id} value={item.code}>
              {item.name} ({item.code})
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* App picker */}
        <Card className="hidden h-fit xl:sticky xl:top-20 xl:block">
          <CardHeader className="gap-3 space-y-0 pb-3">
            <CardTitle className="text-sm">{t('applications')}</CardTitle>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                placeholder={t('searchApps')}
                className="h-9 pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto p-2">
            {filteredApps.map((item) => {
              const active = activeCode === item.code;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedCode(item.code);
                    setSelectedRole(null);
                  }}
                  className={cn(
                    'w-full rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/70',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-sm font-semibold',
                        active && 'text-primary',
                      )}
                    >
                      {item.code}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.name}
                  </p>
                  <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span>
                      {item.roles.length} {t('rolesShort')}
                    </span>
                    <span aria-hidden>/</span>
                    <span>
                      {item.permissions.length} {t('permsShort')}
                    </span>
                    <span aria-hidden>/</span>
                    <span>
                      {item._count?.userAccess ?? 0} {t('usersShort')}
                    </span>
                  </p>
                </button>
              );
            })}
            {!filteredApps.length && !appsQuery.isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t('noApps')}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {app ? (
          <div className="flex min-w-0 flex-col gap-4">
            <Card className="shadow-none">
              <CardContent className="flex flex-col gap-5 py-1 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {app.name}
                    </h2>
                    <StatusBadge status={app.status} />
                    {app.require2fa ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <KeyRound className="size-3" aria-hidden />
                        2FA
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {app.accessMode === 'MEMBERS'
                        ? t('accessModeMembersBadge')
                        : t('accessModeManualBadge')}
                    </span>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/45 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">
                        {t('code')}
                      </dt>
                      <dd className="mt-0.5 font-mono text-xs text-foreground">
                        {app.code}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/45 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">
                        {t('clientId')}
                      </dt>
                      <dd className="mt-0.5 font-mono text-xs text-foreground">
                        {app.clientId}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/45 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">
                        {t('clientSecret')}
                      </dt>
                      <dd className="mt-0.5 text-xs font-medium">
                        {t('activeKeys', {
                          count:
                            app.clientSecrets?.filter(
                              (key) => key.status === 'ACTIVE',
                            ).length ?? 0,
                        })}
                      </dd>
                    </div>
                  </dl>
                  {revealedSecret?.appCode === app.code ? (
                    <Alert className="border-primary/20 bg-primary/5 p-4">
                      <KeyRound aria-hidden />
                      <AlertTitle>{t('clientSecretReady')}</AlertTitle>
                      <AlertDescription className="space-y-3">
                        <p>{t('clientSecretHint')}</p>
                        <code className="block break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
                          {revealedSecret.secret}
                        </code>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void copySecret(revealedSecret.secret)}
                          >
                            <Copy className="size-4" aria-hidden />
                            {t('copySecret')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setRevealedSecret(null)}
                          >
                            {t('dismissSecret')}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Shield className="size-3.5" aria-hidden />
                      {app.roles.length} {t('rolesShort')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <KeyRound className="size-3.5" aria-hidden />
                      {app.permissions.length} {t('permsShort')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="size-3.5" aria-hidden />
                      {app.redirectUris.length} URI
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden />
                      {app._count?.userAccess ??
                        usersQuery.data?.length ??
                        0}{' '}
                      {t('usersShort')}
                    </span>
                  </div>
                </div>
                {platformAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    {app.status === 'ACTIVE' ? (
                      <ConfirmDialog
                        title={t('disableTitle', { app: app.name })}
                        description={t('disableConfirm')}
                        confirmLabel={t('disableAction')}
                        cancelLabel={tc('cancel')}
                        pendingLabel={tc('loading')}
                        onConfirm={() =>
                          run(() =>
                            rbacService.updateApp(app.code, {
                              status: 'DISABLED',
                            }),
                          )
                        }
                        trigger={
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={busy}
                          >
                            {t('disable')}
                          </Button>
                        }
                      />
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            rbacService.updateApp(app.code, {
                              status: 'ACTIVE',
                            }),
                          )
                        }
                      >
                        {t('enable')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          rbacService.updateApp(app.code, {
                            require2fa: !app.require2fa,
                          }),
                        )
                      }
                    >
                      {app.require2fa ? t('unrequire2fa') : t('require2fa')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          rbacService.updateApp(app.code, {
                            accessMode:
                              app.accessMode === 'MEMBERS'
                                ? 'MANUAL'
                                : 'MEMBERS',
                          }),
                        )
                      }
                    >
                      {app.accessMode === 'MEMBERS'
                        ? t('accessModeSetManual')
                        : t('accessModeSetMembers')}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <section
              aria-labelledby="auth-flow-title"
              className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <KeyRound className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id="auth-flow-title" className="font-semibold tracking-tight">
                    {t('decisionFlow')}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t('decisionFlowHint')}
                  </p>
                </div>
              </div>
              <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    icon: Users,
                    title: t('flowIdentity'),
                    hint: t('flowIdentityHint'),
                  },
                  {
                    icon: Shield,
                    title: t('flowMembership'),
                    hint: t('flowMembershipHint'),
                  },
                  {
                    icon: AppWindow,
                    title: t('flowAccess'),
                    hint: t('flowAccessHint'),
                  },
                  {
                    icon: LockKeyhole,
                    title: t('flowPermission'),
                    hint: t('flowPermissionHint'),
                  },
                ].map(({ icon: Icon, title, hint }, index) => (
                  <li
                    key={String(title)}
                    className={cn(
                      'relative flex min-h-32 gap-3 rounded-xl border border-border bg-background p-4 transition-colors',
                      index === 3 && 'border-primary/25 bg-primary/5',
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                        0{index + 1}
                      </p>
                      <p className="text-sm font-semibold leading-5">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {hint}
                      </p>
                    </div>
                    {index < 3 ? (
                      <span className="absolute top-1/2 -right-3 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-card text-primary shadow-sm xl:flex">
                        <ChevronRight className="size-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>

            <Tabs defaultValue="access" className="min-w-0">
              <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start">
                <TabsTrigger className="flex-none px-2.5" value="access">
                  <Shield className="size-4" aria-hidden />
                  {t('tabAccess')}
                </TabsTrigger>
                <TabsTrigger className="flex-none px-2.5" value="users">
                  <Users className="size-4" aria-hidden />
                  {t('tabUsers')}
                </TabsTrigger>
                <TabsTrigger className="flex-none px-2.5" value="uris">
                  <Link2 className="size-4" aria-hidden />
                  {t('tabUris')}
                </TabsTrigger>
                {platformAdmin ? (
                  <TabsTrigger className="flex-none px-2.5" value="keys">
                    <KeyRound className="size-4" aria-hidden />
                    {t('tabKeys')}
                  </TabsTrigger>
                ) : null}
                <TabsTrigger className="flex-none px-2.5" value="managers">
                  <UserCog className="size-4" aria-hidden />
                  {t('tabManagers')}
                </TabsTrigger>
                {platformAdmin ? (
                  <TabsTrigger className="flex-none px-2.5" value="manifest">
                    <AppWindow className="size-4" aria-hidden />
                    {t('tabManifest')}
                  </TabsTrigger>
                ) : null}
              </TabsList>

              {/* Role + permission (role-centric) */}
              <TabsContent value="access" className="mt-4 space-y-4">
                <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t('tabRoles')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3">
                      {platformAdmin ? (
                        <form
                          className="space-y-3 rounded-lg border border-dashed border-border p-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            run(async () => {
                              await rbacService.createRole(app.code, newRole);
                              setSelectedRole(newRole.code.toUpperCase());
                              setNewRole({ code: '', name: '' });
                            });
                          }}
                        >
                          <div className="space-y-1.5">
                            <Label htmlFor="new-role-code">{t('roleCode')}</Label>
                            <Input
                              id="new-role-code"
                              value={newRole.code}
                              onChange={(e) =>
                                setNewRole((r) => ({
                                  ...r,
                                  code: e.target.value,
                                }))
                              }
                              required
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="new-role-name">{t('roleName')}</Label>
                            <Input
                              id="new-role-name"
                              value={newRole.name}
                              onChange={(e) =>
                                setNewRole((r) => ({
                                  ...r,
                                  name: e.target.value,
                                }))
                              }
                              className="h-9"
                            />
                          </div>
                          <Button
                            type="submit"
                            size="sm"
                            className="w-full"
                            disabled={busy}
                          >
                            <Plus className="size-3.5" aria-hidden />
                            {t('addRole')}
                          </Button>
                        </form>
                      ) : null}
                      <div
                        className="flex flex-col gap-1"
                        aria-label={t('tabRoles')}
                      >
                        {app.roles.map((role) => {
                          const on = activeRoleCode === role.code;
                          return (
                            <div
                              key={role.id}
                              className={cn(
                                'flex items-center gap-1 rounded-lg border border-transparent',
                                on && 'border-primary/20 bg-primary/10',
                              )}
                            >
                              <button
                                type="button"
                                aria-pressed={on}
                                className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => setSelectedRole(role.code)}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="block truncate text-sm font-semibold">
                                    {role.name || role.code}
                                  </span>
                                  {on ? (
                                    <Check
                                      className="size-3.5 shrink-0 text-primary"
                                      aria-hidden
                                    />
                                  ) : null}
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <span className="font-mono">{role.code}</span>
                                  <span aria-hidden>/</span>
                                  <span>
                                    {role.permissions.length} {t('permsShort')}
                                  </span>
                                </span>
                              </button>
                              {platformAdmin ? (
                                <ConfirmDialog
                                  title={t('deleteRoleTitle', {
                                    role: roleLabel(role),
                                  })}
                                  description={t('deleteRoleConfirm')}
                                  confirmLabel={t('deleteRoleAction')}
                                  cancelLabel={tc('cancel')}
                                  pendingLabel={tc('loading')}
                                  onConfirm={() =>
                                    run(() =>
                                      rbacService.deleteRole(
                                        app.code,
                                        role.code,
                                      ),
                                    )
                                  }
                                  trigger={
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                      disabled={busy || role.isSystem}
                                      aria-label={t('deleteRoleAction')}
                                      title={
                                        role.isSystem
                                          ? t('systemRoleHint')
                                          : t('deleteRoleAction')
                                      }
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  }
                                />
                              ) : null}
                            </div>
                          );
                        })}
                        {!app.roles.length ? (
                          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                            {t('noRolesYet')}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {activeRole
                          ? t('permsForRole', { role: roleLabel(activeRole) })
                          : t('tabPerms')}
                      </CardTitle>
                      <CardDescription>{t('accessHint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {platformAdmin ? (
                        <form
                          className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                          onSubmit={(e) => {
                            e.preventDefault();
                            run(async () => {
                              await rbacService.createPermission(
                                app.code,
                                newPerm,
                              );
                              setNewPerm({ code: '', description: '' });
                            });
                          }}
                        >
                          <div className="space-y-1.5">
                            <Label htmlFor="new-permission-description">
                              {t('permDesc')}
                            </Label>
                            <Input
                              id="new-permission-description"
                              placeholder={t('permDescPlaceholder')}
                              value={newPerm.description}
                              onChange={(e) =>
                                setNewPerm((p) => ({
                                  ...p,
                                  description: e.target.value,
                                }))
                              }
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="new-permission-code">
                              {t('permCode')}
                            </Label>
                            <Input
                              id="new-permission-code"
                              placeholder={permissionCodeExample}
                              value={newPerm.code}
                              onChange={(e) =>
                                setNewPerm((p) => ({
                                  ...p,
                                  code: e.target.value,
                                }))
                              }
                              required
                              className="h-9 font-mono text-xs"
                            />
                          </div>
                          <Button type="submit" size="sm" disabled={busy}>
                            <Plus className="size-3.5" aria-hidden />
                            {t('addPerm')}
                          </Button>
                        </form>
                      ) : null}

                      {!app.permissions.length ? (
                        <EmptyState title={t('noPermsYet')} />
                      ) : !activeRoleCode ? (
                        <EmptyState title={t('pickRoleFirst')} />
                      ) : (
                        <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
                          {app.permissions.map((perm) => {
                            const granted = roleHasPermission(
                              app,
                              activeRoleCode,
                              perm.code,
                            );
                            return (
                              <li
                                key={perm.id}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-3',
                                  perm.deprecated && 'bg-muted/30 opacity-70',
                                )}
                              >
                                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    className="mt-1 size-4 accent-[var(--primary)]"
                                    checked={granted}
                                    disabled={busy || !platformAdmin}
                                    onChange={() =>
                                      run(() => {
                                        const current = app.roles
                                          .find(
                                            (role) =>
                                              role.code === activeRoleCode,
                                          )!
                                          .permissions.map(
                                            ({ permission }) => permission.code,
                                          );
                                        return rbacService.setRolePermissions(
                                          app.code,
                                          activeRoleCode,
                                          granted
                                            ? current.filter(
                                                (code) => code !== perm.code,
                                              )
                                            : [...current, perm.code],
                                        );
                                      })
                                    }
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium [overflow-wrap:anywhere]">
                                      {permissionLabel(perm)}
                                    </span>
                                    <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                                      {perm.code}
                                    </span>
                                    {perm.deprecated ? (
                                      <Badge variant="outline" className="mt-1">
                                        {t('deprecated')}
                                      </Badge>
                                    ) : null}
                                  </span>
                                </label>
                                {platformAdmin ? (
                                  <ConfirmDialog
                                    title={t('deletePermissionTitle', {
                                      permission: permissionLabel(perm),
                                    })}
                                    description={t('deletePermissionConfirm')}
                                    confirmLabel={t('deletePermissionAction')}
                                    cancelLabel={tc('cancel')}
                                    pendingLabel={tc('loading')}
                                    onConfirm={() =>
                                      run(() =>
                                        rbacService.deletePermission(
                                          app.code,
                                          perm.code,
                                        ),
                                      )
                                    }
                                    trigger={
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                        disabled={busy}
                                        aria-label={t(
                                          'deletePermissionAction',
                                        )}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    }
                                  />
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="keys" className="mt-4">
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm">{t('tabKeys')}</CardTitle>
                      <CardDescription>{t('keysHint')}</CardDescription>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const issued = await rbacService.createClientSecret(
                            app.code,
                          );
                          setRevealedSecret({
                            appCode: app.code,
                            secret: issued.clientSecret,
                          });
                        })
                      }
                    >
                      <Plus className="size-4" aria-hidden />
                      {t('issueKey')}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {app.clientSecrets?.length ? (
                      <ul className="space-y-2">
                        {app.clientSecrets.map((key) => (
                          <li
                            key={key.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="font-medium">{key.label || key.id}</p>
                              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                {formatDate(key.createdAt, locale)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={key.status} />
                              {key.status === 'ACTIVE' ? (
                                <ConfirmDialog
                                  title={t('disableKeyTitle', {
                                    key: key.label || key.id,
                                  })}
                                  description={t('disableKeyConfirm')}
                                  confirmLabel={t('disableKeyAction')}
                                  cancelLabel={tc('cancel')}
                                  pendingLabel={tc('loading')}
                                  onConfirm={() =>
                                    run(() =>
                                      rbacService.setClientSecretStatus(
                                        app.code,
                                        key.id,
                                        'DISABLED',
                                      ),
                                    )
                                  }
                                  trigger={
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="danger"
                                      disabled={busy}
                                    >
                                      {t('disable')}
                                    </Button>
                                  }
                                />
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(() =>
                                      rbacService.setClientSecretStatus(
                                        app.code,
                                        key.id,
                                        'ACTIVE',
                                      ),
                                    )
                                  }
                                >
                                  {t('enableKey')}
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('noKeys')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="uris" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('tabUris')}</CardTitle>
                    <CardDescription>{t('uriHint')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {platformAdmin ? (
                      <form
                        className="flex flex-col gap-2 sm:flex-row sm:items-end"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newUri.trim()) return;
                          run(async () => {
                            await rbacService.addRedirectUri(app.code, newUri);
                            setNewUri('');
                          });
                        }}
                      >
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="new-redirect-uri">
                            {t('redirectUri')}
                          </Label>
                          <Input
                            id="new-redirect-uri"
                            placeholder="https://app.example/auth/callback"
                            value={newUri}
                            onChange={(e) => setNewUri(e.target.value)}
                          />
                        </div>
                        <Button type="submit" disabled={busy}>
                          <Plus className="size-4" aria-hidden />
                          {t('addUri')}
                        </Button>
                      </form>
                    ) : null}
                    {app.redirectUris.length ? (
                      <ul className="space-y-2">
                        {app.redirectUris.map((uri) => (
                          <li
                            key={uri.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
                          >
                            <span className="truncate font-mono text-xs">
                              {uri.redirectUri}
                            </span>
                            {platformAdmin ? (
                              <ConfirmDialog
                                title={t('removeUriTitle')}
                                description={t('removeUriConfirm', {
                                  uri: uri.redirectUri,
                                })}
                                confirmLabel={t('removeUriAction')}
                                cancelLabel={tc('cancel')}
                                pendingLabel={tc('loading')}
                                onConfirm={() =>
                                  run(() =>
                                    rbacService.removeRedirectUri(
                                      app.code,
                                      uri.redirectUri,
                                    ),
                                  )
                                }
                                trigger={
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                  >
                                    <Trash2 className="size-3.5" aria-hidden />
                                    {t('remove')}
                                  </Button>
                                }
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState title={t('noUris')} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('tabUsers')}</CardTitle>
                    <CardDescription>{t('usersHint')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form
                      className="rounded-xl border border-border bg-muted/20 p-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!memberUserId.trim()) return;
                        run(async () => {
                          await applicationService.grant(
                            memberUserId,
                            app.code,
                          );
                          setMemberUserId('');
                        });
                      }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <UserSearchPicker
                          id="member-user-search"
                          label={t('memberUserSearch')}
                          value={memberUserId}
                          onChange={(userId) => setMemberUserId(userId)}
                          placeholder={t('memberUserSearchPlaceholder')}
                          emptyHint={t('memberUserEmpty')}
                          required
                          disabled={busy}
                        />
                        <Button
                          type="submit"
                          disabled={busy || !memberUserId.trim()}
                        >
                          {t('grantAccess')}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {t('grantAccessHint')}
                      </p>
                    </form>
                    {usersQuery.isLoading ? (
                      <div className="space-y-2" aria-label={tc('loading')}>
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : usersQuery.isError ? (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                        role="alert"
                      >
                        <p className="text-sm text-destructive">
                          {t('loadError')}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void usersQuery.refetch()}
                        >
                          {t('retry')}
                        </Button>
                      </div>
                    ) : (usersQuery.data ?? []).length === 0 ? (
                      <EmptyState title={t('noUsers')} />
                    ) : (
                      <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
                        {(usersQuery.data ?? []).map((row) => (
                          <li
                            key={row.id}
                            className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,auto)] xl:items-center"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold">
                                  {row.user.fullName || row.user.email}
                                </p>
                                <StatusBadge status={row.status} />
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.user.email}
                              </p>
                              <div className="mt-3">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                  {t('assignedRoles')}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {app.roles.map((role) => {
                                    const assigned = row.roles.includes(role.code);
                                    return (
                                      <button
                                        key={role.id}
                                        type="button"
                                        aria-pressed={assigned}
                                        disabled={busy}
                                        className={cn(
                                          'inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                                          assigned
                                            ? 'border-primary/25 bg-primary/10 text-primary'
                                            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                        onClick={() =>
                                          run(() =>
                                            assigned
                                              ? applicationService.removeRole(
                                                  row.user.id,
                                                  app.code,
                                                  role.code,
                                                )
                                              : applicationService.assignRole(
                                                  row.user.id,
                                                  app.code,
                                                  role.code,
                                                ),
                                          )
                                        }
                                      >
                                        {assigned ? <Check className="size-3" aria-hidden /> : null}
                                        {roleLabel(role)}
                                      </button>
                                    );
                                  })}
                                  {!app.roles.length ? (
                                    <span className="text-xs text-muted-foreground">
                                      {t('noRolesYet')}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                              {row.status === 'ACTIVE' ? (
                                <ConfirmDialog
                                  title={t('blockAccessTitle', {
                                    user: row.user.fullName || row.user.email,
                                  })}
                                  description={t('blockAccessConfirm')}
                                  confirmLabel={t('blockAccess')}
                                  cancelLabel={tc('cancel')}
                                  pendingLabel={tc('loading')}
                                  onConfirm={() =>
                                    run(() =>
                                      applicationService.block(
                                        row.user.id,
                                        app.code,
                                      ),
                                    )
                                  }
                                  trigger={
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="danger"
                                      disabled={busy}
                                    >
                                      {t('blockAccess')}
                                    </Button>
                                  }
                                />
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(() =>
                                      applicationService.grant(
                                        row.user.id,
                                        app.code,
                                      ),
                                    )
                                  }
                                >
                                  {t('grantAccess')}
                                </Button>
                              )}
                              {platformAdmin ? (
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/admin/users/${row.user.id}`}>
                                    {t('manageUser')}
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="managers" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <UserCog className="size-4" aria-hidden />
                      {t('tabManagers')}
                    </CardTitle>
                    <CardDescription>{t('managersHint')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {platformAdmin ? (
                      <form
                        className="flex flex-col gap-2 sm:flex-row sm:items-end"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (!managerUserId.trim()) return;
                          run(async () => {
                            await rbacService.addManager(
                              app.code,
                              managerUserId,
                            );
                            setManagerUserId('');
                          });
                        }}
                      >
                        <UserSearchPicker
                          id="manager-user-search"
                          label={t('managerUserSearch')}
                          value={managerUserId}
                          onChange={(userId) => setManagerUserId(userId)}
                          placeholder={t('memberUserSearchPlaceholder')}
                          emptyHint={t('memberUserEmpty')}
                          required
                          disabled={busy}
                        />
                        <Button
                          type="submit"
                          disabled={busy || !managerUserId.trim()}
                        >
                          {t('addManager')}
                        </Button>
                      </form>
                    ) : null}
                    {app.managers.length ? (
                      <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
                        {app.managers.map((manager) => (
                          <li
                            key={manager.userId}
                            className="flex items-center gap-3 px-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {manager.user.fullName || manager.user.email}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {manager.user.email}
                              </p>
                            </div>
                            {platformAdmin ? (
                              <ConfirmDialog
                                title={t('removeManagerTitle', {
                                  user:
                                    manager.user.fullName || manager.user.email,
                                })}
                                description={t('removeManagerConfirm')}
                                confirmLabel={t('removeManagerAction')}
                                cancelLabel={tc('cancel')}
                                pendingLabel={tc('loading')}
                                onConfirm={() =>
                                  run(() =>
                                    rbacService.removeManager(
                                      app.code,
                                      manager.userId,
                                    ),
                                  )
                                }
                                trigger={
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                  >
                                    <Trash2 className="size-3.5" aria-hidden />
                                    {t('remove')}
                                  </Button>
                                }
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState title={t('noManagers')} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {platformAdmin ? (
                <TabsContent value="manifest" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Upload className="size-4" aria-hidden />
                        {t('tabManifest')}
                      </CardTitle>
                      <CardDescription>{t('manifestHint')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-3" onSubmit={importManifest}>
                        <Textarea
                          value={manifest}
                          onChange={(event) => setManifest(event.target.value)}
                          placeholder="app:\n  code: quiz\n  name: BCN Quiz\n  clientId: bcn-quiz"
                          className="min-h-64 font-mono text-xs"
                          required
                        />
                        <Button type="submit" disabled={busy}>
                          <Upload className="size-4" aria-hidden />
                          {t('importManifest')}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              ) : null}
            </Tabs>
          </div>
        ) : appsQuery.isLoading || appQuery.isLoading ? (
          <div className="space-y-4" aria-label={tc('loading')}>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : appsQuery.isError || appQuery.isError ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-2" role="alert">
              <p className="text-sm text-destructive">{t('loadError')}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void (appsQuery.isError
                    ? appsQuery.refetch()
                    : appQuery.refetch())
                }
              >
                {t('retry')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title={t('noApps')} description={t('createHint')} />
        )}
      </div>
    </PageShell>
  );
}
