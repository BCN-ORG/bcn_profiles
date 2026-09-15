# BCN Profiles — Identity, Membership Verification, SSO & Authorization

## 1. Mục tiêu

Sử dụng:

```text
https://profiles.bcn.id.vn
```

làm hệ thống Identity trung tâm của BCN.

Profiles chịu trách nhiệm:

```text
BCN Account
Authentication
2FA
External Identity
Membership Verification
SSO
Application Access
Role
Permission
Session
Token
Audit
```

Các ứng dụng:

```text
Quiz
Event
Judge
Attendance
...
```

không tự quản lý account.

---

# 2. Điều kiện để một người được sử dụng BCN Account

Có account BCN **không đồng nghĩa** với được login hệ thống.

User phải vượt qua các lớp:

```text
BCN Account
      ↓
Authentication
      ↓
Membership Verification
      ↓
Account Status
      ↓
2FA
      ↓
Application Access
      ↓
SSO / Token
```

Rule mặc định:

```text
Discord BCN Member
        OR
Zalo BCN Group Member
        ↓
       PASS
```

Nếu:

```text
Discord ❌
Zalo    ❌
```

thì:

```text
BCN LOGIN DENIED
```

---

# 3. Membership Policy

Không hard-code logic trực tiếp trong code.

Định nghĩa policy:

```text
ANY_TRUSTED_GROUP
```

nghĩa là:

```text
Discord = MEMBER
OR
Zalo = MEMBER
```

thì được phép.

Logic:

```text
eligible =
    discordMembership == VERIFIED
    ||
    zaloMembership == VERIFIED
```

Có thể hỗ trợ về sau:

```text
ALL_TRUSTED_GROUPS
```

nghĩa là:

```text
Discord = MEMBER
AND
Zalo = MEMBER
```

Nhưng policy ban đầu BCN nên dùng:

```text
ANY_TRUSTED_GROUP
```

---

# 4. Kiến trúc hoàn chỉnh

```text
           Google
           GitHub
           Discord
           Zalo
              │
              ▼
    ┌───────────────────────┐
    │ profiles.bcn.id.vn   │
    │                       │
    │ BCN Identity Platform │
    └───────────┬───────────┘
                │
                ▼
          Authentication
                │
                ▼
       Membership Verification
                │
        ┌───────┴────────┐
        ▼                ▼
 Discord Guild       Zalo Group
        │                │
        └───────┬────────┘
                │
          ANY = VERIFIED?
                │
         ┌──────┴──────┐
         │             │
        NO            YES
         │             │
         ▼             ▼
       DENY           2FA
                       │
                       ▼
                Application Access
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
           Quiz      Event     Judge
```

---

# 5. Phân biệt 4 khái niệm

## Identity

```text
Bạn là ai?
```

Ví dụ:

```text
BCN User ID = 01K4BCN123
```

## Authentication

```text
Bạn chứng minh danh tính bằng gì?
```

Có thể:

```text
BCN Password
Google
GitHub
Discord
Zalo
```

## Membership Eligibility

```text
Bạn có còn là thành viên BCN không?
```

Kiểm tra:

```text
Discord BCN
hoặc
Zalo BCN
```

## Authorization

```text
Bạn được vào app nào
và được làm gì?
```

Ví dụ:

```text
Quiz     ADMIN
Event    BLOCKED
Judge    MEMBER
```

---

# 6. BCN Account là account gốc

Một người chỉ có:

```text
1 BCN Account
```

Các provider:

```text
Google
GitHub
Discord
Zalo
```

chỉ là External Identity.

```text
Google ──────┐
GitHub ──────┤
Discord ─────┼──> BCN User #123
Zalo ────────┤
Password ────┘
```

---

# 7. External Identity

Table:

```sql
CREATE TABLE external_identities (
    id VARCHAR(32) PRIMARY KEY,

    user_id VARCHAR(32) NOT NULL
        REFERENCES users(id),

    provider VARCHAR(30) NOT NULL,

    provider_subject VARCHAR(255) NOT NULL,

    provider_email VARCHAR(255),
    provider_username VARCHAR(255),
    provider_display_name VARCHAR(255),
    provider_avatar_url TEXT,

    profile_data JSONB,

    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP,

    linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP,
    last_synced_at TIMESTAMP,

    UNIQUE(provider, provider_subject),
    UNIQUE(user_id, provider)
);
```

