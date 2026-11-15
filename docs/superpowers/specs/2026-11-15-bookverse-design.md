# BookVerse prototype — design

Date: 2026-11-15 · Status: awaiting approval

Lines marked **(call)** are the designer's choices, not things the family decided. Everything else comes from the BookVerse v1.0 proposal or the conversation.

## Intent

Chris, a student at the American School of Madrid (ASM), wants a reading community where students discover books, share reviews, and celebrate readers on the 20th of each month. The outcome that matters is a student finding their next favourite book because another student recommended it, not the prize itself.

This document covers the **prototype only**: a demo Chris can show to classmates, parents and the ASM librarians, using fictional data. A pilot with real students is a separate, later project.

## Goals

- Chris can walk someone through the whole experience on a phone, tablet or laptop: find a book, shelve it, review it, ask the AI Librarian for a suggestion, and watch an award ceremony.
- The demo is safe to show anywhere: no accounts, no real student data, nothing to leak.
- The later pilot can add a database and sign-in without rewriting the screens.

## Non-goals (prototype)

- Real accounts, school login, parental consent flows.
- Any connection to ASM's library system beyond an outbound link.
- Student-to-student messaging, public profiles, public leaderboards.
- Reading clubs and reading challenges (proposed as later features).
- A server-side scheduler; languages other than English.

## Anti-goals

- The AI choosing or publishing a winner without an adult approving it.
- A winner decided by page count or reading speed.
- The AI writing a review for a student to submit as their own.
- Any real child's name, review or reading record reaching a server or an AI provider.

## Constraints

- Audience is aged 8–13; in Spain, consent-based processing for under-14s needs a parent or guardian. The prototype avoids the question by holding no personal data.
- ASM uses Follett Destiny Discover for its catalogue. Whether it also has Destiny Engage (reviews, challenges, badges) is unverified and worth asking the librarian before the pilot.
- BookVerse complements the school library; it does not replace it.

## Approaches considered

| Approach | Trade-off |
|---|---|
| **A. Demo-only** — sample data ships with the site, changes are saved in the browser, one small server route for AI | Smallest build; nothing to leak; the database is added at pilot time |
| B. Real backend from day one — database and sign-in now, with fictional data | Pilot becomes an extension, but most of the extra work is invisible in a demo |
| C. Clickable mock-up with no working AI | Cheapest, but does not show the idea's most distinctive part |

**Chosen: A**, picked in conversation. It matches the "no real student data" rule, and the pilot is already planned as its own project with stricter checks.

## What gets built

### Stack **(call)**

Next.js (App Router) with TypeScript and Tailwind CSS, deployed on Vercel. Claude, called from the server only, for the AI features. The proposal named an OpenAI service; either provider's rules for under-18 users must be checked before a real pilot.

### Data

- **Catalogue:** about 40 real, age-appropriate books across six genres, stored as a file in the repository. Each has title, author, genre, age band (8–10 or 11–13), a short description written for BookVerse, and tags. **(call)**
- **Covers:** generated in the page from title, author and a genre colour; no cover images are downloaded or hot-linked. **(call)**
- **Fictional community:** about ten made-up readers with pseudonyms and avatars, each with seeded reviews and shelf history, so the site feels alive.
- **The visitor:** one demo reader who picks a pseudonym and avatar from preset lists. There is no free-text name field, so a real name cannot be entered. **(call)**
- **Saving changes:** the visitor's shelf, reviews and moderation decisions are kept in the browser's local storage. A "Reset demo" control restores the starting state. **(call)**
- **Swap point:** screens read and write through one data module. The pilot replaces what is behind that module with a database; screens do not change. **(call)**

### Screens

