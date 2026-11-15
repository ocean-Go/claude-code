# BookVerse Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A demo-only reading-community website Chris can show on a phone, tablet or laptop: find a book, shelve it, review it, get an AI recommendation, and watch an adult-approved award ceremony on the 20th.

**Architecture:** A Next.js site whose sample catalogue and fictional community ship in the repository. The visitor's changes are saved in browser local storage behind one async store interface, which the later pilot swaps for a database. Two small server routes call Claude with non-personal inputs only, each with a non-AI fallback.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Vitest, Playwright (`@playwright/test`), `@anthropic-ai/sdk`, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-15-bookverse-design.md` (in the `ocean-go/claude-code` repository, branch `claude/peaceful-keller-3f662m`). Copy it into the BookVerse repository at the same path in Task 1.

**Where this runs:** the root of a new, empty BookVerse repository. All paths below are relative to it. Do not build inside `ocean-go/claude-code`.

## Global Constraints

- No accounts, no sign-in, no real student data. No free-text name field anywhere.
- Review text never leaves the browser. No free text of any kind is sent to a server route or to Claude.
- The AI never chooses or publishes a winner. Nothing is revealed without `approvedAt` set by the Grown-ups screen.
- No page-count or reading-speed ranking anywhere.
- All award timing is evaluated in `Europe/Madrid`. Reveal moment: the 20th at 17:00.
- Every AI feature works with `ANTHROPIC_API_KEY` unset.
- English only. Layouts must work at 390×844 (phone) and 820×1180 (tablet).
- Covers are drawn by the site; no cover images are downloaded or hot-linked.
- The API key lives in environment settings only, never in the repository.
- Model id comes from `BOOKVERSE_MODEL`, default `claude-sonnet-5-5`. Load the `claude-api` skill before writing the SDK calls.

## Review Focus