Provider:

```text
GOOGLE
GITHUB
DISCORD
ZALO
```

---

# 8. Membership Source

Không hard-code một Discord Guild ID hoặc Zalo Group ID vào source code.

Tạo table:

```sql
CREATE TABLE membership_sources (
    id VARCHAR(32) PRIMARY KEY,

    provider VARCHAR(30) NOT NULL,

    code VARCHAR(100) NOT NULL UNIQUE,

    name VARCHAR(255) NOT NULL,

    external_group_id VARCHAR(255) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Ví dụ:

```text
DISCORD
code = BCN_DISCORD
external_group_id = <discord_guild_id>
```

```text
ZALO
code = BCN_ZALO
external_group_id = <zalo_group_id>
```

Sau này BCN có thể có:

```text
BCN_DISCORD_MAIN

BCN_DISCORD_ALUMNI

BCN_ZALO_CTV

BCN_ZALO_CORE_TEAM
```

mà không cần sửa source code.

---

# 9. User Membership

Tạo:

```sql
CREATE TABLE user_memberships (
    id VARCHAR(32) PRIMARY KEY,

    user_id VARCHAR(32) NOT NULL
        REFERENCES users(id),

    membership_source_id VARCHAR(32) NOT NULL
        REFERENCES membership_sources(id),

    provider_subject VARCHAR(255),

    status VARCHAR(30) NOT NULL,

    verification_method VARCHAR(30),

    verified_at TIMESTAMP,

    expires_at TIMESTAMP,

    last_checked_at TIMESTAMP,

    metadata JSONB,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, membership_source_id)
);
```

Status:

```text
VERIFIED
NOT_MEMBER
PENDING
STALE
UNKNOWN
```

Verification method:

```text
PROVIDER_API
ADMIN
SYNC
```

---

# 10. Membership không phải Role

Không nhầm:

```text
Discord Member
```

với:

```text
Quiz ADMIN
```

Membership chỉ trả lời:

```text
Người này có phải thành viên BCN hợp lệ không?
```

Role trả lời:

```text
Người này được làm gì trong application?
```

Flow:

```text
MEMBERSHIP
     ↓
được sử dụng BCN ecosystem?
     ↓
APPLICATION ACCESS
     ↓
được sử dụng app nào?
     ↓
ROLE / PERMISSION
     ↓
được làm gì?
```

---

# 11. Discord Membership Verification

Discord hỗ trợ OAuth scope:

```text
guilds.members.read
```

và endpoint lấy thông tin membership của chính user trong một guild.

Khi link Discord, yêu cầu:

```text
identify
guilds.members.read
```

Sau OAuth:

```text
Discord User
     ↓
Discord User ID
     ↓
GET current user guild member
     ↓
BCN Discord Guild
```

Concept:

```text
/users/@me/guilds/{BCN_GUILD_ID}/member
```

Nếu Discord trả member:

```text
VERIFIED
```

Nếu user không thuộc guild:

```text
NOT_MEMBER
```

---

# 12. Discord Data

External identity:

```text
provider = DISCORD

provider_subject =
Discord User ID
```

Membership:

```text
source =
BCN_DISCORD

provider_subject =
Discord User ID

status =
VERIFIED
```

---

# 13. Discord Verification Flow

```text
User
 │
 ▼
Connect Discord
 │
 ▼
Discord OAuth
 │
 ▼
identify
+
guilds.members.read
 │
 ▼
Discord User ID
 │
 ▼
Check BCN Guild
 │
 ├── MEMBER
 │      ↓
 │   VERIFIED
 │
 └── NOT MEMBER
        ↓
    NOT_MEMBER
```

---

# 14. Discord Login không tự động đồng nghĩa với BCN Member

Phải tách:

```text
Discord OAuth success
```

và:

```text
Discord guild membership success
```

Ví dụ:

```text
Discord account hợp lệ
        ↓
OAuth SUCCESS

nhưng

không ở BCN Discord
        ↓
Membership FAIL
```

Kết quả:

```text
không tạo BCN SSO Session
```

---

# 15. Zalo Membership Verification

Zalo hiện có OA Group API để lấy danh sách thành viên của một group:

```text
GET /v3.0/oa/group/listmember
```

API trả về danh sách `user_id` thành viên và yêu cầu ứng dụng được cấp quyền quản lý thông tin nhóm.

Flow:

```text
BCN Zalo OA
       ↓
