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

- [x] **Switch to 5 fully-moving blobs (including white)** — Replace the current 3 blue + (fixed or “peak”) white approach with 5 blobs total. All 5 blobs move during loading (none fixed). Initial colors (from the palette cycle): `#0569FF`, `#2B80FF`, `#5B9DFF`, `#8DBAFF`, `#FFFFFF`. All blobs same size (~340px) and heavy blur (~72px).
- [x] **DVD/screensaver style motion via requestAnimationFrame** — During loading only, move each blob with independent bouncing on the viewport (different speeds and angles). On each bounce, the blob shifts to the next color in the cycle (so every blob continues through the palette).
- [x] **Smooth return on loading end** — When loading finishes, stop the movement loop and smoothly return all blobs to their static resting positions (not snapping). Keep movement slow (cross-screen about 8–12s) and keep drift/angles stable enough to feel organic.

### Four fixes (background + pills + Claude)

- [x] **Background blob animation still not triggering during loading** — Background motion is now driven via `requestAnimationFrame` on `status === "loading"` (so it no longer depends on CSS keyframes). Debug logging remains and can confirm the loading state if needed.
- [x] **Previous search pills disappearing during loading** — Pills row is now rendered whenever `searchHistory.length > 0`, including during loading.
- [x] **Receipt shadow using drop-shadow filter** — Receipt shadow swapped to `filter: drop-shadow(0 8px 24px rgba(0,0,0,0.12))`.
- [x] **Deviled Eggs missing from A-List again** — Claude per-session dish-name cache is cleared in the `/api/search` `GET` handler before each request.

### Two changes (remove blobs + restore cache)

- [x] **Remove all blob background animation, use static background + spinner** — Remove all background blob code entirely: no blob hook/logic, no `gradient-layer` / `gradient-blob` divs in `page.tsx`, no blob CSS in `globals.css`, no `gradient-layer--loading` logic. Keep a simple static blue body background and show a clean centered white spinning circle during loading.
- [x] **Restore Claude session cache behavior** — Remove `claudeDishNamesCache.clear()` from the `/api/search` `GET` handler in `app/api/search/route.ts` so cache persists during a session and repeat searches are consistent.

### Major redesign + backend fix (approval-gated)

> **Gate:** Do not implement any code changes until plan is approved.

- [x] **Step 1 — Fix Claude cache**  
  In `app/api/search/route.ts`, remove the `claudeDishNamesCache.clear()` line from the `GET` handler. Cache should persist during a server session for consistent results.

- [x] **Step 2 — New background**  
  Replace current background entirely. Main viewport wrapper should use:  
  `bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)]`  
  Remove all blob divs/layers and all blob/gradient-layer animation CSS from `globals.css` and `page.tsx`.

- [x] **Step 3 — Install dependencies**  
  Run: `npm install @radix-ui/react-tooltip @radix-ui/react-dialog framer-motion`

- [x] **Step 4 — Add PromptInputBox component**  
  Create `app/components/ui/ai-prompt-box.tsx` and paste the exact component code provided by user.  
  **Done:** Component file added and wired for next steps.

- [x] **Step 5 — Replace search bar with PromptInputBox**  
  Remove current frosted pill search bar from `page.tsx`; import `PromptInputBox`; fix to bottom with 20px horizontal margins and safe-area bottom; apply frosted glass override styles; placeholders: `"What restaurant are you at?"` and `"Search other restaurant"` when receipt is showing; wire `onSend` to existing `runSearch`; preserve mic→send behavior; remove `useKeyboardOffset` hook.

- [x] **Step 6 — Replace bottom-left icons with previous search pills**  
  Inside `PromptInputBox`, replace icon button row + dividers with previous-search pills row using session cache behavior and styling: horizontally scrollable, hidden scrollbar, frosted pills (`rgba(255,255,255,0.2)` bg / `rgba(255,255,255,0.4)` border), white text DM Sans 13px, 32px height, 14px horizontal padding, 8px gap; pill tap loads cached result; no history = show nothing; preserve framer-motion hover animations.

- [x] **Step 7 — Update headline color/contrast**  
  Keep `"What's good here?"` white and add subtle text-shadow if needed for readability on warm gradient.

### Twelve fixes (post-redesign polish)

