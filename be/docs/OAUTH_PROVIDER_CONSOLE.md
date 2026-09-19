# OAuth provider console checklist (production)

> Tài liệu này chỉ cấu hình các provider bên ngoài (Google, GitHub, Discord, Zalo) để BCN Profiles liên kết danh tính. Nếu một BCN application cần đăng nhập và đọc profile từ BCN Profiles, xem [BCN_CLIENT_APP_INTEGRATION.md](./BCN_CLIENT_APP_INTEGRATION.md).

App callbacks must match GitHub Environment `production` redirect URIs.

| Provider | Authorized redirect / callback URI |
|---|---|
| Google | `https://profiles.bcn.id.vn/api/auth/social/google/callback` |
| GitHub | `https://profiles.bcn.id.vn/api/auth/social/github/callback` |
| Discord | `https://profiles.bcn.id.vn/api/auth/social/discord/callback` |
| Zalo | `https://profiles.bcn.id.vn/api/auth/social/zalo/callback` |

Also set homepage / authorized JS origin where the console asks for it:

```text
https://profiles.bcn.id.vn
```

## Consoles

1. **Google** → [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client → Authorized redirect URIs → add Google row above (remove old URI without `/api` if present).
2. **GitHub** → Settings → Developer settings → OAuth Apps → Authorization callback URL → GitHub row above.
3. **Discord** → [Discord Developer Portal](https://discord.com/developers/applications) → OAuth2 → Redirects → Discord row above.
4. **Zalo** → Zalo Developers app → Callback URL → Zalo row above.

CI validates that production `*_REDIRECT_URI` values include `/api/auth/social/`.
