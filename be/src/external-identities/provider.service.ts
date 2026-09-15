import { BadGatewayException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type { ExternalProvider } from 'prisma/client/enums';

export type ProviderIdentity = {
  provider: ExternalProvider;
  subject: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  profileData: object;
};

type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  userUrl: string;
  scope: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

@Injectable()
export class ExternalProviderService {
  constructor(private readonly config: ConfigService) {}

  authorizationUrl(
    provider: ExternalProvider,
    state: string,
    codeVerifier?: string,
  ): string {
    const value = this.providerConfig(provider);
    const url = new URL(value.authorizeUrl);
    url.searchParams.set(
      provider === 'ZALO' ? 'app_id' : 'client_id',
      value.clientId,
    );
    url.searchParams.set('redirect_uri', value.redirectUri);
    url.searchParams.set('state', state);
    if (provider === 'ZALO') {
      if (codeVerifier) {
        url.searchParams.set(
          'code_challenge',
          createHash('sha256').update(codeVerifier).digest('base64url'),
        );
      }
      return url.toString();
    }
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', value.scope);
    return url.toString();
  }

  async exchange(
    provider: ExternalProvider,
    code: string,
    codeVerifier?: string,
  ) {
    const value = this.providerConfig(provider);
    const response = await fetch(value.tokenUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        ...(provider === 'ZALO' ? { secret_key: value.clientSecret } : {}),
      },
      body: new URLSearchParams(
        provider === 'ZALO'
          ? {
              app_id: value.clientId,
              grant_type: 'authorization_code',
              code,
              ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
            }
          : {
              client_id: value.clientId,
              client_secret: value.clientSecret,
              redirect_uri: value.redirectUri,
              grant_type: 'authorization_code',
              code,
            },
      ),
    });
    const body = (await response.json()) as TokenResponse;
    if (!response.ok || !body.access_token) this.providerFailure(provider);
    return body as Required<Pick<TokenResponse, 'access_token'>> &
      TokenResponse;
  }

  async identity(
    provider: ExternalProvider,
    accessToken: string,
  ): Promise<ProviderIdentity> {
    const value = this.providerConfig(provider);
    const url = new URL(value.userUrl);
    if (provider === 'ZALO') url.searchParams.set('access_token', accessToken);
    const response = await fetch(url, {
      headers:
        provider === 'ZALO'
          ? {}
          : {
              authorization: `Bearer ${accessToken}`,
              accept: 'application/json',
            },
    });
    const profile = (await response.json()) as Record<string, unknown>;
    if (!response.ok) this.providerFailure(provider);
    const subjectValue = profile.sub ?? profile.id;
    const subject =
      typeof subjectValue === 'string' || typeof subjectValue === 'number'
        ? String(subjectValue)
        : '';
    if (!subject) this.providerFailure(provider);
    return {
      provider,
      subject,
      email: this.string(profile.email),
      username: this.string(profile.login ?? profile.username),
      displayName: this.string(profile.name ?? profile.display_name),
      avatarUrl: this.avatar(provider, profile),
      profileData: profile,
    };
  }

  private providerConfig(provider: ExternalProvider): ProviderConfig {
    const defaults: Record<
      ExternalProvider,
      Omit<ProviderConfig, 'clientId' | 'clientSecret' | 'redirectUri'>
    > = {
      GOOGLE: {
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scope: 'openid email profile',
      },
      GITHUB: {
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userUrl: 'https://api.github.com/user',
        scope: 'read:user user:email',
      },
      DISCORD: {
        authorizeUrl: 'https://discord.com/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userUrl: 'https://discord.com/api/users/@me',
        scope: 'identify email guilds.members.read',
      },
      ZALO: {
        authorizeUrl:
          this.config.get<string>('ZALO_AUTHORIZE_URL') ||
          'https://oauth.zaloapp.com/v4/permission',
        tokenUrl:
          this.config.get<string>('ZALO_TOKEN_URL') ||
          'https://oauth.zaloapp.com/v4/access_token',
        userUrl:
          this.config.get<string>('ZALO_USER_URL') ||
          'https://graph.zalo.me/v2.0/me?fields=id,name,picture',
        scope: '',
      },
    };
    const envPrefix = provider === 'GITHUB' ? 'OAUTH_GITHUB' : provider;
    const clientId = this.config.get<string>(`${envPrefix}_CLIENT_ID`)?.trim();
    const clientSecret = this.config
      .get<string>(`${envPrefix}_CLIENT_SECRET`)
      ?.trim();
    const redirectUri = this.config
      .get<string>(`${envPrefix}_REDIRECT_URI`)
      ?.trim();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadGatewayException({
        code: 'OAUTH_NOT_CONFIGURED',
        message: `${provider} OAuth is not configured`,
      });
    }
    return { ...defaults[provider], clientId, clientSecret, redirectUri };
  }

  private avatar(provider: ExternalProvider, profile: Record<string, unknown>) {
    if (provider === 'DISCORD' && profile.id && profile.avatar) {
      const id = this.scalar(profile.id);
      const avatar = this.scalar(profile.avatar);
      if (id && avatar)
        return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
    }
    const picture = profile.picture;
    if (picture && typeof picture === 'object') {
      const data = (picture as Record<string, unknown>).data;
      if (data && typeof data === 'object')
        return this.string((data as Record<string, unknown>).url);
    }
    return this.string(profile.picture ?? profile.avatar_url);
  }

  private string(value: unknown): string | undefined {
    return typeof value === 'string' && value ? value : undefined;
  }

  private scalar(value: unknown): string | undefined {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : undefined;
  }

  private providerFailure(provider: ExternalProvider): never {
    throw new BadGatewayException(`${provider} OAuth request failed`);
  }
}
