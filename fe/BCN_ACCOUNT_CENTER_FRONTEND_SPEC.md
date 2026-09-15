# BCN Account Center — Frontend Implementation Specification

> **Domain:** `https://profiles.bcn.id.vn`  
> **Frontend:** Next.js + TypeScript  
> **Package Manager:** `pnpm`  
> **Languages:** Tiếng Việt (`vi`) + English (`en`)  
> **Design vibe:** Black / White / Minimal / Premium, lấy cảm hứng từ nhận diện BCN và trải nghiệm onboarding khi mở máy mới, nhưng được thiết kế riêng cho hệ sinh thái BCN.

---

# 1. Mục tiêu

Xây dựng một Frontend trung tâm cho **BCN Account Center** để:

- User quản lý tài khoản BCN cá nhân.
- Quản lý hồ sơ cá nhân.
- Quản lý bảo mật và 2FA.
- Liên kết / đồng bộ Google, GitHub, Discord, Zalo.
- Xem trạng thái BCN Membership.
- Xem những application được phép truy cập.
- Xem role / quyền theo từng application.
- Xem và revoke session.
- Hỗ trợ onboarding thân thiện cho user mới.
- Admin quản lý user, membership, app access, role, session và audit log.
- Hỗ trợ đa ngôn ngữ:
  - Tiếng Việt.
  - English.

Hệ thống phải mang cảm giác:

```text
Một tài khoản.
Toàn bộ hệ sinh thái BCN.
```

---

# 2. Product Concept

Tên giao diện:

```text
BCN Account
```

Tagline tiếng Việt:

```text
Một tài khoản. Toàn bộ hệ sinh thái BCN.
```

Tagline English:

```text
One account. The entire BCN ecosystem.
```

Concept:

```text
BCN Logo
   ↓
Black / White
   ↓
Minimal
   ↓
Large Typography
   ↓
Guided Experience
   ↓
Subtle Motion
   ↓
Premium Identity Center
```

Frontend không nên mang cảm giác:

```text
Traditional Admin Dashboard
```

mà nên giống:

```text
Account Center
Identity Center
Security Center
Membership Center
```

---

# 3. UX Principles

## 3.1 Friendly First

User mới phải hiểu:

```text
BCN Account là gì?
↓
Tại sao phải kết nối Provider?
↓
Membership là gì?
↓
Tại sao phải bật 2FA?
↓
Mình được truy cập app nào?
```

Không bắt user tự khám phá.

---

## 3.2 Progressive Disclosure

Không hiển thị tất cả thông tin kỹ thuật ngay.

Ví dụ:

```text
Discord
✓ Connected
```

Click `Manage` mới hiển thị:

```text
Discord ID
Membership status
Linked date
Last sync
Disconnect
```

---

## 3.3 Security without Friction

Security cần rõ ràng nhưng không gây khó hiểu.

Ví dụ:

```text
Two-factor authentication
Recommended
```

thay vì hiển thị nội dung kỹ thuật dài dòng.

---

## 3.4 Consistency

Toàn bộ hệ thống sử dụng chung:

- Button.
- Badge.
- Status.
- Modal.
- Drawer.
- Table.
- Empty state.
- Error state.
- Loading state.
- Confirmation dialog.

---

# 4. Recommended Tech Stack

## Core

```text
Next.js
React
TypeScript
pnpm
```

Package manager bắt buộc cho project:

```text
pnpm
```

Không dùng lẫn:

```text
npm
yarn
bun
```

trong cùng repository để tránh lệch lockfile và dependency resolution.

Lockfile chuẩn:

```text
pnpm-lock.yaml
```

Khuyến nghị sử dụng:

```text
Next.js App Router
React Server Components
Server Actions khi phù hợp
Route Handlers khi cần proxy/BFF
```

---

## Styling

```text
Tailwind CSS
```

Lý do:

- Dễ xây design system.
- Responsive nhanh.
- Dark-first thuận lợi.
- Dễ maintain giữa nhiều developer.

---

## UI Components

```text
shadcn/ui
Radix UI
```

Dùng cho:

- Dialog.
- Drawer / Sheet.
- Dropdown.
- Tabs.
- Tooltip.
- Command Palette.
- Select.
- Form controls.
- Alert Dialog.

Không dùng default style của shadcn nguyên bản.

Phải custom lại theo BCN Design System.

---

## Icons

Dùng 2 nhóm icon riêng:

### UI / System Icons

```text
lucide-react
```

Dùng cho:

```text
Home
User
Shield
Lock
Key
Settings
Search
Command
Chevron
Arrow
Check
X
Alert
Clock
Monitor
Smartphone
LogOut
Refresh
Copy
ExternalLink
MoreHorizontal
```

Lucide là bộ icon chính của toàn bộ UI để đảm bảo:

```text
consistent stroke
consistent size
consistent visual language
```

### Brand / Provider Icons

Khuyến nghị:

```text
react-icons
```

và chỉ dùng nhóm:

```text
react-icons/si
```

cho brand icon.

Ví dụ:

```ts
import {
  SiGoogle,
  SiGithub,
  SiDiscord,
  SiZalo
} from "react-icons/si";
```

Nếu một brand không có icon phù hợp hoặc cần logo chính thức chuẩn hơn, lưu SVG chính thức trong:

```text
/public/brands/
```

Ví dụ:

```text
/public/brands/google.svg
/public/brands/github.svg
/public/brands/discord.svg
/public/brands/zalo.svg
/public/brands/bcn.svg
```

Không dùng icon emoji như:

```text
🔒
👤
⚙️
```

trong UI production.

---

## Animation

```text
Motion
```

hoặc package:

```text
motion
```

Dùng cho:

- Onboarding.
- Page transition nhẹ.
- Card transition.
- Success state.
- Drawer.
- Modal.
- Provider connection state.

Không lạm dụng animation.

---

## Server State

```text
TanStack Query
```

Dùng cho:

- Current user.
- Connected accounts.
- Membership.
- Applications.
- Sessions.
- Admin users.
- Admin application access.
- Audit logs.

---