1. Local storage is unavailable, full, or holds corrupt JSON → the site still renders from seed data and does not crash. (Task 2)
2. A route receives a malformed body, an unknown genre, or an oversized payload → 400 with no model call. (Tasks 8, 10)
3. Claude returns unparseable output, or only books outside the catalogue → the fallback answers. (Task 8)
4. Review text is empty, whitespace-only, over the limit, or contains HTML → rejected or shown as plain text, never rendered as markup. (Task 6)
5. An approval from last month, or a demo date at a month boundary → last month's winners are never shown as this month's. (Tasks 7, 11)

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/types.ts` | All shared types |
| `src/data/books.ts`, `readers.ts`, `seed-reviews.ts`, `past-awards.ts` | Sample catalogue and fictional community |
| `src/lib/store/store.ts` | `BookVerseStore` interface (the swap point) |
| `src/lib/store/local-store.ts` | Local-storage implementation |
| `src/lib/store/use-store.tsx` | React provider and hook |
| `src/lib/awards/cycle.ts` | Award phase from a date |
| `src/lib/awards/rubric.ts` | Weighted rubric total |
| `src/lib/awards/announcement.ts` | Template announcement, shared by route and client |
| `src/lib/recommend/schema.ts` | Request validation |
| `src/lib/recommend/fallback.ts` | Rule-based matcher |
| `src/lib/recommend/claude.ts` | Claude call and output filtering |
| `src/lib/rate-limit.ts` | In-memory per-IP limiter |
| `src/lib/asm.ts` | ASM library link |
| `src/app/api/recommend/route.ts`, `src/app/api/announcement/route.ts` | Server routes |
| `src/app/(site)/…` | Pages: `/`, `/discover`, `/books/[id]`, `/shelf`, `/reviews`, `/librarian`, `/awards`, `/grown-ups`, `/themes` |
| `src/components/` | `NavBar`, `BookCover`, `StarRating`, `ReviewCard`, `Countdown`, `ProfilePicker` |
| `e2e/` | Playwright specs |

---

### Task 1: Project, types and sample data

**Files:**
- Create: project scaffold, `src/lib/types.ts`, `src/data/books.ts`, `src/data/readers.ts`, `src/data/seed-reviews.ts`, `src/data/past-awards.ts`, `docs/superpowers/specs/2026-11-15-bookverse-design.md`
- Test: `src/data/data.test.ts`

**Interfaces — Produces:**

```ts
export type Genre = 'fantasy' | 'adventure' | 'mystery' | 'funny' | 'science-fiction' | 'real-life';
export type Mood = 'exciting' | 'funny' | 'cozy' | 'spooky' | 'thoughtful';
export type AgeBand = '8-10' | '11-13';
export type ShelfStatus = 'want' | 'reading' | 'finished';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export interface Book { id: string; title: string; author: string; genre: Genre; ageBand: AgeBand; moods: Mood[]; tags: string[]; description: string; }
export interface Rubric { reviews: number; effort: number; participation: number; exploring: number; } // each 0–100
export interface Reader { id: string; pseudonym: string; avatar: string; rubric: Rubric; }
export interface Review { id: string; bookId: string; readerId: string; stars: 1|2|3|4|5; text: string; status: ReviewStatus; createdAt: string; }
export interface Profile { pseudonym: string; avatar: string; }
export interface AwardDecision { monthKey: string; readerId: string; bookId: string; announcement: string; approvedAt: string | null; }
export const VISITOR_ID = 'visitor';
export const GENRES: Genre[]; export const MOODS: Mood[]; export const AGE_BANDS: AgeBand[];
// data
export const BOOKS: Book[];            // exactly 40
export const READERS: Reader[];        // exactly 10 fictional readers
export const SEED_REVIEWS: Review[];   // all status 'approved'
export const PAST_AWARDS: AwardDecision[]; // two earlier months, approvedAt set
export const PSEUDONYMS: string[];     // 12 presets for the visitor
export const AVATARS: string[];        // 12 emoji
```

- [ ] **Step 1:** Scaffold with `npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --no-import-alias`; add Vitest (`vitest`, `jsdom`, `@testing-library/react`) with an `npm test` script, and `@playwright/test` with an `npm run e2e` script and two projects: `phone` (390×844) and `tablet` (820×1180). Playwright's `webServer` runs `npm run dev` with `ANTHROPIC_API_KEY` explicitly empty.
- [ ] **Step 2: Write the failing test** `src/data/data.test.ts`:

```ts
test('catalogue shape', () => {
  expect(BOOKS).toHaveLength(40);
  expect(new Set(BOOKS.map(b => b.id)).size).toBe(40);
  for (const g of GENRES) expect(BOOKS.filter(b => b.genre === g).length).toBeGreaterThanOrEqual(5);
  for (const a of AGE_BANDS) expect(BOOKS.filter(b => b.ageBand === a).length).toBeGreaterThanOrEqual(15);
  for (const b of BOOKS) { expect(b.moods.length).toBeGreaterThan(0); expect(b.description.length).toBeLessThanOrEqual(400); }
});
test('community refers only to things that exist', () => {
  expect(READERS).toHaveLength(10);
  const bookIds = new Set(BOOKS.map(b => b.id)), readerIds = new Set(READERS.map(r => r.id));
  for (const r of SEED_REVIEWS) { expect(bookIds.has(r.bookId)).toBe(true); expect(readerIds.has(r.readerId)).toBe(true); expect(r.status).toBe('approved'); }
  expect(SEED_REVIEWS.length).toBeGreaterThanOrEqual(30);
  for (const a of PAST_AWARDS) { expect(readerIds.has(a.readerId)).toBe(true); expect(bookIds.has(a.bookId)).toBe(true); expect(a.approvedAt).not.toBeNull(); }
  expect(PSEUDONYMS).toHaveLength(12); expect(AVATARS).toHaveLength(12);
});
```

- [ ] **Step 3:** Run `npm test` — expect FAIL (modules missing).
- [ ] **Step 4:** Write the types and data. Books: real, well-known, age-appropriate titles; descriptions written fresh, spoiler-free. Readers and visitor pseudonyms are invented handles (e.g. "StarFox", "PageDragon"), never real-sounding full names. Seed reviews read like children wrote them and are dated within the current and previous month relative to build time using fixed ISO strings.
- [ ] **Step 5:** Run `npm test` — expect PASS. Copy the spec into `docs/superpowers/specs/`.
- [ ] **Step 6:** Commit: `feat: scaffold project with sample catalogue and community`.

---

### Task 2: The store (swap point)

**Files:**
- Create: `src/lib/store/store.ts`, `src/lib/store/local-store.ts`, `src/lib/store/use-store.tsx`
- Test: `src/lib/store/local-store.test.ts`

**Interfaces — Consumes:** types and data from Task 1.

**Produces:**

```ts
export interface BookVerseStore {
  getProfile(): Promise<Profile | null>;
  setProfile(p: Profile): Promise<void>;
  getShelf(): Promise<Record<string, ShelfStatus>>;
  setShelf(bookId: string, status: ShelfStatus | null): Promise<void>;
  listReviews(): Promise<Review[]>;                       // seed + visitor's, newest first
  addReview(input: { bookId: string; stars: 1|2|3|4|5; text: string }): Promise<Review>; // status 'pending', readerId VISITOR_ID
  setReviewStatus(id: string, status: 'approved' | 'rejected'): Promise<void>;
  getAwardDecision(monthKey: string): Promise<AwardDecision | null>;  // checks saved decisions, then PAST_AWARDS
  saveAwardDecision(d: AwardDecision): Promise<void>;
  getDemoNow(): Promise<string | null>;
  setDemoNow(iso: string | null): Promise<void>;
  reset(): Promise<void>;
}
export function createLocalStore(storage?: Storage): BookVerseStore;  // local-store.ts
export const REVIEW_MAX_LENGTH = 1000;
export function StoreProvider(props: { children: React.ReactNode }): JSX.Element;  // use-store.tsx
export function useStore(): BookVerseStore;
export function useNow(): Date;   // demo date if set, else real time; re-renders each minute
```

- [ ] **Step 1: Write the failing tests** (use an in-memory `Storage` stub):

```ts
test('visitor review starts pending and can be approved', async () => {
  const s = createLocalStore(mem());
  const r = await s.addReview({ bookId: BOOKS[0].id, stars: 4, text: 'Loved the dragon.' });
  expect(r.status).toBe('pending'); expect(r.readerId).toBe(VISITOR_ID);
  await s.setReviewStatus(r.id, 'approved');
  expect((await s.listReviews()).find(x => x.id === r.id)!.status).toBe('approved');
});
test('rejects bad review text', async () => {
  const s = createLocalStore(mem());
  await expect(s.addReview({ bookId: BOOKS[0].id, stars: 3, text: '   ' })).rejects.toThrow();
  await expect(s.addReview({ bookId: BOOKS[0].id, stars: 3, text: 'x'.repeat(1001) })).rejects.toThrow();
  await expect(s.addReview({ bookId: 'nope', stars: 3, text: 'ok' })).rejects.toThrow();
});
test('shelf set and clear', async () => { /* setShelf(id,'reading') then null → key absent */ });
test('corrupt storage falls back to seed data', async () => {
  const m = mem(); m.setItem('bookverse:v1', '{not json');
  const s = createLocalStore(m);
  expect((await s.listReviews()).length).toBe(SEED_REVIEWS.length);
  expect(await s.getProfile()).toBeNull();
});
test('storage that throws on write does not crash', async () => { /* setItem throws → setShelf resolves, getShelf reflects in-memory value */ });
test('reset restores the starting state', async () => { /* add review + shelf + demoNow, reset(), all gone */ });
test('award decision lookup falls back to past awards', async () => { /* getAwardDecision(PAST_AWARDS[0].monthKey) returns it; unknown month → null */ });
```

- [ ] **Step 2:** Run `npm test` — expect FAIL.
- [ ] **Step 3:** Implement. All state lives under the single key `bookverse:v1`; keep an in-memory copy so failed writes do not lose the session. `createLocalStore()` with no argument uses `window.localStorage` when available, otherwise memory only.
- [ ] **Step 4:** Run `npm test` — expect PASS.
- [ ] **Step 5:** Commit: `feat: add local store behind the BookVerseStore interface`.

---

### Task 3: Shell, navigation, covers and theme choice

**Files:**
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/NavBar.tsx`, `src/components/BookCover.tsx`, `src/components/ProfilePicker.tsx`, `src/app/(site)/themes/page.tsx`
- Test: `e2e/shell.spec.ts`