BCN Zalo Group
       ↓
Group List Member API
       ↓
Member IDs
       ↓
Check Zalo User
```

---

# 16. Điều kiện quan trọng đối với Zalo

Không nên giả định mọi Zalo group đều gọi được API.

API trên thuộc hệ thống:

```text
Zalo OA / Group Chat Management
```

và yêu cầu app có:

```text
quyền quản lý thông tin nhóm
```



Do đó cần kiểm tra group BCN hiện tại có nằm trong mô hình OA Group Chat mà BCN có quyền quản lý hay không.

Nếu:

```text
BCN Zalo Group
=
OA managed group
```

thì:

```text
AUTO VERIFY
```

được.

Nếu chỉ là:

```text
Zalo group cá nhân thông thường
```

và BCN App/OA không có quyền group management:

```text
không được giả định API có thể kiểm tra tự động
```

---

# 17. Zalo ID Mapping

Điểm này cần thiết kế cẩn thận.

Zalo có thể tồn tại:

```text
User ID theo App

User ID theo OA
```

Trong webhook của Zalo, hệ thống có thể trả đồng thời:

```text
user_id_by_app
user_id
```

trong đó một ID thuộc App và một ID thuộc OA.

Do đó external identity nên mở rộng:

```sql
ALTER TABLE external_identities
ADD COLUMN provider_membership_subject VARCHAR(255);
```

Ví dụ Zalo:

```text
provider_subject
=
Zalo App User ID
```

```text
provider_membership_subject
=
Zalo OA User ID
```

Group member verification dùng:

```text
provider_membership_subject
```

---

# 18. Nếu chưa map được Zalo App ID ↔ OA ID

Không đoán dựa vào:

```text
name
avatar
phone
```

Phải có mapping xác thực.

Status:

```text
ZALO_ID_MAPPING_PENDING
```

User chưa được tính:

```text
Zalo VERIFIED
```

cho đến khi mapping hoàn tất.

---

# 19. Membership Eligibility Service

Tạo module:

```text
membership/
├── membership.service
├── membership-policy.service
├── membership.repository
├── discord-membership.provider
├── zalo-membership.provider
└── membership-cache.service
```

Interface:

```text
MembershipProvider
```

Concept:

```text
verifyMembership(
    user,
    membershipSource
)
```

Result:

```json
{
  "member": true,
  "provider": "DISCORD",
  "source": "BCN_DISCORD",
  "verifiedAt": "..."
}
```

---

# 20. Eligibility Service

Pseudo:

```text
checkBCNEligibility(user):

    discord =
        getMembership(
            user,
            BCN_DISCORD
        )

    zalo =
        getMembership(
            user,
            BCN_ZALO
        )

    if policy == ANY_TRUSTED_GROUP:

        return
            discord == VERIFIED
            ||
            zalo == VERIFIED
```

Nếu false:

```text
throw MEMBERSHIP_REQUIRED
```

---

# 21. Account Status

`users.status` vẫn giữ:

```text
ACTIVE
BLOCKED
DISABLED
DELETED
```

Nhưng thêm:

```text
membership_status
```

hoặc derive từ membership.

Khuyến nghị **không duplicate** nếu không cần.

Tính runtime:

```text
account.status == ACTIVE
AND
membershipEligible == true
```

mới được login.

---

# 22. Registration Flow mới

Không nên:

```text
Register
   ↓
ACTIVE ngay
```

Nên:

```text
Register BCN
      ↓
Create account
      ↓
PENDING MEMBERSHIP
      ↓
Connect Discord / Zalo
      ↓
Verify Membership
      ↓
Eligible?
   ┌──┴──┐
   NO   YES
   │     │
   ▼     ▼
PENDING ACTIVE
```

User có thể tạo record account nhưng chưa được vào ecosystem.

---

# 23. Login Flow hoàn chỉnh

Dù login bằng:

```text
Password
Google
GitHub
Discord
Zalo
```

đều đi qua một pipeline.

```text
Authenticate Identity
        ↓
BCN User
        ↓
User ACTIVE?
        ↓
2FA nếu cần
        ↓
