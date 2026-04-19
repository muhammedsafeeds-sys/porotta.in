// Curated tag catalog for interest matching
// Categories organized per Indian audience interests

export interface Tag {
  slug: string;
  label: string;
  category: string;
  seoEnabled: boolean;
}

export const TAG_CATALOG: Tag[] = [
  // Entertainment
  { slug: "bollywood", label: "Bollywood", category: "entertainment", seoEnabled: true },
  { slug: "movies", label: "Movies", category: "entertainment", seoEnabled: true },
  { slug: "music", label: "Music", category: "entertainment", seoEnabled: true },
  { slug: "anime", label: "Anime", category: "entertainment", seoEnabled: true },
  { slug: "k-drama", label: "K-Drama", category: "entertainment", seoEnabled: true },
  { slug: "web-series", label: "Web Series", category: "entertainment", seoEnabled: true },
  { slug: "memes", label: "Memes", category: "entertainment", seoEnabled: true },

  // Sports
  { slug: "cricket", label: "Cricket", category: "sports", seoEnabled: true },
  { slug: "football", label: "Football", category: "sports", seoEnabled: true },
  { slug: "ipl", label: "IPL", category: "sports", seoEnabled: true },
  { slug: "f1", label: "Formula 1", category: "sports", seoEnabled: true },
  { slug: "fitness", label: "Fitness", category: "sports", seoEnabled: true },

  // Life & Culture
  { slug: "relationships", label: "Relationships", category: "life", seoEnabled: true },
  { slug: "college-life", label: "College Life", category: "life", seoEnabled: true },
  { slug: "career", label: "Career", category: "life", seoEnabled: true },
  { slug: "late-night-talks", label: "Late Night Talks", category: "life", seoEnabled: true },
  { slug: "travel", label: "Travel", category: "life", seoEnabled: true },
  { slug: "food", label: "Food", category: "life", seoEnabled: true },
  { slug: "books", label: "Books", category: "life", seoEnabled: true },

  // Tech & Gaming
  { slug: "gaming", label: "Gaming", category: "tech", seoEnabled: true },
  { slug: "tech", label: "Tech", category: "tech", seoEnabled: true },
  { slug: "startups", label: "Startups", category: "tech", seoEnabled: true },
  { slug: "coding", label: "Coding", category: "tech", seoEnabled: true },

  // Just Talk
  { slug: "random", label: "Random", category: "general", seoEnabled: true },
  { slug: "deep-talk", label: "Deep Talk", category: "general", seoEnabled: true },
  { slug: "confessions", label: "Confessions", category: "general", seoEnabled: true },
  { slug: "venting", label: "Venting", category: "general", seoEnabled: true },
  { slug: "advice", label: "Advice", category: "general", seoEnabled: true },
];

export function getTagBySlug(slug: string): Tag | undefined {
  return TAG_CATALOG.find((t) => t.slug === slug);
}

export function getTagLabels(): string[] {
  return TAG_CATALOG.map((t) => t.label);
}

export function getSeoTags(): Tag[] {
  return TAG_CATALOG.filter((t) => t.seoEnabled);
}

export function getTagsByCategory(category: string): Tag[] {
  return TAG_CATALOG.filter((t) => t.category === category);
}