**Interfaces — Consumes:** `StoreProvider`, `useStore`, `PSEUDONYMS`, `AVATARS`.

**Produces:**
- `<BookCover book={Book} size="sm" | "md" | "lg" />` — drawn with CSS/SVG from title, author and a per-genre colour.
- `<NavBar />` — links: Home, Discover, My Shelf, Reviews, AI Librarian, Awards; a smaller "Grown-ups" link. Bottom tab bar on phone, top bar from tablet width.
- `<ProfilePicker />` — shown as a first-visit dialog when `getProfile()` is null; two preset grids, no text input.
- Theme tokens as CSS variables on `:root[data-theme="…"]`: three themes named `space`, `forest`, `sunny`. `layout.tsx` sets `data-theme` from the constant `ACTIVE_THEME` in `src/lib/theme.ts` (default `'space'`).

- [ ] **Step 1: Write the failing e2e** `e2e/shell.spec.ts`: first visit shows the profile picker with no `input[type=text]`; choosing a pseudonym and avatar closes it and it stays closed after reload; every nav link reaches a page with a matching `h1`; `/themes` shows the same sample card in all three themes; no horizontal scroll at either viewport (`document.documentElement.scrollWidth <= innerWidth`).
- [ ] **Step 2:** Run `npm run e2e -- --trace off e2e/shell.spec.ts` — expect FAIL.
- [ ] **Step 3:** Implement. Stub each page with its `h1` only.
- [ ] **Step 4:** Run the e2e — expect PASS.
- [ ] **Step 5: Human checkpoint.** Send Chris screenshots of `/themes` at phone width and ask which he wants. Set `ACTIVE_THEME` to his choice. Do not wait on this to continue; `space` stays until he answers.
- [ ] **Step 6:** Commit: `feat: add app shell, generated covers and theme options`.