Membership Eligibility
        ↓
Discord OR Zalo?
        ↓
   ┌────┴────┐
   NO       YES
   │          │
   ▼          ▼
 DENY    Create SSO Session
```

Không provider nào bypass Membership Gate.

---

# 24. Ví dụ Login bằng Google

User đã:

```text
Google linked ✅
```

nhưng:

```text
Discord member ❌
Zalo member ❌
```

Google OAuth vẫn:

```text
SUCCESS
```

nhưng BCN login:

```text
DENIED
```

Flow:

```text
Google Authentication
        ↓
BCN User #123
        ↓
Membership Check
        ↓
Discord ❌
Zalo ❌
        ↓
MEMBERSHIP_REQUIRED
```

---

# 25. Ví dụ Login bằng Discord

```text
Discord OAuth
      ↓
Discord User ID
      ↓
BCN External Identity
      ↓
BCN User
      ↓
Check Discord BCN Guild
      ↓
MEMBER
      ↓
BCN Login PASS
```

Nếu đã rời Discord nhưng còn trong Zalo:

```text
Discord ❌

Zalo ✅

ANY_TRUSTED_GROUP
       ↓
      PASS
```

---

# 26. Login bằng BCN Password vẫn phải check Membership

Điều này rất quan trọng.

Không:

```text
Password đúng
→ login
```

Mà:

```text
Password đúng
     ↓
2FA
     ↓
Membership
     ↓
Discord/Zalo
     ↓
login
```

BCN Password chỉ chứng minh:

```text
đây là account của bạn
```

không chứng minh:

```text
bạn vẫn là thành viên BCN
```

---

# 27. Membership Cache

Không nên gọi Discord/Zalo API trên mọi API request.

Redis:

```text
membership:{userId}
```

Ví dụ:

```json
{
  "eligible": true,

  "discord": {
    "status": "VERIFIED",
    "checkedAt": "..."
  },

  "zalo": {
    "status": "UNKNOWN",
    "checkedAt": "..."
  }
}
```

TTL:

```text
5–15 phút
```

---

# 28. Membership Freshness

Một membership không nên:

```text
VERIFIED forever
```

Phải có:

```text
verified_at
expires_at
```

Ví dụ:

```text
verified_at = 08:00
expires_at  = 08:15
```

Sau đó:

```text
STALE
```

và phải verify lại.

---

# 29. Login Verification Strategy

Khi login:

```text
membership cache fresh?
```

Nếu:

```text
YES
```

dùng cache.

Nếu:

```text
NO
```

revalidate provider.

Flow:

```text
Login
  ↓
Membership Cache
  │
  ├── FRESH
  │     ↓
  │   use
  │
  └── STALE
        ↓
   Provider API
        ↓
   update DB/Redis
```

---

# 30. Zalo Group Cache

Zalo API hiện cung cấp danh sách thành viên theo:

```text
group_id
offset
count
```



Vì vậy thay vì gọi:

```text
list toàn bộ group
```

cho từng login, nên sync:

```text
Zalo Group
      ↓
Background Sync
      ↓
Redis Set
```

Ví dụ:

```text
membership_group:zalo:<group_id>
```

chứa:

```text
Zalo OA User ID #1
Zalo OA User ID #2
Zalo OA User ID #3
...
```

Login chỉ:

```text
SISMEMBER
```

---

# 31. Discord Verification

Discord có endpoint kiểm tra trực tiếp current user's guild membership, nên lúc OAuth/link có thể verify trực tiếp.

Nếu cần revalidation lâu dài, có thể:

```text
refresh Discord user OAuth token
        ↓
check guild membership
```

hoặc xây integration bot/service riêng sau.

Không dùng:

```text
Discord username
```

để kiểm tra.

Phải dùng:

```text
Discord User ID
```

---

# 32. Member rời BCN Group

Ví dụ user:

```text
Discord ✅
Zalo ❌
```

sau đó rời Discord.

Lần sync/check tiếp theo:

```text
Discord VERIFIED
      ↓
NOT_MEMBER
```

Eligibility:

```text
Discord ❌
Zalo ❌
```

Profiles phải:

```text
1. mark membership NOT_MEMBER

2. invalidate membership cache

3. revoke BCN SSO sessions

4. revoke all application sessions

5. deny refresh token

