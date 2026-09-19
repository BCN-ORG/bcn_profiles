# BCN Profiles

Repository gồm hai ứng dụng độc lập:

- `be/`: NestJS API (chạy trên máy host khi local).
- `fe/`: Next.js Account Center (chạy trên máy host khi local).

## 1) Docker — chỉ Postgres + Redis + MinIO

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d
```

| Service  | Host URL / port                          |
|----------|------------------------------------------|
| Postgres | `localhost:5433` (db `profiles`)         |
| Redis    | `localhost:6379`                         |
| MinIO API | `http://127.0.0.1:9010`                 |
| MinIO Console | `http://127.0.0.1:9011`             |
| MinIO Admin | `http://127.0.0.1:9012`               |

Lần đầu mở MinIO Console → tạo bucket tên `profiles`.

## 2) Backend trên máy

```bash
cd be
cp .env.example .env
# Điền local infra (xem block Local Docker trong .env.example)
npm install
npx prisma migrate deploy
npm run start:dev
```

API: http://localhost:3000

## 3) Frontend trên máy

```bash
cd fe
cp .env.example .env
pnpm install
pnpm dev -- -p 5173
```

FE: http://localhost:5173 · locales `/vi`, `/en`

## Production

Dùng `be/docker-compose.prod.yml` + network `bcn-infra` — xem `be/docs/DEPLOY.md`.

App khác cần đăng nhập BCN SSO, RBAC và (tuỳ chọn) Timeline: xem **[hướng dẫn tích hợp client app](./be/docs/BCN_CLIENT_APP_INTEGRATION.md)** (chuẩn cho Quiz / Event / Judge / …).

Không commit `.env`, `.env.docker`, `*.pem`, seed data user.
