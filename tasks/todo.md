# What's Good Here — Build Checklist

**Status:** Plan written. Awaiting your approval before any code changes.

---

## Pre-flight (already verified)

- [x] `/data/nyc_businesses.csv` and `/data/nyc_reviews.csv` exist
- [x] `.gitignore` includes `.env*` (env files not committed)
- [x] Next.js 16 App Router + Tailwind 4 in place
- [ ] `.env.local` created by you with `ANTHROPIC_API_KEY` (developer action; not in repo)

**Data note:** Businesses CSV has columns including `business_id`, `name`, `address`, `city`, `stars`, `review_count`. Reviews CSV has `review_id`, `user_id`, `business_id`, `stars`, `useful`, `funny`, `cool`, `text`, `date`. We will parse by header name; column order may differ from brief.

---

## 1. Design system & layout

- [x] **1.1** Add CSS variables to `app/globals.css`: `--color-bg`, `--color-surface`, `--color-text`, `--color-secondary`, `--color-accent`, `--color-border`, `--color-positive` (exact hex values from brief)
- [x] **1.2** Load Google Fonts in `app/layout.tsx`: headline = Playfair Display or Lora; body/UI = DM Sans or Outfit; data/receipt = DM Mono or IBM Plex Mono. Remove Geist; wire Tailwind theme to new font variables
- [x] **1.3** Add subtle grain/noise texture overlay (CSS or SVG) on background
- [x] **1.4** Mobile-first: max-width 390px, horizontal padding 20px, no horizontal scroll

---

## 2. API route: `/api/search`

- [x] **2.1** Create `app/api/search/route.ts`. GET handler: read `name` from query, validate/sanitize (trim, length cap, no script injection)
- [x] **2.2** Read `nyc_businesses.csv`, match `name` (case-insensitive, partial match). Return 404 shape if no match; return list of matches if multiple (user picks one)
- [x] **2.3** For single match: read `nyc_reviews.csv`, filter by `business_id`, take reviews with `text`
- [x] **2.4** Count dish mentions using `DISH_PHRASES` (brief list). Sort by count, keep top dishes for display
- [x] **2.5** Take top 30 reviews (e.g. by `useful` or order in file), send to Claude API with exact prompt from brief. Model: `claude-haiku-4-5-20251001`
- [x] **2.6** Parse Claude JSON response. Return to client: business info (name, address, city, stars, review_count), dish counts, and AI fields (vibe, order_this, skip_or_note, confidence). On Claude error: return dish counts only, no AI summary
- [x] **2.7** Add `@anthropic-ai/sdk` dependency; use `ANTHROPIC_API_KEY` from `process.env` only in this server file (never expose to client)

---

## 3. Main page: three states

- [x] **3.1** **Empty state:** Centered layout; headline "What's Good Here?" (serif); subtext "Find out what to order before you sit down."; single full-width search input (placeholder: "Try 'The Dandelion' or 'Zahav'..."); 52px height, 8px radius, warm border
- [x] **3.2** **Loading state:** Search bar stays at top; receipt-printing style loader (or pulsing dots); rotating copy "Reading the reviews..." / "Asking around..."; no heavy spinner
- [x] **3.3** **Results state:** Receipt-style card — restaurant name (ALL CAPS) + stars; address; "Based on N reviews"; "WHAT TO ORDER" section with monospace rows (dish name, dot leaders, right-aligned count); "THE VIBE" and "HEADS UP" from Claude; staggered fade-in; "Search again" below card

---

## 4. Client logic & API integration

- [x] **4.1** On submit: call `/api/search?name=...`. Handle: single result (show receipt), multiple results (show list to pick), not found (message: "No results for '[name]'. Try a different spelling?")
- [x] **4.2** If Claude fails: show dish counts only, hide vibe/heads up or show short fallback message
- [x] **4.3** No reviews: show "Not enough reviews to make a recommendation."

---

## 5. Error states & edge cases

- [x] Not found → copy from brief
- [x] Multiple matches → simple list, tap to select then re-run search with chosen business_id or name
- [x] Claude API error → dish counts only, graceful message
- [x] No reviews for business → "Not enough reviews to make a recommendation."

---

## 6. Security & production readiness