6. deny new login
```

---

# 33. Revoke toàn hệ thống

Khi eligibility chuyển:

```text
TRUE → FALSE
```

thực hiện:

```text
revokeUserSessions(userId)
```

Redis:

```text
sso:{sid}
→ REVOKED
```

và:

```text
app_session:{sid}
→ REVOKED
```

cho:

```text
Quiz
Event
Judge
...
```

---

# 34. Membership trở lại

User join lại Discord hoặc Zalo:

```text
NOT_MEMBER
      ↓
VERIFIED
```

Không cần tạo BCN account mới.

User vẫn là:

```text
BCN User #123
```

Sau khi verify:

```text
eligible = true
```

thì login trở lại bình thường.

---

# 35. Không Delete Account khi rời Group

Không nên:

```text
rời Discord
→ DELETE user
```

Vì user có:

```text
profile
quiz history
event history
judge submissions
audit logs
```

Giữ account.

Chỉ:

```text
LOGIN / SSO DENIED
```

---

# 36. Manual Override

Nên hỗ trợ admin override cho các trường hợp:

```text
Discord API lỗi

Zalo API lỗi

thành viên đặc biệt

advisor

former member được cấp quyền tạm thời
```

Tạo:

```sql
CREATE TABLE membership_overrides (
    id VARCHAR(32) PRIMARY KEY,

    user_id VARCHAR(32)
        NOT NULL REFERENCES users(id),

    status VARCHAR(20) NOT NULL,

    reason TEXT,

    expires_at TIMESTAMP,

    granted_by VARCHAR(32) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Status:

```text
ALLOW
DENY
```

Policy:

```text
explicit DENY
>
explicit ALLOW
>
provider membership
```

Có thể tùy BCN quy định.

---

# 37. Override phải có thời hạn

Không nên:

```text
ALLOW FOREVER
```

Mặc định:

```text
expires_at
```

Ví dụ:

```text
7 ngày
30 ngày
```

và bắt buộc:

```text
reason
granted_by
audit
```

---

# 38. Membership Error Codes

Thêm:

```text
MEMBERSHIP_REQUIRED

MEMBERSHIP_NOT_VERIFIED

MEMBERSHIP_EXPIRED

MEMBERSHIP_CHECK_FAILED

DISCORD_MEMBERSHIP_REQUIRED

ZALO_MEMBERSHIP_REQUIRED

ZALO_ID_MAPPING_REQUIRED
```

Ví dụ:

```json
{
  "status": 403,
  "code": "MEMBERSHIP_REQUIRED",
  "message": "BCN membership verification is required."
}
```

Không cần trả quá nhiều thông tin provider trong API public nếu không cần.

---

# 39. Không Fail Open

Nếu policy:

```text
ANY_TRUSTED_GROUP
```

và:

```text
Discord UNKNOWN
Zalo UNKNOWN
```

do cả provider/API đang lỗi:

```text
không được mặc định ALLOW
```

Đối với login mới:

```text
FAIL CLOSED
```

Trả:

```text
MEMBERSHIP_CHECK_FAILED
```

Có thể giữ session hiện tại trong grace period nếu BCN muốn, nhưng đó phải là policy riêng.

---

# 40. JWT vẫn giữ tối giản

Sau khi vượt qua Membership Gate:

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

Không thêm:

```text
discordMember
zaloMember
role
permissions
```

vào JWT.

Membership cũng là runtime authorization state.

---

# 41. Application Access

Membership hợp lệ chỉ cho user quyền:

```text
được tồn tại trong BCN ecosystem
```

Không có nghĩa là được vào tất cả app.

Sau Membership:

```text
BCN Eligible
       ↓
user_app_access
```

Ví dụ:

```text
Membership ✅

Quiz    ACTIVE
Event   BLOCKED
Judge   ACTIVE
```

Kết quả:

```text
Quiz    ✅
Event   ❌
Judge   ✅
```

---

# 42. Applications Table

```sql
CREATE TABLE applications (
    id VARCHAR(32) PRIMARY KEY,

    code VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(255) NOT NULL,

    client_id VARCHAR(255)
        NOT NULL UNIQUE,

    status VARCHAR(20)
        NOT NULL DEFAULT 'ACTIVE',

    require_2fa BOOLEAN
        NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP
        NOT NULL DEFAULT NOW()
);
```

---

# 43. User App Access

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

    UNIQUE(user_id, application_id)
);
```

---

# 44. Authorization Flow

Toàn bộ flow cuối:

```text
USER
 │
 ▼
