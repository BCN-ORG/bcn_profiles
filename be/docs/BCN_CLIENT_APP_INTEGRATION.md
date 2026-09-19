# Tích hợp BCN Profiles cho application khác

Tài liệu **chuẩn** cho mọi BCN application (Quiz, Event, Judge, Attendance, …) cần:

- đăng nhập một lần bằng tài khoản BCN (SSO);
- lấy profile user;
- phân quyền (RBAC) do Profiles quản lý tập trung;
- (tuỳ chọn) ghi mốc Timeline.

Implementation mẫu: repository **BCN Quiz** (`bcn_quiz/be/docs/BCN_SSO.md`). Chi tiết thiết kế RBAC dài: [Application RBAC & Authorization Implementation](./BCN%20Profiles%20—%20Application%20RBAC%20%26%20Authorization%20Implementation.md).

BCN Profiles cung cấp **OAuth 2.0 Authorization Code + PKCE (S256)**. Chưa phải OIDC đầy đủ: không trả `id_token`, không nhận `scope` / `nonce`. Profile lấy bằng access token qua `GET /api/me`.

---

## 1. Luồng tổng quát

```text
App backend  GET /auth/login  (BFF tự tạo PKCE)
  -> Profiles GET /api/oauth/authorize?client_id&redirect_uri&code_challenge…
  -> Nếu chưa có cookie bcn_sso: Profiles FE /login
       (banner “Tiếp tục vào {Name}”, Name lấy từ applications.name)
  -> Kiểm tra: ACTIVE user + membership + app grant + optional 2FA
  -> 302 về redirect_uri?code&state của app
  -> App đổi code tại /api/oauth/token
  -> App gọi /api/me (hoặc tự verify JWT + /internal/session/check)
```

Điều kiện authorize thành công (thiếu cái nào Profiles trả lỗi UI, không JSON thô):

| Điều kiện | Mã lỗi nếu thiếu |
| --- | --- |
| Application tồn tại + `ACTIVE` | `APPLICATION_NOT_FOUND` / `APP_DISABLED` |
| `redirect_uri` khớp URI đã đăng ký | `OAUTH_REDIRECT_URI_INVALID` |
| User SSO session | (redirect login) |
| User `ACTIVE` | `ACCOUNT_BLOCKED` |
| Membership đủ điều kiện (Discord/Zalo đã verify) | `MEMBERSHIP_REQUIRED` |
| UserAppAccess (MANUAL: cần ACTIVE; MEMBERS: bị BLOCKED) | `APP_ACCESS_DENIED` |
| 2FA nếu app `require2fa` | `STEP_UP_AUTH_REQUIRED` |

App **không** tự vẽ màn login BCN. Profiles lo login, 2FA, social, và resume authorize sau login (kể cả Google/Discord).

---

## 2. Provider endpoints

| Mục | Production |
| --- | --- |
| Issuer / API base | `https://profiles.bcn.id.vn/api` |
| Discovery | `…/api/.well-known/openid-configuration` |
| Authorize | `…/api/oauth/authorize` |
| Token | `…/api/oauth/token` |
| Revoke | `…/api/oauth/revoke` |
| JWKS | `…/api/.well-known/jwks.json` |
| Profile | `…/api/me` |
| Authz check | `…/api/internal/authz/check` |
| Session check | `…/api/internal/session/check` |

Local API mặc định: `http://localhost:3000/api`. FE Account Center: port trong `.env` (`FRONTEND_URL`).

---

## 3. Đăng ký application trên Profiles

Chỉ platform admin (hoặc app manager) tạo được application.

1. Đăng nhập `https://profiles.bcn.id.vn`
2. **Administration → Applications** (`/vi/admin/rbac`)
3. **Create application** hoặc import **Manifest**

| Trường | Ví dụ | Quy tắc |
| --- | --- | --- |
| Code | `EVENT` | Unique; thường viết hoa; dùng làm JWT `aud` (lowercase: `event`) |
| Name | `BCN Event` | Tên hiển thị trên login/error SSO — **đặt đúng** vì mọi app dùng chung UI |
| Client ID | `bcn-event` | Unique; gửi trong OAuth `client_id` |
| Redirect URI | `https://event.bcn.id.vn/api/auth/callback` | Khớp **chính xác**; không wildcard |
| Require 2FA | tuỳ app | Bắt buộc AAL2 trước khi cấp code |