- [x] Confirm `ANTHROPIC_API_KEY` only in server code (`route.ts`), never in client bundle or network tab
- [x] No hardcoded secrets; no `.env.local` committed
- [x] API validates/sanitizes `name` (and optional `business_id` if used for multi-select)
- [x] Quick sanity check: no sensitive data in API response beyond business + dish + AI summary

---

## 7. Docs & handoff

- [ ] Create `dev.md`: list any stubs, mock data, or code to remove before production
- [ ] Create `steps.md`: short log of every change made
- [ ] Final review: security pass, syntax, no legacy/duplicate code; add **Review** section at bottom of this file summarizing what was built

---

## Refactor: Simplify product (remove Claude, split dish lists)

**Status:** Checklist written. Awaiting your approval before any code changes.

- [x] **R.1** Remove Claude API integration entirely — delete all Anthropic SDK usage, `getClaudeSummary`, `buildClaudePrompt`, and any code that reads or uses `ANTHROPIC_API_KEY` or `dotenv` for env loading in the API route.
- [x] **R.2** Split dish counting in the API route into two lists:
  - **ORDER THIS:** count dish phrase mentions only in reviews where `stars` is 4 or 5. Return as a sorted list (e.g. `order_this: { phrase, count }[]`).
  - **SKIP THIS:** count dish phrase mentions only in reviews where `stars` is 1 or 2. Return as a sorted list (e.g. `skip_this: { phrase, count }[]`).
  - Keep using the same `DISH_PHRASES` list; 3-star reviews are ignored for both.
- [x] **R.3** Update the API route response: return `order_this` and `skip_this` (and business info). Remove `dishes`, `ai`, and `ai_available` from the success response. Remove any 500/error response fields that referenced AI.
- [x] **R.4** Update the receipt card UI: show **ORDER THIS** and **SKIP THIS** sections (each with dish rows + counts). Remove **THE VIBE** section entirely. Remove **HEADS UP** section (or clarify if you want HEADS UP kept with different content — for this refactor assuming we remove it).
- [x] **R.5** Update the frontend types and client logic to consume the new API shape (no `ai`, no single `dishes`; use `order_this` and `skip_this`).
- [x] **R.6** Remove dependencies: uninstall `@anthropic-ai/sdk` and `dotenv` from the project and remove their imports from the codebase.

**Note:** If you want HEADS UP kept (e.g. as a static line or derived from skip_this), say so and we’ll add it to the checklist.

---

## Functionality fixes (ORDER THIS / SKIP THIS)

- [x] **F.1** No dish in both lists: build ORDER THIS first, then build SKIP THIS and filter out any phrase that already appears in ORDER THIS, so a dish never appears in both lists.
- [x] **F.2** Remove all beverages from `DISH_PHRASES`: remove `beer`, `cocktail`, `whiskey`, `wine`, `beer flip`, `pimms cup`, `earl grey`. Keep only food dishes.

---

## Claude + Dish search (C.1, C.2)

**Status:** Checklist written. Awaiting your approval before any code changes.

### C.1 — Bring back Claude API for intelligent dish extraction

- [x] **C.1.1** Re-add `@anthropic-ai/sdk` dependency and ensure `ANTHROPIC_API_KEY` is in `.env.local` (document in todo; do not commit `.env.local`).
- [x] **C.1.2** Remove the hardcoded `DISH_PHRASES` list entirely from the API route.
- [x] **C.1.3** Send the top 50 reviews (by usefulness or order) to Claude with the exact prompt specified (including context/specificity: e.g. "the roast chicken was dry" → extract "roast chicken" as negative, not "chicken"). See implementation for full prompt text.
- [x] **C.1.4** Parse Claude’s JSON response; build **ORDER THIS** from all dishes where `sentiment === "positive"`, sorted by count (desc). Build **SKIP THIS** from dishes where `sentiment === "negative"`, then filter out any dish that already appears in ORDER THIS.
- [x] **C.1.5** Handle Claude errors or missing key: fall back to empty ORDER THIS / SKIP THIS (or a simple fallback) so the app still returns a valid response.

### C.2 — Add dish search mode

