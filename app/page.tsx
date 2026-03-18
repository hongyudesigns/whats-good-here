"use client";

import { Search } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

type ApiDish = {
  phrase: string;
  count: number;
};

type ApiBusiness = {
  business_id: string;
  name: string;
  address: string;
  city: string;
  stars: number;
  review_count: number;
};

type SearchMode = "restaurant" | "dish";

type SearchStatus =
  | "idle"
  | "loading"
  | "results"
  | "multiple"
  | "dish_results"
  | "not_found"
  | "no_reviews"
  | "error"
  | "rate_limited";

type DishResultRow = ApiBusiness & { dish_count: number };

type SearchResponse =
  | {
      status: "ok";
      business: ApiBusiness;
      order_this: ApiDish[];
      skip_this: ApiDish[];
    }
  | {
      status: "multiple";
      matches: ApiBusiness[];
    }
  | {
      status: "dish_results";
      dish: string;
      results: DishResultRow[];
    }
  | {
      status: "not_found";
      message: string;
    }
  | {
      status: "no_reviews";
      message: string;
      business: ApiBusiness;
    }
  | {
      status: "rate_limited";
      message: string;
    }
  | {
      status: "error";
      message: string;
      debug?: string;
    };

type SearchHistoryEntry = {
  businessId: string;
  name: string;
  result: Extract<SearchResponse, { status: "ok" }>;
};

const MAX_SEARCH_HISTORY = 10;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatStars(stars: number) {
  return `★ ${stars.toFixed(1)}`;
}

function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;

    const handleResize = () => {
      const keyboardHeight =
        window.innerHeight - viewport.height - viewport.offsetTop;
      if (keyboardHeight > 0) {
        // Keep the bar 12px above the keyboard.
        setOffset(keyboardHeight + 12);
      } else {
        setOffset(0);
      }
    };

    handleResize();
    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);
    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  return offset;
}

function DishRow({
  name,
  count,
  onTap,
}: {
  name: string;
  count: number;
  onTap?: (name: string) => void;
}) {
  const label = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const nameNode = onTap ? (
    <button
      type="button"
      onClick={() => onTap(name)}
      className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left font-medium text-[15px] text-[var(--receipt-text)]"
    >
      {label}
    </button>
  ) : (
    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-medium text-[15px] text-[var(--receipt-text)]">
      {label}
    </span>
  );

  return (
    <div className="flex h-8 items-center justify-between text-[15px] text-[var(--receipt-text)]">
      {nameNode}
      <span className="w-12 text-right font-medium">
        {count}
      </span>
    </div>
  );
}

