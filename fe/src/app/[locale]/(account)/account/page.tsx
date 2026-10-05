"use client";

import { FormEvent, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useStatusLabel } from "@/hooks/use-status-label";
import { Button, PageHeader, Skeleton } from "@/components/ui/primitives";
import {
  UploadStageError,
  logUploadStageError,
  putAvatarFile,
} from "@/lib/avatar-upload";
import { authService, profileService } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/layout/page-shell";
import { OtpCountdown } from "@/components/auth/otp-countdown";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/utils";
import type { ProfileUser } from "@/types";

const ProfileArtifact3D = dynamic(
  () => import("@/components/profile/profile-artifact-3d"),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="aspect-square min-h-56 w-full max-w-xs rounded-xl" />
    ),
  },
);

export default function AccountPage() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const t3d = useTranslations("publicProfile");
  const label = useStatusLabel();
  const queryClient = useQueryClient();
  const { user, refresh, setUser } = useAuth();
  const profileQuery = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => profileService.getMe(),
    enabled: Boolean(user),
  });
  const profile = profileQuery.data;
  const [formReady, setFormReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [profile3dEnabled, setProfile3dEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "otp">("idle");
  const [emailOtpSentAt, setEmailOtpSentAt] = useState<number | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!profile || formReady) return;
    setFullName(profile.fullName ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.metadata?.bio ?? "");
    setGithub(profile.metadata?.github ?? "");
    setLinkedin(profile.metadata?.linkedin ?? "");
    setWebsite(profile.metadata?.website ?? "");
    setProfile3dEnabled(profile.metadata?.profile3dEnabled !== false);
    setFormReady(true);
  }, [profile, formReady]);

  function applyProfile(updated: ProfileUser) {
    queryClient.setQueryData(["profile-me"], updated);
    if (!user) return;
    setUser({
      ...user,
      fullName: updated.fullName ?? user.fullName,
      avatar: updated.avatar || undefined,
      metadata: updated.metadata ?? user.metadata,
      updatedAt: updated.updatedAt ?? user.updatedAt,
    });
  }

  if (!user) return null;

  if (profileQuery.isError) {
    return (
      <PageShell>
        <p className="text-sm text-destructive">{tc("error")}</p>
      </PageShell>
    );
  }

  if (!profile || !formReady) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageShell>
    );
  }

  const account = profile;
  const name = account.fullName || account.email;
  const profileInitials = initials(name);
  const avatarUrl = account.avatar || undefined;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await profileService.update({
        fullName,
        ...(phone !== (account.phone ?? "") ? { phone } : {}),
        metadata: {
          bio: bio.trim(),
          github: github.trim(),
          linkedin: linkedin.trim(),
          website: website.trim(),
          profile3dEnabled,
        },
      });
      applyProfile(updated);
      setPhone(updated.phone ?? "");
      toast.success(tc("save"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc("error"));
    } finally {
      setBusy(false);
    }
  }

  async function onAvatar(file: File | null) {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const sig = await profileService.avatarSignature().catch((error) => {
        throw new UploadStageError(
          "signature",
          error instanceof Error ? error.message : t("avatarFail"),
        );
      });
      const maxMb = (sig.maxBytes / 1024 / 1024).toFixed(1);
      await putAvatarFile(
        file,
        sig,
        t("avatarInvalidType"),
        t("avatarTooLarge", { maxMb }),
        t("avatarFail"),
      );
      const updated = await profileService
        .setAvatar(sig.secureUrl, sig.publicId)
        .catch((error) => {
          throw new UploadStageError(
            "confirm",
            error instanceof Error
              ? `${t("avatarFail")}: ${error.message}`
              : t("avatarFail"),
            { fileSize: file.size, mime: file.type },
          );
        });
      applyProfile(updated);
      toast.success(t("avatarOk"));
    } catch (error) {
      logUploadStageError(error);
      toast.error(error instanceof Error ? error.message : tc("error"));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function requestEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const requestedAt = Date.now();
    try {
      await authService.requestEmailChange(newEmail);
      setEmailStep("otp");
      setEmailOtpSentAt(requestedAt);
      toast.success(t("emailOtpSent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc("error"));
    } finally {
      setBusy(false);
    }
  }

  async function resendEmailOtp() {
    const requestedAt = Date.now();
    try {
      await authService.requestEmailChange(newEmail);
      setEmailOtpSentAt(requestedAt);
      toast.success(t("emailOtpSent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc("error"));
    }
  }

  async function confirmEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authService.confirmEmailChange(newEmail, emailOtp);
      setEmailStep("idle");
      setNewEmail("");
      setEmailOtp("");
      setEmailOtpSentAt(null);
      queryClient.setQueryData<ProfileUser>(["profile-me"], (current) =>
        current ? { ...current, email: newEmail } : current,
      );
      await refresh();
      toast.success(t("emailChanged"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        actions={
          <Button asChild variant="outline">
            <Link href={`/profile/${account.id}`}>
              {t("viewPublicProfile")}
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("avatar")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)] sm:items-start">
          <ProfileArtifact3D
            initials={profileInitials}
            avatarUrl={avatarUrl}
            label={t3d("artifactLabel", { name })}
            rotateLeftLabel={t3d("rotateLeft")}
            rotateRightLabel={t3d("rotateRight")}
            resetLabel={t3d("resetArtifact")}
            fallbackLabel={t3d("artifactFallback")}
            hint={t3d("artifactHint")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="secondary" disabled={avatarBusy}>
              <label>
                {avatarBusy ? tc("loading") : t("uploadAvatar")}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={avatarBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    void onAvatar(file);
                  }}
                />
              </label>
            </Button>
            {avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={avatarBusy}
                onClick={() =>
                  void profileService
                    .clearAvatar()
                    .then((updated) => {
                      applyProfile(updated);
                      toast.success(t("avatarCleared"));
                    })
                    .catch((e: Error) => toast.error(e.message))
                }
              >
                {t("clearAvatar")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label>{t("fullName")}</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("email")}</Label>
              <Input value={account.email} disabled />
            </div>
            <div className="space-y-2">
              <Label>{t("phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("role")}</span>
              <strong>{label(account.role)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("status")}</span>
              <strong>{label(account.status || "ACTIVE")}</strong>
            </div>
            {account.metadata?.cohort || account.metadata?.communityRole ? (
              <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 md:col-span-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("cohort")}
                  </p>
                  <p className="mt-1 font-medium">
                    {account.metadata?.cohort || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("communityRole")}
                  </p>
                  <p className="mt-1 font-medium">
                    {account.metadata?.communityRole || "-"}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile-bio">{t("bio")}</Label>
              <Textarea
                id="profile-bio"
                value={bio}
                maxLength={500}
                rows={4}
                placeholder={t("bioPlaceholder")}
                onChange={(event) => setBio(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("bioHint", { count: bio.length })}
              </p>
            </div>
            <fieldset className="grid gap-4 md:col-span-2 md:grid-cols-3">
              <legend className="mb-3 text-sm font-medium">
                {t("publicLinks")}
              </legend>
              <div className="space-y-2">
                <Label htmlFor="profile-github">GitHub</Label>
                <Input
                  id="profile-github"
                  type="url"
                  inputMode="url"
                  placeholder="https://github.com/..."
                  value={github}
                  onChange={(event) => setGithub(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-linkedin">LinkedIn</Label>
                <Input
                  id="profile-linkedin"
                  type="url"
                  inputMode="url"
                  placeholder="https://linkedin.com/in/..."
                  value={linkedin}
                  onChange={(event) => setLinkedin(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-website">Website</Label>
                <Input
                  id="profile-website"
                  type="url"
                  inputMode="url"
                  placeholder="https://..."
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
            </fieldset>
            <div className="md:col-span-2">
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={profile3dEnabled}
                  onChange={(event) =>
                    setProfile3dEnabled(event.target.checked)
                  }
                />
                <span>
                  <span className="block text-sm font-medium">
                    {t("profile3d")}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {t("profile3dHint")}
                  </span>
                </span>
              </label>
            </div>
            <div className="md:col-span-2">
              <Button disabled={busy}>{t("save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={emailStep === "idle" ? requestEmail : confirmEmail}
          >
            <h3 className="text-base font-medium md:col-span-2">
              {t("changeEmail")}
            </h3>
            <div className="space-y-2">
              <Label>{t("newEmail")}</Label>
              <Input
                type="email"
                required
                value={newEmail}
                disabled={emailStep === "otp"}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            {emailStep === "otp" ? (
              <div className="space-y-2">
                <Label htmlFor="change-email-otp">{t("emailOtp")}</Label>
                <Input
                  id="change-email-otp"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={emailOtp}
                  onChange={(e) =>
                    setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
              </div>
            ) : null}
            {emailStep === "otp" ? (
              <div className="md:col-span-2">
                <OtpCountdown
                  sentAt={emailOtpSentAt}
                  onResend={resendEmailOtp}
                />
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Button disabled={busy}>
                {emailStep === "idle" ? t("requestEmail") : t("confirmEmail")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