---

### Task 4: Discover and Book Details

**Files:**
- Create: `src/app/(site)/discover/page.tsx`, `src/app/(site)/books/[id]/page.tsx`, `src/lib/search.ts`, `src/lib/asm.ts`, `src/components/StarRating.tsx`, `src/components/ReviewCard.tsx`
- Test: `src/lib/search.test.ts`, `e2e/discover.spec.ts`

**Produces:**

```ts
export function searchBooks(books: Book[], q: { text?: string; genre?: Genre; ageBand?: AgeBand }): Book[]; // case- and accent-insensitive match on title or author; sorted by title
export function averageStars(reviews: Review[], bookId: string): { average: number | null; count: number }; // approved only; average to one decimal
export const ASM_LEARNING_COMMONS_URL = 'https://www.asmadrid.org/school-life/learning-commons';
export function asmLinkFor(book: Book): string;
```

- [ ] **Step 1: Write the failing unit tests:** text `"potter"` finds by title and `"ROWLING"` by author; genre + ageBand combine with AND; empty query returns all 40; a query matching nothing returns `[]`; `averageStars` ignores pending and rejected reviews and returns `{ average: null, count: 0 }` when none.
- [ ] **Step 2: Write the failing e2e:** typing in search narrows the grid; a nonsense query shows "No books found — try another word"; opening a book shows description, stars, approved reviews, three shelf buttons and a link named "Find it in the ASM library" that opens in a new tab; `/books/unknown` shows a friendly not-found page.
- [ ] **Step 3:** Run both — expect FAIL.
- [ ] **Step 4:** Implement. For `asmLinkFor`: check whether ASM's Destiny Discover catalogue accepts a public per-title search link. If it does, build that link with the title URL-encoded; if not, or if it cannot be confirmed, return `ASM_LEARNING_COMMONS_URL`. Record which in a comment and in the README.
- [ ] **Step 5:** Run both — expect PASS.
- [ ] **Step 6:** Commit: `feat: add Discover and Book Details`.