| Screen | What it does |
|---|---|
| Home | Featured books, latest approved reviews, countdown to the 20th |
| Discover | Search by title or author; filter by genre and age band |
| Book Details | Description, average stars, approved reviews, shelf buttons, "Find it in the ASM library" link |
| My Shelf | Want to Read, Reading, Finished; move books between them |
| Reviews | Write a 1–5 star review with thinking prompts ("What was your favourite part?"); see your own reviews and their status |
| AI Librarian | Guided recommendations (below) |
| Awards | This month's ceremony, or the countdown, or a "coming soon" notice; past winners |
| Grown-ups (Moderator) | Approve or reject pending reviews; choose and approve winners; demo date control |

The "Find it in the ASM library" link points at the school's catalogue search for that title. The exact link format is unverified; if a per-title link is not possible it falls back to ASM's Learning Commons page.

The Grown-ups screen has no password in the prototype. It is a labelled demo of what a librarian would see. **(call)**

### Reviews and moderation

A review the visitor writes starts as *pending*. The visitor sees it marked "waiting for a grown-up"; it appears on the book page and Home only after it is approved on the Grown-ups screen. Review text stays in the browser and is never sent to the server or the AI. The thinking prompts are fixed text, not AI. **(call)**

### AI Librarian

Guided choices, not open chat. The student picks one or more genres, a mood, an age band, and optionally a book they liked from the catalogue. The server receives only those picks.

- The server sends the picks and the catalogue to Claude and asks for up to three catalogue books, each with a one-sentence, spoiler-free reason.
- The server discards any book not in the catalogue before replying.
- If the AI is unavailable or no key is configured, a simple rule-based matcher (genre, age band, tags) returns suggestions instead, and the screen works the same. **(call)**
- Basic per-visitor rate limiting on the route. **(call)**

### Monthly awards

Two awards: **Reader of the Month** and **Book of the Month**.

The cycle is worked out from the date each time a page loads, in Madrid time; there is no scheduled job in the prototype. **(call)**

| When | State | Awards screen shows |
|---|---|---|
| 1st–18th | Reading period | Countdown to the 20th |
| 19th to the 20th at 17:00 | Review | "Winners are being confirmed" |
| From the 20th at 17:00, winners approved | Announced | The ceremony |
| From the 20th at 17:00, not approved | Postponed | "Coming soon"; nothing is revealed |

On the Grown-ups screen the adult sees each fictional reader's scores against the proposal's illustrative rubric (thoughtful reviews 40%, consistent effort 30%, helpful participation 20%, exploring new genres 10%) as guidance. Scores for fictional readers are seeded; the adult makes the choice and presses Approve. **(call)**

After choosing winners the adult can press "Draft announcement". Claude writes a short celebratory message from the pseudonym, the book title and the rubric highlights; the adult can edit it before approving. If the AI is unavailable, a fixed template is used. The AI Librarian character delivers the approved message on the Awards screen. This keeps Chris's "the bot announces the winner" while an adult stays in control. **(call)**

A demo date control on the Grown-ups screen lets Chris pretend it is any day of the month, so the ceremony can be shown at any time. **(call)**

### Checks before calling it done

- Automated tests for the award-cycle states (including the postponed case and the Madrid-time boundary), for the recommendation route discarding unknown books, and for the fallback matcher.
- Browser tests at phone and tablet widths covering: search, shelf changes, writing a review and approving it, getting a recommendation, and the ceremony via the date control.
- The AI Librarian and announcement both work with the AI switched off.

## Left to the builder

- The exact book list and the fictional readers.
- Visual theme. Chris decides the look; the builder should show him two or three options early rather than pick one.
- Component structure, test tooling, and the form of the rate limiter.

## Needed before building starts

- **A home for the code.** This document sits in an unrelated repository because it is the only one available to the session that wrote it. BookVerse needs its own empty repository.
- **An AI key** stored in the hosting settings, never in the code. Without it the site still runs on the fallback matcher.

## Later (not this project)

Real accounts, consent, database with per-student access rules, real moderation, a server scheduler for the 20th, reading clubs and challenges, and a conversation with the ASM library team (LSLibrary@asmadrid.es) about Destiny Engage and catalogue linking.