- [x] **C.2.1** Add a toggle on the search page: **"Restaurant"** vs **"Dish"** (e.g. segmented control or tabs).
- [x] **C.2.2** In **Dish** mode: user types a dish name (e.g. "fish and chips"); app searches across ALL restaurants for that dish.
- [x] **C.2.3** Backend: support dish-search mode (e.g. query param `search=dish` and `dish=fish+and+chips`). **No Claude API call** — pure data search. Options: (a) Search across all restaurants’ reviews for the dish phrase, count mentions in 4–5 star reviews only, return restaurants where count > 0, ranked by count; or (b) Search only over cached per-restaurant ORDER THIS data (restaurants previously loaded via restaurant search). Implement one approach so dish search is deterministic and does not invoke Claude.
- [x] **C.2.4** Each dish-search result shows: restaurant name, address, stars, and the dish mention count. Tapping a result shows the full receipt card for that restaurant (same as current restaurant search; may require loading that restaurant’s receipt via existing API with `business_id`).
- [x] **C.2.5** Ensure API and UI support both flows: restaurant search (current) and dish search (new), with clear param/state handling.

---

## Fixes: Claude extraction + tab behavior

- [x] **Fix 1** Restaurant search returns "No dishes stood out" — Claude dish extraction not working. Check terminal logs and fix why `getClaudeDishes` returns empty. Add server-side logging to log exactly what Claude returns (raw response and parsed dishes).
- [x] **Fix 2** Search box + tab behavior: when user switches between Restaurant and Dish tabs, clear the search input but keep the last results visible for the current tab. Each tab remembers its own last results independently (restaurant results for Restaurant tab, dish results for Dish tab). Switching tabs shows empty search box and the previous results for that tab.

---

## D.1 — Split dish extraction into two steps

**Status:** Checklist written. Awaiting your approval before any code changes.

- [x] **D.1.1 Step 1 — Claude identifies dish names only (small job):**
  - Send Claude only **30 reviews** (not 20, not 50).
  - Ask Claude to return **only a list of dish names** — no sentiment, no counts.
  - Prompt (exact): *"Read these restaurant reviews and list every specific food dish mentioned. Return ONLY a JSON array of dish names, no other text, no markdown: [\"dish one\", \"dish two\", \"dish three\"]. Food only, no drinks, maximum 15 dishes, be specific (e.g. 'roast chicken' not 'chicken')."*
  - Response will be very short (just a JSON array of strings).
- [x] **D.1.2 Step 2 — Code counts across ALL reviews (no AI):**
  - Take the dish names Claude returned.
  - Search **ALL** reviews for that restaurant (e.g. all 2,577 for Dandelion).
  - Count mentions in **4–5 star** reviews → **ORDER THIS** (sort by count, show top 4).
  - Count mentions in **1–2 star** reviews → **SKIP THIS** (exclude any dish already in ORDER THIS; sort by count, show top 4).
  - No second Claude call; counts are accurate over full review set.

---

## Bug fixes (current)

- [x] **B.1** **Rabbit and Rabbit Pie as separate dishes** — Claude returns variations of the same dish as separate entries. Fix deduplication to also catch when one dish name is a substring of another (e.g. "rabbit" and "rabbit pie" should be merged into the more specific one "rabbit pie"). Keep the most specific version, drop the generic one.
- [x] **B.2** **Tab memory** — Dish tab should always show dish results; restaurant tab should always show restaurant results, regardless of how you got there. When a restaurant receipt loads from a dish-search tap, store it in restaurant tab memory AND switch to restaurant tab. When you go back to dish tab it should show the dish results you had before, not the restaurant receipt.

---

## Consolidated Fixes (CF)

- [ ] **CF.1 — Filter search to restaurants only**  
  Filter all business search results to only return businesses whose `categories` string in `nyc_businesses.csv` contains at least one food/restaurant-related keyword. Use this keyword list (case-insensitive, substring match): `"restaurant"`, `"food"`, `"cafe"`, `"coffee"`, `"bar"`, `"pub"`, `"pizza"`, `"sushi"`, `"burger"`, `"diner"`, `"bistro"`, `"grill"`, `"kitchen"`, `"eatery"`, `"bakery"`, `"bbq"`, `"steakhouse"`, `"seafood"`, `"taco"`, `"sandwich"`, `"deli"`, `"brewery"`, `"taproom"`, `"brasserie"`, `"chophouse"`. Any business without any of these terms in its categories should be excluded from all search results.

