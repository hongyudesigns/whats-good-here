import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parse as parseSync } from "csv-parse/sync";
import { parse as parseStream } from "csv-parse";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

type Business = {
  business_id: string;
  name: string;
  address: string;
  city: string;
  stars: number;
  review_count: number;
};

type Review = {
  business_id: string;
  stars: number;
  useful: number;
  text: string;
};

// Keywords for restaurant/food category filtering (CF.1)
const RESTAURANT_CATEGORY_KEYWORDS = [
  "restaurant", "food", "cafe", "coffee", "bar", "pub", "pizza", "sushi",
  "burger", "diner", "bistro", "grill", "kitchen", "eatery", "bakery", "bbq",
  "steakhouse", "seafood", "taco", "sandwich", "deli", "brewery", "taproom",
  "brasserie", "chophouse",
];

function hasRestaurantCategory(categories: string | undefined): boolean {
  if (!categories || !categories.trim()) return false;
  const lower = categories.toLowerCase();
  return RESTAURANT_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

// In-memory caches for CSV data (per serverless instance)
let businessesCache: Business[] | null = null;
const reviewsCacheByBusiness = new Map<string, Review[]>();

// Simple in-memory per-IP rate limiter: 10 requests per 60 seconds
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, number[]>();

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  // Fallback: user agent bucket
  return req.headers.get("user-agent") ?? "unknown";
}

function checkRateLimit(req: NextRequest): { ok: boolean; retryAfterMs?: number } {
  const key = getClientKey(req);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const existing = rateLimitStore.get(key) ?? [];
  const recent = existing.filter((ts) => ts > windowStart);

  if (recent.length >= RATE_LIMIT_MAX) {
    const earliest = Math.min(...recent);
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - earliest);
    rateLimitStore.set(key, recent);
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return { ok: true };
}

