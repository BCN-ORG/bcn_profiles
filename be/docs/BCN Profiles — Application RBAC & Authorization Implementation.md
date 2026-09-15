# BCN Profiles — Application RBAC & Authorization Implementation

## 1. Mục tiêu

`https://profiles.bcn.id.vn` là trung tâm quản lý:

```text
BCN Account
Application Registry
Application Access
Role
Permission
Authorization
Session
SSO
```

Mỗi application BCN được phép có:

```text
Role riêng
Permission riêng
Member riêng
Application Manager riêng
```

Ví dụ:

```text
QUIZ
├── ADMIN
├── EXAMINER
└── MEMBER

EVENT
├── ADMIN
├── ORGANIZER
├── CHECKIN_STAFF
└── PARTICIPANT

JUDGE
├── ADMIN
├── PROBLEM_SETTER
└── CONTESTANT
```

Không tồn tại một bộ role cố định cho toàn BCN.

---

# 2. Nguyên tắc cốt lõi

Hệ thống phải phân biệt:

```text
Platform Role
```

và:

```text
Application Role
```

## Platform Role

Dùng để quản lý Profiles:

```text
PLATFORM_SUPER_ADMIN
IDENTITY_ADMIN
AUDITOR
```

Ví dụ:

```text
IDENTITY_ADMIN
```

có thể:

```text
quản lý user
quản lý membership
quản lý connected identities
```

nhưng không mặc định là:

```text
QUIZ.ADMIN
EVENT.ADMIN
```

---

## Application Role

Thuộc riêng một application.

Ví dụ:

```text
QUIZ.ADMIN

EVENT.ADMIN
```

là hai role hoàn toàn khác nhau.

Database phải đảm bảo:

```text
UNIQUE(application_id, role_code)
```

---

# 3. Authorization Model

Mô hình:

```text
USER
 │
 ▼
APPLICATION
 │
 ▼
APP ACCESS
 │
 ├── BLOCKED
 │      ↓
 │     DENY
 │
 └── ACTIVE
        ↓
      ROLES[]
        ↓
   PERMISSIONS[]
```

Rule:

```text
Membership
→ Có thuộc BCN hay không

Application Access
→ Có được vào app hay không

Role
→ Có vai trò gì trong app

Permission
→ Được làm thao tác nào
```

---

# 4. Role chỉ là nhóm Permission

Không viết business authorization dựa vào:

```text
role == ADMIN
```

nếu không thực sự cần.

Nên kiểm tra:

```text
permission
```

Ví dụ:

```text
QUIZ.ADMIN
├── quiz.question.read
├── quiz.question.create
├── quiz.question.update
├── quiz.question.delete
└── quiz.result.export
```

```text
QUIZ.EXAMINER
├── quiz.question.read
├── quiz.question.create
├── quiz.question.update
└── quiz.result.read
```

Application kiểm tra:

```text
quiz.question.create
```

thay vì:

```text
ADMIN
```

---

# 5. Permission Naming Convention

Tất cả permission phải dùng:

```text
<app>.<resource>.<action>
```

Ví dụ:

```text
quiz.question.read
quiz.question.create
quiz.question.update
quiz.question.delete

event.participant.read
event.participant.export
event.checkin.execute

judge.problem.create
judge.submission.read
judge.submission.rejudge
```

Không đặt:

```text
CREATE
CAN_CREATE
PERMISSION_01
ADMIN_ACTION
```

---

# 6. Applications Table

```sql
CREATE TABLE applications (
    id VARCHAR(32) PRIMARY KEY,

    code VARCHAR(50)
        NOT NULL UNIQUE,

    name VARCHAR(255)
        NOT NULL,

    client_id VARCHAR(255)
        NOT NULL UNIQUE,

    status VARCHAR(20)
        NOT NULL DEFAULT 'ACTIVE',

    require_2fa BOOLEAN
        NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMP
        NOT NULL DEFAULT NOW()
);
```

Ví dụ:

```text
QUIZ
EVENT
JUDGE
ATTENDANCE
```

---

# 7. Redirect URI

```sql
CREATE TABLE application_redirect_uris (
    id VARCHAR(32) PRIMARY KEY,

    application_id VARCHAR(32)
        NOT NULL REFERENCES applications(id),

    redirect_uri TEXT NOT NULL,

    UNIQUE(application_id, redirect_uri)
);
```

Ví dụ:

```text
https://quiz.bcn.id.vn/auth/callback
```

Không dùng:

```text
https://quiz.bcn.id.vn/*
```

Redirect URI phải exact match.

---

# 8. Application Roles

```sql
CREATE TABLE app_roles (
    id VARCHAR(32) PRIMARY KEY,

    application_id VARCHAR(32)
        NOT NULL REFERENCES applications(id),

    code VARCHAR(100)
        NOT NULL,

    name VARCHAR(255),

    description TEXT,

    is_system BOOLEAN
        NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP
        NOT NULL DEFAULT NOW(),

    UNIQUE(application_id, code)
);
```

Ví dụ:

```text
application = QUIZ

ADMIN
EXAMINER
MEMBER
```

---

# 9. Application Permissions

```sql
CREATE TABLE app_permissions (
    id VARCHAR(32) PRIMARY KEY,

    application_id VARCHAR(32)
        NOT NULL REFERENCES applications(id),

    code VARCHAR(150)
        NOT NULL,

    description TEXT,

    created_at TIMESTAMP
        NOT NULL DEFAULT NOW(),

    UNIQUE(application_id, code)
);
```

---

# 10. Role Permission Mapping

```sql
CREATE TABLE app_role_permissions (
    role_id VARCHAR(32)
        REFERENCES app_roles(id),

    permission_id VARCHAR(32)
        REFERENCES app_permissions(id),

    PRIMARY KEY(role_id, permission_id)
);
```

---

# 11. User Application Access

```sql
CREATE TABLE user_app_access (
    id VARCHAR(32) PRIMARY KEY,

    user_id VARCHAR(32)
        NOT NULL REFERENCES users(id),

    application_id VARCHAR(32)
        NOT NULL REFERENCES applications(id),

    status VARCHAR(20)
        NOT NULL DEFAULT 'ACTIVE',

    granted_by VARCHAR(32),

    granted_at TIMESTAMP,

    expires_at TIMESTAMP,

    created_at TIMESTAMP
        NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, application_id)
);
```

Status:

```text
ACTIVE
BLOCKED
PENDING
```

---

# 12. User Application Roles

Một user có thể có nhiều role trong cùng app.

```sql
CREATE TABLE user_app_roles (
    user_id VARCHAR(32)
        REFERENCES users(id),

    application_id VARCHAR(32)
        REFERENCES applications(id),

    role_id VARCHAR(32)
        REFERENCES app_roles(id),

    assigned_by VARCHAR(32),

    assigned_at TIMESTAMP
        NOT NULL DEFAULT NOW(),

    PRIMARY KEY(user_id, application_id, role_id)
);
```

Ví dụ:

```text
Hung

EVENT
├── ORGANIZER
└── CHECKIN_STAFF
```

Permission cuối cùng là union:

```text
ORGANIZER permissions
∪
CHECKIN_STAFF permissions
```

---

# 13. Application Managers

Để mỗi team quản lý app của mình:

```sql
CREATE TABLE application_managers (
    application_id VARCHAR(32)
        REFERENCES applications(id),

    user_id VARCHAR(32)
        REFERENCES users(id),

    manager_role VARCHAR(30)
        NOT NULL DEFAULT 'MANAGER',

    assigned_by VARCHAR(32),

    assigned_at TIMESTAMP
        NOT NULL DEFAULT NOW(),

    PRIMARY KEY(application_id, user_id)
);
```

Ví dụ:

```text
User A
→ Manager QUIZ

User B
→ Manager EVENT
```

Manager Quiz không được sửa Event.

---

# 14. Application Manager được làm gì?

Có thể cấp các quyền platform-level như:

```text
APP_MEMBER_MANAGE
APP_ROLE_ASSIGN
APP_ROLE_VIEW
APP_PERMISSION_VIEW
APP_SESSION_REVOKE
```

Khuyến nghị:

```text
Application Manager
```

không được tự tạo arbitrary permission nếu chưa qua review.

---

# 15. Application Manifest

Mỗi repository BCN nên có:

```text
bcn-app.yml
```

Ví dụ:

```yaml
app:
  name: BCN Quiz
  code: quiz
  clientId: bcn-quiz

auth:
  redirectUri: https://quiz.bcn.id.vn/auth/callback
  require2FA: false

roles:
  - code: ADMIN
    name: Administrator

  - code: EXAMINER
    name: Examiner

  - code: MEMBER
    name: Member

permissions:
  - code: quiz.question.read
  - code: quiz.question.create
  - code: quiz.question.update
  - code: quiz.question.delete
  - code: quiz.result.read
  - code: quiz.result.export

rolePermissions:
  ADMIN:
    - quiz.question.read
    - quiz.question.create
    - quiz.question.update
    - quiz.question.delete
    - quiz.result.read
    - quiz.result.export

  EXAMINER:
    - quiz.question.read
    - quiz.question.create
    - quiz.question.update
    - quiz.result.read

  MEMBER:
    - quiz.question.read
```

