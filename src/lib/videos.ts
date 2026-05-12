export const CATEGORIES = [
  "Funny",
  "Trending",
  "Politics",
  "World",
  "Pop Culture",
  "Music",
  "Gaming",
  "How-To",
  "Sports",
  "Animals",
  "Automotive",
  "Kids",
  "Parenting",
  "Food",
  "Tech",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Platform =
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "X / Twitter"
  | "Facebook"
  | "Facebook Reels"
  | "Snapchat Spotlight"
  | "Threads"
  | "Kwai"
  | "Other";

export type SavedVideo = {
  id: string;
  url: string;
  title: string;
  platform: Platform;
  creator?: string;
  thumbnail?: string;
  category: Category;
  tags: string[];
  notes?: string;
  favorite: boolean;
  createdAt: string;
};

export function detectPlatform(url: string): Platform {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "").replace(/^web\./, "");
    const pathname = parsed.pathname.toLowerCase();

    if (hostname.includes("instagram.com")) return "Instagram";
    if (hostname.includes("tiktok.com")) return "TikTok";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YouTube";
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "X / Twitter";
    if (hostname.includes("threads.net") || hostname.includes("threads.com")) return "Threads";
    if (hostname.includes("kwai.com") || hostname.includes("kuaishou.com") || hostname === "kw.ai" || hostname.endsWith(".kw.ai")) return "Kwai";
    if (hostname.includes("snapchat.com") && pathname.includes("spotlight")) return "Snapchat Spotlight";
    if (hostname.includes("snapchat.com")) return "Snapchat Spotlight";
    if ((hostname.includes("facebook.com") && pathname.includes("reel")) || hostname.includes("fb.watch")) return "Facebook Reels";
    if (hostname.includes("facebook.com")) return "Facebook";

    return "Other";
  } catch {
    return "Other";
  }
}

export function suggestCategory(text: string): Category {
  const haystack = normalize(text);
  const scores = CATEGORY_RULES.map(({ category, terms }) => {
    const score = terms.reduce((total, [term, weight]) => {
      return total + (containsTerm(haystack, term) ? weight : 0);
    }, 0);

    return { category, score };
  }).sort((a, b) => b.score - a.score);

  const best = scores[0];
  return best && best.score >= 2 ? best.category : "Other";
}

export function tagsFromText(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9#\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^#/, ""))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return Array.from(new Set(words)).slice(0, 8);
}

type WeightedTerm = [term: string, weight: number];

const CATEGORY_RULES: Array<{ category: Category; terms: WeightedTerm[] }> = [
  {
    category: "Tech",
    terms: [
      ["tech", 3],
      ["technology", 3],
      ["ai", 3],
      ["artificial intelligence", 4],
      ["apple", 2],
      ["android", 2],
      ["computer", 2],
      ["laptop", 3],
      ["software", 3],
      ["hardware", 3],
      ["coding", 3],
      ["programming", 3],
      ["open source", 3],
      ["iphone", 2],
      ["macbook", 3],
      ["nixos", 3],
      ["linux", 3],
    ],
  },
  {
    category: "Gaming",
    terms: [
      ["game", 2],
      ["gaming", 3],
      ["xbox", 3],
      ["playstation", 3],
      ["nintendo", 3],
      ["fortnite", 3],
      ["minecraft", 3],
      ["steam", 2],
    ],
  },
  {
    category: "Automotive",
    terms: [
      ["car", 2],
      ["cars", 2],
      ["truck", 2],
      ["automotive", 4],
      ["engine", 3],
      ["ev", 3],
      ["tesla", 3],
      ["bmw", 3],
      ["mercedes", 3],
      ["porsche", 3],
      ["mechanic", 3],
      ["detailing", 3],
      ["horsepower", 3],
    ],
  },
  {
    category: "Animals",
    terms: [
      ["animal", 3],
      ["animals", 3],
      ["dog", 3],
      ["cat", 3],
      ["puppy", 3],
      ["kitten", 3],
      ["pet", 2],
      ["pets", 2],
      ["wildlife", 3],
      ["zoo", 3],
      ["bird", 2],
      ["horse", 2],
    ],
  },
  {
    category: "Kids",
    terms: [
      ["kid", 3],
      ["kids", 3],
      ["child", 2],
      ["children", 2],
      ["toddler", 3],
      ["baby", 3],
      ["cartoon", 2],
      ["toys", 2],
      ["school", 2],
    ],
  },
  {
    category: "Music",
    terms: [
      ["official music video", 5],
      ["music video", 4],
      ["lyrics", 4],
      ["song", 3],
      ["album", 3],
      ["guitar", 3],
      ["spotify", 3],
      ["concert", 3],
      ["dj", 3],
      ["singer", 3],
      ["band", 3],
      ["music", 1],
    ],
  },
  {
    category: "Politics",
    terms: [
      ["politic", 3],
      ["election", 3],
      ["trump", 3],
      ["biden", 3],
      ["congress", 3],
      ["senate", 3],
      ["white house", 4],
    ],
  },
  {
    category: "World",
    terms: [
      ["world", 2],
      ["war", 3],
      ["ukraine", 3],
      ["israel", 3],
      ["china", 3],
      ["global", 2],
      ["breaking news", 3],
    ],
  },
  {
    category: "How-To",
    terms: [
      ["how to", 4],
      ["tutorial", 3],
      ["diy", 3],
      ["guide", 2],
      ["tips", 2],
      ["learn", 2],
      ["setup", 2],
    ],
  },
  {
    category: "Sports",
    terms: [
      ["golf", 3],
      ["football", 3],
      ["baseball", 3],
      ["basketball", 3],
      ["hockey", 3],
      ["soccer", 3],
      ["sports", 3],
      ["nba", 3],
      ["nfl", 3],
      ["mlb", 3],
    ],
  },
  {
    category: "Food",
    terms: [
      ["recipe", 3],
      ["food", 3],
      ["cook", 2],
      ["cooking", 3],
      ["restaurant", 3],
      ["pizza", 3],
      ["pasta", 3],
      ["grill", 3],
    ],
  },
  {
    category: "Parenting",
    terms: [
      ["parent", 3],
      ["parenting", 4],
      ["mom", 2],
      ["dad", 2],
      ["family", 2],
    ],
  },
  {
    category: "Pop Culture",
    terms: [
      ["celebrity", 3],
      ["movie", 3],
      ["tv", 2],
      ["netflix", 3],
      ["actor", 3],
      ["hollywood", 3],
    ],
  },
  {
    category: "Funny",
    terms: [
      ["funny", 3],
      ["comedy", 3],
      ["meme", 3],
      ["lol", 3],
      ["fail", 3],
      ["prank", 3],
    ],
  },
  {
    category: "Trending",
    terms: [
      ["viral", 3],
      ["trending", 3],
      ["trend", 2],
    ],
  },
];

function normalize(text: string) {
  return ` ${text.toLowerCase().replace(/[^a-z0-9#+\s-]/g, " ").replace(/\s+/g, " ")} `;
}

function containsTerm(haystack: string, term: string) {
  const normalizedTerm = term.toLowerCase();

  if (normalizedTerm.length <= 3) {
    return new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}($|\\s)`).test(haystack);
  }

  return haystack.includes(normalizedTerm);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "you",
  "this",
  "that",
  "with",
  "from",
  "have",
  "has",
  "was",
  "are",
  "but",
  "not",
  "your",
  "about",
  "into",
  "video",
  "shorts",
  "reel",
  "reels",
  "tiktok",
  "instagram",
  "youtube",
]);