- [ ] **CF.2 — Error message position**  
  Move the `"No results for '[name]'"` error message from below the search bar to directly below the `"What's good here?"` headline, using DM Sans Regular 14px, white text. The search bar itself should have no error text near it.

- [ ] **CF.3 — Search bar placeholder text**  
  Change the bottom search bar placeholder from `"Looking for the best dish..."` to `"What restaurant are you at?"`. Preserve the `"Search other restaurant"` placeholder variant when a receipt card is currently visible.

- [ ] **CF.4 — Remove idle subtext**  
  Remove the existing idle subtext copy entirely. Replace it with:  
  _"Welcome to my personal crusade against reading through reviews to figure out what to eat at a restaurant. Just type the name of a restaurant you're curious about and we'll skim the reviews and show you the dishes people can't stop mentioning in a nifty little list. Hope you enjoy!"_  
  Style: DM Sans Regular, 14px, white at 80% opacity, centered, 24px horizontal margin. Show this only in the idle/empty state.

- [ ] **CF.5 — Search bar position**  
  Raise the bottom search bar slightly so it sits around the bottom 10% of the viewport height rather than hugging the very bottom edge, providing more breathing room above the home indicator. Keep safe-area insets respected on mobile and preserve keyboard-aware behavior.

- [ ] **CF.6 — Torn paper edges on receipt card (SVG)**  
  Replace the current CSS pseudo-element torn effect with explicit SVG-based torn edges. Add an inline SVG at the top and another at the bottom of the receipt card wrapper, each ~16px tall, full card width, filled with `#FFFFFF`, with an irregular zigzag path that varies between 4–12px in height. Use different zigzag patterns for top vs bottom. Position the top SVG just above the card content with a slight negative margin to overlap; position the bottom SVG just below the card content similarly.

- [ ] **CF.7 — Previous search pills row**  
  When a receipt card is visible, render a horizontally scrollable row of pills at the very top of the screen (16px from the top safe area). Each pill shows the restaurant name; most recent search is leftmost. Tapping a pill loads that restaurant's receipt instantly from an in-memory session cache (no API or Claude call). Maintain a `SearchHistory` array (max 10). Pill styling: background `rgba(255,255,255,0.2)`, border `rgba(255,255,255,0.4)`, white text, DM Sans Regular 13px, height 32px, horizontal padding 14px, 8px gap between pills, and 20px left padding for the row. Hide the row when no searches have been made yet.

- [ ] **CF.8 — Loading state: receipt printing animation**  
  Replace the current dashed-box loader with a receipt-printing animation. When loading a fresh search (not from cache), show a white receipt card that feeds upward from the bottom of the screen like a thermal printer: content is already on the card, revealed bottom-to-top using `clip-path` or `max-height` animation over ~1.2–1.5 seconds with slightly mechanical easing. Reveal order during the feed: Blacklist skeleton rows first, then A-List skeleton rows, then star rating + review count, then restaurant name + address last, followed by a subtle snap/settle animation. Add two audio files to `/public/sounds/`: `printer.mp3` (short looping printer sound during feed) and `tear.mp3` (paper tear sound at the end). Use an `HTMLAudioElement` and only play sounds if the user has already interacted with the page (e.g. tapped or typed). When loading from a cached pill, show the receipt instantly with no animation or sound.

- [ ] **CF.9 — Fix Fish and Chips missing from A-List**  
  Investigate why "Fish and Chips" is no longer appearing as the top A-List item for The Dandelion. Inspect the Claude dish-name extraction and deduplication logic for regressions and add targeted logging (for that business) to output the raw list of dish names returned by Claude and the post-deduplication list so we can see whether the phrase is being dropped or renamed.

- [ ] **CF.10 — Error State A: partial matches**  
  When the API returns multiple matching restaurants for a query, show error state A below the headline: _"We couldn't find what you were looking for, did you mean:"_ followed by a bulleted list of up to 3 matches. Each bullet should use a white filled circle and the restaurant name in DM Sans Regular 16px white. Tapping a name loads that restaurant's receipt (one API call using `business_id`). Keep the blue gradient background and bottom-pinned search bar.