---

### Task 5: My Shelf

**Files:**
- Create: `src/app/(site)/shelf/page.tsx`
- Modify: `src/app/(site)/books/[id]/page.tsx` (wire shelf buttons)
- Test: `e2e/shelf.spec.ts`

- [ ] **Step 1: Write the failing e2e:** from a book page choose "Want to Read" → the book is under that heading on `/shelf`; move it to "Reading" then "Finished"; remove it; state survives reload; an empty shelf shows "Your shelf is empty — find a book in Discover" with a link.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement three sections (Want to Read, Reading, Finished) using `getShelf`/`setShelf`.
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit: `feat: add My Shelf`.

---

### Task 6: Reviews and the moderation queue

**Files:**
- Create: `src/app/(site)/reviews/page.tsx`, `src/app/(site)/grown-ups/page.tsx`, `src/components/ReviewForm.tsx`
- Test: `e2e/reviews.spec.ts`

**Produces:** `<ReviewForm bookId?: string />`; a "Reviews waiting" section on `/grown-ups` with Approve and Reject per pending review.

- [ ] **Step 1: Write the failing e2e:**
  - The form offers a book picker, 1–5 stars, a text area with a live count against 1000, and three fixed prompts: "What was your favourite part?", "Who would enjoy this book?", "What surprised you?".
  - Submitting empty or whitespace-only text shows "Write a few words first"; text over 1000 characters cannot be submitted.
  - A submitted review appears under "My reviews" marked "Waiting for a grown-up" and is **not** on the book page.
  - After Approve on `/grown-ups` it is on the book page and no longer in the queue; after Reject it shows "Not published" to the visitor and never appears on the book page.
  - A review containing `<b>hi</b><img src=x onerror=alert(1)>` is displayed as that literal text and no dialog fires.
  - While the review is submitted, no network request leaves the page (assert with `page.on('request')` filtered to non-asset requests).
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement. Render review text as plain text only.
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit: `feat: add reviews with adult approval`.

---

### Task 7: Award cycle logic

**Files:**
- Create: `src/lib/awards/cycle.ts`, `src/lib/awards/rubric.ts`
- Test: `src/lib/awards/cycle.test.ts`, `src/lib/awards/rubric.test.ts`

**Produces:**

```ts
export type AwardPhase = 'reading' | 'review' | 'announced' | 'postponed';
export function monthKey(now: Date): string;                       // 'YYYY-MM' in Europe/Madrid
export function getAwardPhase(now: Date, approved: boolean): AwardPhase;
export function revealAt(now: Date): Date;                         // the 20th 17:00 Madrid of now's Madrid month
export function nextRevealAt(now: Date): Date;                     // this month's if still ahead, else next month's
export function rubricTotal(r: Rubric): number;                    // round(0.4*reviews + 0.3*effort + 0.2*participation + 0.1*exploring)
```

- [ ] **Step 1: Write the failing tests:**