Thêm cả URI local nếu dev:

```text
https://event.bcn.id.vn/api/auth/callback
http://localhost:3001/api/auth/callback
```

Khi tạo app, console hiện `clientSecret` **một lần**. Secret **không** dùng cho PKCE browser flow. Chỉ dùng Basic auth server-to-server (Timeline, …). Tạo thêm server key ở tab secrets khi cần.

### Manifest mẫu (đổi prefix theo app)

```yaml
app:
  code: EVENT
  name: BCN Event
  clientId: bcn-event

auth:
  redirectUri: https://event.bcn.id.vn/api/auth/callback
  require2FA: false

roles:
  - code: MEMBER
    name: Member
  - code: STAFF
    name: Staff
  - code: ADMIN
    name: Admin

permissions:
  - code: event.read
    description: Read events
  - code: event.checkin.execute
    description: Check in participants

rolePermissions:
  MEMBER:
    - event.read
  STAFF:
    - event.read
    - event.checkin.execute
  ADMIN:
    - event.read
    - event.checkin.execute
```

Quy ước permission: `<app>.<resource>.<action>` (ví dụ `quiz.question.create`, `judge.submission.read`). Không dùng tên kiểu `ADMIN` / `CAN_CREATE`.

Import manifest lại sẽ đánh dấu deprecated role/permission bị bỏ. Import **không** grant user và **không** tạo client secret.

---

## 4. Membership và cấp quyền user

### 4.1 Membership (toàn nền tảng)

Authorize app yêu cầu user đã verify tư cách thành viên BCN (Discord hoặc Zalo theo cấu hình Profiles). Chỉ grant app **không đủ**.

- User tự liên kết tại Profiles → **Kết nối** / **Thành viên BCN**
- Lỗi SSO: `MEMBERSHIP_REQUIRED` → UI Profiles hướng tới `/membership`

### 4.2 App access

Tạo application **không** tự mở cho mọi user — trừ khi chọn chế độ dưới đây.

| `accessMode` | Hành vi |
| --- | --- |
| `MANUAL` (mặc định) | Phải grant `ACTIVE` từng user (hoặc Application Manager grant) |
| `MEMBERS` | Mọi user đã verify membership được vào; chỉ **block** cá nhân khi cần. Lần đầu vào tự gán role catalog `MEMBER` nếu có và user chưa có role nào trên app |

1. Admin mở user (RBAC / Users) — cho `MANUAL`, hoặc bật `MEMBERS` trên app
2. Grant application → status `ACTIVE` (MANUAL)
3. (Tuỳ chọn) gán role app (`EXAMINER`, `ADMIN`, …)

Thiếu grant trên app `MANUAL` → `APP_ACCESS_DENIED`.

Manifest:

```yaml
auth:
  accessMode: members   # hoặc manual
  require2FA: false
```

Admin UI: checkbox khi tạo app / nút đổi chế độ trên chi tiết app.

### 4.3 RBAC trong app của bạn

Profiles lưu role/permission; **JWT không chứa** danh sách permission.

Backend app kiểm tra khi cần:

```http
POST /api/internal/authz/check
Authorization: Bearer <access_token>
Content-Type: application/json

{ "permission": "event.checkin.execute" }
```

```json
{ "allowed": true }
```

| Endpoint | Body |
| --- | --- |
| `POST /api/internal/authz/check` | `{ "permission": "…" }` |
| `POST /api/internal/authz/check-any` | `{ "permissions": ["…", "…"] }` |
| `POST /api/internal/authz/check-all` | `{ "permissions": ["…", "…"] }` |

Không dùng `role` platform (`USER`/`ADMIN`) từ `/api/me` thay cho permission của application.

### 4.4 Role tuỳ biến theo app (không chỉ ADMIN / MEMBER)

Mỗi application tự khai báo **bộ role riêng** trong manifest hoặc Admin → Roles. Ví dụ Judge:

```yaml
roles:
  - code: MEMBER
  - code: EXAMINER
  - code: PROBLEM_SETTER
  - code: ADMIN
```

- Role gắn với **một application** (`JUDGE.EXAMINER` ≠ `QUIZ.EXAMINER`).
- Nguồn sự thật là **Profiles** — không đồng bộ ngược từ DB Judge lên Profiles.
- App chỉ **kiểm tra** quyền lúc runtime (`/internal/authz/check`).

**Ai được gán role / grant access?**

| Ai | Phạm vi |
| --- | --- |
| Platform admin Profiles (`role=ADMIN`) | Mọi app |
| **Application manager** của app đó | Chỉ app được giao (vd. manager của `JUDGE`) |

Gán trên Profiles Admin (user → application → tick role), hoặc:

```http
POST /api/admin/users/:userId/applications/JUDGE/roles/EXAMINER
```

(cần session Profiles của platform admin hoặc application manager).

**Admin UI trong Judge có gán role được không?**

Hiện **bắt buộc nguồn gán là Profiles** (UI hoặc API admin ở trên). Không có endpoint “Judge tự gán EXAMINER local”.

Có thể làm màn hình trong Judge admin **chỉ nếu** backend Judge gọi hộ API admin Profiles bằng phiên của user đang là application manager — vẫn ghi vào Profiles. Mặc định: dùng Profiles RBAC; chưa có proxy sẵn trong contract.

Catalog role/permission: manifest hoặc `POST/PATCH /admin/applications/:app/roles`. Gán manager (platform admin):

```http
POST /api/admin/applications/JUDGE/managers/:userId
```

Kiểm tra session còn sống:

```http
POST /api/internal/session/check
Authorization: Bearer <access_token>
```

```json
{ "active": true, "sub": "…", "aud": "event", "sid": "…" }
```

---

## 5. Cấu hình phía application

```env
BCN_OAUTH_ISSUER=https://profiles.bcn.id.vn/api
BCN_OAUTH_CLIENT_ID=bcn-event
BCN_OAUTH_REDIRECT_URI=https://event.bcn.id.vn/api/auth/callback
# Tuỳ chọn: sau callback redirect browser về FE
BCN_OAUTH_SUCCESS_REDIRECT_URL=https://event.bcn.id.vn/dashboard
# Chỉ nếu ghi Timeline / API Basic
PROFILES_CLIENT_SECRET=<server-key-one-time>
```

Local: `BCN_OAUTH_ISSUER` có thể trỏ Profiles deploy hoặc `http://localhost:3000/api`; redirect URI local phải đã đăng ký trên app.

Không đưa `PROFILES_CLIENT_SECRET` / client secret vào frontend.

Khuyến nghị BFF: browser chỉ giữ cookie session `HttpOnly` của app; `code_verifier`, `state`, access/refresh token nằm phía server.

---

## 6. PKCE — bắt đầu đăng nhập

```ts
import { createHash, randomBytes } from 'node:crypto';

const issuer = process.env.BCN_OAUTH_ISSUER!;
const clientId = process.env.BCN_OAUTH_CLIENT_ID!;
const redirectUri = process.env.BCN_OAUTH_REDIRECT_URI!;

const state = randomBytes(32).toString('base64url');
const codeVerifier = randomBytes(48).toString('base64url');
const codeChallenge = createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// Lưu state + codeVerifier session server, rồi redirect browser:
const authorizeUrl = new URL(`${issuer}/oauth/authorize`);
authorizeUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  state,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
}).toString();
```

Không gửi `scope`, `nonce`, `client_secret` trên authorize/token (PKCE).

FE app nên dùng top-level navigation (`window.location.assign`) tới endpoint login của **backend app**, không AJAX sang Profiles.

---

## 7. Callback, token, profile

1. So khớp `state` với session.
2. `POST /oauth/token` với `grant_type=authorization_code` + `code_verifier`.
3. `GET /me` với `Authorization: Bearer <access_token>`.

```ts
type BcnProfile = {
  id: string; // khóa ổn định — map user trong DB app
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  role: 'USER' | 'ADMIN'; // platform role Profiles, không phải role app
  aud: string; // application code lowercase, vd "event"
  sid: string;
};
```