---

# 16. Manifest Sync

Profiles nên hỗ trợ:

```text
Import Manifest
```

Flow:

```text
bcn-app.yml
      ↓
Validate
      ↓
Application
      ↓
Roles
      ↓
Permissions
      ↓
Role-Permission Mapping
```

Version đầu có thể:

```text
Admin upload/import thủ công
```

Sau này:

```text
CI/CD
→ Profiles API
→ sync manifest
```

---

# 17. Manifest Validation

Phải kiểm tra:

```text
App code đã tồn tại?

Client ID trùng?

Redirect URI hợp lệ?

Role code trùng?

Permission prefix đúng app?

Role mapping reference permission tồn tại?
```

Ví dụ app:

```text
quiz
```

không được khai:

```text
event.checkin.execute
```

---

# 18. Sync Strategy

Không xóa ngay role/permission mất khỏi manifest.

Nên:

```text
Manifest bỏ permission
      ↓
Mark deprecated
      ↓
Check usage
      ↓
Admin approve delete
```

Tránh accidental permission removal.

---

# 19. AuthZ Service

Endpoint:

```http
POST /internal/authz/check
```

Input:

```http
Authorization: Bearer <BCN_ACCESS_TOKEN>
```

```json
{
  "permission": "quiz.question.create"
}
```

Không nhận:

```json
{
  "userId": "..."
}
```

rồi tin frontend.

Identity phải lấy từ:

```text
JWT.sub
```

---

# 20. AuthZ Algorithm

Pseudo:

```text
authorize(token, permission):

    validateJWT(token)

    userId = token.sub
    app = token.aud

    ensure user.status == ACTIVE

    ensure membership == VERIFIED

    ensure application.status == ACTIVE

    ensure user_app_access == ACTIVE

    roles =
        loadUserAppRoles(userId, app)

    permissions =
        unionPermissions(roles)

    return permission in permissions
```

---

# 21. Redis Authorization Cache

Key:

```text
authz:{userId}:{app}
```

Ví dụ:

```text
authz:01K4BCN123:quiz
```

Value:

```json
{
  "access": "ACTIVE",
  "roles": [
    "ADMIN"
  ],
  "permissions": [
    "quiz.question.read",
    "quiz.question.create"
  ]
}
```

TTL:

```text
5–15 phút
```

---

# 22. Cache Invalidation

Bắt buộc invalidate khi:

```text
user_app_access changed

role assigned

role removed

role permission changed

application blocked

user blocked

membership lost
```

Ví dụ:

```text
DEL authz:{userId}:quiz
```

---

# 23. Role Permission Update

Ví dụ:

```text
QUIZ.EXAMINER
```

được thêm:

```text
quiz.result.export
```

Cần invalidate cache của tất cả users đang có:

```text
QUIZ.EXAMINER
```

Có thể dùng:

```text
Redis Pub/Sub
```

hoặc queue/event.

---

# 24. JWT không chứa Role hoặc Permission

Token vẫn giữ:

```json
{
  "iss": "https://profiles.bcn.id.vn",
  "sub": "01K4BCN123",
  "aud": "quiz",
  "sid": "01K4SESSION456",
  "iat": 1789458300,
  "exp": 1789459200
}
```

Role/Permission nằm ở:

```text
Profiles
PostgreSQL
Redis
```

---

# 25. Application Admin UI

Navigation:

```text
Administration
│
├── Members
│
├── Applications
│
│   ├── Quiz
│   ├── Event
│   ├── Judge
│   └── ...
│
├── Membership
├── Sessions
└── Audit
```

Click:

```text
Applications
→ Quiz
```

tabs:

```text
Overview
Members
Roles
Permissions
Managers
OAuth Settings
Audit
```

---

# 26. Roles UI

Ví dụ:

```text
BCN Quiz / Roles

ADMIN
6 permissions

EXAMINER
4 permissions

MEMBER
1 permission
```

Click role:

```text
EXAMINER

Permissions

✓ quiz.question.read
✓ quiz.question.create
✓ quiz.question.update
✓ quiz.result.read
```

---

# 27. Members UI