```ts
const at = (iso: string) => new Date(iso);
test.each([
  ['2026-11-01T00:30:00Z', false, 'reading'],
  ['2026-11-18T22:59:59Z', false, 'reading'],    // 18th 23:59:59 Madrid
  ['2026-11-18T23:00:00Z', false, 'review'],     // 19th 00:00 Madrid
  ['2026-11-20T15:59:59Z', true,  'review'],     // 16:59:59 Madrid (winter, UTC+1)
  ['2026-11-20T16:00:00Z', true,  'announced'],
  ['2026-11-20T16:00:00Z', false, 'postponed'],
  ['2026-11-30T22:59:59Z', true,  'announced'],
  ['2026-11-30T23:00:00Z', true,  'reading'],    // 1 Dec 00:00 Madrid
  ['2026-07-20T14:59:59Z', true,  'review'],     // summer, UTC+2
  ['2026-07-20T15:00:00Z', true,  'announced'],
])('%s approved=%s → %s', (iso, approved, phase) => expect(getAwardPhase(at(iso), approved)).toBe(phase));
test('monthKey uses Madrid time', () => {
  expect(monthKey(at('2026-11-30T23:30:00Z'))).toBe('2026-12');
  expect(monthKey(at('2026-12-31T23:30:00Z'))).toBe('2027-01');
});
test('nextRevealAt', () => {
  expect(nextRevealAt(at('2026-11-15T12:00:00Z')).toISOString()).toBe('2026-11-20T16:00:00.000Z');
  expect(nextRevealAt(at('2026-11-21T12:00:00Z')).toISOString()).toBe('2026-12-20T16:00:00.000Z');
});
test('rubricTotal', () => expect(rubricTotal({ reviews: 90, effort: 80, participation: 70, exploring: 60 })).toBe(80));
```

- [ ] **Step 2:** Run `npm test` — expect FAIL.
- [ ] **Step 3:** Implement with `Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', … }).formatToParts`; no date library.
- [ ] **Step 4:** Run `npm test` — expect PASS.
- [ ] **Step 5:** Commit: `feat: add award cycle and rubric logic`.

---

### Task 8: Recommendation service

**Files:**
- Create: `src/lib/recommend/schema.ts`, `src/lib/recommend/fallback.ts`, `src/lib/recommend/claude.ts`, `src/lib/rate-limit.ts`, `src/app/api/recommend/route.ts`
- Test: `src/lib/recommend/*.test.ts`, `src/lib/rate-limit.test.ts`, `src/app/api/recommend/route.test.ts`

**Produces:**

```ts
export interface Picks { genres: Genre[]; mood: Mood; ageBand: AgeBand; likedBookId?: string; }
export interface Recommendation { bookId: string; reason: string; }
export function parsePicks(body: unknown): Picks | null;   // genres 1–3 unique known values; known mood and ageBand; likedBookId must be in BOOKS; no extra keys
export function fallbackRecommend(picks: Picks, books: Book[]): Recommendation[];
export function filterRecommendations(raw: unknown, picks: Picks, books: Book[]): Recommendation[]; // keeps ≤3 with known bookId, not the liked book, reason trimmed to ≤200 chars, no duplicates
export async function claudeRecommend(picks: Picks, books: Book[]): Promise<Recommendation[]>;       // throws on any failure
export function createRateLimiter(limit: number, windowMs: number): (key: string, now?: number) => boolean; // true = allowed
```

Route contract — `POST /api/recommend`:
- Body over 2 KB or `parsePicks` null → `400 { error: 'bad-request' }`, no model call.
- More than 10 requests per minute per IP → `429 { error: 'slow-down' }`.
- Otherwise `200 { source: 'ai' | 'fallback', recommendations: Recommendation[] }` with 1–3 items. `source` is `'fallback'` when the key is unset, `claudeRecommend` throws, takes over 8 seconds, or filtering leaves zero items.

Fallback algorithm: keep books in `picks.ageBand`, drop `likedBookId`; score = 3 if genre is picked + 2 if `picks.mood` is in `book.moods` + 1 per tag shared with the liked book; sort by score descending then title; take 3. Reason copy: `"A ${mood} ${genre} story — a good match for what you picked."` If all scores are 0, still return the first 3 by title with reason `"Something different to try."`

- [ ] **Step 1: Write the failing tests:**
  - `parsePicks`: accepts a valid body; rejects empty genres, four genres, duplicate genres, unknown genre, unknown mood, unknown `likedBookId`, an extra key such as `name`, a non-object.
  - `fallbackRecommend`: every result is in the age band; never returns the liked book; a picked-genre book outranks a non-picked one; returns exactly 3 for every genre × age band combination; is deterministic.
  - `filterRecommendations`: drops unknown ids, the liked book, and duplicates; caps at 3; trims a 500-character reason to 200; returns `[]` for `null`, a string, and `{ recommendations: 'x' }`.
  - Rate limiter: 10 allowed, 11th refused, allowed again after the window.
  - Route (mock `claudeRecommend`): no key → `fallback`; mock resolves with two valid books → `ai` with those two; mock throws → `fallback`; mock returns only unknown ids → `fallback`; mock never resolves → `fallback` within the timeout (fake timers); malformed JSON → 400 and the mock was not called.