## Forms

```text
React Hook Form
Zod
```

Pattern:

```text
React Hook Form
       +
Zod Schema
       ↓
Validated Form
```

---

## Internationalization

Khuyến nghị:

```text
next-intl
```

Languages:

```text
vi
en
```

Default locale:

```text
vi
```

Route có thể theo dạng:

```text
/vi/account
/en/account
```

hoặc dùng locale detection + middleware.

Khuyến nghị sử dụng prefix:

```text
/vi
/en
```

để URL rõ ràng và dễ share.

---

## Notifications

```text
Sonner
```

Dùng cho:

```text
Account connected
Profile updated
Membership refreshed
Session revoked
Role updated
```

---

## Class Utilities

```text
clsx
tailwind-merge
class-variance-authority
```

Dùng cho component variants.

---

## Date

```text
date-fns
```

Format theo locale:

```text
vi
en
```

---

## Optional

Có thể cân nhắc:

```text
nuqs
```

cho filter/search state đồng bộ URL.

Ví dụ:

```text
/admin/users?status=ACTIVE&membership=VERIFIED
```

---

# 5. Architecture

```text
Browser
   │
   ▼
Next.js BCN Account Center
   │
   ▼
profiles.bcn.id.vn API
   │
   ├── User
   ├── Authentication
   ├── External Identity
   ├── Membership
   ├── Applications
   ├── Authorization
   ├── Sessions
   └── Admin
```

Nếu FE và BE cùng domain:

```text
https://profiles.bcn.id.vn
```

có thể deploy:

```text
/       → Next.js FE
/api    → Backend API
```

hoặc:

```text
profiles.bcn.id.vn
api.profiles.bcn.id.vn
```

tùy hạ tầng.

---

# 6. Authentication Strategy

Frontend không nên lưu:

```text
accessToken
refreshToken
```

trong:

```text
localStorage
```

Ưu tiên:

```text
Secure
HttpOnly
SameSite=Lax
Cookie
```

Frontend chỉ cần gọi:

```text
GET /me
```

để biết trạng thái đăng nhập.

---

# 7. Design System

## 7.1 Colors

### Main Background

```css
#050505
```

### Elevated Surface

```css
#0D0D0D
```

### Secondary Surface

```css
#141414
```

### Primary Text

```css
#F5F5F5
```

### Secondary Text

```css
#A1A1A1
```

### Muted Text

```css
#737373
```

### Border

```css
rgba(255, 255, 255, 0.10)
```

### Hover

```css
rgba(255, 255, 255, 0.06)
```

---

# 8. Status Colors

Chỉ dùng accent ở trạng thái.

```text
Success
Green

Warning
Amber

Danger
Red

Info
Cold Blue
```

Ví dụ:

```text
● Active
✓ Verified
○ Pending
× Blocked
```

Không làm các card lớn nhiều màu.

---

# 9. Provider Branding

Các provider:

```text
Google
GitHub
Discord
Zalo
```

Provider card vẫn dùng:

```text
Black / Dark Surface
```

chỉ icon provider có màu nhận diện.

Không biến page thành:

```text
Google Blue
Discord Purple
Zalo Blue
```

---


# 9.1 Icon System

Icon phải là một phần của design system, không chọn tùy ý ở từng page.

## Icon Sizes

Chuẩn:

```text
12px → metadata nhỏ
14px → inline text
16px → button nhỏ / input
18px → button mặc định
20px → navigation
24px → card / action chính
32px → empty state
40–48px → onboarding / success state
```

Không dùng icon quá lớn trừ onboarding hoặc empty state.

---

## Icon Stroke

Với `lucide-react`, giữ:

```text
strokeWidth = 1.5 hoặc 1.75
```

Không mix:

```text
1px
2px
3px
```

lung tung giữa các component.

---

## Icon + Text Rule

Button có icon:

```text
[ icon ] Label
```

Ví dụ:

```text
[ RefreshCw ] Đồng bộ lại

[ ShieldCheck ] Thiết lập 2FA

[ LogOut ] Đăng xuất
```

Icon đứng trước text với gap:

```text
8px
```

---

## Provider Icon Rule

Provider card:

```text
Google
GitHub
Discord
Zalo
```

sử dụng brand icon riêng.

Ví dụ:

```tsx
<SiGoogle />
<SiGithub />
<SiDiscord />
<SiZalo />
```

Brand color chỉ dùng ở icon.

Card vẫn giữ:

```text
BCN dark surface
```

Ví dụ:

```text
┌─────────────────────────────────────────┐
│ [Google Icon] Google                    │
│                                         │
│ user@gmail.com                          │
│ Connected                     [Manage]  │
└─────────────────────────────────────────┘
```

Không tô toàn bộ card theo màu provider.

---

## Status Icons

Mapping chuẩn:

```text
Verified / Active
→ CircleCheck / Check

Pending
→ Clock3

Warning
→ TriangleAlert

Blocked
→ CircleX

Connected
→ Link2

Disconnected
→ Unlink

Security
→ ShieldCheck

2FA
→ KeyRound

Session
→ Monitor / Smartphone

Membership
→ BadgeCheck / UsersRound

Application
→ PanelsTopLeft / AppWindow
```

Không để từng page tự chọn icon khác nhau cho cùng một trạng thái.

---

## Sidebar Icons

Đề xuất:

```text
Overview
→ LayoutDashboard

Account
→ UserRound

Security
→ ShieldCheck

Connected Accounts
→ Link2

Membership
→ BadgeCheck

Applications
→ Grid2X2

Sessions
→ MonitorSmartphone

Administration
→ Shield

Help
→ CircleHelp

Sign out
→ LogOut
```

---

## Admin Icons

```text
Users
→ UsersRound

Applications
→ Boxes / Grid3X3

Roles
→ UserCog

Permissions
→ KeyRound

Membership
→ BadgeCheck

Audit Log
→ ScrollText

Security Events
→ ShieldAlert
```

---

## Onboarding Icons

Không sử dụng quá nhiều icon trong onboarding.

Ưu tiên:

