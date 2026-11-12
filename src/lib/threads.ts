// Reply threads between posts. A post names its parent with `inReplyTo`;
// everything else (roots, thread membership, order) is derived here.
// See notes/replies-between-posts.md.
import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'posts'>;

export interface ThreadIndex {
  /** child id -> parent post */
  parentOf: Map<string, Post>;
  /** root id -> every post in the thread, oldest first (threads of 2+ only) */
  threads: Map<string, Post[]>;
  /** id of any post in a thread -> root id */
  rootOf: Map<string, string>;
}

/**
 * Build the thread index from an already-filtered post list (e.g. the result
 * of getPublishedPosts()), so a published reply to an unpublished parent is
 * reported as a missing parent in production.
 *
 * Throws when any `inReplyTo` is invalid, failing the build.
 */
export function buildThreadIndex(posts: Post[]): ThreadIndex {
  const byId = new Map(posts.map((post) => [post.id, post]));
  const parentOf = new Map<string, Post>();
  const errors: string[] = [];

  for (const post of posts) {
    const ref = post.data.inReplyTo;
    if (!ref) continue;

    if (ref.id === post.id) {
      errors.push(`"${post.id}" replies to itself`);
      continue;
    }
    const parent = byId.get(ref.id);
    if (!parent) {
      errors.push(`"${post.id}" replies to "${ref.id}", which doesn't exist or isn't published`);
      continue;
    }
    if (!post.data.draft && parent.data.draft) {
      errors.push(`"${post.id}" is published but replies to draft "${parent.id}"`);
    }
    if (parent.data.tags.includes('page')) {
      errors.push(`"${post.id}" replies to "${parent.id}", which is a page; pages can't start threads`);
    }
    // Replies must postdate their parent. This also rules out cycles,
    // which the root walk below relies on.
    if (post.data.pubDate.getTime() <= parent.data.pubDate.getTime()) {
      errors.push(`"${post.id}" (pubDate ${post.data.pubDate.toISOString()}) must be published after "${parent.id}" (${parent.data.pubDate.toISOString()})`);
    }
    parentOf.set(post.id, parent);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid inReplyTo in posts:\n  - ${errors.join('\n  - ')}`);
  }

  const rootIdOf = (post: Post): string => {
    let current = post;
    let parent = parentOf.get(current.id);
    while (parent) {
      current = parent;
      parent = parentOf.get(current.id);
    }
    return current.id;
  };

  const members = new Map<string, Post[]>();
  for (const post of posts) {
    const rootId = rootIdOf(post);
    const list = members.get(rootId);
    if (list) list.push(post);
    else members.set(rootId, [post]);
  }

  const threads = new Map<string, Post[]>();
  const rootOf = new Map<string, string>();
  for (const [rootId, list] of members) {
    if (list.length < 2) continue;
    // Thread order is pubDate, not tendDate: tending an old post
    // must not reorder the conversation.
    list.sort((a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime());
    threads.set(rootId, list);
    for (const post of list) rootOf.set(post.id, rootId);
  }

  return { parentOf, threads, rootOf };
}

/** Every post in the thread containing `id`, oldest first, or undefined. */
export function threadFor(index: ThreadIndex, id: string): Post[] | undefined {
  const rootId = index.rootOf.get(id);
  return rootId ? index.threads.get(rootId) : undefined;
}

/**
 * Parent of thread[i] when it isn't the entry directly above it in the
 * flattened thread (a branch reply). Inside a thread, a reply to the entry
 * above needs no "A reply to" line; a branch reply does.
 */
export function branchParent(index: ThreadIndex, thread: Post[], i: number): Post | undefined {
  const parent = index.parentOf.get(thread[i].id);
  return parent && parent.id !== thread[i - 1]?.id ? parent : undefined;
}