async function loadBusinesses(): Promise<Business[]> {
  if (businessesCache) return businessesCache;

  const csvPath = path.join(process.cwd(), "data", "nyc_businesses.csv");
  console.log("[api/search] Loading businesses from:", csvPath);

  let raw: string;
  try {
    raw = await fs.readFile(csvPath, "utf8");
    console.log("[api/search] Businesses file size:", raw.length, "chars");
  } catch (err) {
    console.error("[api/search] Failed to read businesses CSV:", err);
    throw err;
  }

  let records: Record<string, string>[];
  try {
    records = parseSync(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    console.log("[api/search] Parsed businesses rows:", records.length);
  } catch (err) {
    console.error("[api/search] Failed to parse businesses CSV:", err);
    throw err;
  }

  const withRequired = records.filter((row) => row.business_id && row.name);
  const closed = withRequired.filter(
    (row) => row.is_open !== "1" && Number(row.is_open) !== 1,
  );
  const open = withRequired.filter(
    (row) => row.is_open === "1" || Number(row.is_open) === 1,
  );
  const openAndRestaurant = open.filter((row) =>
    hasRestaurantCategory(row.categories),
  );
  console.log(
    "[api/search] is_open filter:",
    closed.length,
    "closed (filtered out),",
    open.length,
    "open (kept); category filter:",
    open.length - openAndRestaurant.length,
    "non-restaurant excluded,",
    openAndRestaurant.length,
    "restaurant/food (kept)",
  );

  businessesCache = openAndRestaurant.map((row) => ({
    business_id: row.business_id,
    name: row.name,
    address: row.address ?? "",
    city: row.city ?? "",
    stars: Number(row.stars ?? 0),
    review_count: Number(row.review_count ?? 0),
  }));

  console.log("[api/search] Valid businesses count:", businessesCache.length);
  return businessesCache;
}

/**
 * Stream the reviews CSV and collect only rows for the given business_id.
 * Used because the reviews file is too large to load into a single string.
 */
async function loadReviewsForBusiness(businessId: string): Promise<Review[]> {
  const cached = reviewsCacheByBusiness.get(businessId);
  if (cached) {
    console.log("[api/search] Reviews cache hit for:", businessId);
    return cached;
  }

  const csvPath = path.join(process.cwd(), "data", "nyc_reviews.csv");
  console.log("[api/search] Streaming reviews for business_id:", businessId);

  return new Promise((resolve, reject) => {
    const reviews: Review[] = [];
    const parser = createReadStream(csvPath, { encoding: "utf8" }).pipe(
      parseStream({
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        trim: true,
      }),
    );

    parser.on("data", (row: Record<string, string>) => {
      if (row.business_id === businessId && row.text) {
        reviews.push({
          business_id: row.business_id,
          stars: Number(row.stars ?? 0),
          useful: Number(row.useful ?? 0),
          text: String(row.text ?? ""),
        });
      }
    });

    parser.on("end", () => {
      reviewsCacheByBusiness.set(businessId, reviews);
      console.log("[api/search] Loaded", reviews.length, "reviews for", businessId);
      resolve(reviews);
    });

    parser.on("error", (err) => {
      console.error("[api/search] Stream error reading reviews CSV:", err);
      reject(err);
    });
  });
}

function sanitizeName(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Cap length to avoid abuse
  return trimmed.slice(0, 80);
}

function findBusinessesByName(all: Business[], name: string): Business[] {
  const target = name.toLowerCase();
  return all.filter((b) => b.name.toLowerCase().includes(target));
}

function findBusinessById(all: Business[], id: string): Business | undefined {
  return all.find((b) => b.business_id === id);
}

/**
 * Scan the full reviews file once for mentions of dishPhrase in 4–5 star reviews only.
 * No row cap — all restaurants can appear. May approach or exceed Vercel's 10s limit on cold start.
 */
async function searchDishAcrossRestaurants(
  dishPhrase: string,
): Promise<{ business_id: string; count: number }[]> {
  const phraseLower = dishPhrase.trim().toLowerCase();
  if (!phraseLower) return [];

  const csvPath = path.join(process.cwd(), "data", "nyc_reviews.csv");
  const counts = new Map<string, number>();

  return new Promise((resolve, reject) => {
    const finish = () => {
      const list = Array.from(counts.entries())
        .map(([business_id, count]) => ({ business_id, count }))
        .sort((a, b) => b.count - a.count);
      resolve(list);
    };

    const parser = createReadStream(csvPath, { encoding: "utf8" }).pipe(
      parseStream({
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        trim: true,
      }),
    );

    parser.on("data", (row: Record<string, string>) => {
      const stars = Number(row.stars ?? 0);
      if (stars < 4) return;
      const text = String(row.text ?? "").toLowerCase();
      if (!text.includes(phraseLower)) return;
      const business_id = row.business_id;
      if (!business_id) return;
      let n = 0;
      let idx = text.indexOf(phraseLower);
      while (idx !== -1) {
        n += 1;
        idx = text.indexOf(phraseLower, idx + phraseLower.length);
      }
      counts.set(business_id, (counts.get(business_id) ?? 0) + n);
    });

    parser.on("end", finish);
    parser.on("error", reject);
  });
}

// Step 1: Claude returns dish names only (small, cheap call).
const CLAUDE_DISH_NAMES_PROMPT = `Read these restaurant reviews and list every specific food dish mentioned. Return ONLY a JSON array of dish names, no other text, no markdown: ["dish one", "dish two", "dish three"]. Food only, no drinks. Return ONLY the top 10 most frequently mentioned food dishes. Maximum 10 dishes, no exceptions. Be specific (e.g. 'roast chicken' not 'chicken').

Reviews:
`;

/** Step 1 — Send 30 reviews to Claude; get back only a list of dish names (no sentiment, no counts). */
async function getClaudeDishNames(reviews: Review[]): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[api/search] ANTHROPIC_API_KEY not set; skipping Claude.");
    return null;
  }

  const topReviews = [...reviews]
    .sort((a, b) => b.useful - a.useful)
    .slice(0, 30);
  if (topReviews.length === 0) {
    console.warn("[api/search] getClaudeDishNames: no reviews to send.");
    return null;
  }
  console.log("[api/search] getClaudeDishNames: sending", topReviews.length, "reviews to Claude");

  const reviewsBlock = topReviews
    .map((r, i) => `${i + 1}. (${r.stars}★) ${r.text}`)
    .join("\n\n");
  const prompt = CLAUDE_DISH_NAMES_PROMPT + reviewsBlock;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const textPart = response.content.find(
      (p): p is { type: "text"; text: string } => p.type === "text",
    );
    if (!textPart?.text) {
      console.warn("[api/search] Claude response had no text part.");
      return null;
    }

    let jsonStr = textPart.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n/, "").replace(/\n```$/, "").trim();
    }

    const parsed = JSON.parse(jsonStr) as unknown;
    const names = Array.isArray(parsed)
      ? (parsed as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    console.log("[api/search] getClaudeDishNames: got", names.length, "dish names:", names);
    return names.length > 0 ? names : null;
  } catch (err) {
    console.error("[api/search] getClaudeDishNames error:", err);
    return null;
  }
}

/**
 * Step 2 — Count mentions of each dish name across ALL reviews by star band.
 * Exact-duplicate names are already removed by caller.
 * Substring conflicts (e.g. "fish and chips" vs "beer battered fish and chips") are resolved
 * after counting: keep whichever has more mentions across all reviews, then build ORDER THIS / SKIP THIS.
 */
function countDishesInAllReviews(
  allReviews: Review[],
  dishNames: string[],
): { order_this: { phrase: string; count: number }[]; skip_this: { phrase: string; count: number }[] } {
  const goodReviews = allReviews.filter((r) => r.stars >= 4);
  const badReviews = allReviews.filter((r) => r.stars <= 2);

  const countMentions = (reviews: Review[], name: string): number => {
    const lower = name.toLowerCase();
    let total = 0;
    for (const r of reviews) {
      const text = r.text.toLowerCase();
      let idx = text.indexOf(lower);
      while (idx !== -1) {
        total += 1;
        idx = text.indexOf(lower, idx + lower.length);
      }
    }
    return total;
  };

  // Get counts for every name (good, bad, total across all reviews).
  const withCounts = dishNames.map((name) => {
    const goodCount = countMentions(goodReviews, name);
    const badCount = countMentions(badReviews, name);
    const totalCount = countMentions(allReviews, name);
    return { phrase: name, goodCount, badCount, totalCount };
  });

  // Resolve substring conflicts: when A is substring of B (or vice versa), keep the one with higher totalCount.
  const resolved = withCounts.filter((a) => {
    const aLower = a.phrase.toLowerCase();
    const drop = withCounts.some(
      (b) =>
        b.phrase !== a.phrase &&
        (b.phrase.toLowerCase().includes(aLower) || aLower.includes(b.phrase.toLowerCase())) &&
        b.totalCount > a.totalCount,
    );
    return !drop;
  });

  const order_this = resolved
    .filter((d) => d.goodCount > 0)
    .sort((a, b) => b.goodCount - a.goodCount)
    .slice(0, 4)
    .map((d) => ({ phrase: d.phrase, count: d.goodCount }));

  const orderPhrases = new Set(order_this.map((d) => d.phrase.toLowerCase()));
  const skip_this = resolved
    .filter((d) => !orderPhrases.has(d.phrase.toLowerCase()) && d.badCount > 0)
    .sort((a, b) => b.badCount - a.badCount)
    .slice(0, 4)
    .map((d) => ({ phrase: d.phrase, count: d.badCount }));

  return { order_this, skip_this };
}

/** Remove only exact duplicates (case-insensitive). Substring conflicts are resolved later by mention count. */
function dedupeDishNames(names: string[]): string[] {
  const trimmed = names.map((n) => n.trim()).filter(Boolean);
  const seen = new Set<string>();
  return trimmed.filter((n) => {
    const key = n.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const claudeDishNamesCache = new Map<string, string[] | null>();

async function getClaudeDishesForBusiness(
  businessId: string,
  reviews: Review[],
): Promise<{
  order_this: { phrase: string; count: number }[];
  skip_this: { phrase: string; count: number }[];
} | null> {
  if (claudeDishNamesCache.has(businessId)) {
    const cachedNames = claudeDishNamesCache.get(businessId) ?? null;
    console.log("[api/search] getClaudeDishesForBusiness: using cached names for", businessId, "=>", cachedNames);
    if (!cachedNames || cachedNames.length === 0) {
      return { order_this: [], skip_this: [] };
    }
    const uniqueCached = dedupeDishNames(cachedNames);
    return countDishesInAllReviews(reviews, uniqueCached);
  }

  const names = await getClaudeDishNames(reviews);
  if (!names || names.length === 0) return { order_this: [], skip_this: [] };
  claudeDishNamesCache.set(businessId, names);
  const unique = dedupeDishNames(names);
  console.log("[api/search] dedupeDishNames: input =", names, "unique =", unique);
  return countDishesInAllReviews(reviews, unique);
}

export async function GET(req: NextRequest) {
  try {
    // For debugging inconsistent Claude dish names (e.g. Deviled Eggs / Fish and Chips),
    // always clear the per-session Claude cache so each request re-asks Claude.
    claudeDishNamesCache.clear();

    const rate = checkRateLimit(req);
    if (!rate.ok) {
      const retryAfterSec =
        rate.retryAfterMs !== undefined
          ? Math.ceil(rate.retryAfterMs / 1000)
          : 60;

      return NextResponse.json(
        {
          status: "rate_limited",
          message:
            "Too many requests. Please wait a moment before trying again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
          },
        },
      );
    }

    const { searchParams } = new URL(req.url);
    const rawName = searchParams.get("name");
    const businessId = searchParams.get("business_id");
    const searchMode = searchParams.get("search");
    const dishQuery = searchParams.get("dish");
    console.log("[api/search] Request query:", { name: rawName, business_id: businessId, search: searchMode, dish: dishQuery });

    // Dish search: scan all reviews for phrase in 4–5 star reviews, return ranked restaurants (no Claude).
    if (searchMode === "dish" && dishQuery?.trim()) {
      const dishPhrase = dishQuery.trim().slice(0, 80);
      const businesses = await loadBusinesses();
      const dishCounts = await searchDishAcrossRestaurants(dishPhrase);
      const results = dishCounts
        .slice(0, 20)
        .map(({ business_id, count }) => {
          const business = findBusinessById(businesses, business_id);
          return business ? { business, count } : null;
        })
        .filter((r): r is { business: Business; count: number } => r !== null);
      return NextResponse.json(
        {
          status: "dish_results",
          dish: dishPhrase,
          results: results.map(({ business, count }) => ({
            business_id: business.business_id,
            name: business.name,
            address: business.address,
            city: business.city,
            stars: business.stars,
            review_count: business.review_count,
            dish_count: count,
          })),
        },
        { status: 200 },
      );
    }

    const businesses = await loadBusinesses();

    let selectedBusiness: Business | undefined;

    if (businessId) {
      selectedBusiness = findBusinessById(businesses, businessId);
      if (!selectedBusiness) {
        return NextResponse.json(
          {
            status: "not_found",
            message: "No restaurant found for that selection.",
          },
          { status: 404 },
        );
      }
      console.log("[api/search] Selected business by id:", selectedBusiness.name);
    } else {
      const name = sanitizeName(rawName);
      if (!name) {
        return NextResponse.json(
          {
            status: "bad_request",
            message: "Please provide a restaurant name.",
          },
          { status: 400 },
        );
      }

      const matches = findBusinessesByName(businesses, name);

      if (matches.length === 0) {
        return NextResponse.json(
          {
            status: "not_found",
            message: `No results for '${name}'. Try a different spelling?`,
          },
          { status: 404 },
        );
      }

      if (matches.length > 1) {
        return NextResponse.json(
          {
            status: "multiple",
            matches: matches.slice(0, 10).map((b) => ({
              business_id: b.business_id,
              name: b.name,
              address: b.address,
              city: b.city,
              stars: b.stars,
              review_count: b.review_count,
            })),
          },
          { status: 200 },
        );
      }

      selectedBusiness = matches[0];
      console.log("[api/search] Single match:", selectedBusiness.name);
    }

    if (!selectedBusiness) {
      return NextResponse.json(
        {
          status: "not_found",
          message: "No restaurant found.",
        },
        { status: 404 },
      );
    }

    console.log("[api/search] Loading reviews for business_id:", selectedBusiness.business_id);
    const businessReviews = await loadReviewsForBusiness(selectedBusiness.business_id);
    console.log("[api/search] Reviews for this business:", businessReviews.length);

    if (businessReviews.length === 0) {
      return NextResponse.json(
        {
          status: "no_reviews",
          message: "Not enough reviews to make a recommendation.",
          business: selectedBusiness,
        },
        { status: 200 },
      );
    }

    const extracted = await getClaudeDishesForBusiness(
      selectedBusiness.business_id,
      businessReviews,
    );
    const order_this = extracted?.order_this ?? [];
    const skip_this = extracted?.skip_this ?? [];
    console.log("[api/search] order_this:", order_this.length, "dishes; skip_this:", skip_this.length, "dishes");

    return NextResponse.json(
      {
        status: "ok",
        business: selectedBusiness,
        order_this,
        skip_this,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/search] Unhandled error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    if (stack) console.error("[api/search] Stack:", stack);

    return NextResponse.json(
      {
        status: "error",
        message: "Something went wrong on the server. Check the server logs for details.",
        debug: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 },
    );
  }
}

