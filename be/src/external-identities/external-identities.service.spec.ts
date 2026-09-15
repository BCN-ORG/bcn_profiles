import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ExternalIdentitiesService } from './external-identities.service';

describe('ExternalIdentitiesService', () => {
  function createService(findUnique: jest.Mock) {
    const values = new Map<string, string>();
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
    const prisma = {
      externalIdentity: {
        findUnique,
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const providers = {
      authorizationUrl: jest.fn((_provider: string, state: string) => state),
      exchange: jest.fn().mockResolvedValue({ access_token: 'provider-token' }),
      identity: jest.fn().mockResolvedValue({
        provider: 'GOOGLE',
        subject: 'google-123',
        email: 'same-email@example.com',
        profileData: {},
      }),
    };
    const authorization = { audit: jest.fn() };
    const membership = {
      verifyDiscord: jest.fn(),
      disconnectDiscord: jest.fn(),
    };
    return new ExternalIdentitiesService(
      prisma as any,
      redis as any,
      providers as any,
      authorization as any,
      membership as any,
    );
  }

  it('does not auto-link an unknown provider identity by matching email', async () => {
    const service = createService(jest.fn().mockResolvedValue(null));
    const { authorizationUrl: state } = await service.begin('google', 'login');

    await expect(
      service.callback('google', state, 'provider-code'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'IDENTITY_NOT_LINKED' }),
    });
  });

  it('rejects linking an identity already owned by another BCN user', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'identity-1', userId: 'user-b' });
    const service = createService(findUnique);
    const { authorizationUrl: state } = await service.begin(
      'google',
      'link',
      'user-a',
    );

    await expect(
      service.callback('google', state, 'provider-code'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects reuse of an OAuth state value', async () => {
    const service = createService(jest.fn().mockResolvedValue(null));
    const { authorizationUrl: state } = await service.begin('google', 'login');
    await expect(
      service.callback('google', state, 'code'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.callback('google', state, 'code'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'OAUTH_STATE_INVALID' }),
    });
  });
});