AUTHENTICATION
 │
 ▼
BCN USER ACTIVE?
 │
 ▼
2FA
 │
 ▼
MEMBERSHIP
 │
 │ Discord OR Zalo
 ▼
BCN ELIGIBLE?
 │
 ├── NO
 │    ↓
 │   DENY
 │
 └── YES
       ↓
APPLICATION ACCESS
       │
       ├── BLOCKED
       │      ↓
       │     DENY
       │
       └── ACTIVE
              ↓
             ROLE
              ↓
          PERMISSION
```

---

# 45. Role & Permission

Role vẫn thuộc từng app.

```text
QUIZ.ADMIN
```

không có nghĩa:

```text
EVENT.ADMIN
```

Permission format:

```text
<app>.<resource>.<action>
```

Ví dụ:

```text
quiz.question.create

event.checkin.execute

judge.problem.create
```

---

# 46. SSO Flow

Quiz:

```text
quiz.bcn.id.vn
       ↓
profiles.bcn.id.vn/oauth/authorize
       ↓
BCN SSO?
       │
       ├── NO
       │    ↓
       │  Authenticate
       │    ↓
       │  Membership
       │
       └── YES
            ↓
Check membership freshness
            ↓
Check Quiz Access
            ↓
Authorization Code
            ↓
Quiz callback
```

Membership không chỉ check lúc register.

Phải check lại trong lifecycle.

---

# 47. `/oauth/authorize`

Trước khi phát Authorization Code:

```text
require:

user.status == ACTIVE

membershipEligible == TRUE

application.status == ACTIVE

user_app_access == ACTIVE

2FA requirement satisfied
```

Nếu membership fail:

```text
không phát authorization code
```

---

# 48. Refresh Token Flow

Mỗi refresh:

```text
Refresh Token
      ↓
Session ACTIVE?
      ↓
User ACTIVE?
      ↓
Membership still eligible?
      ↓
App ACTIVE?
      ↓
App Access ACTIVE?
      ↓
Issue new Access Token
```

Không:

```text
membership revoked
+
refresh token vẫn cấp JWT mới
```

---

# 49. Session Data

Redis app session:

```json
{
  "userId": "01K4BCN123",
  "application": "quiz",
  "status": "ACTIVE",
  "membershipVerifiedAt": "...",
  "refreshTokenHash": "...",
  "expiresAt": "..."
}
```

---

# 50. Membership Redis Keys

Đề xuất:

```text
membership:user:{userId}
```

```text
membership:discord:{guildId}:{discordUserId}
```

```text
membership:zalo:{groupId}
```

Zalo group có thể dùng Redis Set.

---

# 51. Admin User Detail

Profiles Admin nên hiển thị:

```text
Tran Tuan Hung
BCN ID: 01K4BCN123

Account
ACTIVE

────────────────────

BCN Membership

Overall:
✅ VERIFIED

Discord
✅ Member

Last checked:
08:20

Zalo
❌ Not member

Last checked:
08:15

Policy:
ANY_TRUSTED_GROUP

────────────────────

Connected Accounts

Google   ✅
GitHub   ✅
Discord  ✅
Zalo     ✅

────────────────────

Applications

Quiz
✅ ACTIVE
ADMIN

Event
❌ BLOCKED

Judge
✅ ACTIVE
MEMBER
```

---

# 52. User UI

User Settings:

```text
BCN Membership

Status
✅ Verified

Verification Sources

Discord BCN
✅ Member

Zalo BCN
❌ Not verified

You must remain a member of at least
one approved BCN community.
```

Nếu fail:

```text
BCN Membership

❌ Verification required

Connect Discord or Zalo
and verify your membership.
```

---

# 53. Admin Actions

Admin có thể:

```text
Recheck Membership

Manual Allow

Manual Deny

Revoke Sessions

View Verification History
```

Mọi action phải audit.

---

# 54. Audit Events

Thêm:

```text
MEMBERSHIP_VERIFIED

MEMBERSHIP_FAILED

MEMBERSHIP_EXPIRED

MEMBERSHIP_RECHECKED

