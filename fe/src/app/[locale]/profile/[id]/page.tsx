import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { PublicProfile } from "@/types";
import PublicProfileView from "./public-profile-view";

type Props = { params: Promise<{ id: string; locale: string }> };

async function loadPublicProfile(id: string): Promise<PublicProfile | null> {
  const base = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
  ).replace(/\/$/, "");
  try {
    const response = await fetch(
      `${base}/users/${encodeURIComponent(id)}/profile`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      data?: { user?: PublicProfile };
    };
    return body.data?.user ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicProfile" });
  const profile = await loadPublicProfile(id);
  if (!profile) {
    return {
      title: t("notFoundTitle"),
      description: t("notFoundDescription"),
    };
  }
  const name = profile.fullName?.trim() || t("anonymous");
  return {
    title: t("metaTitle", { name }),
    description: profile.bio || t("bioFallback"),
  };
}

export default function PublicProfilePage() {
  return <PublicProfileView />;
}