```text
BCN Logo
Typography
Subtle animation
```

Chỉ dùng icon lớn ở các trạng thái như:

```text
Success
→ CircleCheckBig

Security
→ ShieldCheck

Connected
→ Link2

Ready
→ Check
```

---

## Accessibility cho Icon

Icon chỉ để trang trí:

```tsx
aria-hidden="true"
```

Icon button không có label text phải có:

```tsx
aria-label="Copy BCN ID"
```

Ví dụ:

```tsx
<Button
  variant="ghost"
  size="icon"
  aria-label={t("account.copyBcnId")}
>
  <Copy aria-hidden="true" />
</Button>
```

Không để screen reader chỉ đọc:

```text
button
```

mà không biết chức năng.


# 10. Typography

Khuyến nghị:

```text
Geist
```

Fallback:

```text
Inter
system-ui
sans-serif
```

Heading lớn:

```text
Desktop: 64–80px
Tablet: 52–64px
Mobile: 38–48px
```

Page Heading:

```text
32–40px
```

Section Heading:

```text
20–24px
```

Body:

```text
14–16px
```

Large Body:

```text
18px
```

---

# 11. Spacing

Spacing phải thoáng.

```text
Page X Padding
Desktop: 32–48px
Tablet: 24px
Mobile: 16px
```

Card:

```text
24–32px
```

Section gap:

```text
32–48px
```

---

# 12. Radius

```text
Button: 12–14px
Input: 12–14px
Card: 20–24px
Large Dialog: 24–28px
```

---

# 13. Border

Dùng border nhẹ:

```css
border: 1px solid rgba(255,255,255,.1);
```

Không shadow quá mạnh.

Có thể dùng:

```css
box-shadow:
0 20px 60px rgba(0,0,0,.25);
```

cho modal hoặc floating panel.

---

# 14. Onboarding Experience

User mới không vào dashboard ngay.

Flow:

```text
FIRST LOGIN
     ↓
WELCOME
     ↓
YOUR BCN ACCOUNT
     ↓
CONNECT ACCOUNTS
     ↓
VERIFY MEMBERSHIP
     ↓
SECURE ACCOUNT
     ↓
YOUR APPLICATIONS
     ↓
READY
```

Đây là trải nghiệm quan trọng nhất của sản phẩm.

---

# 15. Welcome Screen

Full viewport.

Background:

```text
#050505
```

Không có sidebar.

Không có navbar phức tạp.

Layout:

```text


               BCN LOGO


          Chào mừng đến với BCN.


      Một tài khoản.
      Toàn bộ hệ sinh thái BCN.


              [ Bắt đầu ]


      BCN Technology • School Life Stories
```

English:

```text
Welcome to BCN.

One account.
The entire BCN ecosystem.

[ Get started ]
```

---

# 16. Welcome Animation

Timeline:

```text
0ms
Black screen

300ms
BCN logo fade

700ms
Logo line draw / subtle reveal

1200ms
Headline fade + slide 10px

1600ms
Description fade

1900ms
Button fade
```

Animation duration:

```text
400–700ms
```

Không dùng:

```text
heavy 3D
particle effect
long intro
```

---

# 17. Account Introduction

Title:

```text
Xin chào, Hùng.
```

English:

```text
Hello, Hung.
```

Description:

```text
Đây là tài khoản BCN của bạn.
Tài khoản này được sử dụng trên toàn bộ hệ sinh thái BCN.
```

Card:

```text
┌──────────────────────────────────────────┐
│                                          │
│                TH                        │
│                                          │
│          Tran Tuan Hung                  │
│          @hung                           │
│                                          │
│ BCN ID                                   │
│ 01K4BCN123                         Copy  │
│                                          │
└──────────────────────────────────────────┘
```

---

# 18. Connected Accounts Onboarding

Title:

```text
Kết nối các tài khoản của bạn
```

English:

```text
Connect your accounts
```

Description:

```text
Sau khi liên kết, bạn có thể sử dụng các tài khoản
này để đăng nhập vào BCN Account.
```

Providers:

```text
Google
GitHub
Discord
Zalo
```

---

# 19. Provider Card

Default:

```text
┌─────────────────────────────────────────┐
│ [icon] Discord                          │
│                                         │
│ Chưa kết nối                            │
│                                         │
│                           [ Kết nối ]   │
└─────────────────────────────────────────┘
```

Connected:

```text
┌─────────────────────────────────────────┐
│ [icon] Discord                     ✓   │
│                                         │
│ @tuanhung                               │
│ Đã kết nối                              │
│                                         │
│                            [ Quản lý ]  │
└─────────────────────────────────────────┘
```

---

# 20. Membership Verification Onboarding

Title:

```text
Xác minh thành viên BCN
```

English:

```text
Verify your BCN membership
```

Description:

```text
Để sử dụng BCN Account, bạn cần thuộc ít nhất
một cộng đồng BCN đã được xác minh.
```

Policy:

```text
Discord BCN
OR
Zalo BCN
```

---

# 21. Membership Checking UI

```text
BCN Membership

● Đang xác minh
```

Sources:

```text
Discord BCN

✓ Account connected

● Checking membership...
```

```text
Zalo BCN

Not connected

[ Connect Zalo ]
```

---

# 22. Membership Success

```text
             ✓

    Bạn đã được xác minh
      là thành viên BCN.

          [ Tiếp tục ]
```

English:

```text
             ✓

   Your BCN membership
      has been verified.

          [ Continue ]
```

---

# 23. Membership Failed

UI nhẹ nhàng:

```text
Chưa thể xác minh thành viên

Tài khoản Discord này hiện không thuộc
cộng đồng Discord BCN.

Bạn có thể:

• Kiểm tra lại Discord
• Kết nối Zalo
• Liên hệ BCN Admin
```

Buttons:

```text
[ Thử lại ]

[ Kết nối Zalo ]

Liên hệ Admin
```

---

# 24. Security Onboarding

Title:

```text
Bảo vệ tài khoản của bạn
```

English:

```text
Secure your account
```

Status:

