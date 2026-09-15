'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  KeyRound,
  Link2,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  Button,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { rbacService, type RbacApplication } from '@/services';
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
import { cn } from '@/lib/utils';

function roleHasPermission(
  app: RbacApplication,
  roleCode: string,
  permCode: string,
) {
  const role = app.roles.find((r) => r.code === roleCode);
  return role?.permissions.some((p) => p.permission.code === permCode) ?? false;
}

export default function AdminRbacPage() {
  const t = useTranslations('rbac');
  const tc = useTranslations('common');
  const queryClient = useQueryClient();
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
  });
  const [newUri, setNewUri] = useState('');
  const [newRole, setNewRole] = useState({ code: '', name: '' });
  const [newPerm, setNewPerm] = useState({ code: '', description: '' });

  const appsQuery = useQuery({
    queryKey: ['admin', 'rbac', 'apps'],
    queryFn: () => rbacService.listApps(),
  });

  const apps = appsQuery.data ?? [];
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
  const activeRoleCode =
    selectedRole && app?.roles.some((r) => r.code === selectedRole)
      ? selectedRole
      : (app?.roles[0]?.code ?? null);

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'rbac'] });
  }

  async function run(action: () => Promise<unknown>, ok = t('saved')) {
    setBusy(true);
    try {
      await action();
      await invalidate();
      toast.success(ok);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    } finally {
      setBusy(false);
    }
  }

  async function createApp(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const created = await rbacService.createApp({
        code: createForm.code,
        name: createForm.name,
        clientId: createForm.clientId,
        require2fa: createForm.require2fa,
        redirectUri: createForm.redirectUri || undefined,
      });
      setSelectedCode(created.code);
      setCreateForm({
        code: '',
        name: '',
        clientId: '',
        redirectUri: '',
        require2fa: false,
      });
      setShowCreate(false);
    }, t('appCreated'));
  }

  return (
    <PageShell>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="size-4" aria-hidden />
            {t('createApp')}
          </Button>
        }
      />

      {showCreate ? (
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
                  <Label>{label}</Label>
                  <Input
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

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* App picker */}
        <Card className="h-fit xl:sticky xl:top-20">
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
                    'rounded-xl px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'bg-primary/10 ring-1 ring-primary/20'
                      : 'hover:bg-muted/70',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        item.status === 'ACTIVE'
                          ? 'bg-primary'
                          : 'bg-muted-foreground/40',
                      )}
                    />
                    <span
                      className={cn(
                        'truncate text-sm font-semibold',
                        active && 'text-primary',
                      )}
                    >
                      {item.code}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate pl-4 text-xs text-muted-foreground">
                    {item.name}
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-2 pl-4 text-[10px] text-muted-foreground">
                    <span>
                      {item.roles.length} {t('rolesShort')}
                    </span>
                    <span>·</span>
                    <span>
                      {item.permissions.length} {t('permsShort')}
                    </span>
                    <span>·</span>
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
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5 md:flex-row md:items-start md:justify-between">
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
                  </div>
                  <dl className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="inline text-xs uppercase tracking-wide">
                        {t('code')} ·{' '}
                      </dt>
                      <dd className="inline font-mono text-foreground">
                        {app.code}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-xs uppercase tracking-wide">
                        {t('clientId')} ·{' '}
                      </dt>
                      <dd className="inline font-mono text-foreground">
                        {app.clientId}
                      </dd>
                    </div>
                  </dl>
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
                      {app._count?.userAccess ?? usersQuery.data?.length ?? 0}{' '}
                      {t('usersShort')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        rbacService.updateApp(app.code, {
                          status:
                            app.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                        }),
                      )
                    }
                  >
                    {app.status === 'ACTIVE' ? t('disable') : t('enable')}
                  </Button>
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
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="access">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="access">{t('tabAccess')}</TabsTrigger>
                <TabsTrigger value="uris">{t('tabUris')}</TabsTrigger>
                <TabsTrigger value="users">{t('tabUsers')}</TabsTrigger>
              </TabsList>

              {/* Role + permission (role-centric) */}
              <TabsContent value="access" className="mt-4 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{t('tabRoles')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3">
                      <form
                        className="space-y-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(async () => {
                            await rbacService.createRole(app.code, newRole);
                            setSelectedRole(newRole.code.toUpperCase());
                            setNewRole({ code: '', name: '' });
                          });
                        }}
                      >
                        <Input
                          placeholder={t('roleCode')}
                          value={newRole.code}
                          onChange={(e) =>
                            setNewRole((r) => ({ ...r, code: e.target.value }))
                          }
                          required
                          className="h-9"
                        />
                        <Input
                          placeholder={t('roleName')}
                          value={newRole.name}
                          onChange={(e) =>
                            setNewRole((r) => ({ ...r, name: e.target.value }))
                          }
                          className="h-9"
                        />
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
                      <div className="flex flex-col gap-1">
                        {app.roles.map((role) => {
                          const on = activeRoleCode === role.code;
                          return (
                            <div
                              key={role.id}
                              className={cn(
                                'flex items-center gap-1 rounded-xl',
                                on && 'bg-primary/10',
                              )}
                            >
                              <button
                                type="button"
                                className="min-w-0 flex-1 rounded-xl px-3 py-2 text-left"
                                onClick={() => setSelectedRole(role.code)}
                              >
                                <span className="block truncate text-sm font-medium">
                                  {role.code}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {role.name}
                                </span>
                              </button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                disabled={busy}
                                aria-label={t('remove')}
                                onClick={() =>
                                  run(() =>
                                    rbacService.deleteRole(app.code, role.code),
                                  )
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
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
                        {activeRoleCode
                          ? t('permsForRole', { role: activeRoleCode })
                          : t('tabPerms')}
                      </CardTitle>
                      <CardDescription>{t('accessHint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form
                        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
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
                        <Input
                          placeholder="app.resource.action"
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
                        <Input
                          placeholder={t('permDesc')}
                          value={newPerm.description}
                          onChange={(e) =>
                            setNewPerm((p) => ({
                              ...p,
                              description: e.target.value,
                            }))
                          }
                          className="h-9"
                        />
                        <Button type="submit" size="sm" disabled={busy}>
                          <Plus className="size-3.5" aria-hidden />
                          {t('addPerm')}
                        </Button>
                      </form>

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
                                className="flex items-center gap-3 px-3 py-2.5"
                              >
                                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    className="mt-1 size-4 accent-[var(--primary)]"
                                    checked={granted}
                                    disabled={busy}
                                    onChange={() =>
                                      run(() =>
                                        granted
                                          ? rbacService.revokeRolePermission(
                                              app.code,
                                              activeRoleCode,
                                              perm.code,
                                            )
                                          : rbacService.grantRolePermission(
                                              app.code,
                                              activeRoleCode,
                                              perm.code,
                                            ),
                                      )
                                    }
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-mono text-xs font-medium">
                                      {perm.code}
                                    </span>
                                    {perm.description ? (
                                      <span className="block text-xs text-muted-foreground">
                                        {perm.description}
                                      </span>
                                    ) : null}
                                  </span>
                                </label>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                  disabled={busy}
                                  aria-label={t('remove')}
                                  onClick={() =>
                                    run(() =>
                                      rbacService.deletePermission(
                                        app.code,
                                        perm.code,
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="uris" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('tabUris')}</CardTitle>
                    <CardDescription>{t('uriHint')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form
                      className="flex flex-col gap-2 sm:flex-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newUri.trim()) return;
                        run(async () => {
                          await rbacService.addRedirectUri(app.code, newUri);
                          setNewUri('');
                        });
                      }}
                    >
                      <Input
                        placeholder="https://app.example/auth/callback"
                        value={newUri}
                        onChange={(e) => setNewUri(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={busy}>
                        <Plus className="size-4" aria-hidden />
                        {t('addUri')}
                      </Button>
                    </form>
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
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                run(() =>
                                  rbacService.removeRedirectUri(
                                    app.code,
                                    uri.redirectUri,
                                  ),
                                )
                              }
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              {t('remove')}
                            </Button>
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
                    <CardTitle className="text-sm">{t('tabUsers')}</CardTitle>
                    <CardDescription>{t('usersHint')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(usersQuery.data ?? []).length === 0 ? (
                      <EmptyState title={t('noUsers')} />
                    ) : (
                      <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
                        {(usersQuery.data ?? []).map((row) => (
                          <li
                            key={row.id}
                            className="flex flex-wrap items-center gap-3 px-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {row.user.fullName || row.user.email}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.user.email}
                              </p>
                            </div>
                            <StatusBadge status={row.status} />
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/users/${row.user.id}`}>
                                {t('manageUser')}
                              </Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : appsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{tc('loading')}</p>
        ) : (
          <EmptyState title={t('noApps')} description={t('createHint')} />
        )}
      </div>
    </PageShell>
  );
}