`GET /api/me` chỉ cần access token hợp lệ; **không** yêu cầu một permission cụ thể.

### Token

- Access JWT `RS256`, ~15 phút; verify: chữ ký JWKS, `iss`, `aud` (= code lowercase), `exp`.
- Refresh: `grant_type=refresh_token` — **rotate**; ghi đè token mới, không reuse token cũ.
- Logout: `POST /oauth/revoke` với access hoặc refresh token.

---

## 8. Timeline (tuỳ chọn)

Server-to-server, tách khỏi PKCE:

```http
POST /api/internal/timeline-events
Authorization: Basic <base64(client_id:client_secret)>
Content-Type: application/json

{
  "userId": "<id từ /api/me>",
  "eventType": "COURSE_COMPLETE",
  "title": "…",
  "idempotencyKey": "event:session:session-id:user-id",
  "metadata": {}
}
```

`eventType` hợp lệ: `JOIN_BCN`, `COURSE_COMPLETE`, `QUIZ_COMPLETE`, `PROJECT_COMPLETE`, `SEMESTER_COMPLETE`.

`idempotencyKey`: 8–120 ký tự `[A-Za-z0-9:_-]`, ổn định theo thành tựu; trùng cùng user+app → trả event cũ; trùng user/app khác → `409 IDEMPOTENCY_CONFLICT`.

---

## 9. Checklist bàn giao app mới

**Profiles admin**

- [ ] App `ACTIVE`, `name` đúng thương hiệu
- [ ] `client_id` + redirect URI prod (và local nếu cần)
- [ ] Roles/permissions/manifest (nếu dùng RBAC)
- [ ] User test: membership OK + grant `ACTIVE` + role
- [ ] Server key Timeline (nếu cần) qua secret manager
- [ ] `aud` = `code` lowercase đã thống nhất với team app

**App team**

- [ ] Authorization Code + PKCE S256 qua BFF
- [ ] Validate `state`; giữ `code_verifier` server-side
- [ ] Map user bằng `id` từ `/me`
- [ ] Rotate refresh; revoke khi logout
- [ ] Authz qua `/internal/authz/*` (không tin JWT chứa permission)
- [ ] Không lộ client secret / `PROFILES_CLIENT_SECRET` ra browser
- [ ] Copy UX login thuộc về Profiles — app chỉ cần nút “Đăng nhập với BCN” + hint sẽ mở Account Center

---

## 10. Lỗi thường gặp

| Code | Nguyên nhân |
| --- | --- |
| `OAUTH_REDIRECT_URI_INVALID` | Callback không khớp URI đã đăng ký |
| `APP_ACCESS_DENIED` | Chưa grant / hết hạn / block |
| `APP_DISABLED` | Application tắt |
| `MEMBERSHIP_REQUIRED` | Chưa verify thành viên BCN |
| `STEP_UP_AUTH_REQUIRED` | App yêu cầu 2FA, session chưa AAL2 |
| `ACCOUNT_BLOCKED` | User không `ACTIVE` |
| `invalid_grant` | Code hết hạn/đã dùng, sai verifier/client/redirect |
| `TOKEN_INVALID` / `SESSION_REVOKED` | Token/session không còn hiệu lực |
| `401` (Timeline) | Basic client/secret sai hoặc secret disabled |
| `IDEMPOTENCY_CONFLICT` | Timeline key đã dùng bởi user/app khác |

Authorization code sống **2 phút**, dùng một lần.

---

## 11. Tham chiếu nhanh

| Tài liệu | Nội dung |
| --- | --- |
| Doc này | Hợp đồng tích hợp SSO + RBAC cho mọi client app |
| [BCN_SSO.md](../../../bcn_quiz/be/docs/BCN_SSO.md) (Quiz) | Ví dụ BFF + cookie HttpOnly |
| RBAC Implementation (cùng thư mục `docs/`) | Mô hình role/permission/admin API chi tiết |
| [API_DOCS.md](./API_DOCS.md) | Toàn bộ HTTP API Profiles |