MEMBERSHIP_OVERRIDE_GRANTED

MEMBERSHIP_OVERRIDE_REVOKED

MEMBERSHIP_LOST

ALL_SESSIONS_REVOKED_MEMBERSHIP
```

---

# 55. Membership Audit Data

Ví dụ:

```json
{
  "userId": "01K4BCN123",
  "provider": "DISCORD",
  "source": "BCN_DISCORD",
  "oldStatus": "VERIFIED",
  "newStatus": "NOT_MEMBER",
  "reason": "USER_NOT_IN_GUILD"
}
```

Không lưu provider access token vào audit.

---

# 56. API bổ sung

User:

```text
GET /me/membership
```

Response:

```json
{
  "eligible": true,
  "policy": "ANY_TRUSTED_GROUP",
  "sources": {
    "discord": {
      "status": "VERIFIED"
    },
    "zalo": {
      "status": "NOT_MEMBER"
    }
  }
}
```

Recheck:

```text
POST /me/membership/recheck
```

Admin:

```text
GET
/admin/users/:userId/membership
```

```text
POST
/admin/users/:userId/membership/recheck
```

```text
POST
/admin/users/:userId/membership/override
```

---

# 57. Security Pipeline

Một login hoàn chỉnh:

```text
1. Verify credential / OAuth

2. Resolve BCN User

3. Check user.status

4. Verify 2FA

5. Check Membership Eligibility

6. Create BCN SSO Session

7. Check Application Access

8. Generate Authorization Code

9. PKCE exchange

10. Create App Session

11. Issue minimal JWT
```

---

# 58. Folder Structure

```text
src/
│
├── auth/
│   ├── authentication/
│   ├── two-factor/
│   ├── identity/
│   ├── oauth/
│   ├── session/
│   └── token/
│
├── membership/
│   ├── membership.service
│   ├── membership-policy.service
│   ├── membership-cache.service
│   │
│   └── providers/
│       ├── discord/
│       │   └── discord-membership.provider
│       │
│       └── zalo/
│           └── zalo-membership.provider
│
├── applications/
│
├── authorization/
│   ├── role/
│   ├── permission/
│   └── authz/
│
├── users/
│
└── audit/
```

---

# 59. Thứ tự triển khai

## Phase 1 — BCN Core

Giữ:

```text
User
Password
Register
Login
2FA
```

---

## Phase 2 — Membership Model

Implement:

```text
membership_sources

user_memberships

membership_overrides

MembershipPolicyService
```

Policy:

```text
ANY_TRUSTED_GROUP
```

---

## Phase 3 — Discord Verification

Làm Discord trước vì verification rõ ràng.

Implement:

```text
Connect Discord

OAuth:
identify
guilds.members.read

Verify BCN Guild

Store membership
```

Discord chính thức hỗ trợ lấy current user's guild-member information với `guilds.members.read`.

---

## Phase 4 — Membership Login Gate

Sửa login:

```text
Password/OAuth
      ↓
MembershipPolicyService
      ↓
eligible?
```

Nếu false:

```text
MEMBERSHIP_REQUIRED
```

Không tạo SSO session.

---

## Phase 5 — Zalo Verification

Xác nhận trước:

```text
BCN Zalo group
có thuộc OA-managed group không?
```

Nếu có:

```text
Zalo OA
      ↓
Group List Member API
      ↓
sync members
      ↓
Redis Set
```

Zalo hiện cung cấp endpoint lấy danh sách thành viên nhóm và trả `user_id`; ứng dụng phải được cấp quyền quản lý thông tin nhóm.

---

## Phase 6 — Zalo Identity Mapping

Mapping:

```text
Zalo App User
↔
Zalo OA User
```

Không map bằng display name.

Nếu tích hợp OA/App cho phép nhận cả:

```text
user_id_by_app
user_id
```

thì sử dụng mapping này.

---

## Phase 7 — SSO

Implement:

```text
applications

user_app_access

/oauth/authorize

/oauth/token

PKCE

App Session
```

---

## Phase 8 — Role / Permission

Implement:

```text
roles

permissions

role_permissions

user_app_roles

AuthZ
```

---

## Phase 9 — Social Providers

Sau Discord:

```text
Google

GitHub

