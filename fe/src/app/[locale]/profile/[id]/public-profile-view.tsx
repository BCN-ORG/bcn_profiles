"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Circle,
  ExternalLink,
  History,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { LocaleSwitcher } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button, EmptyState, Skeleton } from "@/components/ui/primitives";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { initials } from "@/lib/utils";
import { profileService, TIMELINE_EVENT_TYPES } from "@/services";

const ProfileArtifact3D = dynamic(
  () => import("@/components/profile/profile-artifact-3d"),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="aspect-square min-h-72 w-full rounded-xl" />
    ),
  },
);

const SOCIAL_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  github: "GitHub",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  website: "Website",
} as const;

export default function PublicProfileView() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const locale = useLocale();
  const t = useTranslations("publicProfile");
  const timelineT = useTranslations("timeline");
  const query = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => profileService.publicProfile(id),
    enabled: Boolean(id),
    retry: false,
  });

  const achievementTypes = useMemo(
    () =>
      Array.from(
        new Set(
          query.data?.timelineEvents.map((event) => event.eventType) ?? [],
        ),
      ),
    [query.data?.timelineEvents],
  );
  const activeAchievements = new Set(achievementTypes);

  if (query.isLoading) return <ProfileLoading />;

  if (query.isError || !query.data) {
    return (
      <PublicShell>
        <main className="mx-auto flex min-h-[70dvh] w-full max-w-xl items-center px-4 py-12 md:px-8">
          <Card className="w-full text-center">
            <CardHeader>
              <CardTitle className="text-xl">{t("notFoundTitle")}</CardTitle>
              <CardDescription>{t("notFoundDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/">{t("backToAccount")}</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </PublicShell>
    );
  }

  const profile = query.data;
  const name = profile.fullName || t("anonymous");
  const profileInitials = initials(name);
  const socialLinks = Object.entries(profile.socialLinks).filter(
    (entry): entry is [keyof typeof SOCIAL_LABELS, string] =>
      Boolean(entry[1]) && entry[0] in SOCIAL_LABELS,
  );
  const joinedAt = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(profile.createdAt));

  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-8 md:py-12">
        <section className="grid overflow-hidden rounded-xl border border-border bg-card shadow-card lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                {t("verifiedProfile")}
              </Badge>
              {profile.cohort ? (
                <Badge variant="outline">{profile.cohort}</Badge>
              ) : null}
              {profile.communityRole ? (
                <Badge variant="outline">{profile.communityRole}</Badge>
              ) : null}
            </div>

            <h1 className="mt-7 text-3xl font-semibold tracking-[-0.035em] text-balance md:text-4xl">
              {name}
            </h1>

            <p className="mt-6 max-w-[58ch] text-base leading-7 text-muted-foreground">
              {profile.bio || t("bioFallback")}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 text-primary" aria-hidden />
                {t("joined", { date: joinedAt })}
              </span>
              {socialLinks.map(([network, url]) => (
                <a
                  key={network}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Link2 className="size-4" aria-hidden />
                  {SOCIAL_LABELS[network]}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <div className="border-t border-border bg-muted/20 p-5 lg:border-t-0 lg:border-l">
            {profile.profile3dEnabled ? (
              <ProfileArtifact3D
                initials={profileInitials}
                avatarUrl={profile.avatar}
                label={t("artifactLabel", { name })}
                rotateLeftLabel={t("rotateLeft")}
                rotateRightLabel={t("rotateRight")}
                resetLabel={t("resetArtifact")}
                fallbackLabel={t("artifactFallback")}
                hint={t("artifactHint")}
              />
            ) : (
              <div className="flex aspect-square min-h-72 items-center justify-center rounded-xl bg-muted/40">
                <div className="flex size-32 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-3xl font-semibold text-primary shadow-card">
                  {profileInitials}
                </div>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="achievements-title">
          <div className="mb-4 flex items-center gap-3">
            <BadgeCheck className="size-5 text-primary" aria-hidden />
            <div>
              <h2
                id="achievements-title"
                className="text-xl font-semibold tracking-tight"
              >
                {t("achievementsTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("achievementsHint")}
              </p>
            </div>
          </div>
          <div className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 lg:grid-cols-5">
            {TIMELINE_EVENT_TYPES.map((type) => {
              const active = activeAchievements.has(type);
              return (
                <div
                  key={type}
                  className="flex min-h-24 items-center gap-3 border-b border-border p-4 last:border-b-0 sm:border-r sm:[&:nth-child(even)]:border-r-0 lg:border-b-0 lg:[&:nth-child(even)]:border-r lg:last:border-r-0"
                >
                  {active ? (
                    <BadgeCheck
                      className="size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="size-5 shrink-0 text-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {timelineT(`events.${type}`)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {active
                        ? t("achievementEarned")
                        : t("achievementPending")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="timeline-title">
          <Card>
            <CardHeader className="border-b border-border pb-5">
              <CardTitle
                id="timeline-title"
                className="flex items-center gap-2"
              >
                <History className="size-4 text-primary" aria-hidden />
                {t("timelineTitle")}
              </CardTitle>
              <CardDescription>{t("timelineHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.timelineEvents.length ? (
                <ol className="grid gap-5 md:grid-cols-2">
                  {profile.timelineEvents.slice(0, 8).map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BadgeCheck className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium [overflow-wrap:anywhere]">
                          {event.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {timelineT(`events.${event.eventType}`)}
                          {" · "}
                          {new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                          }).format(new Date(event.createdAt))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  title={t("timelineEmpty")}
                  description={t("timelineEmptyHint")}
                />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("publicProfile");
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              B
            </span>
            <div className="leading-tight">
              <strong className="block text-sm tracking-tight">BCN</strong>
              <span className="text-[11px] text-muted-foreground">
                {t("headerLabel")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
            <Button asChild variant="ghost" className="ml-1">
              <Link href="/">{t("account")}</Link>
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function ProfileLoading() {
  return (
    <PublicShell>
      <main
        className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-8 md:py-12"
        aria-busy="true"
      >
        <Skeleton className="h-[32rem] w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </main>
    </PublicShell>
  );
}
