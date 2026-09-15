import { request } from '@/lib/api';
import type {
  AuditLog,
  Identity,
  MembershipStatus,
  User,
  UserApplication,
  UserSession,
} from '@/types';

export const authService = {
  me: () => request.get<{ user: User }>('/auth/me').then((r) => r.user),
  login: (email: string, password: string) =>
    request.post<{
      requiresTwoFactorSetup?: boolean;
      requiresTwoFactorVerification?: boolean;
      setupToken?: string;
      verificationToken?: string;
      user?: User;
    }>('/auth/login', { email, password }),
  logout: () => request.post('/auth/logout'),
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
  beginDiscordMembership: (email: string, password: string) =>
    request.post<{ authorizationUrl: string }>('/auth/membership/discord', {
      email,
      password,
    }),
};

export const profileService = {
  update: (data: {
    fullName?: string;
    phone?: string;
    metadata?: { onboardingVersion?: number };
  }) =>
    request.patch<{ users: User }>('/users/me', data).then((r) => r.users),
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
    request
      .get<{
        twoFactorEnabled: boolean;
        twoFactorRequired?: boolean;
        backupCodesRemaining?: number;
      }>('/auth/2fa/me/status')
      .then((r) => ({
        enabled: r.twoFactorEnabled,
        required: r.twoFactorRequired,
      })),
  disable: (password: string) =>
    request.post('/auth/2fa/me/disable', { password }),
};

export const adminUserService = {
  list: (search = '') =>
    request.get<{ data: User[] }>(
      `/users?page=1&limit=50&search=${encodeURIComponent(search)}`,
    ),
  get: (id: string) =>
    request.get<{ users: User }>(`/users/${id}`).then((r) => r.users),
  approve: (id: string) => request.patch(`/users/${id}/approve`),
  reject: (id: string) => request.delete(`/users/${id}/reject`),
  block: (id: string) => request.patch(`/users/${id}/block`),
  unblock: (id: string) => request.patch(`/users/${id}/unblock`),
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