```text
Password
✓ Configured

Two-factor authentication
○ Recommended

Recovery options
○ Setup
```

---

# 25. Two-Factor Card

```text
Two-factor authentication

Thêm một bước xác minh khi đăng nhập
để bảo vệ BCN Account.

[ Thiết lập 2FA ]
```

English:

```text
Add an additional verification step
to protect your BCN Account.

[ Set up 2FA ]
```

---

# 26. Applications Onboarding

Title:

```text
Các ứng dụng của bạn
```

English:

```text
Your applications
```

Cards:

```text
BCN Quiz

✓ Có quyền truy cập

Role
ADMIN
```

```text
BCN Event

○ Chưa được cấp quyền
```

```text
BCN Judge

✓ Có quyền truy cập

Role
MEMBER
```

---

# 27. Ready Screen

Full black.

```text
              ✓

       Mọi thứ đã sẵn sàng.

BCN Account của bạn đã được thiết lập.

       [ Vào BCN Account ]
```

English:

```text
              ✓

        You're all set.

Your BCN Account is ready.

       [ Open BCN Account ]
```

---

# 28. Main Application Layout

Desktop:

```text
┌────────────────────────────────────────────────────────────┐
│ BCN                  Search        Language     Avatar     │
├────────────────┬───────────────────────────────────────────┤
│                │                                           │
│ Overview       │                                           │
│ Account        │            Main Content                   │
│ Security       │                                           │
│ Connections    │                                           │
│ Membership     │                                           │
│ Applications   │                                           │
│ Sessions       │                                           │
│                │                                           │
│ ─────────────  │                                           │
│ Admin          │                                           │
│ Help           │                                           │
│ Sign out       │                                           │
└────────────────┴───────────────────────────────────────────┘
```

---

# 29. User Sidebar

Menu:

```text
Overview

Account

Security

Connected Accounts

Membership

Applications

Sessions
```

Bottom:

```text
Help

Sign out
```

Nếu có admin permission:

```text
Administration
```

---

# 30. Header

Header gồm:

```text
BCN Logo

Search / Command

Language Switcher

Notification optional

Avatar
```

Language switcher:

```text
VI
EN
```

Không dùng dropdown quá lớn.

Có thể dùng:

```text
VI | EN
```

---

# 31. Overview Page

Hero:

```text
Chào buổi sáng, Hùng.

Mọi thứ về BCN Account của bạn đều ở đây.
```

English:

```text
Good morning, Hung.

Everything about your BCN Account is here.
```

Primary status:

```text
BCN Account

● Active
```

---

# 32. Account Status Summary

Có thể dùng một card rộng:

```text
┌──────────────────────────────────────────────┐
│ BCN Account                                  │
│                                              │
│ ● ACTIVE                                     │
│                                              │
│ Membership      Security       Connected     │
│ ✓ Verified     ✓ Protected    3 / 4         │
│                                              │
└──────────────────────────────────────────────┘
```

---

# 33. Quick Actions

```text
Kết nối Discord

Thiết lập 2FA

Xem ứng dụng

Xem phiên đăng nhập
```

English:

```text
Connect Discord

Set up 2FA

View applications

View sessions
```

---

# 34. Account Page

Sections:

```text
Profile Photo

Full Name

Username

Email

BCN ID

Department

Join Date
```

BCN ID:

```text
01K4BCN123                    Copy
```

Helper text:

```text
BCN ID là định danh cố định của bạn
trong toàn bộ hệ sinh thái BCN.
```

English:

```text
Your BCN ID is your permanent identifier
across the BCN ecosystem.
```

---

# 35. Connected Accounts Page

Header:

```text
Connected Accounts
```

Vietnamese description:

```text
Liên kết các dịch vụ bạn sử dụng với BCN Account.
```

English:

```text
Link the services you use to your BCN Account.
```

Provider cards:

```text
Google

user@gmail.com

Connected Sep 15, 2026

[ Manage ]
```

```text
GitHub

@trantuanhung1209

Connected

[ Manage ]
```

```text
Discord

@hung

BCN Membership ✓

[ Manage ]
```

```text
Zalo

Not connected

[ Connect ]
```

---

# 36. Provider Detail Drawer

Khi click `Manage`, mở Sheet bên phải.

Ví dụ:

```text
Discord

Connected Account

@hung

Discord ID
839284729384

Connected
15/09/2026

BCN Discord Membership

● Verified

Last checked
2 minutes ago

[ Sync now ]

[ Disconnect ]
```

Không chuyển sang page riêng.

---

# 37. Membership Page

Hero:

```text
┌─────────────────────────────────────────┐
│                                         │
│                 ✓                       │
│                                         │
│        Membership verified              │
│                                         │
│ Bạn đang có quyền sử dụng BCN Account   │
│                                         │
└─────────────────────────────────────────┘
```

Sources:

```text
Discord BCN
✓ VERIFIED

Zalo BCN
○ NOT CONNECTED
```

Policy:

```text
Bạn cần thuộc ít nhất một cộng đồng BCN
được hệ thống xác minh.
```

---

# 38. Applications Page

Header:

```text
Applications
```

Description:

```text
Các ứng dụng sử dụng BCN Account của bạn.
```

Cards:

```text
BCN Quiz

● Access granted

Role
ADMIN

Last used
Today

[ Open Quiz ]
```

```text
BCN Event

○ No access

Bạn chưa được cấp quyền sử dụng ứng dụng này.
```

Optional:

```text
[ Request Access ]
```

nếu sau này có workflow xin quyền.

---

# 39. Security Page

Sections:

```text
Password

Two-factor authentication

Login methods

Recent security activity
```

2FA:

```text
Two-factor authentication

● Enabled

Tài khoản của bạn yêu cầu thêm một bước
xác minh sau khi đăng nhập.

[ Manage ]
```

---

# 40. Sessions Page

Card:

```text
Chrome on macOS

Ho Chi Minh City
Current session

Quiz
Last active: now

[ ••• ]
```

Khác:

```text
Safari on iPhone

Last active: 2 days ago

Event
```

Action:

```text
Sign out all other sessions
```

