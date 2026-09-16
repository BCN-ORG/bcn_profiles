import { request } from '@/lib/api';
import type {
  AuditLog,
  Identity,
  MembershipStatus,
  User,
  UserApplication,
  UserSession,
  TimelineEventType,
} from '@/types';

export const TIMELINE_EVENT_TYPES = [
  'JOIN_BCN',
  'COURSE_COMPLETE',
  'QUIZ_COMPLETE',
  'PROJECT_COMPLETE',
  'SEMESTER_COMPLETE',
] as const satisfies readonly TimelineEventType[];

export type { TimelineEventType } from '@/types';

export type TimelineEvent = {
  id: number;
  eventType: TimelineEventType;
  title: string;
  metadata?: unknown;
  createdAt: string;
};

export const authService = {
  me: () => request.get<{ user: User }>('/auth/me').then((r) => r.user),
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => request.post('/auth/register', body),
  login: (email: string, password: string) =>
    request.post<{
      requiresTwoFactorSetup?: boolean;
      requiresTwoFactorVerification?: boolean;
      setupToken?: string;
      verificationToken?: string;
      user?: User;
    }>('/auth/login', { email, password }),
  logout: () => request.post('/auth/logout'),
  refresh: () => request.post('/auth/refresh'),
  forgotPassword: (email: string) =>
    request.post('/auth/forgot-password', { email }),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    request.post('/auth/reset-password', { email, otp, newPassword }),
  requestEmailChange: (newEmail: string) =>
    request.post('/auth/change-email/request', { newEmail }),
  confirmEmailChange: (newEmail: string, otp: string) =>
    request.post('/auth/change-email/confirm', { newEmail, otp }),
  beginSocial: (provider: string) =>
    request.get<{ authorizationUrl: string }>(
      `/auth/social/${provider.toLowerCase()}`,
    ),
  verify2fa: (
    method: 'totp' | 'email' | 'backup-code',
    code: string,
    token: string,
  ) =>
    request.post(
      `/auth/2fa/verify/${method}`,
      { code },
      { Authorization: `Bearer ${token}` },
    ),
  sendEmailOtp: (token: string) =>
    request.post('/auth/2fa/send-email-otp', undefined, {
      Authorization: `Bearer ${token}`,
    }),
  setupInitiate: (password: string, token: string) =>
    request.post<{ secret: string; qrCode: string; setupToken: string }>(
      '/auth/2fa/setup/initiate',
      { password },
      { Authorization: `Bearer ${token}` },
    ),
  setupConfirm: (code: string, secret: string, token: string) =>
    request.post<{ backupCodes: string[] }>(
      '/auth/2fa/setup/confirm',
      { code, secret },
      { Authorization: `Bearer ${token}` },
    ),
  recoveryRequest: (email: string) =>
    request.post('/auth/2fa/recovery/request', { email }),
  recoveryVerify: (email: string, recoveryOtp: string) =>
    request.post<{ recoveryToken: string }>('/auth/2fa/recovery/verify-email', {
      email,
      recoveryOtp,
    }),
  recoveryReset: (password: string, recoveryToken: string) =>
    request.post(
      '/auth/2fa/recovery/reset',
      { password },
      { Authorization: `Bearer ${recoveryToken}` },
    ),
};

export const profileService = {
  update: (data: {
    fullName?: string;
    phone?: string;
    avatar?: string | null;
    avatarPublicId?: string | null;
    metadata?: { onboardingVersion?: number };
  }) => request.patch<{ users: User }>('/users/me', data).then((r) => r.users),
  avatarSignature: () =>
    request.post<{
      uploadUrl: string;
      publicId: string;
      secureUrl: string;
      method: string;
      maxBytes: number;
      expiresAt: string;
    }>('/users/me/avatar/upload-signature', {}),
  setAvatar: (avatar: string, avatarPublicId: string) =>
    request
      .patch<{ users: User }>('/users/me/avatar', {
        avatar,
        avatarPublicId,
      })
      .then((r) => r.users),
  clearAvatar: () => request.delete<{ users: User }>('/users/me/avatar'),
};

export const identityService = {
  list: () => request.get<Identity[]>('/me/identities'),
  link: (provider: string) =>
    request.post<{ authorizationUrl: string }>(
      `/me/identities/${provider.toLowerCase()}/link`,
    ),
  sync: (provider: string) =>
    request.post(`/me/identities/${provider.toLowerCase()}/sync`),
  unlink: (provider: string) =>
    request.delete(`/me/identities/${provider.toLowerCase()}`),
};