- [ ] **Step 2:** Run `npm test` — expect FAIL.
- [ ] **Step 3:** Implement. In `claudeRecommend`, send a system prompt that fixes the role (a friendly school librarian for ages 8–13: recommend only from the supplied list, one spoiler-free sentence per book, no questions back) plus the catalogue as `id | title | author | genre | ageBand | moods | tags`, and the picks as JSON. Request structured JSON output of shape `{ recommendations: [{ bookId, reason }] }` and pass the parsed result through `filterRecommendations`. Take the client IP from `x-forwarded-for`, first entry.
- [ ] **Step 4:** Run `npm test` — expect PASS.
- [ ] **Step 5:** Commit: `feat: add recommendation route with fallback matcher`.

---

### Task 9: AI Librarian screen

**Files:**
- Create: `src/app/(site)/librarian/page.tsx`
- Test: `e2e/librarian.spec.ts`

**Consumes:** `POST /api/recommend` contract, `Picks`, `BOOKS`.

- [ ] **Step 1: Write the failing e2e** (runs keyless, so answers come from the fallback): the page has no text input or text area; the visitor picks up to three genres (a fourth cannot be selected), one mood, one age band and optionally a liked book from a dropdown; "Find me a book" is disabled until genre, mood and age band are chosen; the result shows 1–3 book cards with a reason, each linking to its book page; the request body contains only the keys `genres`, `mood`, `ageBand`, `likedBookId`; when the route is forced to fail (`page.route` → 500) the page shows "The librarian is having a rest — try again in a moment" and a retry button.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement as a short guided flow with the librarian character speaking each step.
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit: `feat: add guided AI Librarian`.

---

### Task 10: Grown-ups awards panel, announcement and demo controls

**Files:**
- Create: `src/lib/awards/announcement.ts`, `src/app/api/announcement/route.ts`
- Modify: `src/app/(site)/grown-ups/page.tsx`
- Test: `src/lib/awards/announcement.test.ts`, `src/app/api/announcement/route.test.ts`, `e2e/grown-ups.spec.ts`

**Produces:**

```ts
export function templateAnnouncement(reader: Reader, book: Book, monthKey: string): string; // ≤600 chars, names the pseudonym, the book title and the month in words
```

Route contract — `POST /api/announcement`:
- Body `{ readerId, bookId, monthKey }`; unknown ids, `monthKey` not matching `/^\d{4}-(0[1-9]|1[0-2])$/`, extra keys, or over 1 KB → `400`, no model call. Same rate limit as Task 8.
- The server looks up the pseudonym, title and rubric from seed data itself; nothing else is sent to Claude.
- `200 { source: 'ai' | 'fallback', text: string }`, text ≤600 characters; fallback is `templateAnnouncement` under the same conditions as Task 8.

Grown-ups screen gains:
- **Awards for <month>:** a table of the 10 readers with the four rubric scores and `rubricTotal`, sorted by total, labelled "Guidance only — you decide"; a table of books by `averageStars` then review count; one reader picker and one book picker; "Draft announcement" (fills an editable text area, max 600); "Approve and schedule" (saves with `approvedAt` = now); "Withdraw approval" (sets `approvedAt` null).
- **Demo controls:** a date-and-time picker for "Pretend today is…" with "Back to real time"; "Reset demo" with a confirm step.
- A banner at the top: "Demo — a real version would need a librarian's sign-in."

