import type { Listing, ShowcaseCategory } from "@/lib/data";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function scoreTextField(value: string, query: string) {
  const normalizedValue = normalize(value);
  const words = tokenize(value);

  if (!query) {
    return 0;
  }

  if (normalizedValue === query) {
    return 160;
  }

  if (normalizedValue.startsWith(query)) {
    return 120;
  }

  if (words.some((word) => word === query)) {
    return 105;
  }

  if (words.some((word) => word.startsWith(query))) {
    return 90;
  }

  if (normalizedValue.includes(query)) {
    return 55;
  }

  return 0;
}

function scoreTokens(text: string, tokens: string[]) {
  const normalizedText = normalize(text);

  if (!tokens.length) {
    return 0;
  }

  let score = 0;

  for (const token of tokens) {
    if (!normalizedText.includes(token)) {
      return -1;
    }

    score += scoreTextField(text, token);
  }

  return score;
}

export function searchListings(listings: Listing[], query: string) {
  const normalizedQuery = normalize(query);
  const tokens = tokenize(query);

  if (!normalizedQuery) {
    return [];
  }

  return listings
    .map((listing) => {
      const titleScore = scoreTextField(listing.title, normalizedQuery);
      const categoryScore = scoreTextField(listing.category, normalizedQuery);
      const gradeScore = scoreTextField(listing.grade, normalizedQuery);
      const locationScore = scoreTextField(listing.location, normalizedQuery);
      const summaryTokenScore = scoreTokens(listing.summary, tokens);

      const matchesAllTokens =
        tokens.every((token) =>
          normalize(
            `${listing.title} ${listing.category} ${listing.summary} ${listing.grade} ${listing.location}`
          ).includes(token)
        ) || false;

      if (!matchesAllTokens) {
        return { listing, score: -1 };
      }

      let score = 0;
      score += titleScore * 4;
      score += categoryScore * 3;
      score += gradeScore * 2;
      score += locationScore;
      score += Math.max(summaryTokenScore, 0);

      if (normalizedQuery.length <= 2 && titleScore === 0 && categoryScore === 0) {
        score = -1;
      }

      return { listing, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.listing);
}

export function searchCategories(categories: ShowcaseCategory[], query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  return categories
    .map((category) => ({
      category,
      score: scoreTextField(category.name, normalizedQuery)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.category);
}
