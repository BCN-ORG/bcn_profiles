# BCN Profiles Frontend

BCN Account Center — Next.js + TypeScript + pnpm.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Biến môi trường:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- App: http://localhost:5173 → mặc định Next.js là http://localhost:3000 (đổi port nếu trùng BE: `pnpm dev -- -p 5173`)
- Locales: `/vi/...`, `/en/...`

Các màn hình MVP:

- Đăng nhập / 2FA
- Tổng quan, hồ sơ, kết nối, membership, ứng dụng, phiên, bảo mật
- Admin: users, user detail (override, app access, roles), audit log

Zalo membership hiển thị stub cho tới khi OA group sync được bật phía BE.