- [x] **Background full screen** — Gradient currently shows only in 390px column. Make gradient cover full viewport; 390px shell should be transparent. Only outermost full-viewport wrapper gets gradient.
- [x] **Remove paperclip/upload button** — Remove `Paperclip` button and hidden file input from `PromptInputBox` entirely.
- [x] **Search box color** — Set search box to dark style: background `#1F2023`, border `#444444`, text white, placeholder `rgba(255,255,255,0.5)`.
- [x] **Search box margin** — Use 24px horizontal margin from screen edges on fixed bottom wrapper.
- [x] **Pill overflow cut off** — Remove `overflow: hidden` behavior from pills container inside `PromptInputBox` so pills can expand freely on hover.
- [x] **Remove top pills row** — Remove pills row above the receipt card at top of screen permanently.
- [x] **Receipt card margin** — Use 24px horizontal margin on both sides (not edge-to-edge).
- [x] **Receipt shadow subtle** — Use subtle shadow: `filter: drop-shadow(0 4px 12px rgba(0,0,0,0.10))`.
- [x] **Pill skeleton loading state** — On search start, show pill skeleton (32px height, 120px width, shimmer pulse) in pills area above search box; transition to real pill on results.
- [x] **Headline and text 24px margin** — Keep consistent 24px horizontal margin across headline/body text.
- [x] **Background gradient proportions** — Ensure full-screen radial gradient fills naturally: warm orange bottom center blending to peach/pink/lavender/light blue top; avoid squishing/distortion.
- [x] **Move pills above search box** — Remove pills from inside `PromptInputBox`; render separate fixed pills row directly above search box with 8px gap, horizontally scrollable, frosted glass style, white text.

### Seven fixes (cache + UI + history)

- [ ] **Zahav returning no results** — Search `app/api/search/route.ts` for any remaining `claudeDishNamesCache.clear()` calls and remove all of them so cache persists.
- [ ] **Pills color (dark theme)** — Pills above search box should be dark: background `#2A2A2E`, border `#444444`, text white. Remove frosted white styling.
- [ ] **Headline/body text color** — Change `"What's good here?"` to `#1A1A1A` and remove text-shadow. Change personal crusade body text to `#1A1A1A`.
- [ ] **Phone outline preview (temporary)** — Add temporary centered 390px phone-style outline wrapping app content (rounded 40px, border `2px solid rgba(0,0,0,0.3)`), with comment `// REMOVE BEFORE PRODUCTION`.
- [ ] **History persistence** — Ensure search history accumulates up to 10 entries and previous pills remain visible when searching new restaurants.
- [ ] **Loading spinner color** — Set loading spinner to white for contrast.
- [ ] **Background pulse during loading** — Add simple CSS opacity pulse on gradient background during loading only (0.85 ↔ 1.0, 2s ease-in-out). Stop when loading ends. If complex, skip.

### Three fixes (WordLoader + torn edge + spinner cleanup)

- [ ] **Replace loading spinner with WordLoader animation** — Install `gsap` and `@gsap/react`; create `app/lib/utils.ts` with simple `cn` utility; create `app/components/ui/word-loader.tsx` WordLoader component; replace current loading spinner with WordLoader using words: `"skimming reviews"`, `"finding dishes"`, `"counting mentions"`, `"reading opinions"`, `"almost there"`. Style loader text white for gradient contrast.
- [ ] **Bottom jagged edge missing on longer receipts** — Fix bottom torn SVG edge not showing on tall receipts (likely clipping/overflow/positioning issue). Ensure receipt wrapper and torn edge positioning keep bottom edge visible regardless of card height.
- [ ] **Current spinner not animating** — If any spinner remains, fix it or fully remove it and confirm loading state is exclusively WordLoader.

### Five fixes (loader/pills sync + cache debug)

- [x] **Loader text color** — Change `WordLoader` text color from white to `#1A1A1A` to match headline color.
- [x] **Pills lighter gray** — Change pills above search box from background `#2A2A2E` / border `#444444` to background `#3A3A3E` / border `#555555`.
- [x] **Loader text position** — Center `WordLoader` vertically between headline and search box (true center of available content area during loading).
- [x] **Sync loading animations (2s)** — Make pill skeleton shimmer, background gradient pulse, and WordLoader cycle all use a 2s loop so they feel synchronized.
- [x] **Zahav cache debugging logs** — In `app/api/search/route.ts` add logs:  
  `"[api/search] Claude cache size: ${claudeDishNamesCache.size}"` at start of GET, and  
  `"[api/search] Claude cache stored for: ${businessId}"` after cache set.  
  Then run Zahav search and inspect terminal output.

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