- [ ] **CF.11 — Error State B: no match with cuisine suggestions**  
  When no restaurant matches the query at all, show error state B below the headline: _"Sorry, we couldn't find that restaurant. We do have these though:"_ followed by up to 3 suggestions chosen via cuisine keyword matching on the query:  
  - `pizza`, `italian`, `pasta` → top-rated Italian restaurants  
  - `sushi`, `japanese`, `ramen` → Japanese  
  - `burger`, `american`, `wings` → American  
  - `tacos`, `mexican`, `burrito` → Mexican  
  - `chinese`, `dim sum`, `dumpling` → Chinese  
  - `indian`, `curry` → Indian  
  If no keyword matches, show the top 3 highest-rated restaurants overall. Render each suggestion as `"• Restaurant Name (★ 4.5)"` in DM Sans Regular 16px white, and tapping loads that restaurant's receipt. Background and search bar remain as in the normal state.

- [ ] **CF.12 — Security audit (consolidated)**  
  Before committing consolidated fixes, run a quick security audit: confirm `ANTHROPIC_API_KEY` only appears in the server-side `app/api/search/route.ts`, `.env.local` remains in `.gitignore`, no secrets or API keys are referenced in client components or shipped to the browser, and input sanitization in the API route still holds after any search-related changes.

- [ ] **CF.13 — Update `dev.md` and `steps.md`**  
  Document all consolidated fixes implemented in this pass: add notes in `dev.md` for any temporary or non-final pieces (e.g. audio assets, skeleton loaders, or SVG torn edges) and append concise entries to `steps.md` describing each CF item (or cohesive batch) completed.

### Follow-up fixes (implement after CF.1–CF.13)

- [ ] **Loading animation direction** — Flip the receipt-printing loader. Receipt should feed **downward from the top**, not upward from the bottom. The card starts with height 0 at the top of the content area and grows downward as paper feeds out. Content reveals **top to bottom** in this order: restaurant name/address first, then star rating + review count, then The A-List with skeleton rows, then The Blacklist with skeleton rows last.

- [ ] **Torn paper SVG edges (two fixes)** — (a) Ensure fill color is **#FFFFFF** (not blue/dark). (b) The tears are currently inverted: the jagged zigzag edge on the **top** SVG should face **downward** into the card, and the jagged edge on the **bottom** SVG should face **upward** into the card. Flip both SVGs 180° so the torn edges connect naturally to the white card surface.

- [ ] **Fish and Chips missing from A-List (The Dandelion)** — Add server-side logging in the API route to show exactly what dish names Claude returns (and the post-deduplication list) so we can see why "Fish and Chips" keeps disappearing. Check if deduplication is incorrectly removing it.

- [ ] **Headline "What's good here?"** — Change to **left-aligned** to match the body text below it.

- [ ] **CF.14 — Claude consistency fix** — In `getClaudeDishNames` in `app/api/search/route.ts`: (1) Ensure **temperature is set to 0** in the Claude API call so the same reviews always produce the same dish names. (2) Add **server-side caching**: if the same `business_id` has already been analyzed by Claude in this server session, return the cached dish names instead of calling Claude again. This fixes both inconsistency and saves API costs on repeat searches.

### Five fixes (next batch)

- [x] **Headline alignment** — Revert "What's good here?" back to **centered** (`text-center`). The "personal crusade" body text below stays left-aligned. Only the headline should be centered.

- [x] **Loading animation blank screen gap** — The receipt feeds down correctly but disappears leaving a blank screen before results appear. Fix the transition so results appear **immediately** when loading completes with zero gap — no blank screen between loader ending and receipt card showing.

- [x] **Torn edges orientation** — The jagged points need to face **inward** toward the card. **Top edge:** jagged points face **down** into the card. **Bottom edge:** jagged points face **up** into the card. Currently still facing the wrong direction.

- [x] **Receipt border radius** — Remove all rounding on the receipt card. Change `border-radius` from 12px to **0**. Save the 12px value in a code comment so we can revert later if needed.

- [x] **Fish and Chips missing** — The per-session Claude cache may have locked in a bad result from an earlier inconsistent call. **Clear the cache** and re-run a Dandelion search. Check terminal logs to see what Claude returned as dish names. Do **not** hardcode "fish and chips" into a fallback list — just clear the cache and check the logs.

