import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function setup(previousStatus?: 'VERIFIED' | 'NOT_MEMBER') {
    const prisma = {
      membershipSource: {
        upsert: jest.fn().mockResolvedValue({
          id: 'membership-discord-bcn',
          externalGroupId: 'guild-123',
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'membership-discord-bcn',
          externalGroupId: 'guild-123',
        }),
      },
      userMembership: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            previousStatus ? { status: previousStatus } : null,
          ),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      membershipOverride: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      externalIdentity: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      authAuditLog: { create: jest.fn() },
    };
    const redis = {
      getJson: jest.fn().mockResolvedValue(
        previousStatus === 'VERIFIED'
          ? {
              eligible: true,
              policy: 'ANY_TRUSTED_GROUP',
              sources: { discord: { status: 'VERIFIED' } },
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
            }
          : null,
      ),
      setJson: jest.fn(),
      del: jest.fn(),
      delByPrefix: jest.fn(),
    };
    const sessions = { revokeAllUserSessions: jest.fn() };
    const config = {
      get: jest.fn((key: string) =>
        key === 'DISCORD_GUILD_ID' ? 'guild-123' : undefined,
      ),
    } as unknown as ConfigService;
    return {
      service: new MembershipService(
        prisma as any,
        redis as any,
        sessions as any,
        config,
      ),
      prisma,
      sessions,
      redis,
    };
  }

  it('verifies membership using Discord current-user guild endpoint', async () => {
    const { service, prisma } = setup();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'discord-1' }, roles: [] }), {
        status: 200,
      }),
    );

    await expect(
      service.verifyDiscord('user-1', 'discord-1', 'access-token'),
    ).resolves.toMatchObject({
      eligible: true,
      policy: 'ANY_TRUSTED_GROUP',
      sources: { discord: { status: 'VERIFIED' } },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://discord.com/api/v10/users/@me/guilds/guild-123/member',
      { headers: { authorization: 'Bearer access-token' } },
    );
    expect(prisma.userMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    );
  });

  it('revokes every session when the last verified membership is lost', async () => {
    const { service, sessions } = setup('VERIFIED');
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      service.verifyDiscord('user-1', 'discord-1', 'access-token'),
    ).resolves.toMatchObject({ eligible: false });
    expect(sessions.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
  });

  it('fails closed when Discord cannot verify membership', async () => {
    const { service } = setup();
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      service.verifyDiscord('user-1', 'discord-1', 'access-token'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('applies ALLOW override over missing provider membership', async () => {
    const { service, prisma } = setup();
    prisma.membershipOverride.findFirst.mockResolvedValue({
      status: 'ALLOW',
      reason: 'advisor access',
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    prisma.externalIdentity.findUnique.mockResolvedValue(null);

    await expect(service.check('user-1')).resolves.toMatchObject({
      eligible: true,
      policy: 'ANY_TRUSTED_GROUP',
      override: { status: 'ALLOW' },
    });
  });
});