export const membershipService = {
  get: () => request.get<MembershipStatus>('/me/membership'),
  recheck: () => request.post<MembershipStatus>('/me/membership/recheck'),
  adminGet: (userId: string) =>
    request.get<MembershipStatus>(`/admin/users/${userId}/membership`),
  adminRecheck: (userId: string) =>
    request.post<MembershipStatus>(`/admin/users/${userId}/membership/recheck`),
  override: (
    userId: string,
    body: { status: 'ALLOW' | 'DENY'; reason: string; expiresAt: string },
  ) =>
    request.post<MembershipStatus>(
      `/admin/users/${userId}/membership/override`,
      body,
    ),
};

export const applicationService = {
  mine: () => request.get<UserApplication[]>('/me/applications'),
  adminList: (userId: string) =>
    request.get<UserApplication[]>(`/admin/users/${userId}/applications`),
  grant: (userId: string, app: string) =>
    request.post(`/admin/users/${userId}/applications/${app}/grant`),
  block: (userId: string, app: string) =>
    request.post(`/admin/users/${userId}/applications/${app}/block`),
  listRoles: (userId: string, app: string) =>
    request.get<string[]>(`/admin/users/${userId}/applications/${app}/roles`),
  assignRole: (userId: string, app: string, role: string) =>
    request.post(`/admin/users/${userId}/applications/${app}/roles/${role}`),
  removeRole: (userId: string, app: string, role: string) =>
    request.delete(`/admin/users/${userId}/applications/${app}/roles/${role}`),
};

export const sessionService = {
  list: () => request.get<UserSession[]>('/me/sessions'),
  revoke: (sid: string) => request.post(`/me/sessions/${sid}/revoke`),
  revokeOthers: () =>
    request.post<{ revoked: number }>('/me/sessions/revoke-others'),
};

export const securityService = {
  status: () =>
    request.get<{
      twoFactorEnabled: boolean;
      twoFactorRequired?: boolean;
      backupCodesRemaining?: number;
    }>('/auth/2fa/me/status'),
  enableInitiate: (password: string) =>
    request.post<{ secret: string; qrCode: string; setupToken: string }>(
      '/auth/2fa/me/enable/initiate',
      { password },
    ),
  enableConfirm: (code: string, secret: string, setupToken: string) =>
    request.post<{ backupCodes?: string[] }>(
      '/auth/2fa/me/enable/confirm',
      { code, secret },
      { Authorization: `Bearer ${setupToken}` },
    ),
  disable: (password: string, totpCode: string) =>
    request.post('/auth/2fa/me/disable', { password, totpCode }),
  adminStatus: (userId: string) =>
    request.get<{
      twoFactorEnabled: boolean;
      twoFactorRequired?: boolean;
    }>(`/auth/2fa/admin/status/${userId}`),
  adminReset: (userId: string, reason?: string) =>
    request.post(`/auth/2fa/admin/reset/${userId}`, reason ? { reason } : {}),
  adminRequire: (userId: string) =>
    request.post(`/auth/2fa/admin/require/${userId}`),
  adminUnrequire: (userId: string) =>
    request.post(`/auth/2fa/admin/unrequire/${userId}`),
};

export const adminUserService = {
  list: (search = '', opts?: { pending?: boolean; page?: number }) => {
    const q = new URLSearchParams({
      page: String(opts?.page ?? 1),
      limit: '50',
      search,
    });
    const path = opts?.pending ? `/users/pending?${q}` : `/users?${q}`;
    return request.get<{ data: User[]; meta?: { total: number } }>(path);
  },
  count: () => request.get<{ count: number }>('/users/count'),
  get: (id: string) =>
    request.get<{ users: User }>(`/users/${id}`).then((r) => r.users),
  create: (body: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
  }) => request.post('/users', body),
  remove: (id: string) => request.delete(`/users/${id}`),
  approve: (id: string) => request.patch(`/users/${id}/approve`),
  reject: (id: string) => request.delete(`/users/${id}/reject`),
  block: (id: string) => request.patch(`/users/${id}/block`),
  unblock: (id: string) => request.patch(`/users/${id}/unblock`),
};

