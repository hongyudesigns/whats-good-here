# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (uses WATCHPACK_POLLING=true for compatibility)
npm run build      # Production build
npm run lint       # Run ESLint
```

The app requires `ANTHROPIC_API_KEY` set in your environment (or `.env.local`) to call Claude for dish extraction.

## Data Files

The API reads two large CSV files at runtime — they are **not** checked into git and must be placed manually:

- `data/nyc_businesses.csv` — Yelp business data with columns: `business_id`, `name`, `address`, `city`, `stars`, `review_count`, `is_open`, `categories`
- `data/nyc_reviews.csv` — Yelp review data with columns: `business_id`, `stars`, `useful`, `text`

The API filters businesses to only those that are `is_open=1` and have a restaurant/food category keyword.

## Architecture

**Single-page app** — `app/page.tsx` is the entire client UI. All state lives there (no global store). `SearchStatus` drives the render: `idle → loading → results | multiple | dish_results | not_found | no_reviews | error | rate_limited`.

**API route** — `app/api/search/route.ts` is the only backend endpoint (`GET /api/search`). It handles three query patterns:
1. `?name=<string>` — fuzzy restaurant name search (substring match)
2. `?business_id=<id>` — direct lookup after disambiguation
3. `?search=dish&dish=<phrase>` — full-scan of reviews for a dish phrase across all restaurants

**Two-step Claude pipeline** (restaurant mode only):
1. Send top 30 most-useful reviews to `claude-haiku-4-5-20251001`, get back a JSON array of dish names
2. Count those dish names across all reviews by star band (≥4★ → "order this", ≤2★ → "skip this")

Both businesses and per-business reviews are cached in module-level variables (in-memory, per serverless instance). Claude dish name results are cached on `globalThis.__claudeCache` to survive hot reloads in dev.

**Rate limiting** — simple in-memory per-IP store: 10 requests per 60 seconds.

## UI Structure

- `app/layout.tsx` — Sets fonts (DM Sans for UI chrome, Poppins for receipt card), gradient background, safe-area insets
- `app/globals.css` — CSS custom properties for the color system, receipt card styles, keyframe animations (`receiptGrowDown`, `shimmerPulse`, `gradientPulse`, `pillEnterScale`)
- `app/components/ui/ai-prompt-box.tsx` — The chat-style search input at the bottom
- `app/components/ui/word-loader.tsx` — Animated word-cycling component shown during loading
- `app/lib/utils.ts` — Utility helpers

The receipt card (`ReceiptCard` in `page.tsx`) uses inline SVG torn-edge shapes and the `.receipt-font` / `.receipt-card` CSS classes. The `receiptGrowDown` animation plays when results arrive.

Design tokens use CSS variables (`--receipt-text`, `--receipt-secondary`, etc.) defined in `globals.css`.

## Session Handoff

At the end of every session, update `notes.md` with: what was completed, what's in progress, what's next, and any important decisions or gotchas discovered.
