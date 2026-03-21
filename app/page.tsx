"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PromptInputBox } from "./components/ui/ai-prompt-box";
import { WordLoader } from "./components/ui/word-loader";

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
  const [multipleMaskMode, setMultipleMaskMode] = useState<
    "none" | "bottom" | "top" | "both"
  >("bottom");

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

  useEffect(() => {
    if (status === "loading") {
      document.body.classList.add("loading-pulse");
    } else {
      document.body.classList.remove("loading-pulse");
    }
    return () => {
      document.body.classList.remove("loading-pulse");
    };
  }, [status]);

  useEffect(() => {
    if (status !== "multiple") {
      setMultipleMaskMode("bottom");
    }
  }, [status]);

  async function runSearch(opts?: { businessId?: string; queryOverride?: string; forceRestaurant?: boolean }) {
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
    } else if ((searchMode === "dish" || opts?.queryOverride != null) && !opts?.forceRestaurant) {
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
  const isMultipleState = status === "multiple" && result?.status === "multiple";

  function loadFromHistory(entry: SearchHistoryEntry) {
    setResult(entry.result);
    setSelectedBusiness(entry.result.business);
    setStatus("results");
    setError(null);
  }

  function updateMultipleMaskMode(el: HTMLDivElement) {
    const { scrollTop, clientHeight, scrollHeight } = el;
    const hasOverflow = scrollHeight - clientHeight > 1;
    if (!hasOverflow) {
      setMultipleMaskMode("none");
      return;
    }

    const atTop = scrollTop <= 1;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
    if (atTop && !atBottom) {
      setMultipleMaskMode("bottom");
      return;
    }
    if (atBottom && !atTop) {
      setMultipleMaskMode("top");
      return;
    }
    setMultipleMaskMode("both");
  }

  function handleListScroll(event: React.UIEvent<HTMLDivElement>) {
    if (status !== "multiple") return;
    updateMultipleMaskMode(event.currentTarget);
  }

  useEffect(() => {
    if (status !== "multiple") return;
    const node = document.getElementById("multiple-matches-scroll");
    if (!(node instanceof HTMLDivElement)) return;
    updateMultipleMaskMode(node);
  }, [status, result]);

  const multipleMaskStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (status !== "multiple") return undefined;

    const map: Record<"none" | "bottom" | "top" | "both", string | undefined> = {
      none: undefined,
      bottom:
        "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) calc(100% - 40px), rgba(0,0,0,0.7) calc(100% - 20px), rgba(0,0,0,0) 100%)",
      top:
        "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 20px, rgba(0,0,0,1) 40px, rgba(0,0,0,1) 100%)",
      both:
        "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 20px, rgba(0,0,0,1) 40px, rgba(0,0,0,1) calc(100% - 40px), rgba(0,0,0,0.7) calc(100% - 20px), rgba(0,0,0,0) 100%)",
    };
    const maskImage = map[multipleMaskMode];
    if (!maskImage) return undefined;
    return {
      WebkitMaskImage: maskImage,
      maskImage,
      WebkitMaskSize: "100% 100%",
      maskSize: "100% 100%",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
    };
  }, [status, multipleMaskMode]);

  return (
    <main
      className={
        hasResultCard
          ? "relative h-[100vh] overflow-y-auto overflow-x-hidden flex flex-col -mx-6 px-6"
          : "relative h-[100vh] overflow-hidden flex flex-col"
      }
      style={
        hasResultCard
          ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 65px)" }
          : undefined
      }
    >

      {/* HEADER SECTION */}
      <div className="flex-shrink-0">
        {!hasResultCard && (
          <header
            className={classNames(
              "text-center",
              status === "idle" ? "mb-4" : "mb-8",
              "pt-8",
            )}
          >
            <h1
              className="text-[28px] font-medium leading-tight text-[#FFFFFF]"
            >
              What&apos;s good here?
            </h1>
            {error && (
              <p className="mt-2 text-[14px] font-normal text-[#FFFFFF]">
                {error}
              </p>
            )}
            {status === "multiple" &&
              result &&
              result.status === "multiple" && (
                <p className="mt-4 text-center text-[#FFFFFF] text-[13px]">
                  We found a few places that match. Tap the one you mean:
                </p>
              )}
          </header>
        )}
      </div>

      {/* CONTENT SECTION */}
      <div
        id={status === "multiple" ? "multiple-matches-scroll" : undefined}
        className={
          hasResultCard
            ? "relative z-0 overflow-visible"
            : status === "multiple" || status === "dish_results"
              ? "relative z-0 h-[360px] overflow-y-auto overflow-x-hidden"
            : "relative flex-1 overflow-y-auto overflow-x-hidden z-0"
        }
        style={multipleMaskStyle}
        onScroll={handleListScroll}
      >
        {status === "idle" && !hasResultCard && (
          <p className="text-center text-[14px] font-normal leading-relaxed text-[#FFFFFF]">
            Harnessing the power of 4-5 star reviews so you never sit at your table and wonder what this place is famous for.
          </p>
        )}

        {status === "loading" && (
          <div
            className="pointer-events-none fixed inset-x-0 z-10 flex justify-center"
            style={{
              top: "calc(20vh + 56px)",
              // WordLoader should sit at midpoint between headline and the pills row.
              // Pills row is ~80px above the search box, so lift the centering bottom reference by +80px.
              bottom:
                "calc(max(10vh, calc(env(safe-area-inset-bottom) + 8px)) + 164px)",
            }}
          >
            <div className="flex items-center">
              <WordLoader
                words={[
                  "skimming reviews",
                  "finding dishes",
                  "counting mentions",
                  "reading opinions",
                  "almost there",
                ]}
                className="text-[#FFFFFF]"
              />
            </div>
          </div>
        )}

        {status === "multiple" &&
        result &&
        result.status === "multiple" && (
          <section className="my-8 space-y-2 text-[13px]">
            <div className="space-y-2">
              {result.matches.map((b) => (
                <button
                  key={b.business_id}
                  type="button"
                  className="flex w-full items-start justify-between rounded-md border border-[rgba(0,0,0,0.1)] bg-[#FFFFFF] px-[14px] py-[12px] text-left text-[#1A1A1A] hover:bg-[#FFFFFF]/90 transition-colors"
                  onClick={() =>
                    runSearch({
                      businessId: b.business_id,
                    })
                  }
                >
                  <div>
                    <div className="font-semibold text-[#1A1A1A]">
                      {b.name}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#1A1A1A]">
                      {b.address}
                      {b.city ? `, ${b.city}` : null}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-[#1A1A1A]">
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
          <section className="mt-0 mb-8 space-y-3 text-[13px]">
            <p className="text-[color:var(--color-secondary)]">
              Restaurants where &quot;{result.dish}&quot; appears in 4–5 star
              reviews:
            </p>
            {result.results.length === 0 ? (
              <p className="text-[color:var(--color-secondary)]">
                No restaurants found with that dish in positive reviews.
              </p>
            ) : (
              <div className="space-y-2">
                {result.results.map((r) => (
                  <button
                    key={r.business_id}
                    type="button"
                    className="flex w-full items-start justify-between rounded-md border border-[rgba(0,0,0,0.1)] bg-[#FFFFFF] px-[14px] py-[12px] text-left text-[#1A1A1A] hover:bg-[#FFFFFF]/90 transition-colors"
                    onClick={() =>
                      runSearch({ businessId: r.business_id })
                    }
                  >
                    <div>
                      <div className="font-semibold text-[#1A1A1A]">
                        {r.name}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#1A1A1A]">
                        {r.address}
                        {r.city ? `, ${r.city}` : null}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-[#1A1A1A]">
                      <div>{formatStars(r.stars)}</div>
                      <div className="mt-0.5 font-mono text-[#1A1A1A]">
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
        <section className="mt-6 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#FFFFFF] p-4 text-[12px] text-[#1A1A1A]">
          <p className="font-semibold text-[#1A1A1A]">
            Not enough reviews to make a recommendation.
          </p>
          <p className="mt-1 text-[#1A1A1A]">
            We don&apos;t have a strong read on{" "}
            <span className="font-semibold text-[#1A1A1A]">
              {selectedBusiness.name}
            </span>{" "}
            yet.{" "}
            Try another spot.
          </p>
        </section>
        )}

        {hasResultCard &&
        result &&
        result.status === "ok" && (
          <>
            <div
              className="overflow-visible mb-8"
              style={{
                marginTop: "32px",
              }}
            >
              <ReceiptCard
                business={result.business}
                order_this={result.order_this}
                skip_this={result.skip_this}
              />
            </div>
          </>
        )}
      </div>

      {/* DOCK */}
      {hasResultCard ? (
        <div className="relative z-20 flex justify-center">
          <div
            className="w-full"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
          >
            {(status === "loading" || searchHistory.length > 0) && (
              <div className="mb-4 hide-scrollbar overflow-x-auto overflow-y-visible">
                <div className="flex gap-2">
                  {searchHistory.map((entry) => (
                    <button
                      key={entry.businessId}
                      type="button"
                      onClick={() => loadFromHistory(entry)}
                      className="shrink-0 rounded-full border border-[rgba(0,0,0,0.1)] bg-[#FFFFFF] px-[14px] py-0 text-[13px] font-normal text-[#1A1A1A]"
                      style={{ height: 32 }}
                    >
                      {entry.name}
                    </button>
                  ))}
                  {status === "loading" && (
                    <div className="h-8 w-[120px] shrink-0 rounded-full border border-[rgba(0,0,0,0.1)] bg-[#FFFFFF] shimmer-pulse" />
                  )}
                </div>
              </div>
            )}

            <PromptInputBox
              isLoading={status === "loading"}
              placeholder={
                status === "loading"
                  ? "Searching..."
                  : hasResultCard
                    ? "Search other restaurant"
                    : "What restaurant are you at?"
              }
              className="border-2 border-white bg-[rgba(255,255,255,0.8)] text-[#1A1A1A] backdrop-blur-[8px] shadow-none"
              onSend={(message) => {
                const trimmed = message.trim();
                if (!trimmed) return;
                setQuery(trimmed);
                void runSearch({ queryOverride: trimmed, forceRestaurant: true });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 flex justify-center z-20">
          <div
            className="w-[calc(100vw-48px)] max-w-[342px]"
            style={{
              // Lock the bottom search box position: depend only on safe-area inset.
              // Raise it for breathing room (requested ~32px + safe area).
              paddingBottom: "calc(env(safe-area-inset-bottom) + 56px)",
            }}
          >
            {(status === "loading" || searchHistory.length > 0) && (
              <div className="mb-2 hide-scrollbar overflow-x-auto overflow-y-visible">
                <div className="flex gap-2">
                  {searchHistory.map((entry) => (
                    <button
                      key={entry.businessId}
                      type="button"
                      onClick={() => loadFromHistory(entry)}
                      className="shrink-0 rounded-full border border-[rgba(0,0,0,0.1)] bg-[#FFFFFF] px-[14px] py-0 text-[13px] font-normal text-[#1A1A1A]"
                      style={{ height: 32 }}
                    >
                      {entry.name}
                    </button>
                  ))}
                  {status === "loading" && (
                    <div className="h-8 w-[120px] shrink-0 rounded-full border border-[rgba(0,0,0,0.1)] bg-[#FFFFFF] shimmer-pulse" />
                  )}
                </div>
              </div>
            )}

            <PromptInputBox
              isLoading={status === "loading"}
              placeholder={
                status === "loading"
                  ? "Searching..."
                  : hasResultCard
                    ? "Search other restaurant"
                    : "What restaurant are you at?"
              }
              className="border-2 border-white bg-[rgba(255,255,255,0.8)] text-[#1A1A1A] backdrop-blur-[8px] shadow-none"
              onSend={(message) => {
                const trimmed = message.trim();
                if (!trimmed) return;
                setQuery(trimmed);
                void runSearch({ queryOverride: trimmed, forceRestaurant: true });
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
