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
import { cn, initials } from "@/lib/utils";
import { profileService, TIMELINE_EVENT_TYPES } from "@/services";

const ProfileArtifact3D = dynamic(
  () => import("@/components/profile/profile-artifact-3d"),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="aspect-square min-h-72 w-full rounded-[calc(var(--radius)+2px)]" />
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
  const earnedCount = achievementTypes.length;

  if (query.isLoading) return <ProfileLoading />;

  if (query.isError || !query.data) {
    return (
      <PublicShell>
        <main className="mx-auto flex min-h-[70dvh] w-full max-w-xl items-center px-4 py-12 md:px-8">
          <Card className="w-full animate-enter text-center shadow-card">
            <CardHeader>
              <CardTitle className="text-xl tracking-tight">
                {t("notFoundTitle")}
              </CardTitle>
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
      <main className="profile-canvas mx-auto w-full max-w-6xl space-y-10 px-4 py-8 md:space-y-12 md:px-8 md:py-12">
        <section
          className={cn(
            "animate-enter grid overflow-hidden rounded-[calc(var(--radius)+4px)]",
            "border border-border bg-card shadow-card",
            "lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]",
          )}
        >
          <div className="relative flex flex-col justify-center p-7 md:p-10 lg:p-12">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top_left,oklch(0.55_0.14_160_/_0.08),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top_left,oklch(0.68_0.14_160_/_0.12),transparent_65%)]"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-center gap-2">
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

            <h1 className="relative mt-6 text-[2rem] font-semibold tracking-[-0.04em] text-balance md:mt-8 md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {name}
            </h1>

            <p className="relative mt-5 max-w-[52ch] text-[0.975rem] leading-7 text-muted-foreground md:text-base md:leading-7">
              {profile.bio || t("bioFallback")}
            </p>

            <div className="relative mt-8 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-muted-foreground">
                <CalendarDays className="size-4 text-primary" aria-hidden />
                {t("joined", { date: joinedAt })}
              </span>
              {socialLinks.map(([network, url]) => (
                <a
                  key={network}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 font-medium text-foreground transition-[color,background-color] duration-200 ease-premium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Link2 className="size-4 text-primary" aria-hidden />
                  {SOCIAL_LABELS[network]}
                  <ExternalLink className="size-3.5 opacity-60" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <div className="relative border-t border-border bg-muted/25 p-4 sm:p-5 lg:border-t-0 lg:border-l">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,oklch(0.55_0.14_160_/_0.07),transparent_58%)] dark:bg-[radial-gradient(circle_at_50%_40%,oklch(0.68_0.14_160_/_0.1),transparent_58%)]"
              aria-hidden
            />
            <div className="relative">
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
                <div className="flex aspect-square min-h-72 items-center justify-center rounded-[calc(var(--radius)+2px)] border border-border/80 bg-background/60">
                  <div className="flex size-32 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-3xl font-semibold tracking-tight text-primary shadow-card">
                    {profileInitials}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          className="animate-enter animate-enter-delay-1"
          aria-labelledby="achievements-title"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BadgeCheck className="size-4" aria-hidden />
              </span>
              <div>
                <h2
                  id="achievements-title"
                  className="text-lg font-semibold tracking-tight md:text-xl"
                >
                  {t("achievementsTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("achievementsHint")}
                </p>
              </div>
            </div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground tabular-nums">
              {earnedCount}/{TIMELINE_EVENT_TYPES.length}
            </p>
          </div>
          <div className="grid overflow-hidden rounded-[calc(var(--radius)+2px)] border border-border bg-card sm:grid-cols-2 lg:grid-cols-5">
            {TIMELINE_EVENT_TYPES.map((type) => {
              const active = activeAchievements.has(type);
              return (
                <div
                  key={type}
                  className={cn(
                    "flex min-h-[5.5rem] items-center gap-3 border-b border-border p-4 transition-colors duration-200 ease-premium",
                    "last:border-b-0 sm:border-r sm:[&:nth-child(even)]:border-r-0",
                    "lg:border-b-0 lg:[&:nth-child(even)]:border-r lg:last:border-r-0",
                    active && "bg-primary/[0.04] dark:bg-primary/[0.07]",
                  )}
                >
                  {active ? (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <BadgeCheck className="size-4" aria-hidden />
                    </span>
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground/55">
                      <Circle className="size-3.5" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">
                      {timelineT(`events.${type}`)}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        active
                          ? "font-medium text-primary"
                          : "text-muted-foreground",
                      )}
                    >
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

        <section
          className="animate-enter animate-enter-delay-2"
          aria-labelledby="timeline-title"
        >
          <div className="overflow-hidden rounded-[calc(var(--radius)+2px)] border border-border bg-card shadow-card">
            <div className="flex items-start gap-3 border-b border-border px-5 py-5 md:px-6">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <History className="size-4" aria-hidden />
              </span>
              <div>
                <h2
                  id="timeline-title"
                  className="text-lg font-semibold tracking-tight md:text-xl"
                >
                  {t("timelineTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("timelineHint")}
                </p>
              </div>
            </div>
            <div className="px-5 py-5 md:px-6 md:py-6">
              {profile.timelineEvents.length ? (
                <ol className="grid gap-4 md:grid-cols-2 md:gap-5">
                  {profile.timelineEvents.slice(0, 8).map((event) => (
                    <li
                      key={event.id}
                      className="group flex gap-3 rounded-xl border border-transparent p-3 transition-[border-color,background-color] duration-200 ease-premium hover:border-border hover:bg-muted/40"
                    >
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors duration-200 ease-premium group-hover:bg-primary/15">
                        <BadgeCheck className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium leading-snug [overflow-wrap:anywhere]">
                          {event.title}
                        </p>
                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
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
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("publicProfile");
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold tracking-tight text-primary-foreground shadow-[0_0_0_1px_oklch(0.55_0.14_160_/_0.25)]">
              B
            </span>
            <div className="leading-tight">
              <strong className="block text-[0.95rem] font-semibold tracking-[-0.02em]">
                BCN
              </strong>
              <span className="text-[11px] tracking-wide text-muted-foreground">
                {t("headerLabel")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
            <Button
              asChild
              variant="ghost"
              className="ml-1 cursor-pointer font-medium"
            >
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
        className="profile-canvas mx-auto w-full max-w-6xl space-y-10 px-4 py-8 md:space-y-12 md:px-8 md:py-12"
        aria-busy="true"
      >
        <Skeleton className="h-[28rem] w-full rounded-[calc(var(--radius)+4px)] md:h-[32rem]" />
        <Skeleton className="h-40 w-full rounded-[calc(var(--radius)+2px)]" />
        <Skeleton className="h-64 w-full rounded-[calc(var(--radius)+2px)]" />
      </main>
    </PublicShell>
  );
}