- [ ] **Step 1: Write the failing unit and route tests:** template contains pseudonym and title and is ≤600 characters; route: keyless → `fallback` equal to the template; mocked AI text of 900 characters is cut to ≤600; unknown `readerId` → 400 with the mock not called; an extra `note` key → 400.
- [ ] **Step 2: Write the failing e2e:** the tables render with 10 readers; no winner is pre-selected; "Approve and schedule" is disabled until a reader, a book and non-empty announcement text exist; after approving and reloading, the choice persists; "Withdraw approval" clears it; setting the demo date changes the month shown in the panel heading; "Reset demo" clears the visitor's review, shelf, decision and demo date.
- [ ] **Step 3:** Run all — expect FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run all — expect PASS.
- [ ] **Step 6:** Commit: `feat: add adult award approval, announcement drafting and demo controls`.

---

### Task 11: Awards screen and Home

**Files:**
- Create: `src/app/(site)/awards/page.tsx`, `src/app/(site)/page.tsx`, `src/components/Countdown.tsx`
- Test: `e2e/awards.spec.ts`, `e2e/home.spec.ts`

**Consumes:** `useNow`, `getAwardPhase`, `monthKey`, `nextRevealAt`, `getAwardDecision`.

Awards screen by phase, for `monthKey(now)`:

| Phase | Shows |
|---|---|
| `reading` | Countdown to `nextRevealAt(now)`; "Keep reading and reviewing!" |
| `review` | "The winners are being confirmed" |
| `announced` | Ceremony: librarian character delivers `decision.announcement`; Reader of the Month (pseudonym, avatar) and Book of the Month (cover, link); a confetti effect that respects `prefers-reduced-motion` |
| `postponed` | "Coming soon — the winners are still being confirmed"; no names, no book |

Below, in every phase: "Past winners" from earlier months with `approvedAt` set. `approved` passed to `getAwardPhase` is `decision?.approvedAt != null` for the current `monthKey` only.

Home: three featured books (fixed ids in `src/data/books.ts`), the five newest approved reviews, and `<Countdown />` — which reads "Winners revealed! See the awards" in `announced`, and otherwise counts down to `nextRevealAt(now)`.

- [ ] **Step 1: Write the failing e2e** (drive time with the demo date control):
  - Demo date the 10th → countdown, no winner names anywhere on the page.
  - The 19th → "being confirmed".
  - The 20th at 17:30 Madrid with nothing approved → "Coming soon", no winner names.
  - Approve a winner, same date → ceremony with the chosen pseudonym, book and announcement text.
  - Move the demo date to the 5th of the following month → countdown again; last month's winner appears only under "Past winners".
  - The 20th at 16:59 Madrid with approval → still "being confirmed".
  - Home shows three featured books, five reviews, none pending, and the countdown.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit: `feat: add Awards ceremony and Home`.

---

### Task 12: Full walkthrough, README and deployment

**Files:**
- Create: `e2e/walkthrough.spec.ts`, `README.md`, `.env.example`

- [ ] **Step 1: Write the walkthrough e2e:** one test that does the whole demo in order — pick a profile, search, open a book, shelve it, write a review, approve it on Grown-ups, get a recommendation, choose and approve winners, set the demo date to the 20th at 17:30, watch the ceremony — and asserts no horizontal scroll on each page.
- [ ] **Step 2:** Run the whole suite on both projects: `npm test && npm run e2e -- --trace off` — expect all PASS with `ANTHROPIC_API_KEY` empty.
- [ ] **Step 3:** With a real key set locally, call `/api/recommend` and `/api/announcement` once each by hand and confirm `source: 'ai'` and sensible, spoiler-free text. Record the result in the PR description; this is the only step that needs the key.
- [ ] **Step 4:** Write `README.md`: what BookVerse is, how to run it, the two environment variables (`ANTHROPIC_API_KEY`, `BOOKVERSE_MODEL`) mirrored in `.env.example`, how to give the demo (including the demo date control and Reset), what the ASM link does, and a "Not in the prototype" list copied from the spec's non-goals.
- [ ] **Step 5:** Deploy a preview to Vercel with the key set in the project's environment settings. Open the preview on a phone-sized viewport and run the walkthrough by hand once.
- [ ] **Step 6:** Commit: `docs: add README and walkthrough test`.