### Four fixes (next batch)

- [x] **Loading animation complete rethink** — The receipt should physically feed **downward** like paper from a printer: **top edge fixed**, **bottom edge grows down** (card gets taller over time). Implement with **height animation from 0 to full height**, overflow hidden on a wrapper; content inside is already at full height — only the wrapper height animates. Duration 1.2s, slightly mechanical easing. The receipt must **not** disappear after the animation — it stays visible and transitions directly into the real receipt card result with **no gap and no blank screen**.

- [x] **Torn edges** — Add **rotate-180** back to **both** top and bottom torn-edge SVGs. Remove border-radius **completely** from the receipt card (0px; ensure no rounded corners). Use **negative margins** on the torn-edge SVGs so they overlap flush with the card edges — no gap between the jagged edge and the white card surface.

- [ ] **Fish and Chips missing — logs** — Paste the Terminal logs showing what Claude returned for The Dandelion this time so we can see exactly what happened. (User to run search and share logs.)

- [x] **Re-enable per-session cache** — Remove the `claudeDishNamesCache.clear()` line that was added for debugging so the cache is used again after fixing Fish and Chips.

### Four fixes (next batch 2)

- [x] **Top torn edge SVG** — Ensure fill is exactly **#FFFFFF** and add **z-index** so the top torn SVG layers on top of the receipt card and overlaps the top edge cleanly.

- [x] **Previous search pills row** — Align the left edge of the pills to match the left edge of the receipt card and search bar. Use the same horizontal margin as the card.

- [x] **Receipt card padding** — Add 10px more padding at the top and 10px more at the bottom of the receipt card interior (e.g. if current is 20px top/bottom, make it 30px top/bottom).

- [ ] **Fish and Chips still missing from A-List** — Check the Terminal logs and paste exactly what Claude returned for dish names for The Dandelion. Determine whether "fish and chips" is in Claude’s list or being dropped by deduplication. **Note:** The API already logs `getClaudeDishNames: got N dish names: [...]` and `dedupeDishNames: input = ... unique = ...`. Run a Dandelion search and paste those lines from the terminal so we can see if the phrase is missing from Claude or removed by dedupe.

### Two fixes (dedupe + Claude cap)

- [x] **Deduplication logic fix** — When one dish name is a substring of another (e.g. "fish and chips" vs "beer battered fish and chips"), keep whichever dish has **more mentions across all reviews**, not the longer name. So "fish and chips" (424 mentions) can beat "beer battered fish and chips" (fewer mentions). Apply this count-based resolution **after** counting but **before** building the final ORDER THIS list.
- [x] **Claude returning too many dishes** — Prompt says maximum 15 but Claude returned 76. Make the prompt stricter: "Return ONLY the top 10 most frequently mentioned food dishes. Maximum 10 dishes, no exceptions." Also reduce `max_tokens` to 512 since 10 dish names are very short.

### Loading state and receipt animation (complete redesign)

- [x] **Remove skeleton loader** — Remove the skeleton receipt loader entirely. No skeleton, no spinner.
- [x] **Loading: breathing gradient** — During loading, only the headline and the background gradient are visible. The four existing radial gradients animate gently (light breathing / flux): slowly shift their positions and opacity in a subtle loop. Duration 3–4 seconds per cycle, ease-in-out, very gentle — not flashing or strobing.
- [x] **Results: gradient settles, receipt feeds down** — When results arrive: (1) gradient animation stops and settles back to static state. (2) Receipt card feeds downward from the top — wrapper height animates from 0 to full final height over ~1.2s, cubic-bezier(0.32, 0, 0.27, 1). The receipt is fully rendered at correct final size before the animation; only the wrapper height animates, content inside is already laid out.

### Breathing gradient animation (complete rethink)

- [x] **Add white peak** — Add a fifth layer: white/very light blue (rgba(255,255,255,0.6)) centered at top center, creating a bright white peak like light shining through. Always present, not just during loading.
- [x] **Blurred blob layers instead of background-image** — Replace CSS background-image gradients with multiple separate absolutely positioned div elements. Each div is a colored circle with heavy blur (filter: blur 60–80px) that can drift smoothly. Use this for both the static look and the loading animation.
- [x] **Smooth loading animation** — During loading, animate multiple overlapping gradient blobs at different speeds (e.g. 4s, 6s, 8s) so they create organic interference (Aurora Borealis feel). Use smooth continuous movement (transform + opacity), not stepped keyframes. Position drift subtle (10–15%); opacity range more dramatic (0.3 to 0.8). Light waxing and waning, not dark blobs jumping.

