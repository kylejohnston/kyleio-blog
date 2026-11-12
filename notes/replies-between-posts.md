# Replies between posts: proposal

Captured 2026-11-11, revised the same day after reviewing the reference posts.

**Status:** phases 1 and 2 implemented (section 7). Lists, CLI and the T1/T2 comparison remain. Scope is **self-replies only**: a post can reply to an earlier post on this site, and a chain of replies forms a thread. Replies are full posts (same schema, title and description required). Reply status is a frontmatter field, not a tag; `TAGS` and the tag colors stay unchanged.

Outbound replies (to other people's blogs) and inbound replies (Webmentions) are out of scope. The data model is chosen so both can be added later without migrating content.

## 0. References and what each contributes

| Source | Pattern | Taken here |
|---|---|---|
| **marcel.io** (thread on iPhone Duo) | Every post in a thread has its own URL. That URL renders the **whole thread**, positioned on the requested post, older entries above, newer below, joined by a vertical rail. In lists, a reply's header carries `↩ {thread title}` on the right. | The core model: the post page *is* the thread view (section 3). The list marker shows the thread's title, not a count (section 4, mode A). |
| **Thomas Rigby** (reply to Ashur Cabrera) | A `reply` layout with `origin_title` / `origin_author` / `origin_url` frontmatter and an "eyebrow" above the `h1`: *A reply to "Title" by Author*. Credits Ashur with adding "an indicator to relevant posts to show it's part of a series or an ongoing conversation". | The eyebrow, for replies shown outside their thread (featured block, RSS, branch replies). The frontmatter shape informs the future outbound variant of `inReplyTo`. |
| **Ashur Cabrera / multiline.co** | The clipped homepage shows a normal entry; the reply UI itself isn't in the clip. | Nothing beyond what Thomas describes. Worth re-clipping the original "Adding UI for replies between blogs" post if its list indicator differs from Marcel's. |

The structural difference from Marcel's site: his thread entries are untitled micro-posts. Posts here are titled, often long, sometimes with galleries. That drives the main design decision in section 3.

## 1. Content model

One new optional field in `src/content.config.ts`:

```ts
import { defineCollection, reference, z } from 'astro:content';

schema: z.object({
  // ...existing fields
  inReplyTo: reference('posts').optional(),
})
```

Frontmatter in a reply:

```yaml
---
title: Liquid glass, six months later
description: Revisiting the public-bathroom argument after living with it.
pubDate: 2026-11-20T09:00:00-05:00
tags: ['post']
inReplyTo: public-bathrooms-and-liquid-glass
---
```

Decisions:

- **Single parent, stored on the child.** The child names its parent; the parent never lists its children. Children are derived at build time. Replying never requires editing an old post.
- **`reference('posts')` over `z.string()`.** It types the value as `{ collection, id }` and documents intent. Astro 7 also reports a reference to a missing entry during content sync. It can't know the thread rules (published parent, date order, no pages), so the site validates those (section 2).
- **Name matches the microformat.** `inReplyTo` maps to `u-in-reply-to`. Outbound replies later widen it to `z.union([reference('posts'), z.object({ url: z.url(), title: z.string(), author: z.string().optional() })])` — the same three facts Thomas stores as `origin_url` / `origin_title` / `origin_author`, nested under one key. Existing replies stay valid.
- **The thread title is the root post's title.** Marcel's `↩ A couple of opinions about the iPhone Duo` is the thread's first post. No separate field until threads drift in topic enough to need one.
- **A thread is a tree, rendered as a list.** Two posts can reply to the same parent. Data allows branching; the UI flattens it chronologically. Forbidding branches buys nothing and costs a rule to enforce.

## 2. Thread index: `src/lib/threads.ts`

All reply logic lives in one module. It takes the already-filtered post list (drafts are handled upstream by `getPublishedPosts()`) and returns lookup maps.

```ts
import type { CollectionEntry } from 'astro:content';
type Post = CollectionEntry<'posts'>;

export interface ThreadIndex {
  parentOf: Map<string, Post>;      // child id -> parent
  childrenOf: Map<string, Post[]>;  // parent id -> direct replies, by pubDate
  rootOf: Map<string, Post>;        // any id in a thread -> root post
  threads: Map<string, Post[]>;     // root id -> every post in thread, by pubDate (threads of 2+ only)
}

export function buildThreadIndex(posts: Post[]): ThreadIndex
export function threadFor(index: ThreadIndex, id: string): Post[] | undefined
export function lastActivity(thread: Post[]): Date  // max(tendDate ?? pubDate)
```

Validation runs inside `buildThreadIndex` and throws, failing `astro build` and surfacing in `astro dev`:

| Rule | Why |
|---|---|
| Parent id exists in the post list | Catches typos and renamed slugs. Because the list is pre-filtered, this also catches a published reply to a draft parent in production. |
| `child.pubDate > parent.pubDate` | Makes cycles impossible without a cycle check. Replies cannot predate what they answer. |
| Parent is not tagged `page` | About/Now/Links are pinned outside the date-sorted lists; threading them breaks ordering in both list modes. Lift the rule if a real need appears. |

Thread order uses `pubDate`, not `tendDate`: tending an old post must not reorder the conversation. List placement (section 4) uses `tendDate ?? pubDate`, consistent with `sortByDate()`.

No caching. With ~45 posts the index builds in microseconds, and a module-level cache would go stale in `astro dev` when frontmatter changes.

## 3. The post page is the thread: `src/pages/p/[...slug].astro`

Following Marcel: `/p/{id}` for any post in a thread renders the whole thread, positioned on `{id}`. There is no separate thread route; every member URL is a view of the same conversation with a different focus. Posts outside any thread render exactly as today.

### 3a. Layout

```
  ┆  ▸ Public bathrooms and liquid glass          Sep 2026     ← older: collapsed
  ┆    Description line…
  ┆
  ●  Liquid glass, six months later               Nov 2026     ← focused: h1, full body
  ┆  Full content…
  ┆
  ┆  A coda on frosted UI                         Dec 2026     ← newer: h2, full body
  ┆  Full content…
```

- A dotted vertical rail (`border-left: 2px dotted var(--lighter)`, the same treatment as `article hr`) joins the entries. It plays the role of Marcel's avatar line in the site's existing vocabulary.
- The focused entry gets the `h1`, the page `<title>`, OG tags, description, and the `id` hooks the dev editor uses. Other entries use `h2` and link their title to their own URL, which re-focuses the thread on them.
- `<link rel="canonical">` stays on each URL (already the case via `Layout.astro`).

### 3b. How the focused post gets on screen

This is the one decision Marcel's site doesn't settle for long, titled posts.

**Option T1 — Marcel-faithful.** Render every entry in full, in order. Put the focused entry in view with a few lines of inline script placed directly after it (`document.getElementById(id).scrollIntoView({ block: 'start' })`), running during parse, before images below finish loading.

- Pro: the thread reads as one continuous document from any entry.
- Con: an older learning log above the focused post can be several thousand pixels tall; the page opens mid-scroll and the scrollbar position says so. Images above without intrinsic dimensions can shift the focused post after the jump (Astro's `<Image>` sets width/height, plain markdown images don't). Every member page carries the full text of every other member.

**Option T2 — collapsed context above (recommended).** Older entries render as `<details>`: the summary row is title · date · description; the full body is pre-rendered inside and expands without JavaScript. The focused entry and everything newer render in full.

- Pro: the focused post sits near the top with no scroll script and no layout shift. Reading downward is the natural direction — context is optional, continuation isn't. Works with JavaScript off and in reader modes.
- Con: departs from Marcel's fully-expanded look for older entries. Newer entries' full text still appears on older members' pages (acceptable for a personal site; canonical tags point at each post's own URL).