Confirm dialog bắt buộc.

---

# 41. Admin Mode

Không cần xây một FE admin riêng.

Dùng cùng project:

```text
profiles.bcn.id.vn
```

Nếu user có admin permission:

```text
Administration
```

xuất hiện ở sidebar.

Có thể có switcher:

```text
BCN Account

User Mode
Admin Mode
```

---

# 42. Admin Overview

Không ưu tiên chart.

Ưu tiên số liệu hành động:

```text
BCN Administration

1,248 Members

1,097 Verified

32 Pending Verification

18 Blocked Accounts
```

Needs attention:

```text
12 membership checks failed

4 users requested app access

2 suspicious sessions
```

---

# 43. Admin Users Page

Table columns:

```text
User

Membership

Applications

Security

Status

Last Active

Actions
```

Example:

```text
Tran Tuan Hung

✓ Verified

Quiz +2

2FA

Active

2m ago
```

---

# 44. Admin Filters

Filters:

```text
Search

Status

Membership

Application

Role

2FA
```

Search:

```text
Name
Username
BCN ID
Email
```

Nên sync filter vào URL.

Ví dụ:

```text
/admin/users?status=ACTIVE&membership=VERIFIED
```

---

# 45. Admin User Detail

Header:

```text
TH

Tran Tuan Hung
@hung

BCN ID
01K4BCN123

● ACTIVE
```

Tabs:

```text
Overview

Membership

Applications

Accounts

Security

Sessions

Audit Log
```

---

# 46. Admin Application Access

Ví dụ:

```text
BCN Quiz

Access
[ ACTIVE ▼ ]

Roles

☑ ADMIN
☐ STAFF
☐ MEMBER
```

Event:

```text
BCN Event

Access
[ BLOCKED ▼ ]

No roles
```

---

# 47. Grant App Confirmation

Modal:

```text
Grant BCN Event access?

User
Tran Tuan Hung

Application
BCN Event

[ Cancel ]

[ Grant access ]
```

Không update quyền ngay mà không confirm.

---

# 48. Admin Role Management

Không show permission quá sớm.

```text
ADMIN

12 permissions

[ View permissions ]
```

Expand:

```text
quiz.question.read
quiz.question.create
quiz.question.update
quiz.question.delete
quiz.result.read
```

---

# 49. Admin Membership

```text
Membership Status

✓ VERIFIED
```

Discord:

```text
Discord BCN

✓ Member

Last checked
1 minute ago

[ Recheck ]
```

Zalo:

```text
Zalo BCN

Unknown

[ Verify ]
```

Override:

```text
[ Add override ]
```

---

# 50. Membership Override Dialog

```text
Membership Override

Action
Allow / Deny

Reason
[ .............. ]

Expiry
7 days

[ Cancel ]

[ Apply ]
```

---

# 51. Audit Log

Dùng timeline.

```text
Today

10:31

Quiz ADMIN role granted
by Nguyen Van A


09:45

Discord membership verified


09:42

Discord account linked


09:38

Successful login
Chrome • macOS
```

---

# 52. Command Palette

Shortcut:

```text
⌘ K
```

hoặc:

```text
Ctrl K
```

Command menu:

```text
Search BCN
```

User actions:

```text
Account

Security

Discord

Membership

Applications

Sessions
```

Admin:

```text
Search member

Open application settings

Membership management

Audit logs
```

---

# 53. Micro Interactions

Duration:

```text
150–250ms
```

Dùng cho:

```text
Hover
Tabs
Drawer
Modal
Button
Card
```

Onboarding:

```text
400–700ms
```

---

# 54. Loading UX

Không dùng spinner lớn ở giữa page.

Dùng skeleton.

Example:

```text
████████████

████████
██████████████
```

Provider verify:

```text
Checking Discord membership...
```

với animated status dot.

---

# 55. Empty States

Ví dụ chưa kết nối Discord:

```text
Bạn chưa kết nối Discord.

Kết nối Discord để sử dụng nó
làm phương thức đăng nhập BCN.

[ Connect Discord ]
```

English:

```text
You haven't connected Discord yet.

Connect Discord to use it
as a BCN sign-in method.

[ Connect Discord ]
```

---

# 56. Error States

Không chỉ:

```text
Something went wrong.
```

Cần message có hướng xử lý.

Ví dụ:

```text
Không thể kiểm tra Membership.

Discord hiện không phản hồi.
Bạn có thể thử lại sau vài phút.

[ Thử lại ]
```

---

# 57. Responsive Design

## Desktop

Sidebar cố định.

## Tablet

Sidebar compact.

## Mobile

Không dùng sidebar permanent.

Bottom navigation:

```text
Home

Apps

Security

Account
```

Các mục khác trong:

```text
More
```

Admin mobile dùng:

```text
Drawer Navigation
```

---

# 58. Recommended Project Structure

```text
src/
│
├── app/
│   │
│   ├── [locale]/
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── callback/
│   │   │
│   │   ├── (onboarding)/
│   │   │   ├── welcome/
│   │   │   ├── account/
│   │   │   ├── connections/
│   │   │   ├── membership/
│   │   │   ├── security/
│   │   │   ├── applications/
│   │   │   └── ready/
│   │   │
│   │   ├── (account)/
│   │   │   ├── page.tsx
│   │   │   ├── account/
│   │   │   ├── security/
│   │   │   ├── connections/
│   │   │   ├── membership/
│   │   │   ├── applications/
│   │   │   └── sessions/
│   │   │
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── users/
│   │       ├── applications/
│   │       ├── roles/
│   │       ├── membership/
│   │       └── audit/
│   │
│   └── api/
│
├── components/
│   ├── account/
│   ├── admin/
│   ├── auth/
│   ├── onboarding/
│   ├── providers/
│   ├── membership/
│   ├── applications/
│   └── ui/
│
├── features/
│   ├── account/
│   ├── identities/
│   ├── membership/
│   ├── applications/
│   ├── sessions/
│   └── admin/
│
├── hooks/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── i18n/
│   ├── query/
│   ├── validators/
│   └── utils/
│
├── services/
│   ├── auth.service.ts
│   ├── profile.service.ts
│   ├── identity.service.ts
│   ├── membership.service.ts
│   ├── application.service.ts
│   ├── session.service.ts
│   ├── admin-user.service.ts
│   └── audit.service.ts
│
├── messages/
│   ├── vi.json
│   └── en.json
│
└── types/
```