---
### Six fixes (slow loaders + styling)

- [x] **1. Slow loading animations** — WordLoader full loop to 5 seconds; shimmer pulse to 3 seconds; background gradient pulse to 4 seconds. Keep everything gentle/slow.
- [x] **2. Word loader position** — Raise it so it sits at the midpoint between the headline and the pills row position (pills row approx 80px above the search box bottom reference).
- [x] **3. Error state styling** — Set `"We found a few places that match"` text color to `#1A1A1A`. Style restaurant option cards to match pill styling: bg `#3A3A3E`, border `#555555`, white text, same border radius as pills.
- [x] **4. Pills less pronounced** — Pills bg `#2A2A2E`, border `#3A3A3E`, text `rgba(255,255,255,0.7)`.
- [x] **5. Remove red border during loading** — In `ai-prompt-box.tsx`, remove any `isLoading && "border-red-500/70"` styling and ensure no border change happens during loading at all.
- [x] **6. Search placeholder during loading** — When `status === "loading"`, pass placeholder `"Searching..."` into `PromptInputBox`.

---
### Revert to frosted glass (white theme)

- [x] **1. Search box frosted glass** — background `rgba(255,255,255,0.2)`, border `rgba(255,255,255,0.3)`, keep `backdrop-blur-[12px]`, placeholder white at `70%` opacity, input text white.
- [x] **2. Microphone/send button contrast** — ensure button reads well on frosted box (prefer white button bg with dark icon).
- [x] **3. Pills frosted glass** — background `rgba(255,255,255,0.2)`, border `rgba(255,255,255,0.3)`, text white.
- [x] **4. All text back to white** — headline “What&apos;s good here?” + personal crusade body text should be `#FFFFFF`.
- [x] **5. Error state cards frosted glass** — multiple-match buttons (and related cards) should use the same frosted glass styling as pills; “We found a few places” heading also white.
- [x] **6. Word loader text** — change loader text back to white.

---
### Four fixes (solid white UI + locked layout)

- [x] **1. Remove frosted glass** — Search box: solid `#FFFFFF` bg, dark text `#1A1A1A`, placeholder `#6B6B6B`, border `rgba(0,0,0,0.1)`. Pills + error state cards: same solid white background + dark text + light border.
- [x] **2. No scroll at all** — Page must never scroll vertically or horizontally. Add `overflow: hidden` to `html` and `body` in `globals.css`, and ensure layout fits within `100vh` without overflow.
- [x] **3. Lock search box** — Search box must never move: keep `position: fixed`, bottom with safe-area padding, left/right anchored.
- [x] **4. Word loader** — Make text `1.5x` bigger than current and make animation `2x` slower (e.g. 5s loop becomes 10s).

---
### Five fixes (search box + send button)

- [x] **1. Search box position** — Raise it: bottom padding approx `32px + safe-area inset`.
- [x] **2. Search box styling** — background `rgba(255,255,255,0.8)`, `border: 2px solid white`, `backdrop-blur-[8px]`, text `#1A1A1A`, placeholder `#6B6B6B`.
- [x] **3. Replace microphone with send button** — Remove voice recording entirely (remove `VoiceRecorder`, `isRecording`, `handleStartRecording`, `handleStopRecording`). Replace mic with a send arrow button (ArrowRight) with `#1A1A1A` icon on white circle.
- [x] **4. Remove Square/StopCircle icons** — Since recording is removed, delete unused icon imports/usages (`Square`, `StopCircle`).
- [x] **5. Send button only shows when typing** — When `input` is empty, right side of search box is empty. When user types, send button fades in smoothly.

---
### Four fixes (scrollable middle + compact search)

- [x] **1. Scrollable middle content area** — Content between headline and pills/search should be independently scrollable. Headline and the “We found a few places” text stays fixed at top. Pills row and search box stay fixed at bottom (higher z-index). Only the list of restaurant cards scrolls. Implement with `overflow-y: auto` on a middle content div with a fixed height filling the space between top content and bottom fixed area; items should scroll behind the bottom fixed area.
- [x] **2. Search box compact height** — Reduce search box to hug its content. Single-line input + send button side-by-side in the same row. Remove extra bottom padding reserved for the icon row. Box ~52px tall when empty, expand naturally if text wraps.
- [x] **3. Send button inline** — Send button must be on the same row as the text input (right-aligned inside that row), not a separate row below.
- [x] **4. Bottom fade mask** — Add subtle gradient fade at the bottom of the scrollable area just above the pills row so list items fade out as they approach the fixed bottom area.

