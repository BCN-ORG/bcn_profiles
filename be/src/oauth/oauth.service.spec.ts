import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'crypto';
import { OauthService } from './oauth.service';

describe('OauthService', () => {
  const verifier = 'a'.repeat(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  let values: Map<string, string>;
  let service: OauthService;
  let sessions: any;
  let authorization: any;
  let prisma: any;

  beforeEach(() => {
    values = new Map();
    const redis = {
      key: (key: string) => key,
      setJson: jest.fn((key: string, value: unknown) => {
        values.set(key, JSON.stringify(value));
      }),
      raw: {
        call: jest.fn((_command: string, key: string) => {
          const value = values.get(key) ?? null;
          values.delete(key);
          return value;
        }),
      },
    };
    sessions = {
      hash: (value: string) =>
        createHash('sha256').update(value).digest('base64url'),
      createAppSession: jest.fn().mockResolvedValue({
        sid: 'sid-1',
        refreshToken: 'refresh-1',
      }),
    };
    authorization = {
      getApplication: jest.fn().mockResolvedValue({
        id: 'app-quiz',
        code: 'QUIZ',
        clientId: 'bcn-quiz',
        status: 'ACTIVE',
        require2fa: false,
      }),
      assertAccess: jest.fn(),
      audit: jest.fn(),
    };
    prisma = {
      applicationRedirectUri: {
        findUnique: jest.fn().mockResolvedValue({ id: 'redirect-1' }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
    };
    const tokens = {
      lifetimeSeconds: 900,
      issue: jest.fn().mockReturnValue('access-1'),
    };
    const membership = {
      assertEligible: jest.fn().mockResolvedValue({
        sources: { discord: { checkedAt: new Date().toISOString() } },
      }),
    };
    service = new OauthService(
      prisma,
      redis as any,
      sessions,
      authorization,
      tokens as any,
      membership as any,
    );
  });

  it('uses an exact redirect, PKCE S256, and a single-use authorization code', async () => {
    const grant = await service.authorize(
      {
        client_id: 'bcn-quiz',
        redirect_uri: 'https://quiz.bcn.id.vn/auth/callback',
        response_type: 'code',
        state: 'state',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      },
      {
        userId: 'user-1',
        status: 'ACTIVE',
        authLevel: 'AAL1',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    );
    const result = await service.exchange({
      grant_type: 'authorization_code',
      client_id: 'bcn-quiz',
      redirect_uri: 'https://quiz.bcn.id.vn/auth/callback',
      code: grant.code,
      code_verifier: verifier,
    });

    expect(result).toEqual({
      access_token: 'access-1',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'refresh-1',
    });
    await expect(
      service.exchange({
        grant_type: 'authorization_code',
        client_id: 'bcn-quiz',
        redirect_uri: 'https://quiz.bcn.id.vn/auth/callback',
        code: grant.code,
        code_verifier: verifier,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid PKCE verifier', async () => {
    const grant = await service.authorize(
      {
        client_id: 'bcn-quiz',
        redirect_uri: 'https://quiz.bcn.id.vn/auth/callback',
        response_type: 'code',
        state: 'state',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      },
      {
        userId: 'user-1',
        status: 'ACTIVE',
        authLevel: 'AAL1',
        createdAt: '',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    );
    await expect(
      service.exchange({
        grant_type: 'authorization_code',
        client_id: 'bcn-quiz',
        redirect_uri: 'https://quiz.bcn.id.vn/auth/callback',
        code: grant.code,
        code_verifier: 'b'.repeat(43),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sessions.createAppSession).not.toHaveBeenCalled();
  });

  it('blocks app authorization until the default password is changed', async () => {
    prisma.user.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      metadata: { mustChangePassword: true },
    });

    await expect(
      service.authorize(
        {
          client_id: 'bcn-quiz',
          redirect_uri: 'https://quiz.bcn.id.vn/auth/callback',
          response_type: 'code',
          state: 'state',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        },
        {
          userId: 'user-1',
          status: 'ACTIVE',
          authLevel: 'AAL1',
          createdAt: '',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      ),
    ).rejects.toMatchObject<ForbiddenException>({
      response: expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }),
    });
    expect(sessions.createAppSession).not.toHaveBeenCalled();
  });
});
