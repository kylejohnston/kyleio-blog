# RSS feed: future-direction options

Captured 2026-05-04. The current implementation (`src/pages/rss.xml.ts`) uses a JSX-aware scanner to strip MDX components from post bodies, then renders the remaining markdown via `micromark`. For posts with a `galleryPath` frontmatter field, it appends static `<img>` HTML built from `import.meta.glob`. This works for today's posts.

Two larger directions were considered and deferred. Revisit when adding components that need richer feed treatment.

## Option 2 — Generate RSS from the built `dist/` HTML

Replace the route at `src/pages/rss.xml.ts` with a post-build script. After `astro build` runs, the script reads each rendered post HTML (`dist/p/<slug>/index.html`), extracts the article content, sanitizes it, rewrites relative URLs to absolute, appends the existing RSS footer, and writes `dist/rss.xml`.

Wiring options:
- An npm script: `"build": "astro build && tsx scripts/generate-rss.ts"`.
- An Astro integration using the `astro:build:done` hook. Cleaner — runs in the same build process and receives the dist directory as input.

This works because `wrangler.jsonc` deploys `./dist` as static assets, so the rendered HTML is the source of truth.

Pros:
- One rendering pipeline. Anything that renders on the page renders in RSS.
- New components automatically work without RSS-specific code.
- No JSX stripping or per-component handling.

Cons / things to design:
- Need a stable selector that bounds "article content" — likely add `<article data-rss-content>` (or similar) around the post body in `src/pages/p/[...slug].astro`.
- Interactive bits (e.g. `GalleryGrid` React lightbox) must degrade gracefully. Static thumbnail grid is fine; strip `<script>` and `client:*` artifacts.
- Be careful what CSS/HTML chrome leaks in. Sanitize aggressively with `ultrahtml` (already a dep).
- The current route at `src/pages/rss.xml.ts` would be removed.

Effort: medium. Worth it when there are 2+ custom components beyond Gallery, or when feed fidelity matters more.

## Option 3 — Per-component RSS render contract

Generalize what `galleryPath` already does: each component that wouldn't survive plain markdown rendering exports (or registers) a static `rssRender(props)` function. RSS generation parses the MDX body to an AST (via `@mdx-js/mdx`, already on the dependency tree through `@astrojs/mdx`), walks it, and for each known component name calls the component's `rssRender` to produce static HTML. Unknown components get dropped.

Pros:
- Components own their feed representation in code, next to the component itself.
- No regex or string scanning. AST-based.
- Predictable, opt-in per component.

Cons:
- More code than the current scanner, less universal than Option 2.
- Each new component needs an explicit `rssRender` to appear in feeds.
- Props passed in MDX may include runtime values (`import.meta.glob` results) that aren't trivially serializable from an AST without re-evaluating the module — likely need to resolve images via the same `import.meta.glob` approach used today, keyed off props or frontmatter.

Effort: low–medium. Good fit if RSS-specific representation differs meaningfully from web rendering for several components.

## When to revisit

- Adding a third custom component that renders meaningfully in posts → consider Option 3.
- Adding interactive content where readers should still see something useful in the feed (charts, embeds, etc.) → consider Option 2.
- If `import.meta.glob`-based gallery handling becomes painful to maintain across many `galleryPath` variants → either option helps.
