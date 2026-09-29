# BCN Profiles Docker Optimization

Measured locally on 2026-09-29 with Docker Desktop Linux/arm64 and an emulated Linux/amd64 build. Sizes below are **uncompressed local image sizes** from `docker image inspect`, not GHCR transfer sizes. Production timings may differ.

## Baseline

| Image | Size | Layers | Largest application layer | Warm build time |
|---|---:|---:|---:|---:|
| Backend | 657.89 MB | 13 | production `node_modules`: 397 MB | 4.08 s |
| Frontend | 332.92 MB | 10 | Next standalone: 83.8 MB | 27.64 s |

Build contexts are `./be` and `./fe` in `.github/workflows/cicd.yml`; neither includes BCN Quiz. The backend context transferred 2.71 MB on the baseline build. The frontend context transferred 174.92 MB, dominated by the local `.next-dev` directory (166 MB). BuildKit transfer numbers depend on its local cache and are not a measure of final image size.

The backend already installed dependencies before source code and pruned dev dependencies in its runner. Its 397 MB production dependency layer is dominated by Prisma packages, including the CLI and engines. The CLI, schema, and migrations are required because production deploy runs `npx prisma migrate deploy` from the application image. The frontend already used a minimal Next standalone runner; its 401 MB `.next/cache` stayed in the builder and was absent from the runner. `public` is 36 KB; no asset exceeds 1 MB.

## Changes

| File | Change | Reason and risk |
|---|---|---|
| `be/.dockerignore` | Exclude docs, secrets, and PEM files from the context. | The Dockerfile copies none of them; reduces context exposure. Runtime key files must still be supplied by environment or mount. |
| `be/Dockerfile` | Cache Prisma generation before source copy; build Nest once; copy only schema and migrations to runner; put `dist` last; use Alpine and install OpenSSL/CA certificates. | Source edits keep dependency, Prisma, and migration layers reusable. Prisma CLI and migration strategy remain intact. |
| `fe/.dockerignore` | Exclude `.next-dev` and TypeScript build cache. | Removes local dev output from context. Locale messages, source, and public assets remain included. |
| `fe/Dockerfile` | Use Alpine for dependency, build, and standalone runner stages. | Smaller base layers; Next build and standalone runtime were smoke tested. |

CI/CD already uses separate GHA Buildx caches for backend and frontend, commit SHA tags, and rollback. No workflow or Compose change was needed. Prisma, bcrypt, auth, Redis, and MinIO dependencies were retained.

## Image results

| Image | Original | Slim optimization | Alpine | Alpine saving vs slim | Largest application layer |
|---|---:|---:|---:|---:|---:|
| Backend | 657.89 MB | 656.16 MB | 565.39 MB | 90.76 MB (13.83%) | `node_modules`: 397 MB |
| Frontend | 332.92 MB | 332.92 MB | 249.77 MB | 83.14 MB (24.97%) | standalone: 83.8 MB |

The first backend saving came from omitting the duplicate generated Prisma client in `/app/prisma`; the compiled client remains in `/app/dist/prisma`. The later Alpine change reduced the base and OS package layers while preserving the selective frontend runner.

### Alpine follow-up

`be/Dockerfile` and `fe/Dockerfile` now use `node:22-alpine` for every stage. The backend installs OpenSSL and CA certificates with `apk`; both runners create the same UID/GID 1001 users. The production migration command and all application dependencies are unchanged. The first local arm64 Alpine builds took 45.43 s (backend) and 47.08 s (frontend), including fresh dependency downloads and build work; these are not directly comparable to the warm slim builds above.

Linux/amd64 Alpine images also built successfully: backend 569.53 MB and frontend 254.03 MB. The first amd64 backend build hit an `ECONNRESET` during npm download; retry succeeded without a file change. Emulated amd64 runtime checks passed for backend health/JWKS, bcrypt and native dependency imports, Prisma `migrate status` against local PostgreSQL, and frontend standalone rendering in both locales.

