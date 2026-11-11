# Replies between posts: proposal

Captured 2026-11-11. Scope is **self-replies only**: a post can reply to an earlier post on this site, and a chain of replies forms a thread. Replies are full posts (same schema, title and description required). Reply status is a frontmatter field, not a tag; `TAGS` and the tag colors stay unchanged.

Outbound replies (to other people's blogs) and inbound replies (Webmentions) are out of scope. The data model below is chosen so both can be added later without migrating content.

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

- **Single parent, stored on the child.** The child names its parent; the parent never lists its children. Children are derived at build time. Editing an old post is never required to reply to it.
- **`reference('posts')` over `z.string()`.** It types the value as `{ collection, id }` and documents intent. It does **not** validate that the target exists: Astro only resolves references when `getEntry()` is called. Validation has to be done by the site (section 2).
- **Name matches the microformat.** `inReplyTo` maps to `u-in-reply-to`. When outbound replies arrive, the field widens to `z.union([reference('posts'), z.object({ url: z.url(), title: z.string(), author: z.string().optional() })])`. Existing replies stay valid.
- **A thread is a tree, rendered as a list.** Two posts can reply to the same parent. Data allows branching; the UI flattens it chronologically (section 3). Forbidding branches buys nothing and costs a rule to enforce.

## 2. Thread index: `src/lib/threads.ts`

All reply logic lives in one module that takes the already-filtered post list (so drafts are handled by `getPublishedPosts()` upstream) and returns lookup maps.

```ts
import type { CollectionEntry } from 'astro:content';
type Post = CollectionEntry<'posts'>;

export interface ThreadIndex {
  parentOf: Map<string, Post>;      // child id -> parent
  childrenOf: Map<string, Post[]>;  // parent id -> direct replies, by pubDate
  rootOf: Map<string, string>;      // any id -> root id
  threads: Map<string, Post[]>;     // root id -> every post in thread, by pubDate (only threads with 2+ posts)
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
| Parent is not tagged `page` | About/Now/Links are pinned outside the date-sorted list; threading them breaks ordering in both list modes. Lift the rule if a real need appears. |

Thread order uses `pubDate`, not `tendDate`. Tending an old post must not reorder the conversation. List placement (section 4) uses `tendDate ?? pubDate` to stay consistent with `sortByDate()`.

No caching. With ~45 posts the index is microseconds to build, and a module-level cache would go stale in `astro dev` when frontmatter changes.

## 3. Post page: `src/pages/p/[...slug].astro`

Three additions, all driven by the thread index. `getStaticPaths` builds the index once and passes `parent`, `replies` and `thread` as props.

### 3a. "In reply to" header (on replies)

Above the `<h1>`, a single line in the same register as the existing "NEWEST POST · · ·" label:

```
IN REPLY TO · · · Public bathrooms and liquid glass
```

Below it, the parent's `description` as a short quote. This gives a reader landing on the reply enough context without leaving the page. The link carries `class="u-in-reply-to"` at no cost, keeping the outbound/Webmention path open.

### 3b. Thread block (on any post in a thread of 2+)

At the end of the article, before the "View more" tag link: an ordered list of every post in the thread, using the existing dotted-leader row style. The current post is marked and not linked. Branches (a post whose parent is not the row directly above it) get a small "↳ re: {parent title}" note so the tree is still legible when flattened.

```
THREAD · · · 3 POSTS
  Public bathrooms and liquid glass ·········· Sep 2026
  Liquid glass, six months later ············· Nov 2026   ← you are here
  A coda on frosted UI ······················· Dec 2026
  View the full thread ☞
```

### 3c. Thread page: `src/pages/thread/[id].astro`

The full conversation on one page, each post rendered in full in `pubDate` order, separated by the post header (title, date, permalink). `id` is the root post's id. This is the destination of every reply marker in lists, matching the "click the indicator, see the thread" behavior.

- `getStaticPaths` emits one route per thread with 2+ posts.
- Each post is rendered with `render(post)`; MDX components work as on the post page.
- `<link rel="canonical">` stays on the individual posts. Add `<meta name="robots" content="noindex">` to the thread page so search engines index the posts, not the aggregate. `Layout.astro` needs a `noindex` prop for this.
- Route sits at `/thread/`, not under `/p/`. `/p/[...slug]` is a rest route, and nesting would make route priority the only thing separating `/p/foo/thread` from a post slug.

## 4. Post lists: two modes to compare

Lists are rendered in three places with three copies of the same row markup: `RecentPosts.astro`, `p/[...page].astro`, `t/[tag].astro` (the tag page omits the tags column). Both list modes need to change that markup, so the first step is a refactor with no visual change:

- **Extract `src/components/PostRow.astro`** with props `post`, `showTags` (default `true`), and `thread` (optional `{ rootId, count, isReply }`). All three lists use it.

Then a single switch in `src/consts.ts`:

```ts
export const REPLY_LIST_MODE: 'inline' | 'collapsed' = 'inline';
```

and one helper in `src/lib/threads.ts` that every list calls after sorting and filtering:

```ts
export function prepareList(posts: Post[], index: ThreadIndex, mode: typeof REPLY_LIST_MODE): ListItem[]
// ListItem = { post: Post; thread?: { rootId: string; count: number; isReply: boolean } }
```

Flipping the constant switches every list on the site. Build both, look at them with real content, delete the losing branch of `prepareList`.

### Mode A: inline with marker

Every post keeps its own row in date order. Replies get a marker in the tags cell, styled like a tag so it reuses the existing row grid (`grid-template-columns: auto minmax(0, 1fr) auto auto auto` in `global.css`, no new column):

```
Liquid glass, six months later ·········· post  ↳ 3  · Nov 2026
```

- Title links to the post; marker links to `/thread/{root}` with `aria-label="Reply in a 3-post thread: view thread"`.
- Root posts with replies also get the marker (without `↳`, just the count) so the thread is discoverable from either end.
- On the tag page (no tags column), the marker sits after the title inside the `h3`.

Strength: nothing disappears; chronology is honest. Weakness: an active thread can fill the homepage's five "EXPLORE" slots.

### Mode B: collapsed into thread

One row per thread. The representative is the **newest** post in the thread; its position is the thread's `lastActivity`. The marker shows the count.

```
A coda on frosted UI ···················· post  3 in thread  · Dec 2026
```

Rules that need deciding up front:

- **Collapse within the filtered set.** On `/t/til`, only posts tagged `til` are candidates; a thread whose members are all `post` doesn't appear. A thread with mixed tags shows its newest *matching* member. Collapsing before filtering would put a `post` row on the TIL page.
- **Pagination counts rows, not posts.** `/p` page size stays 32 rows.
- **Tag counts (`Tags.astro`) stay uncollapsed.** They count posts. "posts 18" means 18 posts exist, regardless of list mode.
- **Featured block on the homepage.** "NEWEST POST" picks from the uncollapsed list (it's one post, not a list). If it's a reply, it shows the "IN REPLY TO" line from 3a.

Strength: homepage stays varied. Weakness: older replies are only reachable through the thread; "Everything" is no longer literally everything.

### How to compare

Neither mode can be judged with zero threads. Before building the list UI, write one real three-post thread (or three `draft: true` posts, visible in `astro dev`). Judge on the homepage first: it's where the five-slot limit makes the difference between the modes visible.

## 5. RSS: `src/pages/rss.xml.ts`

Every reply is its own feed item in both list modes; feeds are chronological by nature. Prepend to the item content:

```html
<p><em>In reply to <a href="https://kyleio.com/p/{parent}/">{parent title}</a></em></p>
```

The feed loop already resolves absolute URLs and appends a footer; this is a string prepend next to `getRssFooter`. Pass the thread index into the loop rather than looking up parents per item.

## 6. Admin CLI: `scripts/admin.ts`

- `post:create`: after tag selection, ask "Reply to an existing post?" (confirm). If yes, show a select of published, non-`page` posts sorted newest first and write the chosen id to `inReplyTo`.
- Add `inReplyTo?: string` to `PostFrontmatter` in `scripts/lib/posts.ts`.
- Optional: `post:reply` command that skips the confirm and goes straight to the parent picker.

The CLI reads frontmatter with gray-matter, not through Astro, so it can't use the thread index. A plain filter on `getAllPosts()` is enough for the picker; validation stays in the build.

## 7. Phasing

Each phase ships on its own and leaves the site coherent.

1. **Data + post page.** Schema field, `src/lib/threads.ts` with validation, "In reply to" header, thread block, RSS prepend. Lists unchanged. Replies are fully usable; they just look like normal posts in lists.
2. **Thread page.** `/thread/[id]`, `noindex` prop on `Layout`.
3. **List refactor.** Extract `PostRow.astro`. No visual change; verify by diffing built HTML before/after.
4. **List modes.** `REPLY_LIST_MODE`, `prepareList`, markers. Write a real thread, compare, delete the losing mode.
5. **CLI.** Reply prompt in `post:create`.

Phase 1 is the core. If phase 4 turns out not to be worth it, phases 1–2 alone are a complete feature: threads are discoverable from any post in them.

## 8. Open questions

- **Marker glyph.** The site's vocabulary is manicules (☞ ☜ ☟) and dotted leaders. `↳` reads as "reply" universally; a manicule variant would be more on-brand but less legible as a reply signal. Decide by mocking both in the tags cell.
- **Thread title.** The thread page and Mode B have no thread-level title, only post titles. The root post's title is the default. If threads drift in topic, an optional `threadTitle` on the root is a one-field addition later.
- **Does a reply's `tendDate` bump the thread?** Proposed: yes for list placement (`lastActivity` uses `tendDate ?? pubDate`), no for order within the thread. Confirm this matches how "tended" is meant on the site.
- **Branch rendering.** Flattened chronological with "↳ re:" notes is proposed. If branches turn out common, indentation on the thread page is the next step; don't build it before a real branch exists.

## Later: outbound and inbound

Recorded so phase 1 doesn't close doors.

- **Outbound** (replying to other blogs): widen `inReplyTo` to the union in section 1. External parents render the same header with the external title/author and an `h-cite` block. They have no thread (the parent isn't on this site) unless the reply itself gets self-replies.
- **Inbound** (others replying here): add `h-entry` markup to `[...slug].astro`, a `<link rel="webmention">` endpoint (webmention.io), and a live collection in `src/live.config.ts` alongside the Raindrop loader, rendered via a server island like `LinksUpdated`. The Cloudflare adapter is already in place for on-demand rendering.