T2 is recommended because the posts here are long-form. If threads end up being short updates (closer to Marcel's use), T1 is a small change: drop the `<details>` wrapper and add the scroll line.

### 3c. Eyebrow

Thomas's pattern, adapted for self-replies:

```
↩ A reply to "Public bathrooms and liquid glass"
```

Inside the thread view the parent is usually the entry directly above, so the eyebrow is redundant there. Show it:

- on an entry whose parent is **not** the entry directly above (a branch reply);
- in the homepage featured block when the newest post is a reply;
- at the top of the item in RSS (section 5).

The link carries `class="u-in-reply-to"` at no cost, keeping the outbound/Webmention path open.

### 3d. Implementation notes

- `getStaticPaths` builds the thread index once and passes `thread` (array or `undefined`) and `focusIndex` as props.
- Render bodies with `await Promise.all(thread.map(p => render(p)))`. MDX components (`Gallery`, `YouTube`) work as they do today.
- The dev-only editor stays bound to the focused post: keep `#view-mode`, `#edit-mode` and the `slug` var on the focused entry only.
- The copy-code script already runs over every `pre` on the page; no change.
- Extract the per-entry markup into `src/components/ThreadEntry.astro` (props: `post`, `Content`, `variant: 'context' | 'focused' | 'continued'`, `showEyebrow`) so the page file stays readable.

## 4. Post lists: two modes to compare

Lists are rendered in three places with three copies of the same row markup: `RecentPosts.astro`, `p/[...page].astro`, `t/[tag].astro` (the tag page omits the tags column). Both list modes change that markup, so the first step is a refactor with no visual change:

- **Extract `src/components/PostRow.astro`** with props `post`, `showTags` (default `true`), and `thread` (optional `{ root: Post; count: number; isReply: boolean }`). All three lists use it.

Then one switch in `src/consts.ts`:

```ts
export const REPLY_LIST_MODE: 'inline' | 'collapsed' = 'inline';
```

and one helper in `src/lib/threads.ts`, called by every list after sorting and filtering:

```ts
export function prepareList(posts: Post[], index: ThreadIndex, mode: typeof REPLY_LIST_MODE): ListItem[]
// ListItem = { post: Post; thread?: { root: Post; count: number; isReply: boolean } }
```

Flipping the constant switches every list on the site. Build both, look at them with real content, delete the losing branch of `prepareList`.

Because the post page already shows the thread, the row needs no separate thread destination: the title link lands on the thread focused on that post.

### Mode A: inline with marker (Marcel's list behavior)

Every post keeps its own row in date order. A reply gets a second line under its row naming the thread, linking to the root post (the thread from the start):

```
Liquid glass, six months later ·················· post · Nov 2026
  ↩ Public bathrooms and liquid glass
```

- The row is a single-line grid (`grid-template-columns: auto minmax(0, 1fr) auto auto auto`, titles `nowrap` with ellipsis). The marker is a sibling element with `grid-column: 1 / -1`, so the existing columns are untouched.
- It's the only reply signal that survives on mobile: the tags and date columns are `hidden sm:block`, the marker line isn't.
- Root posts get no marker. Their replies are visible in the thread once opened; adding a count to roots is a cheap later addition if discovery from the root proves weak.
- Compact alternative if two-line rows look too busy: `↩` alone in the tags cell, with the thread title in `aria-label` and `title`. Loses the mobile signal.

Strength: nothing disappears; chronology is honest; matches the reference. Weakness: an active thread can fill the homepage's five EXPLORE slots.

### Mode B: collapsed into thread

One row per thread. The representative is the **newest** post in the thread; its position is the thread's `lastActivity`. The marker line shows the count:

```
A coda on frosted UI ···························· post · Dec 2026
  ↩ Public bathrooms and liquid glass · 3 posts
```

With T2, landing on the newest post shows the earlier entries collapsed above it — the full thread is one click from the list.

Rules that need deciding up front:

- **Collapse within the filtered set.** On `/t/til`, only posts tagged `til` are candidates; a thread whose members are all `post` doesn't appear. A mixed-tag thread shows its newest *matching* member. Collapsing before filtering would put a `post` row on the TIL page.
- **Pagination counts rows, not posts.** `/p` page size stays 32 rows.
- **Tag counts (`Tags.astro`) stay uncollapsed.** They count posts.
- **Featured block on the homepage** picks from the uncollapsed list (it's one post, not a list). If it's a reply, it shows the eyebrow from 3c.

Strength: homepage stays varied. Weakness: older replies are only reachable through the thread; "Everything" is no longer literally everything.

### How to compare

Neither mode can be judged with zero threads. Before building the list UI, write one real three-post thread (or three `draft: true` posts, visible in `astro dev`). Judge on the homepage first: the five-slot limit is where the modes differ most.

## 5. RSS: `src/pages/rss.xml.ts`

Every reply is its own feed item in both list modes; feeds are chronological by nature, and readers don't see the thread view. Prepend the eyebrow to the item content:

```html
<p><em>↩ A reply to <a href="https://kyleio.com/p/{parent}/">"{parent title}"</a></em></p>
```

The feed loop already absolutizes URLs and appends a footer; this is a string prepend next to `getRssFooter`. Build the thread index once before the loop rather than looking up parents per item.

## 6. Admin CLI: `scripts/admin.ts`

- `post:create`: after tag selection, ask "Reply to an existing post?" (confirm). If yes, show a select of published, non-`page` posts sorted newest first, and write the chosen id to `inReplyTo`. Default the selection to the most recent post that is already in a thread, since continuing a thread is the common case.
- Add `inReplyTo?: string` to `PostFrontmatter` in `scripts/lib/posts.ts`.
- Optional: `post:reply` command that skips the confirm and goes straight to the parent picker.

The CLI reads frontmatter with gray-matter, not through Astro, so it can't use the thread index. A plain filter on `getAllPosts()` is enough for the picker; validation stays in the build.

## 7. Phasing

Each phase ships on its own and leaves the site coherent.

1. **Data.** *(done)* Schema field, `src/lib/threads.ts` with validation, RSS eyebrow. No page changes yet; the build now fails on a broken `inReplyTo`.
2. **Thread view.** *(done)* `ThreadView.astro` (wraps the focused post; renders the slot unchanged outside threads), `ThreadEntry.astro`, `ReplyEyebrow.astro`, thread rendering on `[...slug].astro` (T2), rail styling, eyebrow on branch replies and the featured block. Lists unchanged. This is the feature: a reply is discoverable from any post in its thread.
3. **List refactor.** Extract `PostRow.astro`. No visual change; verify by diffing built HTML before and after.
4. **List modes.** `REPLY_LIST_MODE`, `prepareList`, marker line. Write a real thread, compare, delete the losing mode.
5. **CLI.** Reply prompt in `post:create`.

If phase 4 turns out not to be worth it, phases 1–2 alone are complete.

## 8. Open questions

- **T1 or T2.** Recommended T2. Decide after rendering one real thread both ways; the switch is the `<details>` wrapper plus one script line.
- **Marker glyph.** `↩` matches Marcel and reads as "reply" universally. The site's own vocabulary is manicules (☞ ☜ ☟); `☜` ("points back to") is the on-brand candidate. Mock both on the marker line.
- **Does a reply's `tendDate` bump the thread?** Proposed: yes for list placement (`lastActivity` uses `tendDate ?? pubDate`), no for order within the thread. Confirm this matches how "Tended" is meant on the site.
- **Branch rendering.** Flattened chronological with an eyebrow on branch replies. If branches become common, indent them on the rail; don't build that before a real branch exists.

## Later: outbound and inbound

Recorded so phase 1 doesn't close doors.

- **Outbound** (replying to other blogs): widen `inReplyTo` to the union in section 1. External parents render Thomas's eyebrow with title, author and link, wrapped in `h-cite`. They have no thread view (the parent isn't on this site) unless the reply itself gets self-replies, in which case the reply is the thread root and carries its external eyebrow.
- **Inbound** (others replying here): `h-entry` markup on `[...slug].astro`, a `<link rel="webmention">` endpoint (webmention.io), and a live collection in `src/live.config.ts` alongside the Raindrop loader, rendered via a server island like `LinksUpdated`. The Cloudflare adapter is already in place for on-demand rendering.