Zalo login
```

External Identity và Membership vẫn là hai concept riêng.

---

# 60. Rule rất quan trọng

Không viết:

```text
Google connected
→ BCN member
```

Không:

```text
Discord connected
→ BCN member
```

Phải là:

```text
Discord Identity connected
        +
Discord BCN Guild verified
        ↓
Discord Membership VERIFIED
```

---

# 61. Trường hợp thực tế

### Case A

```text
Password ✅
Discord ✅ BCN Guild
Zalo ❌
```

Result:

```text
LOGIN ✅
```

---

### Case B

```text
Google ✅ linked
Discord ❌
Zalo ✅ BCN Group
```

Result:

```text
LOGIN ✅
```

---

### Case C

```text
GitHub ✅ linked
Discord ❌
Zalo ❌
```

Result:

```text
LOGIN ❌

MEMBERSHIP_REQUIRED
```

---

### Case D

```text
Discord ✅ linked
nhưng đã rời BCN Discord

Zalo ❌
```

Result:

```text
MEMBERSHIP ❌

Sessions revoked

LOGIN ❌
```

---

### Case E

```text
Discord ✅
Zalo ✅
```

sau đó:

```text
rời Discord
```

Result:

```text
Zalo vẫn VERIFIED
        ↓
eligible = TRUE
        ↓
LOGIN ✅
```

vì policy:

```text
ANY_TRUSTED_GROUP
```

---

# 62. Acceptance Criteria mới

Hệ thống chỉ hoàn thành khi:

- Một người chỉ có một BCN Account.
- Google/GitHub/Discord/Zalo là external identities.
- Discord identity không tự động đồng nghĩa với Discord membership.
- Zalo identity không tự động đồng nghĩa với Zalo group membership.
- User phải thuộc ít nhất một trusted membership source.
- Mặc định policy là `Discord OR Zalo`.
- User không thuộc cả hai thì không login BCN được.
- Password đúng nhưng membership fail vẫn không login.
- Google login thành công nhưng membership fail vẫn không login.
- GitHub login thành công nhưng membership fail vẫn không login.
- Discord login chỉ PASS membership nếu user thực sự ở BCN Guild.
- Zalo membership chỉ PASS khi được xác minh bằng nguồn tin cậy.
- Membership không được lưu VERIFIED vĩnh viễn.
- Membership có freshness/TTL.
- User mất membership cuối cùng thì revoke sessions.
- User join lại không cần tạo account mới.
- Không delete business data khi user rời group.
- Có manual override có audit và expiry.
- App access vẫn độc lập với membership.
- Role/permission vẫn độc lập với membership.
- JWT vẫn chỉ chứa `iss/sub/aud/sid/iat/exp`.
- Role/permission/membership không nhét vào JWT.

---

# 63. Kiến trúc cuối cùng

```text
     PASSWORD
     GOOGLE
     GITHUB
     DISCORD
     ZALO
        │
        ▼
┌────────────────────────┐
│ profiles.bcn.id.vn    │
│                        │
│ BCN Identity Platform  │
└────────────┬───────────┘
             │
             ▼
       BCN USER ID
             │
             ▼
    MEMBERSHIP GATE
             │
      ┌──────┴──────┐
      ▼             ▼
 Discord BCN     Zalo BCN
      │             │
      └──────┬──────┘
             │
       ANY VERIFIED?
             │
       ┌─────┴─────┐
       │           │
      NO          YES
       │           │
       ▼           ▼
     DENY        BCN SSO
                   │
                   ▼
             APP ACCESS
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
      Quiz       Event       Judge
       │           │           │
       ▼           ▼           ▼
      Role        Role        Role
       │           │           │
       ▼           ▼           ▼
   Permission  Permission  Permission
```

---

# 64. Công thức để team nhớ

```text
Authentication
=
Bạn là ai?
```

```text
Membership
=
Bạn có còn thuộc BCN không?
```

```text
App Access
=
Bạn được vào app nào?
```

```text
Permission
=
Bạn được làm gì trong app?
```

Flow cuối:

```text
IDENTITY
   ↓
AUTHENTICATION
   ↓
BCN MEMBERSHIP
   ↓
APPLICATION ACCESS
   ↓
ROLE
   ↓
PERMISSION
   ↓
BUSINESS
```

Đây là pipeline bắt buộc của toàn bộ BCN Identity Platform.