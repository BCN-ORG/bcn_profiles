import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './services/email.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { AuthSessionCacheService } from './services/auth-session-cache.service';
import { TokenRevocationService } from './services/token-revocation.service';
import { EmailOtpService } from './services/email-otp.service';
import * as bcrypt from 'bcrypt';
import { IdentitySessionService } from '../identity/session.service';
import { MembershipService } from '../membership/membership.service';

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let cache: {
    setUser: jest.Mock;
    getRevokedBefore: jest.Mock;
    invalidateUser: jest.Mock;
    setRevokedBefore: jest.Mock;
  };
  let sessions: { revokeOtherUserSessions: jest.Mock };
  let membership: { assertEligible: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
    };
    cache = {
      setUser: jest.fn(),
      getRevokedBefore: jest.fn(),
      invalidateUser: jest.fn(),
      setRevokedBefore: jest.fn(),
    };
    sessions = { revokeOtherUserSessions: jest.fn() };
    membership = { assertEligible: jest.fn() };
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
        { provide: EmailService, useValue: {} },
        { provide: EmailOtpService, useValue: {} },
        { provide: TwoFactorAuthService, useValue: {} },
        {
          provide: AuthSessionCacheService,
          useValue: cache,
        },
        {
          provide: TokenRevocationService,
          useValue: {
            isRevoked: jest.fn().mockResolvedValue(false),
            revoke: jest.fn(),
          },
        },
        {
          provide: IdentitySessionService,
          useValue: sessions,
        },
        {
          provide: MembershipService,
          useValue: membership,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    const user = {
      id: 'u1',
      email: 'test@example.invalid',
      role: 'USER',
      status: 'ACTIVE',
      fullName: null,
      avatar: null,
    };
    const jwt = module.get<JwtService>(JwtService);
    prisma.user.findUnique.mockResolvedValue(user);
    (jwt.sign as jest.Mock).mockImplementation((payload) =>
      JSON.stringify(payload),
    );
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'u1',
      type: 'refresh',
      jti: 'r1',
      iat: 1800000000,
      issuedAtMs: 1800000000600,
    });
    cache.getRevokedBefore.mockResolvedValue(1800000000500);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('refreshes immediately after revocation within the same JWT second', async () => {
    const result = await service.refreshTokens('test-refresh');
    expect(result.access_token).toBeDefined();
    expect(JSON.parse(result.access_token).issuedAtMs).toEqual(
      expect.any(Number),
    );
    expect(JSON.parse(result.refresh_token).issuedAtMs).toBe(
      JSON.parse(result.access_token).issuedAtMs,
    );
  });

  it('changes a default password and clears the required-change flag', async () => {
    prisma.user.findUnique.mockResolvedValue({
      password: await bcrypt.hash('111111', 4),
      metadata: { mustChangePassword: true, cohort: 'K20' },
    });

    const result = await service.changePassword('u1', '111111', 'new-password');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        password: expect.any(String),
        metadata: { mustChangePassword: false, cohort: 'K20' },
      }),
    });
    expect(cache.invalidateUser).toHaveBeenCalledWith('u1');
    expect(cache.setRevokedBefore).toHaveBeenCalledWith(
      'u1',
      expect.any(Number),
    );
    const revokedBefore = cache.setRevokedBefore.mock.calls[0][1];
    expect(JSON.parse(result.access_token).issuedAtMs).toBe(revokedBefore + 1);
    expect(sessions.revokeOtherUserSessions).toHaveBeenCalledWith(
      'u1',
      undefined,
    );
  });

  it('marks an existing account when it logs in with the default password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@example.invalid',
      password: await bcrypt.hash('111111', 4),
      status: 'ACTIVE',
      metadata: { cohort: 'K20' },
    });

    const user = await service.validateUser('test@example.invalid', '111111');

    expect(user.metadata).toEqual({
      cohort: 'K20',
      mustChangePassword: true,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        metadata: { cohort: 'K20', mustChangePassword: true },
      },
    });
  });

  it('completes onboarding only after a fresh membership check', async () => {
    prisma.user.findUnique.mockResolvedValue({
      metadata: { mustChangePassword: false, cohort: 'K20' },
    });

    await expect(service.completeOnboarding('u1')).resolves.toEqual({
      completed: true,
    });

    expect(membership.assertEligible).toHaveBeenCalledWith('u1', true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        metadata: {
          mustChangePassword: false,
          cohort: 'K20',
          onboardingVersion: 1,
        },
      }),
    });
  });
});