---

# 59. i18n Structure

Sử dụng:

```text
next-intl
```

Locales:

```ts
export const locales = ["vi", "en"] as const;
```

Default:

```text
vi
```

---

# 60. Translation Files

Example:

```text
messages/
├── vi.json
└── en.json
```

`vi.json`:

```json
{
  "common": {
    "continue": "Tiếp tục",
    "cancel": "Hủy",
    "save": "Lưu",
    "connect": "Kết nối",
    "disconnect": "Ngắt kết nối",
    "manage": "Quản lý"
  },
  "welcome": {
    "title": "Chào mừng đến với BCN",
    "headline": "Một tài khoản. Toàn bộ hệ sinh thái BCN.",
    "start": "Bắt đầu"
  }
}
```

`en.json`:

```json
{
  "common": {
    "continue": "Continue",
    "cancel": "Cancel",
    "save": "Save",
    "connect": "Connect",
    "disconnect": "Disconnect",
    "manage": "Manage"
  },
  "welcome": {
    "title": "Welcome to BCN",
    "headline": "One account. The entire BCN ecosystem.",
    "start": "Get started"
  }
}
```

---

# 61. i18n Rules

Không hard-code text:

Sai:

```tsx
<Button>Kết nối</Button>
```

Đúng:

```tsx
<Button>{t("common.connect")}</Button>
```

---

# 62. Locale Routing

Khuyến nghị:

```text
/vi
/en
```

Examples:

```text
/vi/account
/en/account

/vi/membership
/en/membership

/vi/admin/users
/en/admin/users
```

---

# 63. Locale Detection

Ưu tiên:

```text
Saved User Preference
↓
Cookie
↓
Browser Language
↓
Default = vi
```

User đổi language phải được lưu.

---

# 64. Date Localization

Vietnamese:

```text
15/09/2026
2 phút trước
Hôm nay
```

English:

```text
Sep 15, 2026
2 minutes ago
Today
```

Dùng:

```text
date-fns locale
```

---

# 65. API Service Layer

Không gọi `fetch()` trực tiếp trong component.

Dùng:

```text
services/
```

Ví dụ:

```ts
identityService.getConnectedAccounts()
membershipService.getMembership()
applicationService.getApplications()
sessionService.getSessions()
```

---

# 66. TanStack Query Keys

Chuẩn hóa:

```text
["me"]

["me", "identities"]

["me", "membership"]

["me", "applications"]

["me", "sessions"]

["admin", "users"]

["admin", "user", userId]

["admin", "user", userId, "applications"]

["admin", "user", userId, "membership"]

["admin", "audit"]
```

---

# 67. Mutations

Examples:

```text
connectIdentity

disconnectIdentity

syncIdentity

recheckMembership

setup2FA

revokeSession

revokeAllSessions

grantApplication

blockApplication

assignRole

removeRole

membershipOverride
```

Sau mutation phải invalidate query liên quan.

---

# 68. API → UI Mapping

```text
GET /me
→ Current User
```

```text
GET /me/identities
→ Connected Accounts
```

```text
GET /me/membership
→ Membership
```

```text
GET /me/applications
→ Applications
```

```text
GET /me/sessions
→ Sessions
```

```text
GET /admin/users
→ Admin Users
```

```text
GET /admin/users/:id
→ User Detail
```

```text
GET /admin/users/:id/applications
→ Application Access
```

```text
GET /admin/users/:id/membership
→ Membership Administration
```

---

# 69. Current User Type

```ts
export interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  status: "ACTIVE" | "BLOCKED" | "DISABLED";
}
```

Không lưu:

```text
password
provider token
refresh token
```

trong client state.

---

# 70. Connected Identity Type

```ts
export interface ConnectedIdentity {
  provider: "GOOGLE" | "GITHUB" | "DISCORD" | "ZALO";
  connected: boolean;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  linkedAt?: string;
  lastSyncedAt?: string;
}
```

---

# 71. Membership Type

```ts
export interface MembershipStatus {
  eligible: boolean;

  policy: "ANY_TRUSTED_GROUP";

  sources: {
    discord?: {
      status:
        | "VERIFIED"
        | "NOT_MEMBER"
        | "PENDING"
        | "UNKNOWN";
      checkedAt?: string;
    };

    zalo?: {
      status:
        | "VERIFIED"
        | "NOT_MEMBER"
        | "PENDING"
        | "UNKNOWN";
      checkedAt?: string;
    };
  };
}
```

---

# 72. Application Access Type

```ts
export interface UserApplication {
  code: string;
  name: string;

  access:
    | "ACTIVE"
    | "BLOCKED"
    | "PENDING";

  roles: string[];

  lastUsedAt?: string;

  launchUrl?: string;
}
```

---

# 73. Component Library

Nên tạo component reusable:

```text
BCNButton

BCNCard

BCNStatusBadge

BCNAvatar

BCNPageHeader

BCNSectionHeader

BCNEmptyState

BCNErrorState

BCNSkeleton

ProviderCard

MembershipCard

ApplicationCard

SessionCard

SecurityCard

AdminUserTable

AuditTimeline
```

---

# 74. Status Badge

Standard:

```text
ACTIVE
VERIFIED
PENDING
BLOCKED
NOT CONNECTED
```

Không tạo style riêng mỗi page.

---

# 75. Accessibility

Bắt buộc:

```text
Keyboard navigation

Visible focus

ARIA labels

Proper semantic HTML

Accessible Dialog

Accessible Dropdown

Color contrast

Reduced Motion support
```

Nếu:

```text
prefers-reduced-motion
```

thì giảm hoặc tắt animation onboarding.

---

# 76. Keyboard Navigation

Hỗ trợ:

```text
Tab

Shift + Tab

Enter

Escape

Arrow keys
```

Command Palette:

```text
⌘ K
Ctrl K
```

---

# 77. Performance

Ưu tiên Server Components cho:

```text
Static layout

Navigation

Initial shell
```

Client Components chỉ dùng khi cần:

```text
Interaction

Form

Mutation

Animation

TanStack Query

Provider connect state
```

---

# 78. Images

Avatar sử dụng:

```text
next/image
```

Logo BCN có thể dùng:

```text
SVG
```

để scale tốt.

---

# 79. Loading Performance

Không block cả page.

Dùng:

```text
Suspense

Skeleton

Partial Loading
```

Ví dụ:

```text
Overview loaded

Membership skeleton

Applications skeleton
```

---

# 80. Error Boundary

Nên có error boundaries cho:

```text
Account

Membership

Applications

Admin
```

Provider/API lỗi không làm crash toàn page.

---

# 81. Form UX

Rule:

```text
Validate on blur

Validate again on submit

Show inline errors

Disable submit during mutation
```

Không dùng alert browser.

---

# 82. Destructive Actions

Các action:

```text
Disconnect Provider

Disable 2FA

Revoke All Sessions

Block User

Remove Role

Membership Deny
```

phải dùng confirmation dialog.

---

# 83. Toast Usage

Dùng toast cho success ngắn:

```text
Account connected.

Profile updated.

Membership refreshed.

Session revoked.

Role assigned.
```

Không dùng toast cho nội dung dài.

---

# 84. Login Page

Full black.

```text
BCN

Chào mừng trở lại.

Đăng nhập để tiếp tục.
```

Form:

```text
Username / Email

Password

[ Continue ]
```

Divider:

```text
──────── hoặc ────────
```

Providers:

```text
Continue with Google

Continue with GitHub

Continue with Discord

Continue with Zalo
```

---

# 85. Provider Login Buttons

Button vẫn theo BCN theme.

```text
dark surface
white text
border subtle
```

Provider logo có màu.

Không dùng 4 nút màu lớn.

---

# 86. Admin Permission UX

Frontend có thể hide:

```text
Administration
```

nếu user không có permission.

Nhưng đây chỉ là UX.

Backend vẫn phải kiểm tra authorization.

Không bao giờ coi việc ẩn menu là security.

---

# 87. Help System

Nên có tooltip và contextual help.

Ví dụ:

```text
BCN ID
ⓘ
```

Tooltip:

```text
BCN ID là định danh duy nhất của bạn
trên toàn bộ hệ sinh thái BCN.
```

---

# 88. Guided Tour

Sau onboarding có thể có optional tour:

```text
1/4
Đây là nơi quản lý hồ sơ của bạn.

2/4
Tại đây bạn có thể kết nối Google,
Discord, GitHub và Zalo.

3/4
Membership cho biết bạn còn thuộc BCN hay không.

4/4
Applications cho biết bạn được sử dụng ứng dụng nào.
```

User có thể:

```text
Skip
```

Không bắt buộc.

---

# 89. Onboarding State

Backend/user profile nên lưu:

```text
onboardingCompleted
```

hoặc:

```text
onboardingVersion
```

Khuyến nghị:

```text
onboardingVersion
```

Ví dụ:

```text
1
```

để sau này có onboarding mới.

---

# 90. Recommended Routes

## Public

```text
/[locale]/login

/[locale]/auth/callback
```

## Onboarding

```text
/[locale]/welcome

/[locale]/welcome/account

/[locale]/welcome/connections

/[locale]/welcome/membership

/[locale]/welcome/security

/[locale]/welcome/applications

/[locale]/welcome/ready
```

## User

```text
/[locale]

/[locale]/account

/[locale]/security

/[locale]/connections

/[locale]/membership

/[locale]/applications

/[locale]/sessions
```

## Admin

```text
/[locale]/admin

/[locale]/admin/users

/[locale]/admin/users/[id]

/[locale]/admin/applications

/[locale]/admin/roles

/[locale]/admin/membership

/[locale]/admin/audit
```

---

# 91. Recommended Libraries Summary

```text
Next.js
React
TypeScript
pnpm

Tailwind CSS
shadcn/ui
Radix UI

Motion

TanStack Query

React Hook Form
Zod

next-intl

lucide-react
react-icons

Sonner

date-fns

clsx
tailwind-merge
class-variance-authority
```

Optional:

```text
nuqs
```

---


# 91.1 Khởi tạo project bằng pnpm

Tạo Next.js project:

```bash
pnpm create next-app@latest bcn-profiles-fe
```

Khuyến nghị chọn:

```text
TypeScript            Yes
ESLint                Yes
Tailwind CSS          Yes
src/ directory        Yes
App Router            Yes
Turbopack             Yes
Import alias          @/*
```

Sau đó:

```bash
cd bcn-profiles-fe
```

---

# 91.2 Cài thư viện chính bằng pnpm

```bash
pnpm add \
  @tanstack/react-query \
  react-hook-form \
  @hookform/resolvers \
  zod \
  next-intl \
  motion \
  lucide-react \
  react-icons \
  sonner \
  date-fns \
  clsx \
  tailwind-merge \
  class-variance-authority
```

Nếu dùng `nuqs`:

```bash
pnpm add nuqs
```

---

# 91.3 shadcn/ui

Khởi tạo:

```bash
pnpm dlx shadcn@latest init
```

Sau đó add các component cần thiết:

```bash
pnpm dlx shadcn@latest add \
  button \
  card \
  input \
  label \
  form \
  dialog \
  alert-dialog \
  sheet \
  dropdown-menu \
  select \
  tabs \
  tooltip \
  command \
  table \
  badge \
  avatar \
  separator \
  skeleton
```

Chỉ cài component thực sự sử dụng.

Không cần add toàn bộ shadcn ngay từ đầu.

---

# 91.4 Development Commands

Chạy development:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Production:

```bash
pnpm start
```

Lint:

```bash
pnpm lint
```

Nếu thêm format script:

```bash
pnpm format
```

---

# 91.5 Package Scripts đề xuất

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
}
```

CI nên chạy tối thiểu:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
```

---

# 91.6 pnpm Rules

Repository chỉ commit:

```text
pnpm-lock.yaml
```

Không commit:

```text
package-lock.json
yarn.lock
bun.lockb
```

Nếu các file trên xuất hiện:

```text
remove
```

để tránh nhiều package manager trong cùng project.

Node version nên được khóa bằng:

```text
.nvmrc
```

hoặc:

```json
{
  "engines": {
    "node": ">=22"
  },
  "packageManager": "pnpm@10"
}
```

Version chính xác của pnpm nên được team thống nhất khi khởi tạo repository.


# 92. `.env.example`

```env
NEXT_PUBLIC_APP_URL=https://profiles.bcn.id.vn

NEXT_PUBLIC_API_URL=https://profiles.bcn.id.vn/api

NEXT_PUBLIC_DEFAULT_LOCALE=vi

NEXT_PUBLIC_SUPPORTED_LOCALES=vi,en
```

Không để:

```text
Provider Secret
JWT Private Key
Database Credentials
```

trong frontend env.

---

# 93. Development Phases

## Phase 1 — Foundation

Làm:

```text
Next.js setup

Tailwind

shadcn/ui

Design tokens

next-intl

Layout

Sidebar

Header

Responsive navigation
```

---

## Phase 2 — Authentication UI

Làm:

```text
Login

Logout

Provider Login Buttons

Auth callback

Current User
```

---

## Phase 3 — Onboarding

Làm:

```text
Welcome

Account intro

Connected Accounts

Membership

Security

Applications

Ready
```

Đây là phase ưu tiên cao.

---

## Phase 4 — User Account Center

Làm:

```text
Overview

Account

Security

Connections

Membership

Applications

Sessions
```

---

## Phase 5 — Admin

Làm:

```text
Admin Overview

Users

User Detail

Application Access

Roles

Membership

Sessions

Audit
```

---

## Phase 6 — Polish

Làm:

```text
Command Palette

Guided Tour

Animation

Accessibility Review

Mobile Polish

Error States

Empty States

Performance
```

---

# 94. Acceptance Criteria — User

Frontend user hoàn thành khi:

- Login UI hoạt động.
- Có Vietnamese / English.
- Chuyển locale không reload sai state.
- Welcome onboarding hoàn chỉnh.
- User thấy BCN ID.
- User xem và update profile được.
- User kết nối Google được.
- User kết nối GitHub được.
- User kết nối Discord được.
- User kết nối Zalo được.
- User thấy Membership status.
- User trigger recheck membership được.
- User thấy Applications.
- User biết app nào Active / Blocked.
- User thấy role theo app.
- User quản lý 2FA được.
- User xem sessions được.
- User revoke session được.
- UI responsive.
- UI keyboard accessible.
- Không lưu refresh token trong localStorage.

---

# 95. Acceptance Criteria — Admin

Admin hoàn thành khi:

- Xem danh sách user.
- Search user.
- Filter user.
- Xem user detail.
- Xem Connected Accounts.
- Xem Membership.
- Recheck Membership.
- Add Membership Override.
- Grant App Access.
- Block App Access.
- Assign Role.
- Remove Role.
- Revoke Session.
- Xem Audit Log.
- Các destructive action đều có confirmation.

---

# 96. UX Copy Style

Tone:

```text
Friendly
Short
Clear
Professional
Non-technical
```

Không:

```text
OAuth subject mapping failed.
```

User-facing nên:

```text
Không thể kết nối Discord lúc này.
Vui lòng thử lại sau.
```

Technical detail chỉ trong:

```text
Admin log
Developer console
Observability
```

---

# 97. Vietnamese Copy Rule

Ưu tiên câu ngắn.

Ví dụ:

Sai:

```text
Hệ thống đã thực hiện thao tác xác minh tư cách
thành viên của người dùng thành công.
```

Đúng:

```text
Membership đã được xác minh.
```

---

# 98. English Copy Rule

English phải tự nhiên.

Không dịch word-by-word.

Ví dụ:

Vietnamese:

```text
Mọi thứ đã sẵn sàng.
```

English:

```text
You're all set.
```

Không:

```text
Everything has been ready.
```

---

# 99. Final User Flow

```text
NEW USER
   │
   ▼
LOGIN
   │
   ▼
WELCOME
   │
   ▼
BCN ACCOUNT
   │
   ▼
CONNECT PROVIDERS
   │
   ▼
VERIFY MEMBERSHIP
   │
   ▼
SECURITY
   │
   ▼
APPLICATIONS
   │
   ▼
READY
   │
   ▼
ACCOUNT CENTER
```

Returning user:

```text
LOGIN
 ↓
OVERVIEW
 ↓
Account / Security / Connections
Membership / Applications / Sessions
```

Admin:

```text
LOGIN
 ↓
ACCOUNT CENTER
 ↓
ADMINISTRATION
 ↓
Users
 ↓
Membership
 ↓
App Access
 ↓
Role
 ↓
Sessions
 ↓
Audit
```

---

# 100. Final Design Direction

BCN Profiles không nên chỉ là một trang Profile.

Nó nên trở thành:

```text
BCN Account Center
```

với vai trò:

```text
Identity
+
Security
+
Connected Accounts
+
Membership
+
Applications
+
Administration
```

Visual direction:

```text
Black
White
Minimal
Premium
Calm
Friendly
Modern
```

Trải nghiệm quan trọng nhất:

```text
Chào mừng đến với BCN.

Một tài khoản.
Toàn bộ hệ sinh thái BCN.
```

Sau đó từng bước giúp user hiểu:

```text
Tài khoản của mình là gì?
↓
Kết nối tài khoản nào?
↓
Mình có còn là BCN Member?
↓
Account có an toàn không?
↓
Mình được sử dụng application nào?
↓
Mọi thứ đã sẵn sàng.
```

Đây là định hướng UX/UI chính để phát triển Frontend BCN Profiles bằng Next.js.