```text
BCN Quiz / Members
```

Columns:

```text
User

Access

Roles

Last Login

Sessions
```

Ví dụ:

```text
Tran Tuan Hung

ACTIVE

ADMIN, EXAMINER

2 min ago

2
```

---

# 28. User Detail UI

Admin mở user:

```text
Applications
```

hiện:

```text
QUIZ
Access
ACTIVE

Roles
☑ ADMIN
☐ EXAMINER
☐ MEMBER
```

```text
EVENT
Access
ACTIVE

Roles
☐ ADMIN
☑ CHECKIN_STAFF
```

```text
JUDGE
Access
BLOCKED
```

---

# 29. Admin Rule

Platform Admin có thể:

```text
quản lý mọi app
```

Application Manager chỉ:

```text
quản lý app được giao
```

Ví dụ:

```text
Quiz Manager
```

không gọi được:

```text
/admin/applications/event/...
```

---

# 30. API — Applications

```text
GET    /admin/applications

GET    /admin/applications/:app

POST   /admin/applications

PATCH  /admin/applications/:app
```

---

# 31. API — Roles

```text
GET    /admin/applications/:app/roles

POST   /admin/applications/:app/roles

PATCH  /admin/applications/:app/roles/:role

DELETE /admin/applications/:app/roles/:role
```

---

# 32. API — Permissions

```text
GET
/admin/applications/:app/permissions
```

```text
POST
/admin/applications/:app/permissions
```

```text
PATCH
/admin/applications/:app/permissions/:permission
```

---

# 33. API — Role Permission

```text
PUT
/admin/applications/:app/roles/:role/permissions
```

Body:

```json
{
  "permissions": [
    "quiz.question.read",
    "quiz.question.create"
  ]
}
```

---

# 34. API — User App Access

Grant:

```text
POST
/admin/users/:userId/applications/:app/grant
```

Block:

```text
POST
/admin/users/:userId/applications/:app/block
```

Get:

```text
GET
/admin/users/:userId/applications
```

---

# 35. API — User Role

Assign:

```text
POST
/admin/users/:userId/applications/:app/roles/:role
```

Remove:

```text
DELETE
/admin/users/:userId/applications/:app/roles/:role
```

---

# 36. API — Managers

```text
GET
/admin/applications/:app/managers
```

```text
POST
/admin/applications/:app/managers/:userId
```

```text
DELETE
/admin/applications/:app/managers/:userId
```

---

# 37. API — Manifest

```text
POST
/admin/applications/import
```

Hoặc:

```text
POST
/internal/applications/:app/sync-manifest
```

Nếu dùng CI/CD sau này.

---

# 38. Audit

Audit:

```text
APP_CREATED

APP_DISABLED

APP_ACCESS_GRANTED

APP_ACCESS_BLOCKED

APP_MANAGER_ASSIGNED

ROLE_CREATED

ROLE_UPDATED

ROLE_DELETED

ROLE_ASSIGNED

ROLE_REVOKED

PERMISSION_CREATED

PERMISSION_UPDATED

ROLE_PERMISSION_CHANGED

MANIFEST_IMPORTED
```

---

# 39. Không hard-code Role trong Profiles

Không viết:

```text
if app == QUIZ:
    roles = ADMIN, MEMBER
```

Roles luôn lấy từ database.

Profiles UI phải generic:

```text
Application
→ Roles[]
→ Permissions[]
```

Nhờ vậy thêm app mới không sửa FE.

---

# 40. Acceptance Criteria

Hoàn thành khi:

```text
[ ] App có role riêng

[ ] App có permission riêng

[ ] Cùng tên ADMIN ở 2 app không conflict

[ ] User có nhiều role trong một app

[ ] Permission cuối là union của roles

[ ] Profiles không hard-code business roles

[ ] App Manager chỉ quản lý app của mình

[ ] Platform Admin quản lý toàn platform

[ ] JWT không chứa role

[ ] JWT không chứa permission

[ ] AuthZ kiểm tra runtime

[ ] Role change có hiệu lực ngay sau cache invalidation

[ ] App manifest import được

[ ] UI generic cho mọi application

[ ] Audit đầy đủ
```

---

# 41. Công thức cuối

```text
Application
    ↓
Roles
    ↓
Permissions
```

```text
User
    ↓
Application Access
    ↓
Roles[]
    ↓
Permissions[]
```

Profiles là:

```text
Registry
+
Assignment System
+
Authorization Engine
```

Application vẫn sở hữu:

```text
Business Logic
```