### Four fixes (background + pills + Claude)

- [ ] **Background blob animation not working** — Blobs aren’t moving during loading. Debug why CSS animations aren’t applying: verify `gradient-layer--loading` is added in the DOM and that keyframe animations are running. Then make movement much more visible: drift 20–25%, opacity 0.2–0.9, and speed up to 2s/3s/4s durations (Aurora Borealis level).
- [ ] **White peak not visible** — Debug why the white blob isn’t showing. Make it very obvious: opacity 1.0 and size 400px (then we can tone down).
- [ ] **Previous search pill entrance animation** — When a new receipt loads, the new pill should animate in: tiny dot → expands to full pill width with bouncy spring, then restaurant name text fades in (not instant).
- [ ] **Deviled Eggs missing from A-List again** — Clear Claude cache and re-run. Check if per-session cache is locking in bad results again.

---

## Redesign v3 — UI, Layout & UX (this brief)

### 1. Typography & Fonts

- [ ] **V3.1** Replace existing font setup in `app/layout.tsx` with `next/font/google` imports for **DM Sans** and **Poppins** only.
- [ ] **V3.2** Wire CSS variables so that:
  - DM Sans is used for all UI chrome (headline, search bar text/placeholder, previous search pills, error copy).
  - Poppins is used for all receipt content (restaurant name, stats, section headers, dish rows, counts, and inline copy inside the receipt).
- [ ] **V3.3** Remove now-unused heading/body/mono font variables from layout and theme once the new system is in place.

### 2. Global Background & Shell

- [ ] **V3.4** Replace the warm paper background in `app/globals.css` with the fixed soft blue layered radial gradient from the brief (covering full viewport height, non-scrolling).
- [ ] **V3.5** Ensure the app shell is constrained to 390px width, centered on desktop, with the gradient filling the full browser width behind it.
- [ ] **V3.6** Keep (or refine) the subtle grain/noise overlay so it works visually on top of the new gradient without muddying text.

### 3. Core Layout States (Single Restaurant Search Flow)

- [ ] **V3.7** Remove the Restaurant/Dish tab toggle from `app/page.tsx` — the product becomes a single restaurant search flow.
- [ ] **V3.8** Rework top-level layout to support the three states:
  - **Empty state:** gradient + centered "What's good here?" headline + bottom-pinned search bar.
  - **Active search:** same layout, but search bar raised with keyboard (using `visualViewport` or safe-area/keyboard insets).
  - **Results state:** previous search pills row at top, ripped receipt centered, bottom-pinned search bar with updated placeholder.
- [ ] **V3.9** Remove the old hero copy ("PHILLY YELP COMPANION", "Find out what to order before you sit down.") and move the headline into the v3 position/style.

### 4. Search Bar (All States)

- [ ] **V3.10** Implement the bottom-pinned search bar with:
  - 20px horizontal margins, 52px height, 100px radius pill shape.
  - Frosted glass background, border, and 12px backdrop blur matching the brief.
  - DM Sans placeholder/text styling and right-aligned search icon.
- [ ] **V3.11** Wire keyboard-aware positioning so that when focused:
  - The bar moves up above the keyboard with a 12px gap.
  - It respects `env(safe-area-inset-bottom)` on iOS.
- [ ] **V3.12** In results state, update placeholder to "Search other restaurant" and preserve behavior across empty/loading/error/results screens.

### 5. Receipt Card (Ripped Paper Design)

- [ ] **V3.13** Replace the current receipt card with the new white card:
  - Rounded corners, specified padding, and updated typography hierarchy.
  - Centered restaurant name, address, review count line, and "4.0 ★" rating (number + star, dark color only).
- [ ] **V3.14** Implement the **torn/ripped paper** top and bottom edges:
  - Prefer a white PNG overlay for torn edges if available; otherwise, create an SVG path mask for irregular 8–12px variation, applied to both top and bottom.
  - Ensure the torn edges blend cleanly with the blue gradient behind.
