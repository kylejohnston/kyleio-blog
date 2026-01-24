# CLI Admin Tool for Astro Projects

A reusable pattern for adding an interactive CLI tool to manage blog posts in Astro projects.

## 1. Install Dependencies

```bash
npm install -D @clack/prompts gray-matter tsx
```

## 2. File Structure

```
scripts/
├── admin.ts           # Main CLI entry point
└── lib/
    ├── utils.ts       # Date formatting, slug generation
    └── posts.ts       # Content collection CRUD operations
```

## 3. Configuration Points

Before implementing, document these project-specific details:

| Item | Questions to Answer |
|------|---------------------|
| **Content path** | Where do posts live? (`src/content/blog/`, `src/content/posts/`, etc.) |
| **Frontmatter schema** | What fields exist? Which are required? |
| **Date fields** | Single `date`? Separate `pubDate`/`updatedAt`? Timezone handling? |
| **Draft handling** | `draft: boolean`? Separate folder? Underscore prefix? |
| **Taxonomies** | Tags? Categories? Series? How are they stored (array, string)? |
| **Filename convention** | Date prefix? Slug only? Nested folders by year? |
| **Extension** | `.md` only? `.mdx` option? Default? |

## 4. Implement `scripts/lib/utils.ts`

```ts
// Customize these functions per project:

generateSlug(title: string): string
  // - Kebab-case conversion
  // - Any prefix rules (date, category, etc.)

formatDate(date?: Date): string
  // - Match your frontmatter date format
  // - ISO 8601? YYYY-MM-DD? With timezone?
```

## 5. Implement `scripts/lib/posts.ts`

```ts
// Define your frontmatter interface
interface PostFrontmatter {
  title: string;
  // ... project-specific fields
}

// Core functions to implement:
getAllPosts(): Post[]        // Read from content directory
getDrafts(): Post[]          // Filter by your draft convention
getExistingTags(): string[]  // Or categories, etc.
createPost(...)              // Write new file with frontmatter
updatePost(...)              // Modify existing post
```

## 6. Implement `scripts/admin.ts`

Build commands based on your workflow:

| Command | Typical Prompts | Actions |
|---------|-----------------|---------|
| `create` | Title, description, taxonomies, extension | Generate filename, write draft |
| `publish` | Select draft | Update draft field, update dates |
| `edit` | Select post | Open in editor |

**Optional commands** based on workflow:
- `archive` - Move to archive folder or set archived flag
- `schedule` - Set future publish date
- `migrate` - Bulk update frontmatter schema

## 7. Add npm Scripts

```json
{
  "scripts": {
    "admin": "tsx scripts/admin.ts",
    "post:create": "tsx scripts/admin.ts create"
  }
}
```

## 8. Customization Checklist

When adapting to a new project:

- [ ] Update `CONTENT_DIR` path constant
- [ ] Define `PostFrontmatter` interface matching your schema
- [ ] Adjust `createPost` to generate correct default frontmatter
- [ ] Modify date logic for your `pubDate`/`updatedAt` pattern
- [ ] Update tag/category selection to match your taxonomies
- [ ] Adjust filename generation (prefixes, date patterns)
- [ ] Configure editor command (`code`, `cursor`, `nvim`, etc.)

## Reference Implementation

See the sibling files in this directory (`admin.ts`, `lib/utils.ts`, `lib/posts.ts`) for a working example.
