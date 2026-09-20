export type TimelineEventType =
  | "JOIN_BCN"
  | "COURSE_COMPLETE"
  | "QUIZ_COMPLETE"
  | "PROJECT_COMPLETE"
  | "SEMESTER_COMPLETE";

export type User = {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  role: "USER" | "ADMIN";
  status?: "PENDING" | "ACTIVE" | "BLOCKED" | "DISABLED";
  createdAt?: string;
  twoFactorEnabled?: boolean;
  timelineEvents?: Array<{
    id: number;
    eventType: TimelineEventType;
    title: string;
    metadata?: unknown;
    sourceApp?: string | null;
    createdAt: string;
  }>;
  metadata?: {
    onboardingVersion?: number;
    maSV?: string;
    ngaySinh?: string;
    bio?: string;
    cohort?: string;
    communityRole?: string;
    profile3dEnabled?: boolean;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    [key: string]: unknown;
  } | null;
};

export type PublicProfile = {
  id: string;
  fullName?: string | null;
  avatar?: string | null;
  createdAt: string;
  bio?: string;
  cohort?: string;
  communityRole?: string;
  profile3dEnabled: boolean;
  socialLinks: Partial<
    Record<
      | "facebook"
      | "instagram"
      | "tiktok"
      | "youtube"
      | "github"
      | "linkedin"
      | "twitter"
      | "website",
      string
    >
  >;
  timelineEvents: Array<{
    id: number;
    eventType: TimelineEventType;
    title: string;
    sourceApp?: string | null;
    createdAt: string;
  }>;
};

export type Identity = {
  provider: "GOOGLE" | "GITHUB" | "DISCORD" | "ZALO";
  providerEmail?: string;
  providerUsername?: string;
  providerDisplayName?: string;
  providerAvatarUrl?: string;
  linkedAt: string;
  lastSyncedAt?: string;
};

export type SourceStatus = "VERIFIED" | "NOT_MEMBER" | "PENDING" | "UNKNOWN";

export type MembershipStatus = {
  eligible: boolean;
  policy: "ANY_TRUSTED_GROUP";
  sources: {
    discord?: { status: SourceStatus; checkedAt?: string };
    zalo?: { status: SourceStatus; checkedAt?: string };
  };
  override?: {
    status: "ALLOW" | "DENY";
    expiresAt: string;
    reason?: string;
  } | null;
  expiresAt?: string;
};

export type UserApplication = {
  code: string;
  name: string;
  access: "ACTIVE" | "BLOCKED" | "PENDING";
  roles: string[];
  grantedAt?: string;
  expiresAt?: string;
};

export type UserSession = {
  id: string;
  type: "SSO" | "APP";
  application: string | null;
  authLevel: "AAL1" | "AAL2" | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export type AuditLog = {
  id: string;
  userId?: string | null;
  eventType: string;
  applicationCode?: string | null;
  provider?: string | null;
  metadata?: unknown;
  createdAt: string;
};

export type TwoFactorStatus = {
  enabled: boolean;
  required?: boolean;
};
