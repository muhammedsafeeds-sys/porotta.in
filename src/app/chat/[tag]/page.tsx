import type { Metadata } from "next";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";
import TagLandingContent from "./TagLandingContent";
import { getTagBySlug, getSeoTags } from "@/lib/tags";

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getSeoTags().map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag: slug } = await params;
  const tag = getTagBySlug(slug);
  const label = tag?.label || slug.replace(/-/g, " ");
  return {
    title: `Chat about ${label}`,
    description: `Find someone to talk about ${label} anonymously on porotta.in. Gender-directed matching, no account needed.`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag: slug } = await params;
  const tag = getTagBySlug(slug);
  const label = tag?.label || slug.replace(/-/g, " ");

  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <TagLandingContent slug={slug} label={label} />
      </main>
      <Footer />
    </>
  );
}