export type RbacApplication = {
  id: string;
  code: string;
  name: string;
  clientId: string;
  status: 'ACTIVE' | 'DISABLED';
  require2fa: boolean;
  redirectUris: { id: string; redirectUri: string }[];
  roles: {
    id: string;
    code: string;
    name: string | null;
    description?: string | null;
    isSystem?: boolean;
    deprecated?: boolean;
    permissions: {
      permission: { id: string; code: string; description?: string | null };
    }[];
  }[];
  permissions: {
    id: string;
    code: string;
    description?: string | null;
    deprecated?: boolean;
  }[];
  managers: RbacManager[];
  _count?: { userAccess: number; userAppRoles?: number };
};

export type RbacManager = {
  userId: string;
  managerRole: string;
  assignedAt: string;
  user: { id: string; email: string; fullName?: string | null };
};

export type RbacAppUser = {
  id: string;
  status: string;
  createdAt: string;
  user: { id: string; email: string; fullName: string; status: string };
  roles: string[];
};

export const rbacService = {
  listApps: () => request.get<RbacApplication[]>('/admin/applications'),
  getApp: (code: string) =>
    request.get<RbacApplication>(`/admin/applications/${code}`),
  createApp: (body: {
    code: string;
    name: string;
    clientId: string;
    require2fa?: boolean;
    redirectUri?: string;
  }) => request.post<RbacApplication>('/admin/applications', body),
  updateApp: (
    code: string,
    body: {
      name?: string;
      clientId?: string;
      status?: 'ACTIVE' | 'DISABLED';
      require2fa?: boolean;
    },
  ) => request.patch<RbacApplication>(`/admin/applications/${code}`, body),
  addRedirectUri: (code: string, redirectUri: string) =>
    request.post(`/admin/applications/${code}/redirect-uris`, { redirectUri }),
  removeRedirectUri: (code: string, redirectUri: string) =>
    request.delete(`/admin/applications/${code}/redirect-uris`, {
      redirectUri,
    }),
  createRole: (code: string, body: { code: string; name?: string }) =>
    request.post(`/admin/applications/${code}/roles`, body),
  deleteRole: (code: string, role: string) =>
    request.delete(`/admin/applications/${code}/roles/${role}`),
  createPermission: (
    code: string,
    body: { code: string; description?: string },
  ) => request.post(`/admin/applications/${code}/permissions`, body),
  deletePermission: (code: string, permission: string) =>
    request.delete(`/admin/applications/${code}/permissions/${permission}`),
  grantRolePermission: (code: string, role: string, permission: string) =>
    request.post(
      `/admin/applications/${code}/roles/${role}/permissions/${permission}`,
    ),
  revokeRolePermission: (code: string, role: string, permission: string) =>
    request.delete(
      `/admin/applications/${code}/roles/${role}/permissions/${permission}`,
    ),
  setRolePermissions: (code: string, role: string, permissions: string[]) =>
    request.put(`/admin/applications/${code}/roles/${role}/permissions`, {
      permissions,
    }),
  listAppUsers: (code: string) =>
    request.get<RbacAppUser[]>(`/admin/applications/${code}/users`),
  listManagers: (code: string) =>
    request.get<RbacManager[]>(`/admin/applications/${code}/managers`),
  addManager: (code: string, userId: string) =>
    request.post(`/admin/applications/${code}/managers/${userId}`),
  removeManager: (code: string, userId: string) =>
    request.delete(`/admin/applications/${code}/managers/${userId}`),
  importManifest: (content: string) =>
    request.post<RbacApplication>('/admin/applications/import', { content }),
};

export const auditService = {
  list: (params: { userId?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.userId) query.set('userId', params.userId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query}` : '';
    return request.get<{
      data: AuditLog[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/admin/audit${suffix}`);
  },
};

export const timelineService = {
  mine: (page = 1, limit = 20) =>
    request.get<TimelineEvent[]>(
      `/timeline-events/my-timeline?page=${page}&limit=${limit}`,
    ),
  createForUser: (userId: string, body: {
    eventType: TimelineEventType;
    title: string;
    metadata?: Record<string, unknown>;
  }) => request.post<TimelineEvent>(`/timeline-events/users/${userId}`, body),
  update: (
    id: number,
    body: Partial<Pick<TimelineEvent, 'eventType' | 'title' | 'metadata'>>,
  ) => request.patch<TimelineEvent>(`/timeline-events/${id}`, body),
  remove: (id: number) => request.delete(`/timeline-events/${id}`),
};
