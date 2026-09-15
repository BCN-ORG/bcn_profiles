import { UnauthorizedException } from '@nestjs/common';
import { IdentitySessionService } from './session.service';

describe('IdentitySessionService', () => {
  it('rotates opaque refresh tokens and revokes the session on reuse', async () => {
    const values = new Map<string, string>();
    const sets = new Map<string, Set<string>>();
    const raw = {
      sadd: jest.fn((key: string, value: string) => {
        const set = sets.get(key) ?? new Set<string>();
        set.add(value);
        sets.set(key, set);
      }),
      srem: jest.fn((key: string, value: string) =>
        sets.get(key)?.delete(value),
      ),
      smembers: jest.fn((key: string) => [...(sets.get(key) ?? [])]),
      del: jest.fn((key: string) => values.delete(key)),
      get: jest.fn((key: string) => values.get(key) ?? null),
      set: jest.fn((key: string, value: string) => values.set(key, value)),
      pexpire: jest.fn(),
      call: jest.fn((_command: string, key: string) => {
        const value = values.get(key) ?? null;
        values.delete(key);
        return value;
      }),
    };
    const redis = {
      raw,
      key: (key: string) => key,
      set: jest.fn((key: string, value: string) => values.set(key, value)),
      setJson: jest.fn((key: string, value: unknown) =>
        values.set(key, JSON.stringify(value)),
      ),
      getJson: jest.fn((key: string) => {
        const value = values.get(key);
        return value ? JSON.parse(value) : undefined;
      }),
      del: jest.fn((...keys: string[]) =>
        keys.reduce((count, key) => count + Number(values.delete(key)), 0),
      ),
    };
    const service = new IdentitySessionService(redis as any);
    const created = await service.createAppSession('user-1', 'quiz');
    const rotated = await service.rotateRefreshToken(created.refreshToken);

    expect(rotated.refreshToken).not.toBe(created.refreshToken);
    expect(await service.getAppSession(created.sid)).toMatchObject({
      status: 'ACTIVE',
      refreshTokenHash: service.hash(rotated.refreshToken),
    });
    await expect(
      service.rotateRefreshToken(created.refreshToken),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(await service.getAppSession(created.sid)).toBeUndefined();
  });
});