- [ ] **V3.15** Rebuild receipt sections to match:
  - "The A-List" / "Upvotes" header row with left/right alignment.
  - "The Blacklist" / "Downvotes" section mirroring A-List.
  - Dish rows using Poppins Medium with left dish name and right count.
  - Thin `#E8E8E8` dividers exactly where specified.
- [ ] **V3.16** Keep underlying ORDER THIS / SKIP THIS data model, but map:
  - ORDER THIS → The A-List (Upvotes).
  - SKIP THIS → The Blacklist (Downvotes).

### 6. Previous Search Pills & Session Cache

- [ ] **V3.17** Introduce a `SearchHistory` React state (max 10 entries) with `{ businessId, name, result }` objects, reset on page reload.
- [ ] **V3.18** Render the previous search pills row:
  - Horizontally scrollable, no visible scrollbar.
  - Most recent search on the left, pills styled per brief.
- [ ] **V3.19** When a pill is tapped:
  - Load the cached result instantaneously without hitting the API or Claude.
  - Update current view state to show that cached receipt.
- [ ] **V3.20** Ensure new successful searches:
  - Prepend to the history array.
  - De-duplicate by `businessId` (move existing pill to the front).

### 7. Error States & Suggestions

- [ ] **V3.21** Implement **Multiple matches** state (Error A):
  - Replace headline area with the specified DM Sans 22px "did you mean" copy.
  - Show up to 3 bullet-pointed restaurant names, tappable to load receipts.
- [ ] **V3.22** Implement **No match** state (Error B) with cuisine-based suggestions:
  - Keyword matching on the raw query for cuisine buckets (pizza/italian, sushi/japanese, burger/american, tacos/mexican, chinese/dim sum/dumpling, indian/curry).
  - If no cuisine match, show top 3 highest-rated restaurants overall.
  - Render suggestions as "• Restaurant Name (★ 4.5)" using DM Sans.
- [ ] **V3.23** Implement **No reviews** visual behavior (Error C):
  - Reuse the receipt card, but show "Not enough reviews yet" in place of A-List dishes (Poppins Regular 13px, #6B6B6B).

### 8. Removing Deprecated UI

- [ ] **V3.24** Hide/remove:
  - Restaurant vs Dish tab toggle and any Dish-search-specific UI.
  - "Search again" button.
  - Any remaining references to THE VIBE / HEADS UP sections.
  - "PHILLY YELP COMPANION" label and old hero subtext.
- [ ] **V3.25** Leave underlying API support for dish search intact but unused in the UI, per brief (no new calls from the redesigned interface).

### 9. Security & Production Readiness (Per Brief)

- [ ] **V3.26** Re-verify the Security Checklist:
  - `.env.local` in `.gitignore`.
  - `ANTHROPIC_API_KEY` used only in the API route.
  - No secrets or env values referenced in client components.
  - Inputs sanitized in the API route (already in place; re-check after refactors).
- [ ] **V3.27** Manually inspect network requests in dev tools to confirm no API keys or sensitive headers are exposed.

### 10. Documentation & Review

- [ ] **V3.28** Update `dev.md` with any temporary code paths or design assets used for the torn receipt or keyboard handling that should be revisited before launch.
- [ ] **V3.29** Keep `steps.md` up to date with a short entry for each cluster of checklist items implemented.
- [ ] **V3.30** Add a **Review** section at the bottom of this file summarizing:
  - What changed in v3 (UI/UX highlights).
  - Any trade-offs or known limitations in the implementation.

---

## Scope boundaries (do not build)

- NYC support / Google Places API  
- Saved favorites  
- Share results  
- "Surprise me"  
- Neighborhood filter  
- Usage/cost tracker  
- User accounts  

---

## Questions for you (if any)

- **Multi-select flow (still relevant?)** For "multiple matches", we currently drive a server call + client pick flow. If we keep multi-select, are you happy with a second API call after the user taps a suggestion, or do you prefer pushing more logic client-side?
- **Dish-search API (unused in v3 UI):** Confirm that we should leave the dish-search API path intact but unused from the new interface (no pills or hidden toggles that hit it).

Once you confirm this redesign checklist, I’ll implement items in small, focused steps and keep `steps.md` and this file in sync as we go.
