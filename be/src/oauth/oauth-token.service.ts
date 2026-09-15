import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from 'crypto';
import { readFileSync } from 'fs';

export type BcnAccessToken = {
  iss: string;
  sub: string;
  aud: string;
  sid: string;
  iat: number;
  exp: number;
};

@Injectable()
export class OauthTokenService {
  private readonly logger = new Logger(OauthTokenService.name);
  private readonly issuer: string;
  private readonly kid: string;
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  readonly lifetimeSeconds: number;

  constructor(config: ConfigService) {
    this.issuer =
      config.get<string>('OAUTH_ISSUER')?.trim() ||
      'https://profiles.bcn.id.vn';
    this.kid =
      config.get<string>('JWT_RS256_KID')?.trim() || 'bcn-profiles-2026-01';
    this.lifetimeSeconds = Number(
      config.get<string>('OAUTH_ACCESS_TOKEN_TTL_SECONDS') ?? 900,
    );
    const privatePem = this.readPem(
      config.get<string>('JWT_RS256_PRIVATE_KEY'),
      config.get<string>('JWT_RS256_PRIVATE_KEY_FILE'),
    );
    const publicPem = this.readPem(
      config.get<string>('JWT_RS256_PUBLIC_KEY'),
      config.get<string>('JWT_RS256_PUBLIC_KEY_FILE'),
    );

    if (privatePem) {
      this.privateKey = createPrivateKey(privatePem);
      this.publicKey = publicPem
        ? createPublicKey(publicPem)
        : createPublicKey(this.privateKey);
    } else {
      if (config.get<string>('NODE_ENV') === 'production') {
        throw new Error(
          'JWT_RS256_PRIVATE_KEY environment variable is required',
        );
      }
      const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
      this.privateKey = pair.privateKey;
      this.publicKey = pair.publicKey;
      this.logger.warn('Using an ephemeral RS256 key outside production');
    }
  }

  issue(sub: string, aud: string, sid: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'RS256', typ: 'at+jwt', kid: this.kid });
    const payload = this.encode({
      iss: this.issuer,
      sub,
      aud,
      sid,
      iat: now,
      exp: now + this.lifetimeSeconds,
    });
    const data = `${header}.${payload}`;
    return `${data}.${sign('RSA-SHA256', Buffer.from(data), this.privateKey).toString('base64url')}`;
  }

  validate(token: string, audience?: string): BcnAccessToken {
    const [headerPart, payloadPart, signaturePart, extra] = token.split('.');
    if (!headerPart || !payloadPart || !signaturePart || extra) this.invalid();
    try {
      const header = JSON.parse(
        Buffer.from(headerPart, 'base64url').toString(),
      ) as Record<string, unknown>;
      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString(),
      ) as BcnAccessToken;
      const validSignature = verify(
        'RSA-SHA256',
        Buffer.from(`${headerPart}.${payloadPart}`),
        this.publicKey,
        Buffer.from(signaturePart, 'base64url'),
      );
      if (
        !validSignature ||
        header.alg !== 'RS256' ||
        header.typ !== 'at+jwt' ||
        header.kid !== this.kid ||
        payload.iss !== this.issuer ||
        !payload.sub ||
        !payload.aud ||
        !payload.sid ||
        !Number.isInteger(payload.iat) ||
        !Number.isInteger(payload.exp) ||
        payload.exp <= Math.floor(Date.now() / 1000) ||
        (audience !== undefined && payload.aud !== audience)
      ) {
        this.invalid();
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      return this.invalid();
    }
  }

  jwks() {
    const jwk = this.publicKey.export({ format: 'jwk' });
    return { keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: this.kid }] };
  }

  private readPem(value?: string, file?: string): string | undefined {
    const path = file?.trim();
    if (path) return readFileSync(path, 'utf8');
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    const decoded = trimmed.includes('BEGIN')
      ? trimmed
      : Buffer.from(trimmed, 'base64').toString();
    return decoded.replace(/\\n/g, '\n');
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private invalid(): never {
    throw new UnauthorizedException({
      code: 'TOKEN_INVALID',
      message: 'Token is invalid',
    });
  }
}