---
### Two fixes (phantom space + list height)

- [x] **1. Remove phantom space below search box** — In neutral/idle state, eliminate extra white space appearing below the fixed bottom search box. Remove any padding/margin/min-height affecting the fixed bottom wrapper or PromptInputBox in idle so only safe-area padding remains.
- [x] **2. Fix scrollable list height** — In list states, set the middle scrollable content height to hard-cut at ~360px (4.5 cards * ~80px). Use fixed height + `overflow: hidden`/`overflow-y: auto` so it cuts off cleanly without bleeding into pills/search area.

---
### Four fixes (section labels + spacing + dock + sort)

- [x] **1. Add section labels in `app/page.tsx`** — Add comments: `{/* HEADER SECTION */}`, `{/* CONTENT SECTION */}`, `{/* DOCK */}` above their respective wrappers.
- [x] **2. Dock position** — Increase dock bottom padding to `56px + safe-area inset`.
- [x] **3. Global headline spacing** — Add `mb-6` to the header in HEADER SECTION.
- [x] **4. Send button alignment** — Align send button to vertical center of initial single-line input and keep it 8px from right edge.
- [x] **5. Multiple matches sort order** — In API route, sort multiple business matches by `review_count` descending before returning.

---
### Two small fixes (idle text + loading input)

- [x] **1. Idle body text alignment** — Center align the personal crusade body text in idle state (`text-center`).
- [x] **2. Loading typing behavior** — During loading, keep input enabled for type-ahead, but disable send button (50% opacity, non-clickable). Re-enable send when loading ends and text exists.

---
### Multiple-matches header grouping (subtitle spacing)

- [x] **1. Subtitle belongs to section 1** — In multiple-matches state, treat `"We found a few places..."` as part of the header block (section 1), with `mb-4` (16px) between headline and subtitle and `mt-8` (32px) between subtitle and the scrollable list.

---
### Zahav "no dishes stood out" investigation

- [x] **1. Diagnose only (no UI changes)** — Investigate why searching `"Zahav"` returns empty A-List/Blacklist despite 3000+ reviews: verify business lookup in CSV, verify 30-review sample assembly + Claude request payload, inspect Claude dish names returned, and validate mention counting against full reviews (including case/whitespace normalization). Report findings before any code changes.

---
### Zahav "no dishes" fix (truncation + parse fallback)

- [x] **1. Increase Claude output budget + fallback parser** — In `getClaudeDishNames()`, increase `max_tokens` from `512` to `1024`. If `JSON.parse()` fails on Claude text, attempt fallback extraction by parsing a JSON array substring from the first `[` to the last complete `]`; if fallback still fails, log and return `null`.

---
### Results spacing below receipt

- [x] **1. Add receipt-to-dock gap in results** — In results state, enforce a 32px gap (`mb-8`) between the bottom of the receipt card and the pills/dock area.

---
### Results clearance + loading headline alignment

- [x] **1. Fix results/dock overlap + loading headline position** — Ensure results section has reliable 32px clearance below the receipt before the fixed dock starts, prevent pills from overlapping receipt by increasing results scroll-area bottom padding (`pb-32` or equivalent), and keep headline top-aligned (`pt-8`) in loading and all non-receipt states (idle/multiple/error), with headline hidden only when receipt is shown.

---
### Results-state dock flow (not fixed)

- [x] **1. Make results dock in-flow** — In results/receipt state only, render pills + search in normal document flow after the receipt (not fixed): receipt → `mb-8` → pills row → `mb-4` → search box → bottom `pb-8`. Keep dock fixed-bottom behavior for idle/loading/multiple/error states.

---
### Results dock motion + Safari bottom clearance

- [x] **1. Remove dock slide in results** — In results state, remove any dock position/translate animation behavior so pills + search appear in place with no movement when receipt results render.
- [x] **2. Add adaptive Safari bottom padding in results scroll** — On the results scroll container, use `padding-bottom: calc(env(safe-area-inset-bottom) + 130px)` so the search box clears mobile Safari browser UI; should degrade gracefully when inset is `0`.

---
### Multiple list centering + results padding tweak

- [x] **1. Multiple matches equidistant spacing** — In multiple-matches state, make the scrollable list container sit equidistant between section 1 and section 3 by adding 32px above and below (`my-8` or equivalent).
- [x] **2. Results bottom padding reduction** — Change results scroll-container bottom padding from `calc(env(safe-area-inset-bottom) + 130px)` to `calc(env(safe-area-inset-bottom) + 65px)`.