function ReceiptCard({
  business,
  order_this,
  skip_this,
  onDishTap,
}: {
  business: ApiBusiness;
  order_this: ApiDish[];
  skip_this: ApiDish[];
  onDishTap?: (dishName: string) => void;
}) {
  const topOrder = order_this.slice(0, 4);
  const topSkip = skip_this.slice(0, 4);
  return (
    <section className="relative mt-6 receipt-font">
      {/* Top torn edge — irregular zigzag, hand-drawn style; z-index so it layers on top of card */}
      <svg
        className="relative z-10 block w-full -mb-1 rotate-180"
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
        height={16}
        fill="#FFFFFF"
        aria-hidden
      >
        <path d="M0,0 L100,0 L100,16 L88,7 L76,14 L62,4 L48,11 L34,6 L22,13 L10,3 L0,9 Z" />
      </svg>
      <div
        className={classNames(
          "receipt-card",
          "relative z-0 px-5 py-[26px]",
        )}
      >
        {/* Header */}
        <header className="mb-4 text-center">
          <h2 className="text-[18px] font-semibold text-[var(--receipt-text)]">
            {business.name}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--receipt-secondary)]">
            {business.address}
            {business.city ? `, ${business.city}` : null}
          </p>

          <div className="mt-3 h-px w-full bg-[var(--receipt-divider)]" />

          <p className="mt-3 text-[12px] text-[var(--receipt-secondary)]">
            Based on {business.review_count.toLocaleString()} reviews
          </p>
          <p className="mt-1 text-[24px] font-semibold text-[var(--receipt-text)]">
            {business.stars.toFixed(1)} ★
          </p>
        </header>

        {/* The A-List / Upvotes */}
        <section className="border-t border-b border-[var(--receipt-divider)] py-3">
          <div className="mb-2 flex items-center justify-between text-[12px] text-[var(--receipt-secondary)]">
            <span>The A-List</span>
            <span>Upvotes</span>
          </div>

          {topOrder.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--receipt-secondary)]">
              No dishes stood out in 4–5 star reviews.
            </p>
          ) : (
            <div className="space-y-1">
              {topOrder.map((dish) => (
                <DishRow
                  key={dish.phrase}
                  name={dish.phrase}
                  count={dish.count}
                  onTap={onDishTap}
                />
              ))}
            </div>
          )}
        </section>

        {/* The Blacklist / Downvotes */}
        <section className="pt-3">
          <div className="mb-2 flex items-center justify-between text-[12px] text-[var(--receipt-secondary)]">
            <span>The Blacklist</span>
            <span>Downvotes</span>
          </div>

          {topSkip.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--receipt-secondary)]">
              No dishes stood out in 1–2 star reviews.
            </p>
          ) : (
            <div className="space-y-1">
              {topSkip.map((dish) => (
                <DishRow
                  key={dish.phrase}
                  name={dish.phrase}
                  count={dish.count}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      {/* Bottom torn edge — different irregular zigzag */}
      <svg
        className="block w-full -mt-1 rotate-180"
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
        height={16}
        fill="#FFFFFF"
        aria-hidden
      >
        <path d="M0,16 L0,0 L12,5 L26,2 L40,10 L54,4 L68,12 L82,6 L100,8 L100,16 Z" />
      </svg>
    </section>
  );
}

// Per-tab last results: switching tabs clears input but shows that tab's last result.
const initialTabState = (): { status: SearchStatus; result: SearchResponse | null; error: string | null } => ({
  status: "idle",
  result: null,
  error: null,
});

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("restaurant");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<ApiBusiness | null>(
    null,
  );
  const [lastRestaurant, setLastRestaurant] = useState(initialTabState);
  const [lastDish, setLastDish] = useState(initialTabState);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (hasUserInteracted) return;
    const onInteraction = () => setHasUserInteracted(true);
    document.addEventListener("mousedown", onInteraction, { once: true });
    document.addEventListener("touchstart", onInteraction, { once: true });
    document.addEventListener("keydown", onInteraction, { once: true });
    return () => {
      document.removeEventListener("mousedown", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
      document.removeEventListener("keydown", onInteraction);
    };
  }, [hasUserInteracted]);

  async function runSearch(opts?: { businessId?: string; queryOverride?: string }) {
    const effectiveQuery = (opts?.queryOverride ?? query).trim();
    if (!opts?.businessId && !effectiveQuery) {
      setError(searchMode === "dish" ? "Please enter a dish name." : "Please enter a restaurant name.");
      setStatus("not_found");
      return;
    }

    setStatus("loading");
    setError(null);

    const params = new URLSearchParams();
    if (opts?.businessId) {
      params.set("business_id", opts.businessId);
    } else if (searchMode === "dish" || opts?.queryOverride != null) {
      params.set("search", "dish");
      params.set("dish", effectiveQuery);
    } else {
      params.set("name", effectiveQuery);
    }

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const text = await res.text();
      if (!text.trim()) {
        setStatus("error");
        setError("Server returned an empty response. Check the terminal running the dev server for errors.");
        return;
      }
      let data: SearchResponse;
      try {
        data = JSON.parse(text) as SearchResponse;
      } catch {
        setStatus("error");
        setError("Server returned invalid response. Check the terminal for server errors.");
        return;
      }

      if (data.status === "error") {
        setStatus("error");
        setError(
          data.debug ?? data.message ?? "Something went wrong on the server.",
        );
        return;
      }

      if (data.status === "multiple") {
        setResult(data);
        setStatus("multiple");
        setLastRestaurant({ status: "multiple", result: data, error: null });
        return;
      }

      if (data.status === "dish_results") {
        setResult(data);
        setStatus("dish_results");
        setLastDish({ status: "dish_results", result: data, error: null });
        if (opts?.queryOverride != null) setSearchMode("dish");
        return;
      }

      if (data.status === "not_found") {
        setResult(data);
        setStatus("not_found");
        setError(data.message);
        setLastRestaurant({ status: "not_found", result: data, error: data.message });
        return;
      }

      if (data.status === "no_reviews") {
        setResult(data);
        setSelectedBusiness(data.business);
        setStatus("no_reviews");
        setError(data.message);
        setLastRestaurant({ status: "no_reviews", result: data, error: data.message });
        return;
      }

      if (data.status === "rate_limited") {
        setResult(data);
        setStatus("rate_limited");
        setError(
          data.message ??
            "Too many requests. Please wait a moment and try again.",
        );
        return;
      }

      if (data.status === "ok") {
        setResult(data);
        setSelectedBusiness(data.business);
        setStatus("results");
        setError(null);
        setSearchHistory((prev) => {
          const entry: SearchHistoryEntry = {
            businessId: data.business.business_id,
            name: data.business.name,
            result: data,
          };
          const without = prev.filter((e) => e.businessId !== entry.businessId);
          return [entry, ...without].slice(0, MAX_SEARCH_HISTORY);
        });
        if (opts?.businessId) {
          setLastRestaurant({ status: "results", result: data, error: null });
          setSearchMode("restaurant");
        } else if (searchMode === "restaurant") {
          setLastRestaurant({ status: "results", result: data, error: null });
        } else {
          setLastDish({ status: "results", result: data, error: null });
          setSearchMode("restaurant");
        }
        return;
      }

      setStatus("error");
      setError("Something went wrong. Please try again.");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  const hasResultCard =
    status === "results" &&
    result &&
    result.status === "ok" &&
    result.business &&
    Array.isArray(result.order_this) &&
    Array.isArray(result.skip_this);

  const keyboardOffset = useKeyboardOffset();

  function loadFromHistory(entry: SearchHistoryEntry) {
    setResult(entry.result);
    setSelectedBusiness(entry.result.business);
    setStatus("results");
    setError(null);
  }

  const isLoading = status === "loading";

  return (
    <main className="relative min-h-screen pb-28">
      <div
        className={classNames(
          "gradient-layer",
          isLoading && "gradient-layer--loading",
        )}
      >
        <div className="gradient-blob gradient-blob--blue-1" />
        <div className="gradient-blob gradient-blob--blue-2" />
        <div className="gradient-blob gradient-blob--blue-3" />
        <div className="gradient-blob--white-peak" />
      </div>
      {/* Previous search pills — only when we have a receipt and history */}
      {hasResultCard && searchHistory.length > 0 && (
        <div
          className="hide-scrollbar overflow-x-auto overflow-y-hidden pb-2 pr-5"
          style={{ paddingTop: "calc(16px + env(safe-area-inset-top))" }}
        >
          <div className="flex gap-2">
            {searchHistory.map((entry, index) => (
              <button
                key={entry.businessId}
                type="button"
                onClick={() => loadFromHistory(entry)}
                className={classNames(
                  "shrink-0 rounded-md border border-[var(--pill-border)] bg-[var(--pill-bg)] px-[14px] py-0 text-[13px] font-normal text-[var(--pill-text)] backdrop-blur-sm",
                  index === 0 && "pill-enter",
                )}
                style={{ height: 32 }}
              >
                <span className={index === 0 ? "pill-enter__label" : undefined}>
                  {entry.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TOP REGION: headline + content (results / errors). */}
      {!hasResultCard && (
        <header className="pt-[20vh] text-center">
          <h1 className="text-[28px] font-medium leading-tight text-[color:var(--color-text)]">
            What&apos;s good here?
          </h1>
          {error && (
            <p className="mt-2 text-[14px] font-normal text-white">
              {error}
            </p>
          )}
        </header>
      )}

      <div className="mt-6">
        {status === "idle" && !hasResultCard && (
          <p className="mx-6 text-left text-[14px] font-normal leading-relaxed text-white/80">
            Welcome to my personal crusade against reading through reviews to figure out what to eat at a restaurant. Just type the name of a restaurant you&apos;re curious about and we&apos;ll skim the reviews and show you the dishes people can&apos;t stop mentioning in a nifty little list. Hope you enjoy!
          </p>
        )}

        {status === "loading" && null}

        {status === "multiple" &&
        result &&
        result.status === "multiple" && (
          <section className="mt-6 space-y-3 text-[13px]">
            <p className="text-[color:var(--color-secondary)]">
              We found a few places that match. Tap the one you mean:
            </p>
            <div className="divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
              {result.matches.map((b) => (
                <button
                  key={b.business_id}
                  type="button"
                  className="flex w-full items-start justify-between px-3 py-3 text-left hover:bg-[rgba(212,98,42,0.04)]"
                  onClick={() =>
                    runSearch({
                      businessId: b.business_id,
                    })
                  }
                >
                  <div>
                    <div className="font-semibold text-[color:var(--color-text)]">
                      {b.name}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[color:var(--color-secondary)]">
                      {b.address}
                      {b.city ? `, ${b.city}` : null}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-[color:var(--color-secondary)]">
                    <div>{formatStars(b.stars)}</div>
                    <div className="mt-0.5">
                      {b.review_count.toLocaleString()} reviews
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {status === "dish_results" &&
        result &&
        result.status === "dish_results" && (
          <section className="mt-6 space-y-3 text-[13px]">
            <p className="text-[color:var(--color-secondary)]">
              Restaurants where &quot;{result.dish}&quot; appears in 4–5 star
              reviews:
            </p>
            {result.results.length === 0 ? (
              <p className="text-[color:var(--color-secondary)]">
                No restaurants found with that dish in positive reviews.
              </p>
            ) : (
              <div className="divide-y divide-[color:var(--color-border)] rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                {result.results.map((r) => (
                  <button
                    key={r.business_id}
                    type="button"
                    className="flex w-full items-start justify-between px-3 py-3 text-left hover:bg-[rgba(212,98,42,0.04)]"
                    onClick={() =>
                      runSearch({ businessId: r.business_id })
                    }
                  >
                    <div>
                      <div className="font-semibold text-[color:var(--color-text)]">
                        {r.name}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[color:var(--color-secondary)]">
                        {r.address}
                        {r.city ? `, ${r.city}` : null}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-[color:var(--color-secondary)]">
                      <div>{formatStars(r.stars)}</div>
                      <div className="mt-0.5 font-mono text-[color:var(--color-text)]">
                        {r.dish_count} mentions
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {status === "no_reviews" && selectedBusiness && (
        <section className="mt-6 rounded-lg border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.9)] p-4 text-[12px]">
          <p className="font-semibold text-[color:var(--color-text)]">
            Not enough reviews to make a recommendation.
          </p>
          <p className="mt-1 text-[color:var(--color-secondary)]">
            We don&apos;t have a strong read on{" "}
            <span className="font-semibold">{selectedBusiness.name}</span> yet.
            Try another spot.
          </p>
        </section>
        )}

        {hasResultCard &&
        result &&
        result.status === "ok" && (
          <div
            className="overflow-hidden"
            style={{
              animation: "receiptGrowDown 1.2s cubic-bezier(0.32, 0, 0.27, 1) forwards",
            }}
          >
            <ReceiptCard
              business={result.business}
              order_this={result.order_this}
              skip_this={result.skip_this}
            />
          </div>
        )}
      </div>

      {/* BOTTOM REGION: search bar pinned to bottom (desktop + mobile). */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center"
        style={{
          transform:
            keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
        }}
      >
        <div
          className="pointer-events-auto w-full max-w-[390px] px-5"
          style={{
            paddingBottom: "max(10vh, calc(16px + env(safe-area-inset-bottom)))",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  hasResultCard ? "Search other restaurant" : "What restaurant are you at?"
                }
                className={classNames(
                  "h-[52px] w-full rounded-full border pl-4 pr-12 text-[14px] outline-none",
                  "border-[var(--search-border)] bg-[var(--search-bg)] text-[var(--search-text)]",
                  "placeholder:text-[var(--search-placeholder)]",
                  "backdrop-blur-[12px]",
                )}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-[var(--search-text)]"
              >
                <Search className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