No-code arm64 Alpine rebuilds reused every Dockerfile step: backend 1.52 s, frontend 1.51 s.

## Layer cache results

| Probe | Cached | Rebuilt | Elapsed |
|---|---|---|---:|
| No-code backend rebuild | All steps | None | 1.40 s |
| No-code frontend rebuild | All steps | None | 1.39 s |
| Backend `src/main.ts` comment change | `npm ci`, `npm prune`, `prisma generate`, schema, migrations, entrypoint | source copy, Nest build, final `dist` copy | 4.99 s |
| Frontend component comment change | `pnpm install`, base image, public copy | source copy, Next build, standalone and static copies | 24.58 s |

Source probes were reverted after building. Digest comparison shows one changed backend runner layer (layer 14, `dist`, 2.63 MB uncompressed). The frontend probe changed two runner layers (standalone 83.8 MB and static 2.47 MB uncompressed). These are local layer sizes, **not measured GHCR push/pull bytes**. A code change that alters only server output may reuse the static layer; this probe changed both. BuildKit's incremental context transfer on the first optimized frontend build was 7.74 KB, versus 174.92 MB in the baseline build, but those figures are affected by cache state. The removed `.next-dev` directory itself measured 166 MB.

## Runtime verification

- [x] Optimized backend starts; `/api/health` returns 200.
- [x] PostgreSQL/Prisma: startup connects and prefetched user/timeline records; generated client imports; Prisma CLI loads schema and migrations.
- [x] Alpine backend: `prisma migrate status` connected to local PostgreSQL and reported 15 migrations with schema up to date. This read-only check did not apply migrations.
- [x] Redis: startup reports `PONG`.
- [x] bcrypt hash/compare and MinIO, Redis, Prisma runtime imports succeed.
- [x] OAuth discovery and JWKS endpoints return 200.
- [x] Protected profile, admin applications, and user applications endpoints return 401 without a session.
- [x] Next standalone starts; `/` and `/login` return 200. With `NEXT_LOCALE=vi` and `NEXT_LOCALE=en`, `/login` renders `<html lang="vi">` and `<html lang="en">` respectively. Prefixed `/vi` and `/en` redirect to `/` by the configured `localePrefix: 'never'` rule.
- [x] Next static CSS returns 200; both cookie-selected locales render without a missing-message error.
- [ ] Login → profile → refresh → logout, 2FA, full SSO code exchange, and authenticated RBAC: no test account/client credentials were available for this local run.
- [ ] MinIO avatar upload/presign: SDK imports and application startup complete, but no upload was performed. The local `.env` region initially disagreed with the local MinIO server; smoke run used `MINIO_REGION=us-east-1` and logged no bucket setup error.
- [ ] Production GHCR push/pull and deploy timing: no registry/server measurement in this local run.

Smoke containers used the existing local PostgreSQL, Redis, and MinIO services; their lifecycle was unchanged. The smoke run did not execute migrations.

## Deploy impact

Before: backend 657.89 MB total, frontend 332.92 MB total. After the slim optimization: backend 656.16 MB, frontend 332.92 MB. After the Alpine follow-up: backend 565.39 MB, frontend 249.77 MB. For a backend source-only edit, the final image changes only its 2.63 MB `dist` layer locally. For the tested frontend edit, standalone and static layers changed (86.27 MB uncompressed). Actual compressed push/pull bytes and production deployment duration require GHCR and server measurements; no estimate is presented as a result.

## Remaining opportunities

- Prisma CLI and transitive packages dominate the backend. Removing them requires a separate migration image/job and a deploy workflow change, so they were retained.
- Frontend standalone is already lean. Further savings would require inspecting traced runtime dependencies.
- BuildKit cache mounts could speed a fresh dependency install, but the production fallback uses the classic Docker builder (`DOCKER_BUILDKIT=0`), so a cache-mount-only Dockerfile would break that path.