---
### Multiple-list fade mask rewrite

- [x] **1. Replace overlay fades with container mask-image** — Remove current top/bottom overlay fade implementation and apply a single `mask-image: linear-gradient(...)` on the multiple-matches scroll container itself. Drive mask state from scroll position: top (`bottom-only` fade), bottom (`top-only` fade), middle (`both` fades), with soft gradients.

---
### Multiple-list fade intensity tuning

- [x] **1. Soften edge fade + shrink fade zone** — Reduce multiple-matches mask fade zones to ~40px on top/bottom edges and make the gradient subtler so more cards remain clearly visible.

---
### Four fixes (outline + status bar + results scroll + spacing)

- [x] **1. Remove phone outline border** — Delete the temporary rounded phone frame wrapper (`rounded-[40px] border-2 ...`, marked REMOVE BEFORE PRODUCTION) from `app/layout.tsx`.
- [x] **2. Fix status bar color on mobile** — Apply gradient background color to `html` and set `theme-color` metadata to `#483E65` so iPhone top/bottom safe areas blend with the gradient.
- [x] **3. Enable vertical scroll in results state** — Allow full-page vertical scroll when receipt is showing so user can reach search box below receipt; keep overflow hidden for non-results states.
- [x] **4. Receipt spacing** — Ensure 32px gap above receipt and 32px gap between receipt bottom and dock/search area.

---
### Four fixes (status bar + results scroll + PWA + global cache)

- [x] **1. Fix mobile status bar blending** — Set `theme-color` meta to `#483E65`. Set `html` and `body` background color to `#483E65` in `globals.css`. Ensure gradient wrapper starts at viewport top with no margin/padding so top gradient blends at status bar edge.
- [x] **2. Fix mobile results scroll flow** — Ensure results state can scroll to dock: `overflow-y-auto` on main when `hasResultCard`, content exceeds viewport height, dock in document flow (not fixed) in results state. Structure should be receipt → 32px gap → pills row → search box, all scrollable.
- [x] **3. Set up PWA meta tags + manifest** — Add head/meta config (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style=black-translucent`, viewport with `viewport-fit=cover`) and link manifest. Add `public/manifest.json` with requested fields/colors.
- [x] **4. Claude cache persistence via globalThis** — Use `globalThis` storage for Claude cache so it persists across dev HMR restarts.

---
### Two fixes (search text color + results bottom padding)

- [ ] **1. Search box text colors** — In `ai-prompt-box.tsx`, set placeholder color to `rgba(255,255,255,0.6)` and input text color to `#FFFFFF` for all placeholder states.
- [x] **1. Search box text colors** — In `ai-prompt-box.tsx`, set placeholder color to `rgba(255,255,255,0.6)` and input text color to `#FFFFFF` for all placeholder states.
- [x] **2. Bottom scroll padding in results state** — Add extra bottom padding (~80px) to scrollable main in results state so dock/search remains fully visible with ~56px space below at scroll end.

---
### Three fixes (dock/pills alignment + safe area colors)

- [x] **1. Search box and pills width alignment** — Make dock search box + pills row match receipt card horizontal edges exactly (same 24px shell padding alignment).
- [x] **2. Pills border radius** — Change previous-search pills to `rounded-full` for fully pill-shaped corners.
- [x] **3. Bottom safe area color blend** — Use `html` linear-gradient so top blends with `#483E65` and bottom safe area blends with `#FFE483`.

---
### Several fixes (dock margins + bottom bar + multiple layout + 32px gaps)

- [x] **1. Dock margins in all states** — Ensure search box + pills always have 24px horizontal margins (`px-6`) in idle/loading/results (no edge-to-edge in non-results).
- [x] **2. Force yellow bottom safe area** — Add fixed bottom overlay with height `env(safe-area-inset-bottom)` and background `#FFE483` so bottom safe area is yellow.
- [x] **3. Fix multiple-matches layout** — Keep headline at top; 32px below headline for subtitle; scrollable list in middle with fixed 4.5-card height (~360px); 32px gap between list and dock; dock fixed bottom with 24px side margins; in this state top area should use start alignment.
- [x] **4. Global 32px section gaps** — Enforce 32px between major sections (headline→content and content→dock) across states via shared layout rules, not ad-hoc per-state spacing.
